export function getSupabaseServerUrl(): string | undefined {
  return process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
}

export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
}

export function getMissingSupabaseServerEnv(): string[] {
  const missing: string[] = [];
  if (!getSupabaseServerUrl()) missing.push("SUPABASE_URL");
  if (!getSupabasePublishableKey()) missing.push("SUPABASE_PUBLISHABLE_KEY");
  return missing;
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
