import { safeNetworkErrorFields } from "@/lib/health/network-error-log.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleHealthCheckRequest(): Promise<Response> {
  const env = {
    supabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    supabasePublishableKey: !!(
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ),
    supabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    turnstileSecretKey: !!process.env.TURNSTILE_SECRET_KEY,
    turnstileSiteKey: !!(process.env.VITE_TURNSTILE_SITE_KEY),
  };

  const { probeSupabaseUrlConfig, describeProfilesProbeTarget } = await import(
    "@/lib/health/supabase-url-probe.server"
  );
  const urlDebug = await probeSupabaseUrlConfig();
  const probeTarget = describeProfilesProbeTarget(urlDebug.host);
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (!isProduction) {
    console.error("[health] supabase url debug (temporary)", {
      ...urlDebug,
      profilesProbeTarget: probeTarget,
      serviceRoleKeyDefined: env.supabaseServiceRoleKey,
    });
  }

  let supabaseReachable = false;
  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (error) {
        const wrapped = new Error(error.message);
        console.error("[health] supabase profiles probe failed", {
          postgrestCode: error.code,
          postgrestDetails: error.details,
          postgrestHint: error.hint,
          ...safeNetworkErrorFields(wrapped),
        });
        supabaseReachable = false;
      } else {
        supabaseReachable = true;
      }
    } catch (probeError) {
      console.error("[health] supabase client init or probe failed", {
        ...safeNetworkErrorFields(probeError),
        profilesProbeTarget: probeTarget,
        dnsResolved: urlDebug.dnsResolved,
        dnsErrorCode: urlDebug.dnsErrorCode,
      });
      supabaseReachable = false;
    }
  } else {
    const missing = [
      ...(!env.supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!env.supabaseServiceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    if (missing.length > 0) {
      console.error(`[health] missing env for supabase probe: ${missing.join(", ")}`);
    }
  }

  const requiredEnvOk = Object.values(env).every(Boolean);

  // Production: minimal public payload (no host/DNS/env booleans — reconnaissance aid).
  if (isProduction) {
    return json({
      ok: requiredEnvOk && supabaseReachable,
    });
  }

  return json({
    ok: requiredEnvOk && supabaseReachable,
    app: "ok",
    supabase: supabaseReachable,
    env,
    supabaseHost: urlDebug.host,
    supabaseDnsResolved: urlDebug.dnsResolved,
    supabaseDnsErrorCode: urlDebug.dnsErrorCode,
  });
}
