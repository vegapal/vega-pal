import { requireAdminFromRequest } from "@/lib/admin/admin-auth.server";
import { checkServerRateLimit, clientIpFromRequest } from "@/lib/auth/server-rate-limit.server";
import {
  MonitoringRequestError,
  parseMonitoringVisit,
  parseNotificationRead,
  readMonitoringJson,
  requireMonitoringSameOrigin,
} from "./monitoring-validation";
import type { MonitoringSummary } from "./monitoring-types";

type DatabaseResult = { data?: unknown; error: unknown };
export type MonitoringDatabase = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<DatabaseResult>;
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        is: (column: string, value: null) => PromiseLike<DatabaseResult>;
      };
    };
  };
};

type DeliveryConfig = MonitoringSummary["delivery"];
type Dependencies = {
  requireAdmin: (request: Request) => Promise<unknown>;
  getDatabase: () => Promise<MonitoringDatabase>;
  getDeliveryConfig: () => Promise<DeliveryConfig>;
  dispatchNotifications: (limit: number) => Promise<unknown>;
  rateLimit: typeof checkServerRateLimit;
  now: () => Date;
};

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders },
  });
}

function unavailable(now: Date, delivery: DeliveryConfig): MonitoringSummary {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  return {
    available: false,
    since: start.toISOString(),
    uniqueVisitors: 0,
    visits: 0,
    newAccounts: 0,
    signedInUsers: 0,
    logins: 0,
    daily: [],
    notifications: [],
    unreadCount: 0,
    delivery,
  };
}

function hasSummaryShape(data: unknown): data is Omit<MonitoringSummary, "available" | "delivery"> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const row = data as Record<string, unknown>;
  const counts = ["uniqueVisitors", "visits", "newAccounts", "signedInUsers", "logins", "unreadCount"];
  return (
    counts.every((key) => typeof row[key] === "number" && Number.isSafeInteger(row[key]) && (row[key] as number) >= 0) &&
    typeof row.since === "string" && Number.isFinite(Date.parse(row.since)) &&
    Array.isArray(row.daily) && row.daily.length === 30 &&
    Array.isArray(row.notifications) && row.notifications.length <= 50
  );
}

/** Dependency injection keeps request/security tests offline and free of auth mutations. */
export function createMonitoringApiHandler(deps: Dependencies) {
  return async function handle(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    try {
      if (path === "/api/analytics/visit") {
        if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "POST" });
        requireMonitoringSameOrigin(request);
        const ipRate = deps.rateLimit(`monitoring-visit:${clientIpFromRequest(request)}`, 60, 60_000);
        if (!ipRate.allowed) return json({ error: "Too many requests" }, 429, { "retry-after": String(ipRate.retryAfterSec) });
        const visit = parseMonitoringVisit(await readMonitoringJson(request));
        const visitorRate = deps.rateLimit(`monitoring-visitor:${visit.visitorId}`, 20, 60_000);
        if (!visitorRate.allowed) return json({ error: "Too many requests" }, 429, { "retry-after": String(visitorRate.retryAfterSec) });
        try {
          const admin = await deps.getDatabase();
          const { error } = await admin.rpc("record_site_visit", {
            p_visitor_id: visit.visitorId,
            p_session_id: visit.sessionId,
            p_landing_path: visit.path,
            p_source: visit.source,
          });
          if (error) return json({ available: false }, 503);
          return json({ ok: true }, 202);
        } catch {
          return json({ available: false }, 503);
        }
      }

      if (!path.startsWith("/api/admin/monitoring")) return json({ error: "Not found" }, 404);
      // Authorize before importing the service-role client, even for mutations.
      await deps.requireAdmin(request);

      if (path === "/api/admin/monitoring" && request.method === "GET") {
        const delivery = await deps.getDeliveryConfig();
        try {
          const admin = await deps.getDatabase();
          const { data, error } = await admin.rpc("get_site_monitoring_summary");
          if (error || !hasSummaryShape(data)) return json(unavailable(deps.now(), delivery));
          // Explicit fields keep database-internal delivery or auth data out of responses.
          const summary: MonitoringSummary = {
            available: true,
            since: data.since,
            uniqueVisitors: data.uniqueVisitors,
            visits: data.visits,
            newAccounts: data.newAccounts,
            signedInUsers: data.signedInUsers,
            logins: data.logins,
            daily: data.daily,
            notifications: data.notifications,
            unreadCount: data.unreadCount,
            delivery,
          };
          return json(summary);
        } catch {
          return json(unavailable(deps.now(), delivery));
        }
      }

      if (path === "/api/admin/monitoring/read" && request.method === "POST") {
        requireMonitoringSameOrigin(request);
        const id = parseNotificationRead(await readMonitoringJson(request));
        const admin = await deps.getDatabase();
        const { error } = await admin.from("admin_signup_notifications")
          .update({ read_at: deps.now().toISOString() }).eq("id", id).is("read_at", null);
        if (error) return json({ error: "Monitoring is unavailable" }, 503);
        return json({ ok: true });
      }

      if (path === "/api/admin/monitoring/deliver" && request.method === "POST") {
        requireMonitoringSameOrigin(request);
        const body = await readMonitoringJson(request);
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 0) {
          throw new MonitoringRequestError(400, "Empty JSON object required.");
        }
        const rate = deps.rateLimit(`monitoring-delivery:${clientIpFromRequest(request)}`, 3, 60_000);
        if (!rate.allowed) return json({ error: "Too many requests" }, 429, { "retry-after": String(rate.retryAfterSec) });
        return json({ ok: true, result: await deps.dispatchNotifications(5) });
      }

      if (["/api/admin/monitoring", "/api/admin/monitoring/read", "/api/admin/monitoring/deliver"].includes(path)) {
        return json({ error: "Method not allowed" }, 405);
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      if (error instanceof Response) {
        const headers = new Headers(error.headers);
        headers.set("cache-control", "no-store");
        return new Response(error.body, { status: error.status, headers });
      }
      if (error instanceof MonitoringRequestError) return json({ error: error.message }, error.status);
      return json({ error: "Monitoring is unavailable" }, 503);
    }
  };
}

export const handleMonitoringApiRequest = createMonitoringApiHandler({
  requireAdmin: requireAdminFromRequest,
  getDatabase: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin as unknown as MonitoringDatabase;
  },
  getDeliveryConfig: async () => {
    const { getSignupDeliveryConfig } = await import("./notification-delivery.server");
    return getSignupDeliveryConfig();
  },
  dispatchNotifications: async (limit) => {
    const { dispatchSignupNotifications } = await import("./notification-delivery.server");
    return dispatchSignupNotifications(limit);
  },
  rateLimit: checkServerRateLimit,
  now: () => new Date(),
});
