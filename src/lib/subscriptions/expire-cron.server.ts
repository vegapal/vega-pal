import { expireDueSubscriptions } from "@/lib/subscriptions/subscription.service.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Protected cron endpoint for expiring due subscriptions.
 * Authorize with CRON_SECRET (Authorization: Bearer <secret> or x-cron-secret).
 */
export async function handleSubscriptionsExpireCron(request: Request): Promise<Response> {
  if (request.method !== "POST" && request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return json({ error: "Cron is not configured." }, 503);
  }

  const auth = request.headers.get("authorization") ?? "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (bearer !== secret && headerSecret !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expired = await expireDueSubscriptions(supabaseAdmin);
    return json({ ok: true, expired });
  } catch (err) {
    console.error("[cron] expire subscriptions failed", err);
    return json({ error: "Could not expire subscriptions." }, 500);
  }
}
