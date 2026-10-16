import assert from "node:assert/strict";
import {
  getSignupDeliveryConfig,
  dispatchSignupNotifications,
  sendSignupNotification,
} from "../src/lib/monitoring/notification-delivery.server";

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  created_at: "2026-10-16T00:00:00Z",
  delivery_attempts: 1,
};
const envKeys = [
  "SIGNUP_NOTIFICATION_CHANNEL",
  "RESEND_API_KEY",
  "SIGNUP_NOTIFICATION_EMAIL_TO",
  "SIGNUP_NOTIFICATION_EMAIL_FROM",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
];
const old = new Map(envKeys.map((key) => [key, process.env[key]]));
try {
  for (const key of envKeys) delete process.env[key];
  assert.deepEqual(getSignupDeliveryConfig(), { configured: false, channel: null });
  assert.deepEqual(await dispatchSignupNotifications(), {
    configured: false,
    claimed: 0,
    sent: 0,
    failed: 0,
  });
  process.env.SIGNUP_NOTIFICATION_CHANNEL = "email";
  process.env.RESEND_API_KEY = "test-only-key";
  process.env.SIGNUP_NOTIFICATION_EMAIL_TO = "owner@example.test";
  assert.equal(getSignupDeliveryConfig().configured, false);
  process.env.SIGNUP_NOTIFICATION_EMAIL_FROM = "VegaPal <alerts@example.test>";
  assert.deepEqual(getSignupDeliveryConfig(), { configured: true, channel: "email" });
  process.env.SIGNUP_NOTIFICATION_EMAIL_TO = "owner@example.test\r\nBcc: another@example.test";
  assert.equal(getSignupDeliveryConfig().configured, false);
  process.env.SIGNUP_NOTIFICATION_CHANNEL = "telegram";
  process.env.TELEGRAM_BOT_TOKEN = "test-only-token";
  process.env.TELEGRAM_CHAT_ID = "@unverified-name";
  assert.equal(getSignupDeliveryConfig().configured, false);
  process.env.TELEGRAM_CHAT_ID = "-12345";
  assert.deepEqual(getSignupDeliveryConfig(), { configured: true, channel: "telegram" });

  const email = {
    channel: "email" as const,
    key: "test-only-key",
    to: "owner@example.test",
    from: "alerts@example.test",
  };
  const captures: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch: typeof fetch = async (url, init) => {
    captures.push({ url: String(url), init: init! });
    return new Response("{}", { status: 200 });
  };
  assert.equal(await sendSignupNotification(email, row, fakeFetch), null);
  assert.equal(await sendSignupNotification(email, row, fakeFetch), null);
  assert.equal(captures[0].url, "https://api.resend.com/emails");
  assert.equal(
    new Headers(captures[0].init.headers).get("idempotency-key"),
    new Headers(captures[1].init.headers).get("idempotency-key"),
  );
  const payload = JSON.parse(String(captures[0].init.body));
  assert.deepEqual(Object.keys(payload).sort(), ["from", "subject", "text", "to"]);
  assert.ok(payload.text.includes("https://vega-pal.com/admin"));
  assert.ok(
    !payload.text.includes(email.to) &&
      !payload.text.includes(email.key) &&
      !payload.text.includes(row.id),
  );
  assert.ok(captures[0].init.signal instanceof AbortSignal);
  assert.equal(
    await sendSignupNotification(
      email,
      row,
      async () => new Response("sensitive provider error body", { status: 429 }),
    ),
    "provider_http_429",
  );
  const telegram = { channel: "telegram" as const, token: "test-only-token", chatId: "-12345" };
  assert.equal(
    await sendSignupNotification(telegram, row, async () => Response.json({ ok: true })),
    null,
  );
  assert.equal(
    await sendSignupNotification(telegram, row, async () => Response.json({ ok: false })),
    "provider_rejected",
  );
  assert.equal(
    await sendSignupNotification(telegram, row, async () => {
      throw new Error("URL may contain test-only-token");
    }),
    "provider_unreachable",
  );
  console.log(
    "PASS notification delivery: disabled/partial configuration, header safety, generic payloads, email idempotency, provider errors and credential redaction (offline)",
  );
} finally {
  for (const [key, value] of old) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
