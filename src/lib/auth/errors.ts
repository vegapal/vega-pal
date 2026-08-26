import type { AuthError } from "@supabase/supabase-js";
import type { z } from "zod";
import { AuthApiError } from "@/lib/auth/auth-api-error";
import { InvoiceNumberAllocationError } from "@/lib/vegapal-store";

const FALLBACK = "Something went wrong. Please try again.";

/** Never render raw objects — coerce any value to a safe display string. */
export function toDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "{}" || trimmed === "[object Object]") return "";
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Error) return toDisplayString(value.message) || FALLBACK;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string") {
      const fromMessage = toDisplayString(record.message);
      if (fromMessage) return fromMessage;
    }
    if (typeof record.error === "string") {
      const fromError = toDisplayString(record.error);
      if (fromError) return fromError;
    }
    if (Array.isArray(record._errors) && record._errors.length > 0) {
      const fromErrors = toDisplayString(record._errors[0]);
      if (fromErrors) return fromErrors;
    }
    const code = typeof record.code === "string" ? record.code : undefined;
    if (code) {
      const fromCode = mapSupabaseAuthCode(code);
      if (fromCode) return fromCode;
    }
  }
  return "";
}

const SUPABASE_AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email before continuing.",
  user_already_exists: "An account with this email already exists. Try signing in instead.",
  email_exists: "An account with this email already exists. Try signing in instead.",
  signup_disabled: "Registration is temporarily unavailable. Please try again later.",
  weak_password: "Password is too weak. Use at least 6 characters.",
  same_password: "Choose a new password that is different from your current one.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
  user_not_found: "No account found with that email address.",
  validation_failed: "Please check your details and try again.",
  session_not_found: "Your session has expired. Please sign in again.",
  session_missing: "Your reset link has expired. Please request a new password reset link.",
  flow_state_expired: "This link has expired. Please request a new one.",
  otp_expired: "This link has expired. Please request a new one.",
  account_disabled: "This account has been disabled. Contact support if you need help.",
  captcha_verification_failed: "Captcha verification failed. Please try again.",
  service_unavailable: "Authentication is temporarily unavailable. Please try again later.",
  supabase_unreachable: "Authentication is temporarily unavailable. Please try again later.",
  network_error: "Network error. Check your connection and try again.",
  free_plan_invoice_limit:
    "You have reached the Free plan limit of 3 documents this month. Upgrade to Pro to create unlimited invoices.",
  request_timeout: "The request timed out. Check your connection and try again.",
};

const EXPIRED_AUTH_CODES = new Set([
  "otp_expired",
  "flow_state_expired",
  "session_missing",
  "session_not_found",
]);

/** True when Supabase explicitly reports an expired OTP/session/link. */
export function isExpiredAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as AuthError).code;
  if (code && EXPIRED_AUTH_CODES.has(code)) return true;
  const message = (err as Error).message?.toLowerCase() ?? "";
  return (
    message.includes("otp expired") ||
    message.includes("link has expired") ||
    message.includes("flow state has expired")
  );
}

function mapSupabaseAuthCode(code: string): string | undefined {
  return SUPABASE_AUTH_MESSAGES[code];
}

function mapSupabaseAuthMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return SUPABASE_AUTH_MESSAGES.user_already_exists;
  }
  if (lower.includes("invalid login credentials")) {
    return SUPABASE_AUTH_MESSAGES.invalid_credentials;
  }
  if (lower.includes("password should be at least") || lower.includes("weak password")) {
    return SUPABASE_AUTH_MESSAGES.weak_password;
  }
  if (lower.includes("email not confirmed")) {
    return SUPABASE_AUTH_MESSAGES.email_not_confirmed;
  }
  if (lower.includes("auth session missing") || lower.includes("session missing")) {
    return SUPABASE_AUTH_MESSAGES.session_missing;
  }
  if (lower.includes("code verifier")) {
    return "This reset link must be opened in the same browser where you requested it. Please request a new password reset link.";
  }
  if (lower.includes("free_plan_invoice_limit") || lower.includes("free plan limit of 3")) {
    return SUPABASE_AUTH_MESSAGES.free_plan_invoice_limit;
  }
  if (lower.includes("no password recovery token")) {
    return "Open the password reset link from your email, or request a new one.";
  }
  if (lower.includes("failed to fetch") || lower.includes("fetch failed") || lower.includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("captcha_verification_failed") || lower.includes("captcha")) {
    return "Captcha verification failed. Please try again.";
  }
  return message;
}

/** Map Supabase auth errors, network failures, and thrown values to user-facing text. */
export function formatAuthError(err: unknown): string {
  if (!err) return FALLBACK;

  if (err instanceof AuthApiError && err.code) {
    const fromCode = mapSupabaseAuthCode(err.code);
    if (fromCode) return fromCode;
  }

  if (typeof err === "object" && err !== null) {
    const authErr = err as AuthError;
    if (typeof authErr.code === "string") {
      const fromCode = mapSupabaseAuthCode(authErr.code);
      if (fromCode) return fromCode;
    }
  }

  const direct = toDisplayString(err);
  if (direct && direct !== FALLBACK) {
    return mapSupabaseAuthMessage(direct);
  }

  if (typeof err === "object" && err !== null) {
    if (err instanceof InvoiceNumberAllocationError) {
      return err.message;
    }
    const authErr = err as AuthError;
    if (typeof authErr.message === "string" && authErr.message.trim()) {
      return mapSupabaseAuthMessage(authErr.message.trim());
    }
  }

  return FALLBACK;
}

const POSTGREST_MESSAGES: Record<string, string> = {
  PGRST116: "The requested item was not found.",
  "23505": "This record already exists.",
  "42501": "You don't have permission to perform this action.",
  "23503": "This action could not be completed because related data is missing.",
  "22P02": "Some values are invalid. Please check your input.",
  "23514": "Some values are invalid. Please check your input.",
};

function mapDatabaseMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return POSTGREST_MESSAGES["42501"];
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) {
    return POSTGREST_MESSAGES["23505"];
  }
  if (lower.includes("violates foreign key")) {
    return POSTGREST_MESSAGES["23503"];
  }
  if (lower.includes("invalid input syntax")) {
    return POSTGREST_MESSAGES["22P02"];
  }
  return message;
}

/** Friendly message for any app/API error (auth, Supabase, DB, Zod throws). */
export function formatAppError(err: unknown): string {
  if (!err) return FALLBACK;

  if (typeof err === "object" && err !== null) {
    const record = err as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : undefined;
    if (code && POSTGREST_MESSAGES[code]) return POSTGREST_MESSAGES[code];

    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (message) {
      const mapped = mapDatabaseMessage(message);
      if (mapped !== message) return mapped;
      const fromAuth = mapSupabaseAuthMessage(message);
      if (fromAuth !== message) return fromAuth;
      if (!message.startsWith("{") && !message.includes("[object Object]")) {
        return message;
      }
    }
  }

  return formatAuthError(err);
}

function issueToString(issue: z.ZodIssue): string {
  const raw = issue.message;
  if (typeof raw === "string" && raw.trim()) return raw.trim();

  switch (issue.code) {
    case "invalid_string":
      if (issue.validation === "email") return "Enter a valid email address.";
      return "Invalid value.";
    case "too_small":
      if (issue.type === "string") {
        return issue.minimum === 1
          ? `${String(issue.path[0] ?? "This field")} is required.`
          : `Must be at least ${issue.minimum} characters.`;
      }
      return "Value is too small.";
    case "too_big":
      return "Value is too long.";
    case "custom":
      return "Please check your input.";
    default:
      return "";
  }
}

export function zodErrorForField(error: z.ZodError, field: string): string | undefined {
  const issue = error.issues.find((i) => i.path[0] === field);
  if (!issue) return undefined;
  const text = issueToString(issue);
  return text || undefined;
}

/** Prefer a field-specific message (e.g. confirmPassword), then first issue. */
export function formatZodError(error: z.ZodError, preferredField?: string): string {
  if (preferredField) {
    const fieldMsg = zodErrorForField(error, preferredField);
    if (fieldMsg) return fieldMsg;
  }
  for (const issue of error.issues) {
    const text = issueToString(issue);
    if (text) return text;
  }
  return "Please check your input.";
}
