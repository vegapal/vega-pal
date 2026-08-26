/**
 * Cross-user authorization tests using real Supabase authenticated sessions.
 * Requires low-privilege test accounts — never use service role for these checks.
 *
 * Env:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY
 *   E2E_EMAIL / E2E_PASSWORD         — User A
 *   E2E_EMAIL_B / E2E_PASSWORD_B     — User B
 *   PLAYWRIGHT_BASE_URL              — srvx preview for admin API checks
 *   E2E_INVOICE_ID_B                 — optional invoice UUID owned by User B
 *
 * Usage: npx tsx scripts/test-cross-user-auth.harness.ts
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env.mjs";
import type { Database } from "../src/integrations/supabase/types.ts";

const PRODUCTION_SUPABASE_URL = "https://vknqaavcalnbyajevgsx.supabase.co";

function pass(id: string) {
  console.log(`PASS  ${id}`);
}

function fail(id: string, reason: string): never {
  throw new Error(`FAIL  ${id} — ${reason}`);
}

function supabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or VITE_* equivalents).");
  }
  return { url, key };
}

async function signInClient(
  url: string,
  key: string,
  email: string,
  password: string,
  label: string,
): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) fail(`${label} sign-in`, error.message);
  pass(`${label} authenticated via signInWithPassword`);
  return client;
}

async function bearerToken(client: SupabaseClient<Database>) {
  const { data: session } = await client.auth.getSession();
  const token = session.session?.access_token;
  assert.ok(token, "authenticated session token required");
  return token;
}

async function ensureUserBInvoiceId(
  clientB: SupabaseClient<Database>,
  userBId: string,
): Promise<string> {
  const fromEnv = process.env.E2E_INVOICE_ID_B?.trim();
  if (fromEnv) return fromEnv;

  const { data: existing } = await clientB
    .from("invoices")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: profile, error: profileErr } = await clientB
    .from("profiles")
    .select("name, email, contact_email, wallet, network, brand_color")
    .eq("id", userBId)
    .maybeSingle();
  if (profileErr || !profile) {
    fail("User B invoice fixture", "Could not load User B profile to create probe invoice.");
  }

  const issueDate = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const probeNumber = `E2E-${Date.now().toString(36).toUpperCase()}`;

  const { data: created, error: createErr } = await clientB
    .from("invoices")
    .insert({
      user_id: userBId,
      number: probeNumber,
      title: "E2E cross-user probe",
      client_name: "E2E probe client",
      client_email: "probe@example.com",
      due_date: dueDate,
      issue_date: issueDate,
      network: profile.network || "TRON TRC20",
      wallet_address: profile.wallet || "TQn9Y2khEsiJW1ChVWFMSMeRDow5KcblSE",
      seller_name: profile.name || "E2E User B",
      seller_email: profile.contact_email || profile.email || "e2e-b@example.com",
      brand_color: profile.brand_color || "#0B203A",
      document_type: "tax_invoice",
      document_status: "draft",
      payment_status: "unpaid",
      status: "draft",
      description: "",
      terms_and_conditions: "",
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      discount_type: "percentage",
      tax_type: "percentage",
      invoice_currency: "USDT",
      payment_methods: [],
      display_options: {},
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    fail(
      "User B invoice fixture",
      createErr?.message ?? "User B could not create probe invoice for IDOR tests.",
    );
  }

  pass("User B probe invoice created for IDOR tests");
  return created.id;
}

async function main() {
  loadEnvFiles();

  const { url, key } = supabaseEnv();
  const normalizedUrl = url.replace(/\/$/, "");
  if (normalizedUrl !== PRODUCTION_SUPABASE_URL) {
    fail(
      "Supabase project URL",
      `expected ${PRODUCTION_SUPABASE_URL}, got ${normalizedUrl}`,
    );
  }
  pass("Supabase URL matches production project");

  const emailA = process.env.E2E_EMAIL?.trim();
  const passwordA = process.env.E2E_PASSWORD;
  const emailB = process.env.E2E_EMAIL_B?.trim();
  const passwordB = process.env.E2E_PASSWORD_B;

  if (!emailA || !passwordA) {
    fail("E2E credentials", "Set E2E_EMAIL and E2E_PASSWORD for User A.");
  }
  if (!emailB || !passwordB) {
    fail("E2E credentials", "Set E2E_EMAIL_B and E2E_PASSWORD_B for User B.");
  }

  const apiBase = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

  const clientA = await signInClient(url, key, emailA, passwordA, "User A");
  const clientB = await signInClient(url, key, emailB, passwordB, "User B");

  const { data: userA } = await clientA.auth.getUser();
  const { data: userB } = await clientB.auth.getUser();
  assert.ok(userA.user?.id && userB.user?.id, "Both user sessions required");

  // Admin APIs denied for normal user
  {
    const token = await bearerToken(clientA);
    for (const [path, method, label] of [
      ["/api/admin/users", "GET", "admin users list"],
      ["/api/admin/subscription-payments/fake-id/approve", "POST", "subscription approve"],
      ["/api/admin/subscription-payments/fake-id/reject", "POST", "subscription reject"],
    ] as const) {
      const res = await fetch(`${apiBase}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      });
      assert.ok(
        res.status === 401 || res.status === 403,
        `${label} expected 401/403 got ${res.status}`,
      );
      pass(`User A → ${label} denied`);
    }
  }

  // User A cannot self-elevate role/plan/is_disabled
  {
    const { data: beforeA } = await clientA
      .from("profiles")
      .select("role, plan, is_disabled")
      .eq("id", userA.user!.id)
      .single();

    const { data: roleUpdated } = await clientA
      .from("profiles")
      .update({ role: "admin" } as never)
      .eq("id", userA.user!.id)
      .select("id");
    assert.ok(!roleUpdated?.length, "role self-elevation must not apply");
    pass("User A cannot change own role");

    const { data: planUpdated } = await clientA
      .from("profiles")
      .update({ plan: "pro" } as never)
      .eq("id", userA.user!.id)
      .select("id");
    assert.ok(!planUpdated?.length, "plan self-elevation must not apply");
    pass("User A cannot change own plan");

    const { data: disabledUpdated } = await clientA
      .from("profiles")
      .update({ is_disabled: true } as never)
      .eq("id", userA.user!.id)
      .select("id");
    assert.ok(!disabledUpdated?.length, "is_disabled self-change must not apply");
    pass("User A cannot change own is_disabled");

    const { data: afterA } = await clientA
      .from("profiles")
      .select("role, plan, is_disabled")
      .eq("id", userA.user!.id)
      .single();
    assert.equal(afterA?.role, beforeA?.role);
    assert.equal(afterA?.plan, beforeA?.plan);
    assert.equal(afterA?.is_disabled, beforeA?.is_disabled);
  }

  // User A cannot modify User B profile fields
  {
    const { data: beforeB } = await clientB
      .from("profiles")
      .select("role, plan, is_disabled")
      .eq("id", userB.user!.id)
      .single();

    for (const [field, value, label] of [
      ["role", "admin", "role"],
      ["plan", "pro", "plan"],
      ["is_disabled", true, "is_disabled"],
    ] as const) {
      const { data: updated } = await clientA
        .from("profiles")
        .update({ [field]: value } as never)
        .eq("id", userB.user!.id)
        .select("id");
      assert.ok(!updated?.length, `User A must not change User B ${label}`);
      pass(`User A cannot change User B ${label}`);
    }

    const { data: afterB } = await clientB
      .from("profiles")
      .select("role, plan, is_disabled")
      .eq("id", userB.user!.id)
      .single();
    assert.equal(afterB?.role, beforeB?.role);
    assert.equal(afterB?.plan, beforeB?.plan);
    assert.equal(afterB?.is_disabled, beforeB?.is_disabled);
  }

  // RPC cross-user guards
  {
    const { error: logErr } = await clientA.rpc("log_user_activity", {
      p_user_id: userB.user!.id,
      p_action: "cross_user_probe",
      p_description: "probe",
    });
    assert.ok(logErr, "cross-user activity log must fail");
    pass("User A cannot log activity for User B");

    const { error: planProbeErr } = await clientA.rpc("get_effective_plan", {
      p_user_id: userB.user!.id,
    });
    assert.ok(planProbeErr, "cross-user plan probe must fail");
    pass("User A cannot read User B effective plan");
  }

  const invoiceIdB = await ensureUserBInvoiceId(clientB, userB.user!.id);

  // Invoice IDOR — User A blocked
  {
    const { data: invRow, error: invErr } = await clientA
      .from("invoices")
      .select("id")
      .eq("id", invoiceIdB)
      .maybeSingle();
    assert.ok(!invRow || invErr, "User A must not read User B invoice");
    pass("User A cannot read User B invoice");

    const { data: updated, error: updateErr } = await clientA
      .from("invoices")
      .update({ title: "cross-user-probe" } as never)
      .eq("id", invoiceIdB)
      .select("id");
    assert.ok(updateErr || !updated?.length, "User A must not update User B invoice");
    pass("User A cannot update User B invoice");

    const { data: deleted, error: deleteErr } = await clientA
      .from("invoices")
      .delete()
      .eq("id", invoiceIdB)
      .select("id");
    assert.ok(deleteErr || !deleted?.length, "User A must not delete User B invoice");
    pass("User A cannot delete User B invoice");
  }

  // User B can access own invoice
  {
    const { data: ownInv, error: ownInvErr } = await clientB
      .from("invoices")
      .select("id")
      .eq("id", invoiceIdB)
      .maybeSingle();
    assert.ok(ownInv && !ownInvErr, "User B must read own invoice");
    pass("User B can read own invoice");
  }

  // Payment method IDOR
  const { data: pmB } = await clientB.from("payment_methods").select("id").limit(1).maybeSingle();
  if (pmB?.id) {
    const { data: pmRow, error: pmReadErr } = await clientA
      .from("payment_methods")
      .select("id")
      .eq("id", pmB.id)
      .maybeSingle();
    assert.ok(!pmRow || pmReadErr, "User A must not read User B payment method");
    pass("User A cannot read User B payment method");

    const { data: pmUpdated, error: pmUpdErr } = await clientA
      .from("payment_methods")
      .update({ label: "cross-user-probe" } as never)
      .eq("id", pmB.id)
      .select("id");
    assert.ok(pmUpdErr || !pmUpdated?.length, "User A must not update User B payment method");
    pass("User A cannot update User B payment method");

    const { data: pmDeleted, error: pmDelErr } = await clientA
      .from("payment_methods")
      .delete()
      .eq("id", pmB.id)
      .select("id");
    assert.ok(pmDelErr || !pmDeleted?.length, "User A must not delete User B payment method");
    pass("User A cannot delete User B payment method");

    const { data: ownPm, error: ownPmErr } = await clientB
      .from("payment_methods")
      .select("id")
      .eq("id", pmB.id)
      .maybeSingle();
    assert.ok(ownPm && !ownPmErr, "User B must read own payment method");
    pass("User B can read own payment method");
  } else {
    pass("User B payment method IDOR skipped — User B has no saved payment methods (create one for full coverage)");
  }

  // User B profile self-read
  {
    const { data: profileB, error: profileErr } = await clientB
      .from("profiles")
      .select("id, plan")
      .eq("id", userB.user!.id)
      .maybeSingle();
    assert.ok(profileB && !profileErr, "User B must read own profile");
    pass("User B can read own profile");
  }

  // Public invoice allowlist sanity
  {
    const { PUBLIC_INVOICE_SELECT, PUBLIC_INVOICE_FORBIDDEN_KEYS } = await import(
      "../src/lib/invoices/public-invoice.ts"
    );
    for (const forbidden of PUBLIC_INVOICE_FORBIDDEN_KEYS) {
      assert.ok(!PUBLIC_INVOICE_SELECT.includes(forbidden), `${forbidden} must not be selected`);
    }
    pass("public invoice select excludes internal columns");
  }

  console.log("\nCross-user authorization checks completed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
