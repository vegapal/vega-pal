/**
 * Growth engine unit/contract tests (no live DB required for pure helpers).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FREE_PLAN_MONTHLY_INVOICE_LIMIT } from "../src/lib/admin/plans.ts";
import { isAtFreePlanInvoiceLimit } from "../src/lib/plan/invoice-limit.ts";
import { buildReferralLink } from "../src/lib/growth/attribution-client.ts";
import { SITE_ORIGIN } from "../src/lib/seo/site.ts";

function pass(id: string) {
  console.log(`PASS  ${id}`);
}

// Base Free remains 3
assert.equal(FREE_PLAN_MONTHLY_INVOICE_LIMIT, 3);
pass("base Free limit is 3");

// Effective limit uses monthlyLimit from usage (3 + bonuses)
assert.equal(
  isAtFreePlanInvoiceLimit({ plan: "free", invoicesThisMonth: 3, monthlyLimit: 3 }),
  true,
);
assert.equal(
  isAtFreePlanInvoiceLimit({ plan: "free", invoicesThisMonth: 3, monthlyLimit: 5 }),
  false,
);
assert.equal(
  isAtFreePlanInvoiceLimit({ plan: "free", invoicesThisMonth: 5, monthlyLimit: 5 }),
  true,
);
assert.equal(
  isAtFreePlanInvoiceLimit({ plan: "pro", invoicesThisMonth: 99, monthlyLimit: null }),
  false,
);
pass("bonus-aware free limit helpers");

const link = buildReferralLink("ab12cd", { source: "pdf", medium: "referral" });
assert.ok(link.startsWith(SITE_ORIGIN));
assert.ok(link.includes("ref=AB12CD"));
assert.ok(link.includes("utm_source=pdf"));
pass("referral link builder");

// Migration present
const mig = path.join("supabase", "migrations", "20260827120000_growth_engine_v1.sql");
assert.ok(fs.existsSync(mig), "growth migration missing");
const sql = fs.readFileSync(mig, "utf8");
assert.ok(sql.includes("ENABLE ROW LEVEL SECURITY"));
assert.ok(sql.includes("claim_referral_attribution"));
assert.ok(sql.includes("qualify_referral_for_user"));
assert.ok(sql.includes("get_free_plan_monthly_allowance"));
assert.ok(sql.includes("affiliate_commissions"));
assert.ok(sql.includes("referrals_no_self"));
assert.ok(sql.includes("UNIQUE (referred_user_id)"));
assert.ok(sql.includes("UNIQUE (subscription_payment_request_id)"));
assert.ok(sql.includes("get_public_invoice_referral_code"));
pass("migration security + idempotency constraints");

const harden = path.join(
  "supabase",
  "migrations",
  "20260827150000_harden_qualify_referral_caller.sql",
);
assert.ok(fs.existsSync(harden), "qualify caller harden migration missing");
const hardenSql = fs.readFileSync(harden, "utf8");
assert.ok(hardenSql.includes("caller <> p_user_id"));
assert.ok(hardenSql.includes("REVOKE ALL ON FUNCTION public.qualify_referral_for_user"));
pass("qualify_referral_for_user cross-user harden migration present");

// Canonical must ignore query params (site helper)
import { absoluteUrl } from "../src/lib/seo/site.ts";
assert.equal(absoluteUrl("/usdt-invoice-generator"), `${SITE_ORIGIN}/usdt-invoice-generator`);
assert.ok(!absoluteUrl("/").includes("ref="));
pass("canonical URLs stay clean");

// i18n keys exist in EN
const settings = JSON.parse(fs.readFileSync("locales/en/settings.json", "utf8"));
assert.ok(settings.invite?.title);
assert.ok(settings.invite?.stats?.activated);
const common = JSON.parse(fs.readFileSync("locales/en/common.json", "utf8"));
assert.ok(common.plan?.inviteEarnCta);
assert.ok(common.nav?.inviteEarn);
const admin = JSON.parse(fs.readFileSync("locales/en/admin.json", "utf8"));
assert.ok(admin.growth?.title);
pass("growth i18n keys present (en)");

console.log("\nAll growth contract checks passed.");
