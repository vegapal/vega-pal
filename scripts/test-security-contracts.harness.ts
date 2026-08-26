/**
 * Static security contract checks (no live Supabase required).
 * Usage: npx tsx scripts/test-security-contracts.harness.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderInvoiceDocumentMarkup } from "../src/lib/pdf/invoice-document-html.server.tsx";
import { getProCheckoutPrice, getProSubscriptionMonths } from "../src/lib/billing/public-pricing.ts";
import {
  getUsdtSubscriptionDeposit,
  isUsdtSubscriptionNetworkId,
  USDT_SUBSCRIPTION_NETWORKS,
} from "../src/lib/billing/usdt-subscription-deposits.ts";
import { handleHealthCheckRequest } from "../src/lib/health/health-check.server.ts";
import { SECURITY_HEADERS } from "../src/lib/security-headers.ts";
import { FREE_PLAN_MONTHLY_INVOICE_LIMIT } from "../src/lib/admin/plans.ts";
import type { InvoiceDocumentModel } from "../src/components/invoice-document/invoice-document.types.ts";

function pass(id: string) {
  console.log(`PASS  ${id}`);
}

function minimalModel(): InvoiceDocumentModel {
  return {
    documentType: "tax_invoice",
    documentTitle: "Tax Invoice",
    documentNumber: "INV-001",
    issueDateLabel: "Issue date",
    issueDate: "2026-01-01",
    dueDateLabel: "Due date",
    dueDate: "2026-01-15",
    sellerLines: [{ text: '<script>alert(1)</script>' }, { text: '<img src=x onerror=alert(1)>' }],
    showClient: true,
    clientLines: [{ text: '"><svg/onload=alert(1)>' }],
    metaFields: [],
    currency: "USD",
    items: [
      {
        description: '<iframe src="javascript:alert(1)">',
        quantity: "1",
        unitPrice: "100.00",
        amount: "100.00",
      },
    ],
    totals: [{ label: "Subtotal", value: "100.00" }],
    finalTotalLabel: "Total",
    finalTotalAmount: "100.00",
    showNotes: true,
    noteBullets: ["<b>notes</b><script>x</script>"],
    payment: { show: false, centerTitle: false },
    locale: "en",
    dir: "ltr",
  };
}

async function testHealthProductionMinimal() {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "production";

  const res = await handleHealthCheckRequest();
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(typeof json.ok, "boolean");
  assert.equal(json.app, undefined, "production health must not expose app field");
  assert.equal(json.env, undefined, "production health must not expose env booleans");
  assert.equal(json.supabaseHost, undefined);

  process.env.NODE_ENV = prevNode;
  process.env.VERCEL_ENV = prevVercel;
  pass("health production minimal payload");
}

function testPricingServerTruth() {
  assert.equal(getProCheckoutPrice("monthly"), 29);
  assert.equal(getProCheckoutPrice("semiannual"), 59);
  assert.equal(getProSubscriptionMonths("monthly"), 1);
  assert.equal(getProSubscriptionMonths("semiannual"), 6);
  assert.equal(FREE_PLAN_MONTHLY_INVOICE_LIMIT, 3);
  pass("billing pricing constants");
}

function testUsdtNetworks() {
  assert.equal(USDT_SUBSCRIPTION_NETWORKS.length, 5);
  assert.ok(isUsdtSubscriptionNetworkId("tron_trc20"));
  assert.ok(!isUsdtSubscriptionNetworkId("solana"));
  const deposit = getUsdtSubscriptionDeposit("tron_trc20");
  assert.ok(deposit.address.length >= 20);
  assert.ok(!/private|seed|mnemonic/i.test(deposit.address));
  pass("USDT subscription deposit config");
}

function testPdfEscapesUserHtml() {
  const html = renderInvoiceDocumentMarkup(minimalModel());
  assert.ok(!html.includes("<script"), "script tags must not appear raw in PDF HTML");
  assert.ok(!html.includes("<iframe"), "iframe tags must not appear raw");
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "seller XSS payload must be escaped");
  assert.ok(html.includes("&lt;iframe"), "iframe payload must be escaped");
  pass("PDF HTML escaping");
}

function testSecurityHeaders() {
  assert.ok(SECURITY_HEADERS["Content-Security-Policy"]);
  assert.equal(SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
  assert.ok(SECURITY_HEADERS["Strict-Transport-Security"].includes("max-age"));
  assert.ok(SECURITY_HEADERS["Content-Security-Policy"].includes("challenges.cloudflare.com"));
  pass("security headers configured");
}

function testMigrationRpcGuards() {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260826240000_security_rls_hardening.sql"),
    "utf8",
  );
  assert.match(migration, /log_user_activity[\s\S]*auth\.uid\(\)/);
  assert.match(migration, /get_effective_plan[\s\S]*auth\.uid\(\)/);
  assert.match(migration, /document_status NOT IN \('draft', 'cancelled'\)/);
  pass("security migration RPC guards present");
}

function testRobotsBlocksPrivateRoutes() {
  const robots = readFileSync(join(process.cwd(), "public/robots.txt"), "utf8");
  for (const path of ["/dashboard", "/admin", "/pay", "/invoices", "/settings"]) {
    assert.match(robots, new RegExp(`Disallow: ${path.replace("/", "\\/")}`));
  }
  pass("robots.txt blocks private routes");
}

async function main() {
  testPricingServerTruth();
  testUsdtNetworks();
  testPdfEscapesUserHtml();
  testSecurityHeaders();
  testMigrationRpcGuards();
  testRobotsBlocksPrivateRoutes();
  await testHealthProductionMinimal();
  console.log("\nAll security contract checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
