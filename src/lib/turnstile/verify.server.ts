import { serverTurnstilePolicy, shouldBypassTurnstile } from "@/lib/turnstile/policy";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifyResult = {
  success: boolean;
  error?: string;
  skipped?: boolean;
};

type CloudflareSiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
};

export function logTurnstileVerificationFailed(result: CloudflareSiteverifyResponse): void {
  console.warn(
    JSON.stringify({
      event: "turnstile_verification_failed",
      errorCodes: result["error-codes"] ?? [],
      hostname: result.hostname ?? null,
      action: result.action ?? null,
    }),
  );
}

export type TurnstileVerifyDeps = {
  fetchImpl?: typeof fetch;
  getSecret?: () => string | undefined;
};

export async function verifyTurnstileToken(
  token: string,
  options?: { remoteIp?: string; host?: string | null },
  deps?: TurnstileVerifyDeps,
): Promise<TurnstileVerifyResult> {
  const host = options?.host ?? null;
  const fetchImpl = deps?.fetchImpl ?? fetch;
  const getSecret = deps?.getSecret ?? (() => process.env.TURNSTILE_SECRET_KEY);

  if (shouldBypassTurnstile(serverTurnstilePolicy(host))) {
    return { success: true, skipped: true };
  }

  const secret = getSecret();
  const isProductionHost = host && !shouldBypassTurnstile(serverTurnstilePolicy(host));

  if (!secret) {
    if (isProductionHost) {
      return { success: false, error: "captcha_verification_failed" };
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[turnstile] TURNSTILE_SECRET_KEY is not set — verification skipped");
    }
    return { success: true, skipped: true };
  }

  if (!token?.trim()) {
    return { success: false, error: "captcha_verification_failed" };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token.trim());
  if (options?.remoteIp) {
    form.set("remoteip", options.remoteIp);
  }

  const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!response.ok) {
    logTurnstileVerificationFailed({ "error-codes": ["siteverify_http_error"] });
    return { success: false, error: "captcha_verification_failed" };
  }

  const data = (await response.json()) as CloudflareSiteverifyResponse;
  if (!data.success) {
    logTurnstileVerificationFailed(data);
    return { success: false, error: "captcha_verification_failed" };
  }

  return { success: true };
}
