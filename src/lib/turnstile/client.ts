import { clientTurnstilePolicy, shouldBypassTurnstile } from "@/lib/turnstile/policy";

export function isTurnstileEnabled() {
  if (!import.meta.env.VITE_TURNSTILE_SITE_KEY) {
    return false;
  }
  return !shouldBypassTurnstile(clientTurnstilePolicy());
}

export async function verifyTurnstileOnServer(token: string): Promise<void> {
  if (!isTurnstileEnabled()) {
    return;
  }

  const response = await fetch("/api/turnstile/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = "Captcha verification failed. Please try again.";
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      if (response.status === 503 || text.includes("FUNCTION_INVOCATION_FAILED")) {
        message = "Service temporarily unavailable. Please try again in a moment.";
      }
    }
    throw new Error(message);
  }
}
