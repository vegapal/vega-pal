import assert from "node:assert/strict";
import { verifyTurnstileToken } from "../src/lib/turnstile/verify.server.ts";
import { handleAuthApiRequest } from "../src/lib/auth/auth-api.server.ts";

const ORIGINAL_FETCH = globalThis.fetch;

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

async function testMissingTokenReturns403OnProductionHost() {
  process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
  let siteverifyCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("siteverify")) {
      siteverifyCalls++;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const request = new Request("https://vega-pal.com/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "vega-pal.com",
    },
    body: JSON.stringify({
      name: "Test User",
      email: "turnstile-test@vegapal-qa.invalid",
      password: "Qa!Test1234",
      confirmPassword: "Qa!Test1234",
    }),
  });

  const response = await handleAuthApiRequest(request);
  const json = (await response.json()) as { error?: string };
  assert.equal(response.status, 403);
  assert.equal(json.error, "captcha_verification_failed");
  assert.equal(siteverifyCalls, 0, "missing token must not call siteverify");
  restoreFetch();
}

async function testFailedSiteverifyCallsOnceAndReturns403() {
  process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
  let siteverifyCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("siteverify")) {
      siteverifyCalls++;
      const body = typeof init?.body === "string" ? init.body : "";
      assert.ok(body.includes("secret="), "secret must be sent to siteverify");
      assert.ok(body.includes("response=reused-token"), "token must be sent to siteverify");
      return new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["invalid-input-response"],
          hostname: "vega-pal.com",
          action: "signup",
        }),
        { status: 200 },
      );
    }
    throw new Error(`unexpected fetch (supabase should not be called): ${url}`);
  };

  const request = new Request("https://vega-pal.com/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "vega-pal.com",
    },
    body: JSON.stringify({
      name: "Test User",
      email: "turnstile-test2@vegapal-qa.invalid",
      password: "Qa!Test1234",
      confirmPassword: "Qa!Test1234",
      turnstileToken: "reused-token",
    }),
  });

  const response = await handleAuthApiRequest(request);
  const json = (await response.json()) as { error?: string };
  assert.equal(response.status, 403);
  assert.equal(json.error, "captcha_verification_failed");
  assert.equal(siteverifyCalls, 1, "siteverify must run exactly once");
  restoreFetch();
}

async function testSuccessfulSiteverifyOnce() {
  let siteverifyCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("siteverify")) {
      siteverifyCalls++;
      return new Response(
        JSON.stringify({ success: true, hostname: "vega-pal.com", action: "signup" }),
        { status: 200 },
      );
    }
    return ORIGINAL_FETCH(input, init);
  };

  const result = await verifyTurnstileToken(
    "valid-token",
    { host: "vega-pal.com" },
    { getSecret: () => "test-secret-key" },
  );
  assert.equal(result.success, true);
  assert.equal(siteverifyCalls, 1);
  restoreFetch();
}

async function testRetryRequiresNewTokenAfterFailure() {
  let siteverifyCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("siteverify")) {
      siteverifyCalls++;
      return new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }), {
        status: 200,
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const token = "single-use-token";
  const first = await verifyTurnstileToken(token, { host: "vega-pal.com" }, { getSecret: () => "secret" });
  const second = await verifyTurnstileToken(token, { host: "vega-pal.com" }, { getSecret: () => "secret" });
  assert.equal(first.success, false);
  assert.equal(second.success, false);
  assert.equal(siteverifyCalls, 2, "each attempt verifies independently; client must reset widget for new token");
  restoreFetch();
}

async function main() {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";

  await testMissingTokenReturns403OnProductionHost();
  await testFailedSiteverifyCallsOnceAndReturns403();
  await testSuccessfulSiteverifyOnce();
  await testRetryRequiresNewTokenAfterFailure();
  console.log("Turnstile verify harness: all tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
