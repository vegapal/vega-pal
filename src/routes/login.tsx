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
      await auth.signIn(normalizedEmail, parsed.data.password, turnstile.enabled ? turnstile.token : undefined);
      trackLogin("email");
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
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-hero relative overflow-hidden p-12 flex-col justify-between text-navy-foreground">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="relative">
          <Link to="/">
            <Logo light size="auth" />
          </Link>
        </div>
        <div className="relative max-w-md">
          <ShieldCheck className="h-10 w-10 text-primary mb-6" />
          <h2 className="text-3xl font-bold tracking-tight text-balance">
            {t("panel.headlineLine1")}
            <br />
            {t("panel.headlineLine2")}
          </h2>
          <p className="mt-3 text-navy-foreground/70">{t("panel.description")}</p>
        </div>
        <div className="relative text-sm text-navy-foreground/50">
          {t("panel.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-background relative min-w-0">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm min-w-0 px-1">
          <div className="lg:hidden mb-8">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
