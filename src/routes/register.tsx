import { createFileRoute, Link } from "@tanstack/react-router";
import { trackSignUp } from "@/lib/analytics/events";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { auth } from "@/lib/vegapal-store";
import { AuthLayout } from "./login";
import { registerSchema, firstZodError } from "@/lib/validation/schemas";
import { checkClientRateLimit } from "@/lib/client-rate-limit";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { FormError } from "@/components/ui/form-error";
import { RegisterSuccessPanel } from "@/components/auth/RegisterSuccessPanel";
import { formatAuthError } from "@/lib/auth/errors";
import { useTurnstile } from "@/hooks/use-turnstile";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

export const Route = createFileRoute("/register")({
  beforeLoad: () => ensureNamespacesLoaded(["auth"]),
  head: () => ({
    meta: [
      { title: "Create account — VegaPal" },
      {
        name: "description",
        content: "Create your VegaPal account to send USDT invoices and accept crypto payments.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const turnstile = useTurnstile();
  const submitGuard = useSubmitGuard();
  const formDisabled = loading || registered;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitGuard.begin()) return;
    setError("");

    const parsed = registerSchema.safeParse({
      name,
      business,
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setError(firstZodError(parsed.error, "confirmPassword"));
      submitGuard.end();
      return;
    }

    const rate = checkClientRateLimit("register", 5, 15 * 60_000);
    if (!rate.allowed) {
      setError(tc("errors.rateLimit", { seconds: rate.retryAfterSec }));
      submitGuard.end();
      return;
    }

    setLoading(true);
    try {
      turnstile.requireToken();
      const data = parsed.data;
      await auth.signUp(
        data.email.toLowerCase(),
        data.password,
        data.name,
        data.business || undefined,
        turnstile.enabled ? turnstile.token : undefined,
      );
      setRegisteredEmail(data.email.toLowerCase());
      setRegistered(true);
      turnstile.reset();
      trackSignUp("email");
    } catch (err) {
      turnstile.reset();
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
      submitGuard.end();
    }
  };

  return (
    <AuthLayout title={t("register.title")} subtitle={t("register.subtitle")}>
      {registered ? (
        <RegisterSuccessPanel email={registeredEmail} />
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">{tc("labels.name")}</Label>
            <Input
              id="name"
              required
              autoComplete="name"
              disabled={formDisabled}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("register.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business">
              {t("register.businessName")}{" "}
              <span className="text-muted-foreground font-normal">({tc("labels.optional")})</span>
            </Label>
            <Input
              id="business"
              autoComplete="organization"
              disabled={formDisabled}
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder={t("register.businessPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{tc("labels.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              disabled={formDisabled}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("register.emailPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{tc("labels.password")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={formDisabled}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("register.passwordPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("register.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={formDisabled}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("register.confirmPasswordPlaceholder")}
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
            disabled={formDisabled || (turnstile.enabled && !turnstile.token)}
          >
            {loading ? t("register.creatingAccount") : t("register.createAccount")}
          </LoadingButton>
          <p className="text-xs text-muted-foreground text-center">{t("register.termsNotice")}</p>
          <p className="text-sm text-muted-foreground text-center">
            {t("register.alreadyHaveAccount")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t("register.signIn")}
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
