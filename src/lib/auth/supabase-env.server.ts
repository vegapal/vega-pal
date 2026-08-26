import { normalizeSupabaseUrl } from "@/lib/supabase/normalize-url.server";

export function getSupabaseServerUrl(): string | undefined {
  const raw = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const normalized = normalizeSupabaseUrl(raw);
  return normalized || undefined;
}

export function getSupabasePublishableKey(): string | undefined {
  const raw =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!raw) return undefined;
  return raw.replace(/^["']|["']$/g, "").trim() || undefined;
}

export function getMissingSupabaseServerEnv(): string[] {
  const missing: string[] = [];
  if (!getSupabaseServerUrl()) missing.push("SUPABASE_URL");
  if (!getSupabasePublishableKey()) missing.push("SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

/** Safe hostname for logs/health (never logs keys). */
export function getSupabaseServerHost(): string | null {
  const url = getSupabaseServerUrl();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function requireSupabaseServerEnv(): { url: string; publishableKey: string } {
  const url = getSupabaseServerUrl();
  const publishableKey = getSupabasePublishableKey();
  const missing = getMissingSupabaseServerEnv();
  if (!url || !publishableKey || missing.length > 0) {
    console.error(`[supabase-env] Missing environment variable(s): ${missing.join(", ")}`);
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }
  return { url, publishableKey };
}
