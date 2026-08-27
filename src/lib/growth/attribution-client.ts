/**
 * Client-side growth attribution capture.
 * Persists only non-sensitive ref/UTM fields (no PII).
 */
import { SITE_ORIGIN } from "@/lib/seo/site";

export const GROWTH_REF_KEY = "vegapal_ref_code";
export const GROWTH_UTM_KEY = "vegapal_utm";
export const GROWTH_LANDING_KEY = "vegapal_landing_path";
export const GROWTH_REF_TS_KEY = "vegapal_ref_ts";

/** 30-day attribution window */
export const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type GrowthUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function sanitizeCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,24}$/.test(code)) return null;
  return code;
}

function sanitizePath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
    if (!path.startsWith("/")) return null;
    if (path.startsWith("/dashboard") || path.startsWith("/admin") || path.startsWith("/api")) {
      return "/";
    }
    return path.slice(0, 200);
  } catch {
    return null;
  }
}

function sanitizeUtmValue(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().slice(0, 120);
  return v || undefined;
}

export function captureGrowthParamsFromUrl(search: string, pathname: string): void {
  if (!isBrowser()) return;
  try {
    const params = new URLSearchParams(search);
    const ref = sanitizeCode(params.get("ref"));
    if (ref) {
      window.localStorage.setItem(GROWTH_REF_KEY, ref);
      window.localStorage.setItem(GROWTH_REF_TS_KEY, String(Date.now()));
    }

    const utm: GrowthUtm = {
      source: sanitizeUtmValue(params.get("utm_source")),
      medium: sanitizeUtmValue(params.get("utm_medium")),
      campaign: sanitizeUtmValue(params.get("utm_campaign")),
      term: sanitizeUtmValue(params.get("utm_term")),
      content: sanitizeUtmValue(params.get("utm_content")),
    };
    if (Object.values(utm).some(Boolean)) {
      const existing = readStoredUtm();
      // First-touch: only write if empty
      if (!existing || !Object.values(existing).some(Boolean)) {
        window.localStorage.setItem(GROWTH_UTM_KEY, JSON.stringify(utm));
      }
    }

    if (!window.localStorage.getItem(GROWTH_LANDING_KEY)) {
      const landing = sanitizePath(pathname);
      if (landing) window.localStorage.setItem(GROWTH_LANDING_KEY, landing);
    }
  } catch {
    /* private mode */
  }
}

export function readStoredReferralCode(): string | null {
  if (!isBrowser()) return null;
  try {
    const code = sanitizeCode(window.localStorage.getItem(GROWTH_REF_KEY));
    const ts = Number(window.localStorage.getItem(GROWTH_REF_TS_KEY) || "0");
    if (!code) return null;
    if (ts && Date.now() - ts > ATTRIBUTION_WINDOW_MS) {
      window.localStorage.removeItem(GROWTH_REF_KEY);
      window.localStorage.removeItem(GROWTH_REF_TS_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function readStoredUtm(): GrowthUtm | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(GROWTH_UTM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GrowthUtm;
  } catch {
    return null;
  }
}

export function readStoredLandingPath(): string | null {
  if (!isBrowser()) return null;
  try {
    return sanitizePath(window.localStorage.getItem(GROWTH_LANDING_KEY));
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(GROWTH_REF_KEY);
    window.localStorage.removeItem(GROWTH_REF_TS_KEY);
  } catch {
    /* ignore */
  }
}

export function buildReferralLink(code: string, opts?: { source?: string; medium?: string }): string {
  const safe = sanitizeCode(code) ?? code.toUpperCase();
  const url = new URL(SITE_ORIGIN);
  url.searchParams.set("ref", safe);
  if (opts?.source) url.searchParams.set("utm_source", opts.source);
  if (opts?.medium) url.searchParams.set("utm_medium", opts.medium);
  return url.toString();
}
