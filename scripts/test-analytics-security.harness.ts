/** Offline contracts for CSP, URL redaction and single-owner event delivery. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { SECURITY_HEADERS } from "../src/lib/security-headers.ts";
import * as privacy from "../src/lib/analytics/privacy.ts";

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const deployedHeaders = Object.fromEntries(
  vercel.headers
    .find((rule: { source: string }) => rule.source === "/(.*)")
    .headers.map(({ key, value }: { key: string; value: string }) => [key, value]),
);
assert.deepEqual(deployedHeaders, SECURITY_HEADERS, "Vercel and server protections must match");
const csp = new Map(
  SECURITY_HEADERS["Content-Security-Policy"].split("; ").map((directive) => {
    const [name, ...sources] = directive.split(" ");
    return [name, sources];
  }),
);
for (const [directive, expected] of Object.entries({
  "default-src": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
}))
  assert.deepEqual(csp.get(directive), expected);
assert.equal(SECURITY_HEADERS["X-Frame-Options"], "DENY");
for (const directive of ["script-src", "connect-src", "frame-src"]) {
  const sources = csp.get(directive)!;
  assert.ok(sources.includes("https://challenges.cloudflare.com"));
  assert.ok(sources.includes("https://www.googletagmanager.com"));
  assert.ok(
    !sources.some((source) => source === "*" || source === "https:" || source === "'unsafe-eval'"),
  );
  assert.ok(!sources.some((source) => /clarity|bing|doubleclick|googleadservices/.test(source)));
  assert.ok(!sources.some((source) => source.includes("*") && !source.endsWith("*.supabase.co")));
}
assert.ok(csp.get("connect-src")!.includes("https://www.google-analytics.com"));
assert.ok(csp.get("connect-src")!.includes("https://region1.google-analytics.com"));
assert.ok(
  !readFileSync("src/components/analytics/AnalyticsScripts.tsx", "utf8").includes(
    "<MicrosoftClarity",
  ),
);
console.log("PASS CSP parity, required named origins, and retained protections");

for (const [raw, expected] of [
  ["/invoice-generator?email=private@example.com#access_token=secret", "/invoice-generator"],
  ["/pay/private-share-token?token=secret", "/pay/:id"],
  ["/invoices/private-document-id", "/invoices/:id"],
  ["/admin/users/private-account-id", "/admin/users/:id"],
  ["/reset-password#access_token=secret", "/reset-password"],
  ["https://untrusted.example/private", "/other"],
  ["/unknown-private-token", "/other"],
])
  assert.equal(privacy.sanitizeAnalyticsPath(raw), expected);
assert.ok(privacy.isPublicAnalyticsPath("/invoice-generator?token=secret"));
assert.ok(!privacy.isPublicAnalyticsPath("/pay/secret"));
console.log("PASS queries, fragments, private identifiers and unknown routes redacted");

// Run the actual event module with configuration and browser dependencies stubbed.
const eventsJs = ts.transpileModule(readFileSync("src/lib/analytics/events.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function eventHarness(direct: boolean, manager: boolean) {
  const calls: unknown[][] = [];
  const browser = {
    location: { pathname: "/invoice-generator", search: "?token=secret", hash: "#secret" },
    dataLayer: [] as unknown[],
    gtag: (...args: unknown[]) => calls.push(args),
  };
  const document = {
    title: "Invoice generator",
    referrer: "https://vega-pal.com/pay/secret?token=secret",
  };
  const configuration = {
    GOOGLE_ANALYTICS_ID: direct ? "G-TEST" : "",
    GOOGLE_ADS_ID: "",
    hasGoogleAnalytics: direct,
    hasGoogleTagManager: manager,
  };
  const module = { exports: {} as Record<string, (...args: unknown[]) => void> };
  const require = (id: string) => {
    if (id.endsWith("/config")) return configuration;
    if (id.endsWith("/privacy")) {
      return {
        ...privacy,
        getAnalyticsPageContext: (path?: string, title?: string) => ({
          ...privacy.getAnalyticsPageContext(
            path ?? browser.location.pathname,
            title ?? document.title,
          ),
          page_referrer: "",
        }),
      };
    }
    throw new Error(`Unexpected import: ${id}`);
  };
  vm.runInNewContext(eventsJs, {
    exports: module.exports,
    module,
    require,
    window: browser,
    document,
  });
  return { events: module.exports, browser, calls };
}

for (const [direct, manager] of [
  [true, false],
  [false, true],
  [true, true],
  [false, false],
]) {
  const harness = eventHarness(direct, manager);
  harness.events.trackPageView("/invoice-generator?token=secret#secret", "Invoice generator");
  const events = harness.calls.filter(([type]) => type === "event");
  assert.equal(events.length, direct ? 1 : 0);
  assert.equal(harness.browser.dataLayer.length, !direct && manager ? 1 : 0);
  for (const event of [...events.map((call) => call[2]), ...harness.browser.dataLayer] as Record<
    string,
    unknown
  >[]) {
    assert.equal(event.page_path, "/invoice-generator");
    assert.equal(event.page_location, "https://vega-pal.com/invoice-generator");
    assert.equal(event.page_referrer, "");
    assert.ok(!JSON.stringify(event).includes("secret"));
  }
  harness.calls.length = 0;
  harness.browser.dataLayer.length = 0;
  harness.events.trackPageView("/pay/private-token");
  assert.equal(
    harness.calls.length + harness.browser.dataLayer.length,
    0,
    "private page views stay local",
  );
  harness.browser.location.pathname = "/invoices/private-token";
  harness.events.trackLogin("email");
  const login =
    harness.calls.find(([type]) => type === "event")?.[2] ?? harness.browser.dataLayer[0];
  if (login) {
    assert.equal(
      (login as Record<string, unknown>).page_location,
      "https://vega-pal.com/invoices/:id",
    );
    assert.equal((login as Record<string, unknown>).page_title, "VegaPal");
    assert.ok(!JSON.stringify(login).includes("private-token"));
  }
}
console.log("PASS direct GA, GTM, combined, disabled, and private-page event contracts");
