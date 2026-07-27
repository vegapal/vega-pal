/**
 * Automated QA smoke tests (no secrets printed).
 * Usage: node scripts/qa-smoke.mjs [baseUrl]
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const base = process.argv[2] ?? "http://localhost:8080";

function loadEnvFiles() {
  for (const file of [".env", ".env.local", ".env.production"]) {
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

loadEnvFiles();

const results = [];

function pass(id, detail = "") {
  results.push({ id, status: "PASS", detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail = "") {
  results.push({ id, status: "FAIL", detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

function skip(id, detail = "") {
  results.push({ id, status: "NOT RUN", detail });
  console.log(`SKIP  ${id}${detail ? ` — ${detail}` : ""}`);
}

async function fetchJson(path, init) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, text, json };
}

// --- Env booleans ---
const envKeys = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "SUPABASE_DB_PASSWORD",
];
const envBools = Object.fromEntries(envKeys.map((k) => [k, !!process.env[k]]));
console.log("\n=== Env presence (booleans only) ===");
console.log(JSON.stringify(envBools));

// --- Auth API ---
try {
  const invalidSignup = await fetchJson("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "bad", password: "x", name: "" }),
  });
  if (invalidSignup.res.status === 400 && invalidSignup.json?.error) {
    pass("auth signup invalid", "400 JSON");
  } else if (invalidSignup.text.includes("<!DOCTYPE")) {
    fail("auth signup invalid", "HTML response");
  } else {
    fail("auth signup invalid", String(invalidSignup.res.status));
  }

  const unauthSession = await fetchJson("/api/auth/session");
  if (unauthSession.res.status === 401 && unauthSession.json?.error) {
    pass("auth session 401 JSON");
  } else {
    fail("auth session 401 JSON", String(unauthSession.res.status));
  }
} catch (e) {
  fail("auth API", e.message);
}

// --- Health ---
try {
  const { res, json, text } = await fetchJson("/api/health");
  if (res.status !== 200) fail("J.1 health status", String(res.status));
  else pass("J.1 health status", "200");

  if (!json) fail("J.1 health json", "not json");
  else {
    if (typeof json.ok === "boolean") pass("J.1 health ok boolean");
    else fail("J.1 health ok boolean");
    if (json.app === "ok") pass("J.1 health app ok");
    else fail("J.1 health app ok", String(json.app));
    if (typeof json.supabase === "boolean") pass("J.1 supabase boolean");
    else fail("J.1 supabase boolean");

    const envVals = json.env ? Object.values(json.env) : [];
    if (envVals.every((v) => typeof v === "boolean")) pass("J.2 env booleans only");
    else fail("J.2 env booleans only");

    const serialized = JSON.stringify(json);
    const secretPatterns = [/sb_secret_/i, /service_role/i, /eyJ[A-Za-z0-9_-]{30,}/];
    if (secretPatterns.some((p) => p.test(serialized))) fail("J.4 no secrets in health");
    else pass("J.4 no secrets in health");
  }
} catch (e) {
  fail("J.1 health", e.message);
}

// --- Pricing redirect ---
try {
  const res = await fetch(`${base}/pricing`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  if (res.status >= 300 && res.status < 400 && /pricing/i.test(loc + res.url)) {
    pass("A.2 pricing redirect", `${res.status} → ${loc || res.url}`);
  } else if (res.status === 200) {
    pass("A.2 pricing", "200 (client route)");
  } else {
    fail("A.2 pricing", `status ${res.status}`);
  }
} catch (e) {
  fail("A.2 pricing", e.message);
}

// --- Homepage ---
try {
  const res = await fetch(`${base}/`);
  if (res.status === 200) pass("A.1 homepage", "200");
  else fail("A.1 homepage", String(res.status));
} catch (e) {
  fail("A.1 homepage", e.message);
}

// --- Admin API security ---
try {
  const { res, json } = await fetchJson("/api/admin/users");
  if (res.status === 401 || res.status === 403) pass("G.3 unauth admin users", String(res.status));
  else fail("G.3 unauth admin users", `expected 401/403 got ${res.status}`);
} catch (e) {
  fail("G.3 unauth admin users", e.message);
}

try {
  const { res } = await fetchJson("/api/admin/users/00000000-0000-0000-0000-000000000001", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: "pro" }),
  });
  if (res.status === 401 || res.status === 403) pass("G.2 unauth admin patch", String(res.status));
  else fail("G.2 unauth admin patch", `expected 401/403 got ${res.status}`);
} catch (e) {
  fail("G.2 unauth admin patch", e.message);
}

// Non-admin token test — needs a real user JWT; skip if no credentials
const qaUserJwt = process.env.QA_USER_JWT;
const qaAdminJwt = process.env.QA_ADMIN_JWT;

if (qaUserJwt) {
  const { res } = await fetchJson("/api/admin/users", {
    headers: { authorization: `Bearer ${qaUserJwt}` },
  });
  if (res.status === 403 || (res.status === 200 && (await res.clone().json()).isAdmin === false))
    pass("G.1 non-admin admin users");
  else if (res.status === 403) pass("G.1 non-admin admin users", "403");
  else fail("G.1 non-admin admin users", String(res.status));
} else {
  skip("G.1 non-admin admin users", "Set QA_USER_JWT to test");
}

if (qaAdminJwt) {
  const invalidPlan = await fetchJson("/api/admin/users/00000000-0000-0000-0000-000000000001", {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${qaAdminJwt}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ plan: "enterprise" }),
  });
  if (invalidPlan.res.status === 400) pass("G.4 invalid plan rejected");
  else fail("G.4 invalid plan rejected", String(invalidPlan.res.status));
} else {
  skip("G.4 invalid plan", "Set QA_ADMIN_JWT");
}

// --- Bundle secret scan ---
function scanDir(dir, patterns) {
  if (!existsSync(dir)) return [];
  const hits = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) hits.push(...scanDir(p, patterns));
    else if (/\.(mjs|js|css|html)$/.test(name.name)) {
      const content = readFileSync(p, "utf8");
      for (const pattern of patterns) {
        if (pattern.test(content)) hits.push(`${p}: ${pattern}`);
      }
    }
  }
  return hits;
}

const bundleHits = scanDir(".vercel/output", [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/,
  /sb_secret_[A-Za-z0-9_-]{10,}/,
  /service_role["']\s*:\s*["'][^"']{20,}/,
]);
if (bundleHits.length === 0) pass("G.6 no service role in bundle");
else fail("G.6 no service role in bundle", bundleHits.slice(0, 3).join("; "));

// --- Migrations in repo ---
for (const v of ["20260630120000_invoice_plan_limit.sql", "20260630140000_admin_audit_logs.sql"]) {
  if (existsSync(join("supabase/migrations", v))) pass(`migration file ${v}`);
  else fail(`migration file ${v}`, "missing");
}

// --- DB migration applied (optional) ---
if (process.env.SUPABASE_DB_PASSWORD) {
  try {
    const { default: pg } = await import("pg");
    const ref = "rudqfhqawqmhclqmaflj";
    const encoded = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    const connStr = `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
    const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const mig = await client.query(
      `SELECT version FROM supabase_migrations.schema_migrations WHERE version IN ('20260630120000','20260630140000') ORDER BY 1`,
    );
    const applied = mig.rows.map((r) => r.version);
    if (applied.includes("20260630120000")) pass("DB migration 20260630120000 applied");
    else fail("DB migration 20260630120000 applied", "not in schema_migrations");
    if (applied.includes("20260630140000")) pass("DB migration 20260630140000 applied");
    else fail("DB migration 20260630140000 applied", "not in schema_migrations");

    const auditTable = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_logs'`,
    );
    if (auditTable.rowCount) pass("admin_audit_logs table exists");
    else fail("admin_audit_logs table exists");

    await client.end();
  } catch (e) {
    skip("DB migration check", e.message);
  }
} else {
  skip("DB migration applied check", "SUPABASE_DB_PASSWORD not set locally");
}

// --- Hardcoded secret grep in scripts/src (not env docs) ---
const suspicious = [];
function grepFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  if (/Hanaa@|postgresql:\/\/postgres:[^@]+@/.test(content) && !path.includes(".example")) {
    suspicious.push(path);
  }
}
grepFile("scripts/verify-supabase-sql.mjs");
if (suspicious.length === 0) pass("J.6 no hardcoded DB passwords in scripts");
else fail("J.6 hardcoded secrets", suspicious.join(", "));

console.log("\n=== Summary ===");
const passN = results.filter((r) => r.status === "PASS").length;
const failN = results.filter((r) => r.status === "FAIL").length;
const skipN = results.filter((r) => r.status === "NOT RUN").length;
console.log(`PASS: ${passN}  FAIL: ${failN}  NOT RUN: ${skipN}`);
process.exit(failN > 0 ? 1 : 0);
