import dns from "node:dns/promises";
import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url.server";

export type SupabaseUrlProbeDebug = {
  envSource: "SUPABASE_URL" | "missing";
  host: string | null;
  protocol: string | null;
  urlValid: boolean;
  urlLength: number;
  hasLeadingOrTrailingWhitespace: boolean;
  hasWrappingQuotes: boolean;
  viteUrlAlsoSet: boolean;
  viteHostMatches: boolean | null;
  dnsResolved: boolean;
  dnsErrorCode: string | null;
};

/** Safe server-side diagnostics for Supabase URL (no keys, no full URL logged). */
export async function probeSupabaseUrlConfig(): Promise<SupabaseUrlProbeDebug> {
  const raw = process.env.SUPABASE_URL;
  const viteRaw = process.env.VITE_SUPABASE_URL;

  const trimmed = normalizeSupabaseUrl(raw);

  const hasLeadingOrTrailingWhitespace =
    typeof raw === "string" && raw.length > 0 && raw.trim() !== raw;
  const hasWrappingQuotes =
    typeof raw === "string" &&
    ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")));

  let host: string | null = null;
  let protocol: string | null = null;
  let urlValid = false;

  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      host = parsed.hostname;
      protocol = parsed.protocol;
      urlValid = protocol === "https:" || protocol === "http:";
    } catch {
      urlValid = false;
    }
  }

  let viteHost: string | null = null;
  if (viteRaw?.trim()) {
    try {
      viteHost = new URL(viteRaw.trim().replace(/^["']|["']$/g, "")).hostname;
    } catch {
      viteHost = null;
    }
  }

  let dnsResolved = false;
  let dnsErrorCode: string | null = null;
  if (host) {
    try {
      await dns.lookup(host);
      dnsResolved = true;
    } catch (err) {
      dnsResolved = false;
      const code = (err as NodeJS.ErrnoException).code;
      dnsErrorCode = typeof code === "string" ? code : "lookup_failed";
    }
  }

  return {
    envSource: trimmed ? "SUPABASE_URL" : "missing",
    host,
    protocol,
    urlValid,
    urlLength: typeof raw === "string" ? raw.length : 0,
    hasLeadingOrTrailingWhitespace,
    hasWrappingQuotes,
    viteUrlAlsoSet: Boolean(viteRaw?.trim()),
    viteHostMatches: host && viteHost ? host === viteHost : null,
    dnsResolved,
    dnsErrorCode,
  };
}

/** REST path the Supabase client uses for the profiles head probe (no secrets). */
export function describeProfilesProbeTarget(host: string | null): string | null {
  if (!host) return null;
  return `https://${host}/rest/v1/profiles (HEAD count probe)`;
}
