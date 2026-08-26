import { useTranslation } from "react-i18next";
import { ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useResendConfirmation } from "@/hooks/use-resend-confirmation";
import { useTurnstile } from "@/hooks/use-turnstile";
import { getEmailProviderUrl } from "@/lib/mail-provider";
import { CheckSpamHint } from "@/components/auth/CheckSpamHint";

type EmailConfirmationActionsProps = {
  email: string;
};

export function EmailConfirmationActions({ email }: EmailConfirmationActionsProps) {
  const { t } = useTranslation("auth");
  const turnstile = useTurnstile();
  const { resend, resending, success, error, secondsLeft, canResend } =
    useResendConfirmation(email);
  const mailUrl = getEmailProviderUrl(email);

  const handleResend = async () => {
    try {
      if (turnstile.enabled) turnstile.requireToken();
      await resend(turnstile.enabled ? turnstile.token : undefined);
    } catch {
      turnstile.reset();
    }
  };

  return (
    <div className="space-y-3">
      {mailUrl ? (
        <Button asChild variant="hero" size="lg" className="w-full">
          <a href={mailUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("confirmEmail.openEmail")}
          </a>
        </Button>
      ) : null}
      {turnstile.enabled ? (
        <TurnstileWidget
          onToken={turnstile.setToken}
          resetRef={turnstile.resetRef}
          onExpire={() => turnstile.setToken("")}
        />
      ) : null}
      <LoadingButton
        type="button"
        variant={mailUrl ? "outline" : "hero"}
        size="lg"
        className="w-full"
        loading={resending}
        disabled={!canResend || (turnstile.enabled && !turnstile.token)}
        onClick={handleResend}
      >
        <Mail className="h-4 w-4" aria-hidden />
        {canResend
          ? t("confirmEmail.resend")
          : t("confirmEmail.resendIn", { seconds: secondsLeft })}
      </LoadingButton>
      {success ? <FormSuccess message={t("confirmEmail.resendSuccess")} /> : null}
      <FormError message={error} />
      <CheckSpamHint />
    </div>
  );
}
