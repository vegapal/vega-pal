import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Logo } from "@/components/Logo";
import { EmailConfirmationActions } from "@/components/auth/EmailConfirmationActions";
import { CheckSpamHint } from "@/components/auth/CheckSpamHint";
import { auth } from "@/lib/vegapal-store";

export function ConfirmEmailPending({ email }: { email?: string | null }) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await auth.signOut();
      navigate({ to: "/login" });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-ice flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="mb-6 text-center">
          <Link to="/" aria-label="VegaPal home">
            <Logo className="mx-auto" />
          </Link>
        </div>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">{t("confirmEmail.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {t("confirmEmail.message")}
          </p>
          <CheckSpamHint className="mt-3 text-xs text-muted-foreground leading-relaxed" />
          {email ? (
            <p className="mt-3 text-sm font-medium text-foreground break-all">{email}</p>
          ) : null}
        </div>

        {email ? (
          <div className="mt-6">
            <EmailConfirmationActions email={email} />
          </div>
        ) : null}

        <LoadingButton
          type="button"
          variant="ghost"
          className="mt-4 w-full"
          loading={signingOut}
          onClick={signOut}
        >
          {t("confirmEmail.backToSignIn")}
        </LoadingButton>
      </div>
    </div>
  );
}
