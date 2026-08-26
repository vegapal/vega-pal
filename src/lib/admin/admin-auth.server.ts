import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseServerEnv } from "@/lib/auth/supabase-env.server";

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

function createUserScopedClient(accessToken: string) {
  const { url, publishableKey } = requireSupabaseServerEnv();
  return createClient<Database>(url, publishableKey, {
    global: {
      fetch: createSupabaseFetch(publishableKey),
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminAuthContext = {
  userId: string;
};

export async function requireAdminFromRequest(request: Request): Promise<AdminAuthContext> {
  let serverEnv: ReturnType<typeof requireSupabaseServerEnv>;
  try {
    serverEnv = requireSupabaseServerEnv();
  } catch {
    throw new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient<Database>(serverEnv.url, serverEnv.publishableKey, {
    global: {
      fetch: createSupabaseFetch(serverEnv.publishableKey),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const userId = data.claims.sub;
  const userClient = createUserScopedClient(token);

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("role, is_disabled")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin" || profile.is_disabled) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  return { userId };
}
