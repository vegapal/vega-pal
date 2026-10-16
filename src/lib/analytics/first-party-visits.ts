import { isPublicSitemapPath } from "@/lib/seo/sitemap-urls";
import type { MonitoringVisit, VisitSource } from "@/lib/monitoring/monitoring-types";

const VISITOR_KEY = "vegapal.monitoring.visitor.v1";
const SESSION_KEY = "vegapal.monitoring.session.v1";
const TRACKED_DAY_KEY = "vegapal.monitoring.day.v1";
const VISITOR_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pendingVisits = new Set<string>();
const recordedVisits = new Set<string>();

function privacyOptOut(): boolean {
  const browser = navigator as Navigator & { globalPrivacyControl?: boolean };
  const legacyWindow = window as Window & { doNotTrack?: string };
  return (
    browser.globalPrivacyControl === true ||
    browser.doNotTrack === "1" ||
    browser.doNotTrack === "yes" ||
    legacyWindow.doNotTrack === "1"
  );
}

/** Categorize locally. The referrer URL is never sent or retained. */
function visitSource(): VisitSource {
  try {
    if (!document.referrer) return "direct";
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return "direct";
    const host = referrer.hostname.toLowerCase();
    if (
      /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host) ||
      /(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com|search\.brave\.com|ecosia\.org|baidu\.com|yandex\.(com|ru))$/.test(
        host,
      )
    ) {
      return "search";
    }
    return "referral";
  } catch {
    return "direct";
  }
}

/**
 * Record at most one public-site visit per browser session and UTC day.
 * Unavailable storage or a privacy opt-out skips collection. Failed requests
 * remain unmarked so the next public navigation can retry, without a retry loop.
 */
export async function recordFirstPartyVisit(pathname: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (privacyOptOut()) {
    try {
      localStorage.removeItem(VISITOR_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TRACKED_DAY_KEY);
    } catch {
      /* Storage may be disabled. */
    }
    return;
  }
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!isPublicSitemapPath(path) || typeof crypto.randomUUID !== "function") return;

  let visit: MonitoringVisit;
  let visitKey: string;
  const day = new Date().toISOString().slice(0, 10);
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId || !UUID_PATTERN.test(sessionId)) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    visitKey = `${sessionId}:${day}`;
    if (
      sessionStorage.getItem(TRACKED_DAY_KEY) === visitKey ||
      recordedVisits.has(visitKey) ||
      pendingVisits.has(visitKey)
    )
      return;

    let stored: { id?: unknown; expiresAt?: unknown } | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? "null");
    } catch {
      /* Replace invalid data. */
    }
    const now = Date.now();
    const validVisitor =
      typeof stored?.id === "string" &&
      UUID_PATTERN.test(stored.id) &&
      typeof stored.expiresAt === "number" &&
      stored.expiresAt > now &&
      stored.expiresAt <= now + VISITOR_LIFETIME_MS;
    const visitorId = validVisitor ? (stored!.id as string) : crypto.randomUUID();
    if (!validVisitor) {
      localStorage.setItem(
        VISITOR_KEY,
        JSON.stringify({ id: visitorId, expiresAt: now + VISITOR_LIFETIME_MS }),
      );
    }
    visit = { visitorId, sessionId, path, source: visitSource() };
  } catch {
    return;
  }

  pendingVisits.add(visitKey);
  try {
    const response = await fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(visit),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
    });
    if (response.ok) {
      recordedVisits.add(visitKey);
      try {
        sessionStorage.setItem(TRACKED_DAY_KEY, visitKey);
      } catch {
        /* Memory still prevents duplicate requests. */
      }
    }
  } catch {
    // Best effort: analytics must never interfere with a public page.
  } finally {
    pendingVisits.delete(visitKey);
  }
}
