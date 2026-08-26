import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { trackLogin } from "@/lib/analytics/events";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Logo } from "@/components/Logo";
import { auth } from "@/lib/vegapal-store";
import { ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { loginSchema, firstZodError } from "@/lib/validation/schemas";
import { checkClientRateLimit } from "@/lib/client-rate-limit";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { FormError } from "@/components/ui/form-error";
import { EmailConfirmationActions } from "@/components/auth/EmailConfirmationActions";
import { formatAuthError } from "@/lib/auth/errors";
import { useTurnstile } from "@/hooks/use-turnstile";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

export const Route = createFileRoute("/login")({
  beforeLoad: () => ensureNamespacesLoaded(["auth"]),
  head: () => ({
    meta: [
      { title: "Sign in — VegaPal" },
      {
        name: "description",
        content: "Sign in to VegaPal to manage invoices, payments, and your business profile.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: LoginPage,
});

function isEmailNotConfirmedError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "email_not_confirmed"
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const turnstile = useTurnstile();
  const submitGuard = useSubmitGuard();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitGuard.begin()) return;
    setError("");
    setUnconfirmedEmail(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(firstZodError(parsed.error));
      submitGuard.end();
      return;
    }

    const rate = checkClientRateLimit("login", 10, 15 * 60_000);
    if (!rate.allowed) {
      setError(tc("errors.rateLimit", { seconds: rate.retryAfterSec }));
      submitGuard.end();
      return;
    }

    setLoading(true);
    const normalizedEmail = parsed.data.email.toLowerCase();
    try {
      turnstile.requireToken();
      const { setRememberMePreference } = await import("@/lib/auth/auth-session-storage");
      setRememberMePreference(rememberMe);
      await auth.signIn(normalizedEmail, parsed.data.password, turnstile.enabled ? turnstile.token : undefined);
      trackLogin("email");
      void import("@/lib/activity/log-user-activity").then(({ logUserActivity }) =>
        logUserActivity("login", { description: "Signed in" }),
      );
      navigate({ to: "/dashboard" });
    } catch (err) {
      turnstile.reset();
      setError(formatAuthError(err));
      if (isEmailNotConfirmedError(err)) {
        setUnconfirmedEmail(normalizedEmail);
      }
    } finally {
      setLoading(false);
      submitGuard.end();
    }
  };

  return (
    <AuthLayout title={t("login.title")} subtitle={t("login.subtitle")}>
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (unconfirmedEmail) setUnconfirmedEmail(null);
            }}
            placeholder={t("register.emailPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{tc("labels.password")}</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              {t("login.forgotPassword")}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.passwordPlaceholder")}
          />
        </div>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input"
            checked={rememberMe}
            disabled={loading}
            onChange={(e) => setRememberMe(e.target.checked)}
            aria-describedby="remember-me-hint"
          />
          <span>
            <span className="text-sm font-medium block">{t("login.rememberMe")}</span>
            <span id="remember-me-hint" className="text-xs text-muted-foreground block mt-0.5">
              {t("login.rememberMeHint")}
            </span>
          </span>
        </label>
        <FormError message={error} />
        {unconfirmedEmail ? (
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{t("login.unconfirmedHint")}</p>
            <EmailConfirmationActions email={unconfirmedEmail} />
          </div>
        ) : null}
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
          {loading ? t("login.signingIn") : t("login.signIn")}
        </LoadingButton>
        <p className="text-sm text-muted-foreground text-center">
          {t("login.newToVegapal")}{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            {t("login.createAccount")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const { t } = useTranslation("auth");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex bg-hero relative overflow-hidden p-10 xl:p-12 flex-col justify-between text-navy-foreground">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative">
          <Link to="/" className="inline-flex">
            <Logo light size="auth" />
          </Link>
        </div>
        <div className="relative max-w-md space-y-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-3xl xl:text-[2.15rem] font-bold tracking-tight text-balance leading-tight">
            {t("panel.headlineLine1")}
            <br />
            {t("panel.headlineLine2")}
          </h2>
          <p className="text-[15px] leading-relaxed text-navy-foreground/70">{t("panel.description")}</p>
        </div>
        <div className="relative text-sm text-navy-foreground/50">
          {t("panel.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12 relative min-w-0">
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-[24rem] min-w-0">
          <div className="lg:hidden mb-7">
            <Link to="/" className="inline-flex">
              <Logo size="lg" />
            </Link>
          </div>
          <h1 className="text-[1.75rem] sm:text-[2rem] font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
