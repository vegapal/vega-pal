/**
 * Cross-user authorization tests using real Supabase authenticated sessions.
 * Requires low-privilege test accounts — never use service role for these checks.
 *
 * Env:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY
 *   E2E_EMAIL / E2E_PASSWORD         — User A
 *   E2E_EMAIL_B / E2E_PASSWORD_B     — User B (optional but required for IDOR tests)
 *   E2E_INVOICE_ID_B                 — optional invoice UUID owned by User B
 *
 * Usage: npx tsx scripts/test-cross-user-auth.harness.ts
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types.ts";

function pass(id: string) {
  console.log(`PASS  ${id}`);
}

function skip(id: string, reason: string) {
  console.log(`SKIP  ${id} — ${reason}`);
}

function loadEnvFiles() {
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m || line.trimStart().startsWith("#")) continue;
      const [, key, raw] = m;
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
      }
    }
  }
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
): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function main() {
  loadEnvFiles();

  const { url, key } = supabaseEnv();
  const emailA = process.env.E2E_EMAIL?.trim();
  const passwordA = process.env.E2E_PASSWORD;
  const emailB = process.env.E2E_EMAIL_B?.trim();
  const passwordB = process.env.E2E_PASSWORD_B;

  if (!emailA || !passwordA) {
    console.log("SKIP  cross-user auth — Set E2E_EMAIL and E2E_PASSWORD for User A.");
    process.exit(0);
  }

  const clientA = await signInClient(url, key, emailA, passwordA);
  const { data: userA } = await clientA.auth.getUser();
  assert.ok(userA.user?.id, "User A session required");

  // Admin API denied for normal user
  {
    const { data: session } = await clientA.auth.getSession();
    const token = session.session?.access_token;
    assert.ok(token);
    const res = await fetch(`${process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173"}/api/admin/users`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.ok(res.status === 401 || res.status === 403, `admin users expected 401/403 got ${res.status}`);
    pass("User A → admin API denied");
  }

  // Billing approval denied
  {
    const { data: session } = await clientA.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch(
      `${process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173"}/api/admin/subscription-payments/fake-id/approve`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      },
    );
    assert.ok(res.status === 401 || res.status === 403, `approve expected 401/403 got ${res.status}`);
    pass("User A → subscription approve denied");
  }

  // Cannot change own role/plan via profiles update (trigger)
  {
    const { error: roleErr } = await clientA
      .from("profiles")
      .update({ role: "admin" } as never)
      .eq("id", userA.user!.id);
    assert.ok(roleErr, "role self-elevation must fail");
    pass("User A cannot change own role");
  }

  {
    const { error: planErr } = await clientA
      .from("profiles")
      .update({ plan: "pro" } as never)
      .eq("id", userA.user!.id);
    assert.ok(planErr, "plan self-elevation must fail");
    pass("User A cannot change own plan");
  }

  // log_user_activity cross-user (post-migration guard)
  if (emailB && passwordB) {
    const clientB = await signInClient(url, key, emailB, passwordB);
    const { data: userB } = await clientB.auth.getUser();
    assert.ok(userB.user?.id);

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

    const invoiceIdB =
      process.env.E2E_INVOICE_ID_B ??
      (
        await clientB
          .from("invoices")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data?.id;

    if (invoiceIdB) {
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

      const { data: pmB } = await clientB.from("payment_methods").select("id").limit(1).maybeSingle();
      if (pmB?.id) {
        const { data: pmRow, error: pmReadErr } = await clientA
          .from("payment_methods")
          .select("id")
          .eq("id", pmB.id)
          .maybeSingle();
        assert.ok(!pmRow || pmReadErr, "User A must not read User B payment method");
        pass("User A cannot read User B payment methods");
      } else {
        skip("User A payment method IDOR", "User B has no saved payment methods");
      }
    } else {
      skip("User A invoice IDOR", "No invoice found for User B");
    }
  } else {
    skip("cross-user IDOR", "Set E2E_EMAIL_B and E2E_PASSWORD_B");
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
