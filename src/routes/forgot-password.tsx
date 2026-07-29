import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/vegapal-store";
import { AuthLayout } from "./login";
import { forgotPasswordSchema, firstZodError } from "@/lib/validation/schemas";
import { checkClientRateLimit } from "@/lib/client-rate-limit";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { FormError } from "@/components/ui/form-error";
import { formatAuthError } from "@/lib/auth/errors";
import { useTurnstile } from "@/hooks/use-turnstile";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { MailCheck } from "lucide-react";
import { CheckSpamHint } from "@/components/auth/CheckSpamHint";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: () => ensureNamespacesLoaded(["auth"]),
  head: () => ({
    meta: [
      { title: "Reset password — VegaPal" },
      { name: "description", content: "Reset your VegaPal account password securely." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstile = useTurnstile();
  const submitGuard = useSubmitGuard();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitGuard.begin()) return;
    setError("");

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(firstZodError(parsed.error));
      submitGuard.end();
      return;
    }

    const rate = checkClientRateLimit("forgot-password", 5, 15 * 60_000);
    if (!rate.allowed) {
      setError(tc("errors.rateLimit", { seconds: rate.retryAfterSec }));
      submitGuard.end();
      return;
    }

    setLoading(true);
    try {
      turnstile.requireToken();
      await auth.resetPassword(
        parsed.data.email.toLowerCase(),
        turnstile.enabled ? turnstile.token : undefined,
      );
      setSent(true);
    } catch (err) {
      turnstile.reset();
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
      submitGuard.end();
    }
  };

  return (
    <AuthLayout title={t("forgotPassword.title")} subtitle={t("forgotPassword.subtitle")}>
      {sent ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MailCheck className="h-6 w-6" aria-hidden />
            </div>
            <p className="mt-4 text-sm leading-relaxed">
              <Trans
                i18nKey="forgotPassword.checkInbox"
                ns="auth"
                values={{ email }}
                components={{ strong: <strong /> }}
              />
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("forgotPassword.followLink")}</p>
            <CheckSpamHint className="mt-3 text-xs text-muted-foreground leading-relaxed" />
          </div>
          <Button
            onClick={() => navigate({ to: "/login" })}
            variant="hero"
            size="lg"
            className="w-full"
          >
            {t("forgotPassword.backToSignIn")}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{tc("labels.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.emailPlaceholder")}
            />
          </div>
          <FormError message={error} />
          {turnstile.enabled && (
            <TurnstileWidget
              onToken={turnstile.setToken}
              resetRef={turnstile.resetRef}
              onExpire={() => turnstile.setToken("")}
            />
          )}
          <LoadingButton
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading || (turnstile.enabled && !turnstile.token)}
          >
            {loading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
          </LoadingButton>
          <p className="text-sm text-muted-foreground text-center">
            {t("forgotPassword.remembered")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t("forgotPassword.signIn")}
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
