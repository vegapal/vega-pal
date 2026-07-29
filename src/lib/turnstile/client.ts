import { clientTurnstilePolicy, shouldBypassTurnstile } from "@/lib/turnstile/policy";

export function isTurnstileEnabled() {
  if (!import.meta.env.VITE_TURNSTILE_SITE_KEY) {
    return false;
  }
  return !shouldBypassTurnstile(clientTurnstilePolicy());
}
