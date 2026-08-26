import type { AuthError } from "@supabase/supabase-js";
import { formatAuthError } from "@/lib/auth/errors";
import { safeNetworkErrorFields } from "@/lib/health/network-error-log.server";
import { getSupabaseServerHost } from "@/lib/auth/supabase-env.server";

export type AuthApiErrorBody = {
  error: string;
  code?: string;
};

export function authApiJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function authApiError(status: number, message: string, code?: string): Response {
  const body: AuthApiErrorBody = { error: message };
  if (code) body.code = code;
  return authApiJson(body, status);
}

export function mapSupabaseAuthToHttpStatus(code: string | undefined, message?: string): number {
  if (code) {
    switch (code) {
      case "invalid_credentials":
        return 401;
      case "email_not_confirmed":
      case "account_disabled":
      case "captcha_verification_failed":
        return 403;
      case "user_already_exists":
      case "email_exists":
        return 409;
      case "over_request_rate_limit":
        return 429;
      case "weak_password":
      case "validation_failed":
        return 400;
      case "user_not_found":
        return 404;
      case "signup_disabled":
      case "service_unavailable":
      case "supabase_unreachable":
        return 503;
      default:
        break;
    }
  }
  const lower = message?.toLowerCase() ?? "";
  if (lower.includes("invalid login credentials")) return 401;
  return 400;
}

function isConnectivityFailure(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message.toLowerCase()
      : typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message ?? "").toLowerCase()
        : String(err).toLowerCase();
  if (
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("enotfound") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("certificate")
  ) {
    return true;
  }
  const fields = safeNetworkErrorFields(err);
  const causeCode = typeof fields.causeCode === "string" ? fields.causeCode.toUpperCase() : "";
  return (
    causeCode === "ENOTFOUND" ||
    causeCode === "ECONNREFUSED" ||
    causeCode === "ETIMEDOUT" ||
    causeCode === "EAI_AGAIN" ||
    causeCode === "CERT_HAS_EXPIRED"
  );
}

export function supabaseUnreachableResponse(context: string, err?: unknown): Response {
  const host = getSupabaseServerHost();
  console.error(
    JSON.stringify({
      event: "auth_supabase_unreachable",
      context,
      host,
      ...(err ? safeNetworkErrorFields(err) : {}),
    }),
  );
  return authApiError(
    503,
    "Authentication is temporarily unavailable. Please try again later.",
    "supabase_unreachable",
  );
}

export function responseFromSupabaseAuthError(err: AuthError, context: string): Response {
  if (isConnectivityFailure(err)) {
    return supabaseUnreachableResponse(context, err);
  }

  const code = err.code ?? undefined;
  const status = mapSupabaseAuthToHttpStatus(code, err.message);
  const message = formatAuthError(err);
  console.error(
    JSON.stringify({
      event: "auth_supabase_error",
      context,
      code: code ?? "unknown",
      status,
      host: getSupabaseServerHost(),
    }),
  );
  return authApiError(status, message, code);
}

export function serviceUnavailableResponse(missingEnv: string[]): Response {
  console.error(
    JSON.stringify({
      event: "auth_missing_env",
      missingEnv,
    }),
  );
  return authApiError(
    503,
    "Authentication is temporarily unavailable. Please try again later.",
    "service_unavailable",
  );
}
