import type { SupabaseClient } from "@supabase/supabase-js";

type Channel = "email" | "telegram";
type DeliveryConfig =
  | { channel: "email"; key: string; to: string; from: string }
  | { channel: "telegram"; token: string; chatId: string };
type ClaimedNotification = { id: string; created_at: string; delivery_attempts: number };

function deliveryConfig(): DeliveryConfig | null {
  const channel = process.env.SIGNUP_NOTIFICATION_CHANNEL?.trim();
  if (channel === "email") {
    const key = process.env.RESEND_API_KEY?.trim();
    const to = process.env.SIGNUP_NOTIFICATION_EMAIL_TO?.trim();
    const from = process.env.SIGNUP_NOTIFICATION_EMAIL_FROM?.trim();
    if (key && to && from && !/[\r\n]/.test(to + from)) return { channel, key, to, from };
  }
  if (channel === "telegram") {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (token && /^-?\d+$/.test(chatId ?? "")) return { channel, token, chatId: chatId! };
  }
  return null;
}

/** This is the only notification configuration exposed to the admin browser. */
export function getSignupDeliveryConfig(): { configured: boolean; channel: Channel | null } {
  const config = deliveryConfig();
  return { configured: config !== null, channel: config?.channel ?? null };
}

/** Generic owner alert: account email, name, IP and credentials never leave VegaPal. */
export function signupNotificationText(createdAt: string): string {
  return `A new account registered on VegaPal at ${createdAt}.\nView your private signup inbox: https://vega-pal.com/admin`;
}

export async function sendSignupNotification(
  config: DeliveryConfig,
  row: ClaimedNotification,
  fetchImpl: typeof fetch = fetch,
  parentSignal?: AbortSignal,
): Promise<string | null> {
  const text = signupNotificationText(row.created_at);
  const signal = parentSignal
    ? AbortSignal.any([parentSignal, AbortSignal.timeout(4_000)])
    : AbortSignal.timeout(4_000);
  try {
    const response =
      config.channel === "email"
        ? await fetchImpl("https://api.resend.com/emails", {
            method: "POST",
            signal,
            headers: {
              authorization: `Bearer ${config.key}`,
              "content-type": "application/json",
              "idempotency-key": `vegapal-signup-${row.id}`,
            },
            body: JSON.stringify({
              from: config.from,
              to: [config.to],
              subject: "New VegaPal account",
              text,
            }),
          })
        : await fetchImpl(`https://api.telegram.org/bot${config.token}/sendMessage`, {
            method: "POST",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chat_id: config.chatId,
              text,
              link_preview_options: { is_disabled: true },
            }),
          });
    if (!response.ok) return `provider_http_${response.status}`;
    if (config.channel === "telegram") {
      const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!payload?.ok) return "provider_rejected";
    }
    return null;
  } catch {
    // Do not log errors containing provider URLs: Telegram URLs contain its bot credential.
    return "provider_unreachable";
  }
}

/** Atomic database claims prevent parallel requests from sending the same queued row. */
export async function dispatchSignupNotifications(limit = 1): Promise<{
  configured: boolean;
  claimed: number;
  sent: number;
  failed: number;
}> {
  const config = deliveryConfig();
  const result = { configured: config !== null, claimed: 0, sent: 0, failed: 0 };
  if (!config) return result;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Newly migrated service-only tables are not yet in the generated database types.
    const db = supabaseAdmin as unknown as SupabaseClient;
    // This bound covers database claims, provider calls and acknowledgement.
    const signal = AbortSignal.timeout(6_000);
    const { data, error } = await db
      .rpc("claim_signup_notifications", {
        p_limit: Math.min(5, Math.max(1, Math.trunc(limit))),
      })
      .abortSignal(signal);
    if (error) {
      console.warn("[signup-notifications] queue unavailable");
      return result;
    }
    const rows = (data ?? []) as ClaimedNotification[];
    result.claimed = rows.length;
    // A bounded batch shares one overall deadline and runs in parallel.
    await Promise.all(
      rows.map(async (row) => {
        const failure = await sendSignupNotification(config, row, fetch, signal);
        const delayMinutes = Math.min(1_440, 2 ** Math.min(10, row.delivery_attempts || 1));
        const { error: updateError } = await db
          .from("admin_signup_notifications")
          .update({
            delivery_status: failure ? "pending" : "sent",
            delivery_sent_at: failure ? null : new Date().toISOString(),
            delivery_next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
            delivery_last_error: failure,
            delivery_claimed_at: null,
          })
          .eq("id", row.id)
          .eq("delivery_status", "processing")
          .abortSignal(signal);
        if (failure || updateError) result.failed += 1;
        else result.sent += 1;
      }),
    );
  } catch {
    console.warn("[signup-notifications] delivery unavailable");
  }
  return result;
}
