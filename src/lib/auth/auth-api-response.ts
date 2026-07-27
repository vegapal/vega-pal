import type { AuthError } from "@supabase/supabase-js";
import { formatAuthError } from "@/lib/auth/errors";

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

export function authApiError(
  status: number,
  message: string,
  code?: string,
): Response {
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
        return 503;
      default:
        break;
    }
  }
  const lower = message?.toLowerCase() ?? "";
  if (lower.includes("invalid login credentials")) return 401;
  return 400;
}

export function responseFromSupabaseAuthError(err: AuthError, context: string): Response {
  const messageLower = err.message?.toLowerCase() ?? "";
  if (messageLower.includes("fetch failed") || messageLower.includes("failed to fetch")) {
    console.error(`[auth-api] ${context} supabase unreachable`);
    return authApiError(
      503,
      "Authentication is temporarily unavailable. Please try again later.",
      "service_unavailable",
    );
  }

  const code = err.code ?? undefined;
  const status = mapSupabaseAuthToHttpStatus(code, err.message);
  const message = formatAuthError(err);
  console.error(`[auth-api] ${context} failed`, { code: code ?? "unknown", status });
  return authApiError(status, message, code);
}

export function serviceUnavailableResponse(missingEnv: string[]): Response {
  console.error(`[auth-api] service unavailable — missing env: ${missingEnv.join(", ")}`);
  return authApiError(
    503,
    "Authentication is temporarily unavailable. Please try again later.",
    "service_unavailable",
  );
}
