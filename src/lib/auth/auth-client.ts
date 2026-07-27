import { formatAuthError } from "@/lib/auth/errors";
import { AuthApiError } from "@/lib/auth/auth-api-error";

export type AuthSessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
};

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (
      response.status === 503 ||
      text.includes("FUNCTION_INVOCATION_FAILED") ||
      text.includes("SERVICE_UNAVAILABLE")
    ) {
      return {
        error: "Service temporarily unavailable. Please try again in a moment.",
        code: "service_unavailable",
      };
    }
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      return {
        error: "Something went wrong. Please try again.",
        code: "non_json_response",
      };
    }
    return { error: formatAuthError(new Error(text.slice(0, 200))) };
  }
}

export async function authApiRequest<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
  } catch {
    throw new AuthApiError(
      "Network error. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  const data = (await parseJsonBody(response)) as Record<string, unknown> | null;
  if (!response.ok) {
    const message =
      (typeof data?.error === "string" && data.error) ||
      formatAuthError(data) ||
      "Something went wrong. Please try again.";
    const code = typeof data?.code === "string" ? data.code : undefined;
    throw new AuthApiError(message, response.status, code);
  }

  return data as T;
}

export { AuthApiError } from "@/lib/auth/auth-api-error";
