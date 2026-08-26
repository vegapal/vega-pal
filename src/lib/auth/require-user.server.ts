import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export type UserAuthContext = {
  userId: string;
  email: string | null;
};

/** Authenticated end-user from Bearer access token (not admin-gated). */
export async function requireUserFromRequest(request: Request): Promise<UserAuthContext> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Please sign in to continue." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) {
    throw new Response(JSON.stringify({ error: "Please sign in to continue." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Response(JSON.stringify({ error: "Please sign in to continue." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const userId = String(data.claims.sub);
  const email =
    typeof data.claims.email === "string" ? data.claims.email : null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_disabled")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_disabled) {
    throw new Response(JSON.stringify({ error: "This account is disabled." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  return { userId, email };
}
