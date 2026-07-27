/**
 * Auth API HTTP tests (JSON responses, no secrets printed).
 * Usage: node scripts/qa-auth-api.mjs [baseUrl]
 */
const base = process.argv[2] ?? "http://localhost:8080";

let fail = 0;

function pass(id, detail = "") {
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function failTest(id, detail = "") {
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
  fail++;
}

async function fetchJson(path, init) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

console.log(`\n=== Auth API QA (${base}) ===\n`);

// Invalid signup input
{
  const { res, json, text } = await fetchJson("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "x", name: "" }),
  });
  if (res.status === 400 && json?.error) pass("signup invalid input", "400 JSON");
  else if (text.includes("<!DOCTYPE")) failTest("signup invalid input", "HTML error page");
  else failTest("signup invalid input", `status ${res.status}`);
}

// Wrong method
{
  const { res, json } = await fetchJson("/api/auth/login", { method: "GET" });
  if (res.status === 404 && json?.error) pass("login GET rejected", "404 JSON");
  else failTest("login GET rejected", String(res.status));
}

// Missing body
{
  const { res, json } = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not-json",
  });
  if (res.status === 400 && json?.error) pass("login invalid json", "400");
  else failTest("login invalid json", String(res.status));
}

// Wrong password (should be 401 JSON, not crash)
{
  const { res, json, text } = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "nobody@vegapal-qa.invalid",
      password: "WrongPassword1!",
    }),
  });
  if ((res.status === 401 || res.status === 400) && json?.error) pass("login wrong password", String(res.status));
  else if (text.includes("FUNCTION_INVOCATION_FAILED")) failTest("login wrong password", "FUNCTION_INVOCATION_FAILED");
  else failTest("login wrong password", `status ${res.status}`);
}

// Session without auth
{
  const { res, json } = await fetchJson("/api/auth/session");
  if (res.status === 401 && json?.error) pass("session unauthenticated", "401");
  else failTest("session unauthenticated", String(res.status));
}

// Unknown auth route
{
  const { res, json, text } = await fetchJson("/api/auth/does-not-exist", { method: "POST" });
  if (res.status === 404 && json?.error) pass("unknown auth route", "404 JSON");
  else if (text.includes("<!DOCTYPE")) failTest("unknown auth route", "HTML");
  else failTest("unknown auth route", String(res.status));
}

// Signup probe (may succeed, 409 duplicate, 403 captcha, or 503 misconfig — must be JSON)
{
  const tag = Date.now();
  const { res, json, text } = await fetchJson("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "QA User",
      email: `qa-api-${tag}@vegapal-qa.invalid`,
      password: "Qa!Test1234",
      confirmPassword: "Qa!Test1234",
    }),
  });
  if (json && typeof json.error === "string") {
    if (res.status === 503) pass("signup service config", "503 JSON (check Vercel Supabase env)");
    else if (res.status === 403) pass("signup captcha gate", "403 JSON");
    else pass("signup error JSON", `status ${res.status}`);
  } else if (res.status === 200 && json?.ok) {
    pass("signup success", json.email);
  } else if (text.includes("FUNCTION_INVOCATION_FAILED")) {
    failTest("signup invocation", "FUNCTION_INVOCATION_FAILED");
  } else {
    failTest("signup response", `status ${res.status}`);
  }
}

console.log(`\nAuth API QA: ${fail} failure(s)`);
process.exit(fail > 0 ? 1 : 0);
