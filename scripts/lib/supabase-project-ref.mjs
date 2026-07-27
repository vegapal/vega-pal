/**
 * Resolve Supabase project ref from env (no hardcoded project IDs).
 * Usage: node -e "import('./scripts/lib/supabase-project-ref.mjs').then(m => console.log(m.resolveSupabaseProjectRef()))"
 */

function trimQuotes(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

/**
 * @returns {string} project ref (subdomain), e.g. "abcdefghijklmnop"
 */
export function resolveSupabaseProjectRef() {
  const explicit = process.env.SUPABASE_PROJECT_REF;
  if (explicit?.trim()) {
    return trimQuotes(explicit);
  }

  for (const key of ["SUPABASE_URL", "VITE_SUPABASE_URL"]) {
    const raw = process.env[key];
    if (!raw?.trim()) continue;
    const url = trimQuotes(raw);
    try {
      const host = new URL(url).hostname;
      const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
      if (match) return match[1];
    } catch {
      /* try next */
    }
  }

  throw new Error(
    "Set SUPABASE_PROJECT_REF or SUPABASE_URL (https://<ref>.supabase.co) in the environment.",
  );
}

export function resolveSupabaseDbHosts(ref) {
  return {
    directHost: `db.${ref}.supabase.co`,
    poolerHostEnv: process.env.SUPABASE_DB_POOLER_HOST?.trim() || null,
  };
}
