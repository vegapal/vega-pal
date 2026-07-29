import { useCallback, useRef, useState } from "react";
import { isTurnstileEnabled } from "@/lib/turnstile/client";

export function useTurnstile() {
  const enabled = isTurnstileEnabled();
  const [token, setToken] = useState("");
  const resetRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    setToken("");
    resetRef.current?.();
  }, []);

  const requireToken = useCallback(() => {
    if (!enabled) {
      return;
    }
    if (!token) {
      throw new Error("Please complete the captcha.");
    }
  }, [enabled, token]);

  return {
    enabled,
    token,
    setToken,
    reset,
    resetRef,
    requireToken,
  };
}
