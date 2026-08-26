import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isEmailConfirmed } from "@/lib/auth/email-confirmation";
import {
  authApiError,
  authApiJson,
  responseFromSupabaseAuthError,
  serviceUnavailableResponse,
  supabaseUnreachableResponse,
} from "@/lib/auth/auth-api-response";
import {
  getMissingSupabaseServerEnv,
  getSupabaseServerHost,
  requireSupabaseServerEnv,
} from "@/lib/auth/supabase-env.server";
import { safeNetworkErrorFields } from "@/lib/health/network-error-log.server";
import {
  checkServerRateLimit,
  clientIpFromRequest,
} from "@/lib/auth/server-rate-limit.server";
import { getEmailConfirmRedirectUrl, getPasswordResetRedirectUrl } from "@/lib/auth/redirect-url";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validation/schemas";
import { verifyTurnstileToken } from "@/lib/turnstile/verify.server";
import { formatZodError } from "@/lib/auth/errors";

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

function createAuthClient() {
  const { url, publishableKey } = requireSupabaseServerEnv();
  return createClient<Database>(url, publishableKey, {
    global: { fetch: createSupabaseFetch(publishableKey) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

function logAuthStep(step: string, extra?: Record<string, unknown>): void {
  // Safe operational diagnostics only — never log tokens, passwords, or keys.
  console.info(
    JSON.stringify({
      event: "auth_login_step",
      step,
      host: getSupabaseServerHost(),
      ...extra,
    }),
  );
}

async function verifyTurnstileForAuth(request: Request, token: string | undefined): Promise<Response | null> {
  const remoteIp = clientIpFromRequest(request);
  const host = request.headers.get("host");
  const result = await verifyTurnstileToken(token ?? "", { remoteIp, host });
  if (!result.success) {
    console.warn(
      JSON.stringify({
        event: "auth_turnstile_failed",
        requestHost: host ? host.split(":")[0] : null,
        skipped: Boolean(result.skipped),
      }),
    );
    return authApiError(403, "Captcha verification failed. Please try again.", "captcha_verification_failed");
  }
  return null;
}

async function ensureUserProfile(
  userId: string,
  email: string,
  name: string,
  business?: string,
): Promise<{ ok: true; plan: string } | { ok: false; response: Response }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing, error: readError } = await supabaseAdmin
    .from("profiles")
    .select("id, plan")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    console.error("[auth-api] profile read failed", { code: readError.code });
    return {
      ok: false,
      response: authApiError(500, "Could not finish creating your account. Please try signing in.", "profile_error"),
    };
  }

  if (existing) {
    return { ok: true, plan: existing.plan ?? "free" };
  }

  const { error: insertError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    email,
    name: name || email.split("@")[0] || "User",
    business: business?.trim() || null,
    contact_email: email,
  } as never);

  if (insertError) {
    console.error("[auth-api] profile insert recovery failed", { code: insertError.code });
    return {
      ok: false,
      response: authApiError(500, "Could not finish creating your account. Please try signing in.", "profile_error"),
    };
  }

  return { ok: true, plan: "free" };
}

async function handleSignup(request: Request): Promise<Response> {
  const missing = getMissingSupabaseServerEnv();
  if (missing.length > 0) return serviceUnavailableResponse(missing);

  const ip = clientIpFromRequest(request);
  const rate = checkServerRateLimit(`signup:${ip}`, 8, 15 * 60_000);
  if (!rate.allowed) {
    return authApiError(
      429,
      `Too many attempts. Try again in ${rate.retryAfterSec} seconds.`,
      "over_request_rate_limit",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return authApiError(400, "Invalid request body.", "invalid_json");
  }

  const captchaBlock = await verifyTurnstileForAuth(request, typeof body.turnstileToken === "string" ? body.turnstileToken : undefined);
  if (captchaBlock) return captchaBlock;

  const parsed = registerSchema.safeParse({
    name: body.name,
    business: body.business,
    email: body.email,
    password: body.password,
    confirmPassword: body.confirmPassword ?? body.password,
  });
  if (!parsed.success) {
    return authApiError(400, formatZodError(parsed.error, "confirmPassword"), "validation_failed");
  }

  const email = parsed.data.email.toLowerCase();
  const redirectTo = getEmailConfirmRedirectUrl();

  try {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirectTo,
        data: { name: parsed.data.name, business: parsed.data.business ?? "" },
      },
    });

    if (error) return responseFromSupabaseAuthError(error, "signup");

    if (data.user?.identities?.length === 0) {
      return authApiError(
        409,
        "An account with this email already exists. Try signing in instead.",
        "user_already_exists",
      );
    }

    if (data.user?.id) {
      const profile = await ensureUserProfile(
        data.user.id,
        email,
        parsed.data.name,
        parsed.data.business,
      );
      if (!profile.ok) return profile.response;
    }

    return authApiJson({
      ok: true,
      email,
      needsEmailConfirmation: data.user ? !isEmailConfirmed(data.user) : true,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Missing Supabase")) {
      return serviceUnavailableResponse(getMissingSupabaseServerEnv());
    }
    console.error("[auth-api] signup unexpected error");
    return authApiError(500, "Something went wrong. Please try again.");
  }
}

async function handleLogin(request: Request): Promise<Response> {
  const missing = getMissingSupabaseServerEnv();
  if (missing.length > 0) {
    logAuthStep("missing_env", { missingEnv: missing });
    return serviceUnavailableResponse(missing);
  }

  const ip = clientIpFromRequest(request);
  const rate = checkServerRateLimit(`login:${ip}`, 15, 15 * 60_000);
  if (!rate.allowed) {
    logAuthStep("rate_limited", { retryAfterSec: rate.retryAfterSec });
    return authApiError(
      429,
      `Too many attempts. Try again in ${rate.retryAfterSec} seconds.`,
      "over_request_rate_limit",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    logAuthStep("invalid_json");
    return authApiError(400, "Invalid request body.", "invalid_json");
  }

  logAuthStep("turnstile_start");
  const captchaBlock = await verifyTurnstileForAuth(
    request,
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
  );
  if (captchaBlock) {
    logAuthStep("turnstile_failed");
    return captchaBlock;
  }
  logAuthStep("turnstile_ok");

  const parsed = loginSchema.safeParse({ email: body.email, password: body.password });
  if (!parsed.success) {
    logAuthStep("validation_failed");
    return authApiError(400, formatZodError(parsed.error), "validation_failed");
  }

  const email = parsed.data.email.toLowerCase();

  try {
    logAuthStep("supabase_signin_start");
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (error) {
      logAuthStep("supabase_signin_failed", { code: error.code ?? "unknown" });
      return responseFromSupabaseAuthError(error, "login");
    }
    logAuthStep("supabase_signin_ok");

    const user = data.user;
    const session = data.session;
    if (user && !isEmailConfirmed(user)) {
      await supabase.auth.signOut();
      logAuthStep("email_not_confirmed");
      return authApiError(403, "Please confirm your email before continuing.", "email_not_confirmed");
    }

    if (user) {
      logAuthStep("profile_lookup_start");
      try {
        if (!session?.access_token) {
          await supabase.auth.signOut();
          return authApiError(401, "Incorrect email or password.", "invalid_credentials");
        }
        const userClient = createUserScopedClient(session.access_token);
        const { data: profile, error: profileError } = await userClient
          .from("profiles")
          .select("is_disabled")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) {
          console.error(
            JSON.stringify({
              event: "auth_profile_lookup_failed",
              code: profileError.code ?? "unknown",
              host: getSupabaseServerHost(),
            }),
          );
          await supabase.auth.signOut();
          return supabaseUnreachableResponse("login_profile", new Error(profileError.message));
        }
        if (profile?.is_disabled) {
          await supabase.auth.signOut();
          logAuthStep("account_disabled");
          return authApiError(
            403,
            "This account has been disabled. Contact support if you need help.",
            "account_disabled",
          );
        }
        logAuthStep("profile_lookup_ok");
      } catch (profileErr) {
        await supabase.auth.signOut().catch(() => undefined);
        console.error(
          JSON.stringify({
            event: "auth_profile_lookup_threw",
            host: getSupabaseServerHost(),
            ...safeNetworkErrorFields(profileErr),
          }),
        );
        return supabaseUnreachableResponse("login_profile", profileErr);
      }
    }

    if (!session) {
      logAuthStep("missing_session");
      return authApiError(401, "Incorrect email or password.", "invalid_credentials");
    }

    logAuthStep("login_ok");
    return authApiJson({
      ok: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Missing Supabase")) {
      return serviceUnavailableResponse(getMissingSupabaseServerEnv());
    }
    const network = safeNetworkErrorFields(err);
    if (
      network.message.toLowerCase().includes("fetch failed") ||
      network.causeCode === "ENOTFOUND" ||
      network.causeCode === "ECONNREFUSED"
    ) {
      return supabaseUnreachableResponse("login", err);
    }
    console.error(
      JSON.stringify({
        event: "auth_login_unexpected",
        host: getSupabaseServerHost(),
        ...network,
      }),
    );
    return authApiError(500, "Something went wrong. Please try again.", "internal_error");
  }
}

async function handleLogout(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return authApiError(405, "Method not allowed.");
  }
  return authApiJson({ ok: true });
}

async function handleSession(request: Request): Promise<Response> {
  const missing = getMissingSupabaseServerEnv();
  if (missing.length > 0) return serviceUnavailableResponse(missing);

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return authApiError(401, "Unauthorized.", "session_missing");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) {
    return authApiError(401, "Unauthorized.", "session_missing");
  }

  try {
    const { url, publishableKey } = requireSupabaseServerEnv();
    const supabase = createClient<Database>(url, publishableKey, {
      global: {
        fetch: createSupabaseFetch(publishableKey),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return authApiError(401, "Your session has expired. Please sign in again.", "session_not_found");
    }

    const userId = data.claims.sub;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, name, plan, is_disabled")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return authApiError(404, "Profile not found.", "profile_not_found");
    }

    if (profile.is_disabled) {
      return authApiError(403, "This account has been disabled.", "account_disabled");
    }

    return authApiJson({
      ok: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        plan: profile.plan,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Missing Supabase")) {
      return serviceUnavailableResponse(getMissingSupabaseServerEnv());
    }
    console.error("[auth-api] session unexpected error");
    return authApiError(500, "Something went wrong. Please try again.");
  }
}

async function handleForgotPassword(request: Request): Promise<Response> {
  const missing = getMissingSupabaseServerEnv();
  if (missing.length > 0) return serviceUnavailableResponse(missing);

  const ip = clientIpFromRequest(request);
  const rate = checkServerRateLimit(`forgot:${ip}`, 6, 15 * 60_000);
  if (!rate.allowed) {
    return authApiError(
      429,
      `Too many attempts. Try again in ${rate.retryAfterSec} seconds.`,
      "over_request_rate_limit",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return authApiError(400, "Invalid request body.", "invalid_json");
  }

  const captchaBlock = await verifyTurnstileForAuth(request, typeof body.turnstileToken === "string" ? body.turnstileToken : undefined);
  if (captchaBlock) return captchaBlock;

  const parsed = forgotPasswordSchema.safeParse({ email: body.email });
  if (!parsed.success) {
    return authApiError(400, formatZodError(parsed.error), "validation_failed");
  }

  try {
    const supabase = createAuthClient();
    const redirectTo = getPasswordResetRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
      redirectTo,
    });
    if (error) return responseFromSupabaseAuthError(error, "forgot-password");
    return authApiJson({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Missing Supabase")) {
      return serviceUnavailableResponse(getMissingSupabaseServerEnv());
    }
    console.error("[auth-api] forgot-password unexpected error");
    return authApiError(500, "Something went wrong. Please try again.");
  }
}

async function handleResendConfirmation(request: Request): Promise<Response> {
  const missing = getMissingSupabaseServerEnv();
  if (missing.length > 0) return serviceUnavailableResponse(missing);

  const ip = clientIpFromRequest(request);
  const rate = checkServerRateLimit(`resend:${ip}`, 6, 15 * 60_000);
  if (!rate.allowed) {
    return authApiError(
      429,
      `Too many attempts. Try again in ${rate.retryAfterSec} seconds.`,
      "over_request_rate_limit",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return authApiError(400, "Invalid request body.", "invalid_json");
  }

  const parsed = forgotPasswordSchema.safeParse({ email: body.email });
  if (!parsed.success) {
    return authApiError(400, formatZodError(parsed.error), "validation_failed");
  }

  const captchaBlock = await verifyTurnstileForAuth(
    request,
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
  );
  if (captchaBlock) return captchaBlock;

  try {
    const supabase = createAuthClient();
    const redirectTo = getEmailConfirmRedirectUrl();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email.toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return responseFromSupabaseAuthError(error, "resend-confirmation");
    return authApiJson({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Missing Supabase")) {
      return serviceUnavailableResponse(getMissingSupabaseServerEnv());
    }
    console.error("[auth-api] resend-confirmation unexpected error");
    return authApiError(500, "Something went wrong. Please try again.");
  }
}

export async function handleAuthApiRequest(request: Request): Promise<Response> {
  try {
    const path = new URL(request.url).pathname;

    if (path === "/api/auth/signup" && request.method === "POST") {
      return handleSignup(request);
    }
    if (path === "/api/auth/login" && request.method === "POST") {
      return handleLogin(request);
    }
    if (path === "/api/auth/logout" && request.method === "POST") {
      return handleLogout(request);
    }
    if (path === "/api/auth/session" && request.method === "GET") {
      return handleSession(request);
    }
    if (path === "/api/auth/forgot-password" && request.method === "POST") {
      return handleForgotPassword(request);
    }
    if (path === "/api/auth/resend-confirmation" && request.method === "POST") {
      return handleResendConfirmation(request);
    }

    return authApiError(404, "Not found.");
  } catch (error) {
    console.error("[auth-api] unhandled error", error instanceof Error ? error.message : error);
    return authApiError(500, "Something went wrong. Please try again.");
  }
}
