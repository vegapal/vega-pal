import { useCallback, useEffect, useState } from "react";
import { formatAuthError } from "@/lib/auth/errors";
import { auth } from "@/lib/vegapal-store";

const COOLDOWN_SEC = 60;

export function useResendConfirmation(email: string) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const resend = useCallback(
    async (turnstileToken?: string) => {
      if (!email || secondsLeft > 0 || resending) return;
      setError("");
      setSuccess(false);
      setResending(true);
      try {
        await auth.resendConfirmationEmail(email, turnstileToken);
        setSuccess(true);
        setSecondsLeft(COOLDOWN_SEC);
      } catch (err) {
        setError(formatAuthError(err));
        throw err;
      } finally {
        setResending(false);
      }
    },
    [email, resending, secondsLeft],
  );

  return {
    resend,
    resending,
    success,
    error,
    secondsLeft,
    canResend: secondsLeft <= 0 && !resending,
  };
}
