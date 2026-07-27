/** Trim, strip wrapping quotes, remove trailing slashes (Supabase project URL). */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let url = raw.trim().replace(/^["']|["']$/g, "");
  while (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}
