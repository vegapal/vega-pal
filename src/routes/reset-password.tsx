import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "./login";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/vegapal-store";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { establishPasswordRecoverySession } from "@/lib/auth/complete-auth-from-url";
import { logAuthDebug } from "@/lib/auth/debug";
import { formatAuthError, isExpiredAuthError } from "@/lib/auth/errors";
import { firstZodError, resetPasswordSchema } from "@/lib/validation/schemas";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  beforeLoad: () => ensureNamespacesLoaded(["auth"]),
  head: () => ({
    meta: [{ title: "Reset your password — VegaPal" }, { name: "robots", content: "noindex, follow" }],
  }),
  component: ResetPassword,
});

type PageState = "checking" | "ready" | "invalid" | "success";

function recoveryFailureMessage(
  error: unknown,
  step: string,
  t: (key: string) => string,
): string {
  if (error) {
    if (isExpiredAuthError(error)) {
      return t("resetPassword.invalidLink");
    }
    return formatAuthError(error);
  }
  if (step === "noCallbackParams") {
    return t("resetPassword.openLinkFromEmail");
  }
  return formatAuthError(error);
}

function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>("checking");
  const submitGuard = useSubmitGuard();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await establishPasswordRecoverySession();
      if (cancelled) return;

      logAuthDebug("recovery", {
        establishResult: result.ok,
        step: result.step,
        error: result.error?.message ?? null,
      });

      if (result.ok) {
        setPageState("ready");
        return;
      }

      setError(recoveryFailureMessage(result.error, result.step, t));
      setPageState("invalid");
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pageState !== "ready" || !submitGuard.begin()) return;
    setError("");

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(firstZodError(parsed.error, "confirmPassword"));
      submitGuard.end();
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      logAuthDebug("recovery.getSession", {
        beforeUpdateUser: true,
        hasSession: !!sessionData.session,
        error: sessionError?.message ?? null,
      });

      if (!sessionData.session) {
        const recovered = await establishPasswordRecoverySession();
        logAuthDebug("recovery", {
          reEstablishBeforeUpdate: recovered.ok,
          step: recovered.step,
          error: recovered.error?.message ?? null,
        });
        if (!recovered.ok) {
          setPageState("invalid");
          setError(recoveryFailureMessage(recovered.error, recovered.step, t));
          return;
        }
      }

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      logAuthDebug("recovery.updateUser", {
        hasUser: !!updateData.user,
        error: updateError?.message ?? null,
        code: updateError?.code ?? null,
      });
      if (updateError) throw updateError;

      setPageState("success");
      await auth.signOut();
      window.setTimeout(() => navigate({ to: "/login" }), 2000);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
      submitGuard.end();
    }
  };

  if (pageState === "checking") {
    return (
      <AuthLayout title={t("resetPassword.title")} subtitle={t("resetPassword.subtitle")}>
        <div
          className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground"
          role="status"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <span>{t("resetPassword.checkingLink")}</span>
        </div>
      </AuthLayout>
    );
  }

  if (pageState === "invalid") {
    return (
      <AuthLayout title={t("resetPassword.title")} subtitle={t("resetPassword.subtitle")}>
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <FormError message={error} />
          <Button asChild variant="hero" size="lg" className="w-full">
            <Link to="/forgot-password">{t("resetPassword.requestNewLink")}</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">{t("resetPassword.backToSignIn")}</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (pageState === "success") {
    return (
      <AuthLayout title={t("resetPassword.title")} subtitle={t("resetPassword.subtitle")}>
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </div>
          <FormSuccess message={t("resetPassword.successMessage")} />
          <Button asChild variant="hero" size="lg" className="w-full">
            <Link to="/login">{t("resetPassword.backToSignIn")}</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("resetPassword.title")} subtitle={t("resetPassword.subtitle")}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">{t("resetPassword.newPassword")}</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("resetPassword.passwordPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("resetPassword.confirmPassword")}</Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            disabled={loading}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("resetPassword.confirmPasswordPlaceholder")}
          />
        </div>
        <FormError message={error} />
        <LoadingButton
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          {loading ? t("resetPassword.updating") : t("resetPassword.updatePassword")}
        </LoadingButton>
        <p className="text-sm text-muted-foreground text-center">
          <Link to="/login" className="text-primary font-medium hover:underline">
            {t("resetPassword.backToSignIn")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
