/** Offline request/security contracts. No live auth mutations, providers, or database. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMonitoringApiHandler, handleMonitoringApiRequest, type MonitoringDatabase } from "../src/lib/monitoring/monitoring-api.server.ts";
import { MonitoringRequestError, parseMonitoringVisit, readMonitoringJson, requireMonitoringSameOrigin } from "../src/lib/monitoring/monitoring-validation.ts";

const visitorId = "36e6320f-81cd-4c9d-89bf-f1cf2c497740";
const sessionId = "fc568caa-8faa-4522-b966-9c62ba4d2253";
const notificationId = "31b6f642-7ef7-43f7-9a81-d330522c6fc8";
const now = new Date("2026-10-16T12:00:00.000Z");
const validVisit = { visitorId, sessionId, path: "/invoice-generator", source: "search" };
const origin = "https://vega-pal.com";

function request(path: string, body?: unknown, overrides: Record<string, string> = {}): Request {
  return new Request(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", ...overrides },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function fixture(options?: { authStatus?: number; databaseError?: boolean; summary?: unknown; limited?: boolean }) {
  const calls: Array<{ operation: string; args?: unknown }> = [];
  const db: MonitoringDatabase = {
    rpc: async (name, args) => {
      calls.push({ operation: name, args });
      return { data: options?.summary, error: options?.databaseError ? { code: "PGRST202" } : null };
    },
    from: (table) => ({ update: (values) => ({ eq: (column, value) => ({ is: async (nullColumn, nullValue) => {
      calls.push({ operation: "update", args: { table, values, column, value, nullColumn, nullValue } });
      return { error: null };
    } }) }) }),
  };
  const handler = createMonitoringApiHandler({
    requireAdmin: async () => {
      calls.push({ operation: "auth" });
      if (options?.authStatus) throw new Response(JSON.stringify({ error: "Denied" }), { status: options.authStatus });
      return { userId: visitorId };
    },
    getDatabase: async () => { calls.push({ operation: "database" }); return db; },
    getDeliveryConfig: async () => ({ configured: false, channel: null }),
    dispatchNotifications: async (limit) => { calls.push({ operation: "deliver", args: limit }); return { sent: 1 }; },
    rateLimit: () => options?.limited ? { allowed: false, retryAfterSec: 60 } : { allowed: true },
    now: () => now,
  });
  return { handler, calls };
}

function testVisitValidation() {
  assert.deepEqual(parseMonitoringVisit(validVisit), validVisit);
  assert.equal(parseMonitoringVisit({ ...validVisit, path: "/invoice-generator/" }).path, "/invoice-generator");
  for (const path of ["/pay/123", "/dashboard", "/admin", "/register", "/api/admin/stats", "/unknown", "//vega-pal.com", "/learn?email=x", "/learn#x", "/learn/%2f", "/learn/../admin", "/" + "a".repeat(161)]) {
    assert.throws(() => parseMonitoringVisit({ ...validVisit, path }), MonitoringRequestError, path);
  }
  assert.throws(() => parseMonitoringVisit({ ...validVisit, email: "private@example.test" }), MonitoringRequestError);
  assert.throws(() => parseMonitoringVisit({ ...validVisit, visitorId: "not-a-uuid" }), MonitoringRequestError);
  assert.throws(() => parseMonitoringVisit({ ...validVisit, source: "https://search.example/?q=private" }), MonitoringRequestError);
  assert.throws(() => parseMonitoringVisit(null), MonitoringRequestError);
  console.log("PASS visit validation excludes private paths, queries, PII fields and unbounded input");
}

async function testBodyAndOrigin() {
  for (const headers of [{ origin: "https://attacker.example" }, { origin: "null" }, { origin: "" }, { "sec-fetch-site": "cross-site" }]) {
    assert.throws(() => requireMonitoringSameOrigin(request("/api/analytics/visit", validVisit, headers)), MonitoringRequestError);
  }
  requireMonitoringSameOrigin(request("/api/analytics/visit", validVisit, { "sec-fetch-site": "same-origin" }));
  const tooLarge = request("/api/analytics/visit", { extra: "x".repeat(1100) });
  await assert.rejects(readMonitoringJson(tooLarge), (error: unknown) => error instanceof MonitoringRequestError && error.status === 413);
  await assert.rejects(readMonitoringJson(request("/api/analytics/visit", validVisit, { "content-length": "2048" })), (error: unknown) => error instanceof MonitoringRequestError && error.status === 413);
  await assert.rejects(readMonitoringJson(request("/api/analytics/visit", validVisit, { "content-type": "text/plain" })), (error: unknown) => error instanceof MonitoringRequestError && error.status === 415);
  await assert.rejects(readMonitoringJson(new Request(`${origin}/api/analytics/visit`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" })), MonitoringRequestError);
  console.log("PASS same-origin JSON and streamed body size enforcement");
}

async function testVisitHandler() {
  const { handler, calls } = fixture();
  const response = await handler(request("/api/analytics/visit", validVisit));
  assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(calls, [{ operation: "database" }, { operation: "record_site_visit", args: {
    p_visitor_id: visitorId, p_session_id: sessionId, p_landing_path: "/invoice-generator", p_source: "search",
  } }]);
  const invalid = fixture();
  assert.equal((await invalid.handler(request("/api/analytics/visit", { ...validVisit, path: "/admin" }))).status, 400);
  assert.equal(invalid.calls.length, 0, "invalid input cannot reach service-role DB");
  const limited = fixture({ limited: true });
  const denied = await limited.handler(request("/api/analytics/visit", validVisit));
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get("retry-after"), "60");
  assert.equal(limited.calls.length, 0);
  assert.equal((await fixture({ databaseError: true }).handler(request("/api/analytics/visit", validVisit))).status, 503);
  console.log("PASS visits persist only validated fields, rate-limit before DB, and signal unavailability");
}

async function testAdminAuthorization() {
  for (const authStatus of [401, 403]) {
    for (const req of [request("/api/admin/monitoring"), request("/api/admin/monitoring/read", { id: notificationId }), request("/api/admin/monitoring/deliver", {})]) {
      const { handler, calls } = fixture({ authStatus });
      const response = await handler(req);
      assert.equal(response.status, authStatus);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(calls, [{ operation: "auth" }], "authorization must precede service-role DB and provider access");
    }
  }
  // Exercise the real auth gate without calling Supabase: missing bearer is rejected locally.
  const priorUrl = process.env.SUPABASE_URL;
  const priorKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://monitoring-test.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_offline_test";
  try {
    assert.equal((await handleMonitoringApiRequest(request("/api/admin/monitoring"))).status, 401);
  } finally {
    if (priorUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = priorUrl;
    if (priorKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = priorKey;
  }
  console.log("PASS admin GET/read/delivery deny unauthorized and non-admin users before privileged operations");
}

async function testSummaryAndRead() {
  const summary = {
    since: "2026-09-17T00:00:00.000Z", uniqueVisitors: 2005, visits: 3000, newAccounts: 10, signedInUsers: 8, logins: 25,
    daily: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.UTC(2026, 8, 17 + i)).toISOString().slice(0, 10), visitors: 0, visits: 0, newAccounts: 0, logins: 0 })),
    notifications: [], unreadCount: 0,
  };
  const available = fixture({ summary });
  const data = await (await available.handler(request("/api/admin/monitoring"))).json();
  assert.equal(data.available, true);
  assert.equal(data.uniqueVisitors, 2005, "SQL aggregate must not be truncated to a 1,000-row PostgREST page");
  assert.deepEqual(available.calls.map((call) => call.operation), ["auth", "database", "get_site_monitoring_summary"]);
  const failed = await (await fixture({ databaseError: true }).handler(request("/api/admin/monitoring"))).json();
  assert.equal(failed.available, false);
  assert.equal(failed.since, summary.since);
  assert.deepEqual(failed.daily, []);
  const malformed = await (await fixture({ summary: { visits: 0 } }).handler(request("/api/admin/monitoring"))).json();
  assert.equal(malformed.available, false);
  const read = fixture();
  assert.equal((await read.handler(request("/api/admin/monitoring/read", { id: notificationId }))).status, 200);
  assert.deepEqual(read.calls.at(-1), { operation: "update", args: {
    table: "admin_signup_notifications", values: { read_at: now.toISOString() }, column: "id", value: notificationId, nullColumn: "read_at", nullValue: null,
  } });
  const delivery = fixture();
  assert.equal((await delivery.handler(request("/api/admin/monitoring/deliver", {}))).status, 200);
  assert.deepEqual(delivery.calls.at(-1), { operation: "deliver", args: 5 });
  console.log("PASS aggregate summary, migration-unavailable state, idempotent read, and bounded delivery batch");
}

function testSqlSecurityContracts() {
  const sql = readFileSync("supabase/migrations/20261016090000_site_monitoring.sql", "utf8");
  for (const table of ["site_visits", "site_login_events", "admin_signup_notifications"]) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
  assert.match(sql, /REVOKE ALL ON TABLE public\.site_visits, public\.site_login_events, public\.admin_signup_notifications FROM PUBLIC, anon, authenticated/);
  for (const fn of ["record_site_visit", "record_site_login", "get_site_monitoring_summary", "claim_signup_notifications", "notify_admin_signup"]) {
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^;]+?FROM PUBLIC, anon, authenticated`, "s"));
  }
  assert.equal((sql.match(/SECURITY DEFINER/g) ?? []).length, (sql.match(/SET search_path = pg_catalog, public/g) ?? []).length);
  assert.match(sql, /UNIQUE \(session_id, visit_date\)/);
  assert.match(sql, /ON CONFLICT \(session_id, visit_date\) DO NOTHING/);
  assert.match(sql, /REFERENCES public\.profiles\(id\) ON DELETE CASCADE UNIQUE/);
  assert.match(sql, /ON CONFLICT \(user_id\) DO NOTHING/);
  assert.match(sql, /monitoring_profile_created AFTER INSERT ON public\.profiles/);
  assert.doesNotMatch(sql, /INSERT INTO public\.admin_signup_notifications[^;]*\bSELECT\b/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /v_today - 89/);
  assert.match(sql, /generate_series\(0, 29\)/);
  assert.match(sql, /count\(DISTINCT visitor_id\)/);
  assert.match(sql, /count\(DISTINCT user_id\) FROM public\.site_login_events/);
  const auth = readFileSync("src/lib/auth/auth-api.server.ts", "utf8");
  assert.ok(auth.indexOf('logAuthStep("login_ok")') < auth.indexOf("await recordSuccessfulServerLogin(user.id)"));
  assert.ok(auth.indexOf('if (!session)') < auth.indexOf("await recordSuccessfulServerLogin(user.id)"));
  console.log("PASS SQL grants/RLS, deduplication, no historical alerts, retention, atomic claims and server-auth ordering");
}

testVisitValidation();
await testBodyAndOrigin();
await testVisitHandler();
await testAdminAuthorization();
await testSummaryAndRead();
testSqlSecurityContracts();
console.log("All monitoring contracts passed (offline).");
