import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Copy, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaymentQr } from "@/components/landing/PaymentQr";
import { FormError } from "@/components/ui/form-error";
import { cn } from "@/lib/utils";
import { formatAppError } from "@/lib/auth/errors";
import { submitSubscriptionPaymentRequest } from "@/lib/billing/billing-client";
import {
  getProCheckoutPrice,
  type PublicBillingPeriod,
} from "@/lib/billing/public-pricing";
import {
  DEFAULT_USDT_SUBSCRIPTION_NETWORK,
  USDT_SUBSCRIPTION_DEPOSITS,
  getUsdtSubscriptionDeposit,
  type UsdtSubscriptionNetworkId,
} from "@/lib/billing/usdt-subscription-deposits";

export type SubscriptionPlan = {
  planKey: "pro";
  price: number;
  billingPeriod: PublicBillingPeriod;
};

type Step = "pay" | "confirm" | "submitted";

function CopyFieldButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1.5 shrink-0">
      <Copy className="h-3.5 w-3.5" />
      {copied ? copiedLabel : label}
    </Button>
  );
}

export function SubscriptionPaymentModal({
  plan,
  open,
  onOpenChange,
}: {
  plan: SubscriptionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");

  const [step, setStep] = useState<Step>("pay");
  const [networkId, setNetworkId] = useState<UsdtSubscriptionNetworkId>(
    DEFAULT_USDT_SUBSCRIPTION_NETWORK,
  );
  const [txHash, setTxHash] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("pay");
    setNetworkId(DEFAULT_USDT_SUBSCRIPTION_NETWORK);
    setTxHash("");
    setNotes("");
    setError(null);
    setSubmitting(false);
  }, [open, plan?.billingPeriod]);

  if (!plan) return null;

  const amount = getProCheckoutPrice(plan.billingPeriod);
  const deposit = getUsdtSubscriptionDeposit(networkId);
  const planName = t(`pricing.plans.${plan.planKey}.name`);
  const periodLabel =
    plan.billingPeriod === "semiannual"
      ? t("subscriptionModal.periodSemiannual")
      : t("subscriptionModal.periodMonthly");

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await submitSubscriptionPaymentRequest({
        billingPeriod: plan.billingPeriod,
        networkId,
        txHash,
        notes: notes.trim() || undefined,
      });
      setStep("submitted");
    } catch (err) {
      setError(formatAppError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-border bg-card p-0 gap-0">
        <div className="border-b border-border bg-muted/40 px-5 py-5 sm:px-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl tracking-tight">
              {t("subscriptionModal.checkoutTitle")}
            </DialogTitle>
            <DialogDescription>
              {step === "submitted"
                ? t("subscriptionModal.submittedDescription")
                : step === "confirm"
                  ? t("subscriptionModal.confirmDescription")
                  : t("subscriptionModal.checkoutDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tc("labels.plan")}
                </p>
                <p className="mt-0.5 text-base font-semibold">{planName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{periodLabel}</p>
                {plan.billingPeriod === "semiannual" ? (
                  <span className="mt-2 inline-flex rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-background">
                    {t("pricing.plans.pro.bestValueBadge")}
                  </span>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("subscriptionModal.amountLabel")}
                </p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums">
                  {amount}{" "}
                  <span className="text-sm font-semibold text-muted-foreground">USDT</span>
                </p>
                <p className="mt-1 text-xs font-medium text-primary">
                  {t("subscriptionModal.payWithUsdt")}
                </p>
              </div>
            </div>
          </div>

          {step === "pay" ? (
            <>
              <div>
                <p className="mb-2 text-sm font-semibold">{t("subscriptionModal.chooseNetwork")}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {USDT_SUBSCRIPTION_DEPOSITS.map((network) => {
                    const selected = network.id === networkId;
                    return (
                      <button
                        key={network.id}
                        type="button"
                        onClick={() => setNetworkId(network.id)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-card hover:bg-muted/40",
                        )}
                      >
                        <p className="text-sm font-semibold">{network.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex flex-col items-center gap-2 sm:items-start">
                    <img
                      src="/assets/currencies/usdt.svg"
                      alt="USDT"
                      width={36}
                      height={36}
                      className="h-9 w-9"
                    />
                    <PaymentQr value={deposit.address} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {tc("labels.network")}
                      </p>
                      <p className="text-base font-semibold">{deposit.label}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("subscriptionModal.amountLabel")}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold tabular-nums">{amount} USDT</p>
                        <CopyFieldButton
                          value={String(amount)}
                          label={t("subscriptionModal.copyAmount")}
                          copiedLabel={tc("buttons.copied")}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {tc("labels.walletAddress")}
                      </p>
                      <p className="mt-1 break-all font-mono text-sm leading-snug">
                        {deposit.address}
                      </p>
                      <div className="mt-2">
                        <CopyFieldButton
                          value={deposit.address}
                          label={t("subscriptionModal.copyAddress")}
                          copiedLabel={tc("buttons.copied")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-warning/35 bg-warning/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">
                    {t("subscriptionModal.networkWarningPrimary", { network: deposit.label })}
                  </p>
                  <p className="text-muted-foreground">
                    {t("subscriptionModal.networkWarningSecondary")}
                  </p>
                </div>
              </div>

              <Button type="button" size="lg" className="w-full" onClick={() => setStep("confirm")}>
                {t("subscriptionModal.iveSentPayment")}
              </Button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                {t("subscriptionModal.confirmHint", {
                  amount: `${amount} USDT`,
                  network: deposit.label,
                })}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="usdt-txid">{t("subscriptionModal.txHashLabel")}</Label>
                  <Input
                    id="usdt-txid"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder={t("subscriptionModal.txHashPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usdt-notes">
                    {t("subscriptionModal.notesLabel")}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({t("subscriptionModal.optional")})
                    </span>
                  </Label>
                  <Textarea
                    id="usdt-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("subscriptionModal.notesPlaceholder")}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p>{t("subscriptionModal.neverShareSecrets")}</p>
              </div>

              {error ? <FormError message={error} /> : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="sm:flex-1"
                  onClick={() => setStep("pay")}
                >
                  {tc("buttons.back")}
                </Button>
                <Button
                  type="button"
                  className="sm:flex-1"
                  disabled={submitting || !txHash.trim()}
                  onClick={handleSubmit}
                >
                  {submitting ? tc("buttons.loading") : t("subscriptionModal.submitForReview")}
                </Button>
              </div>
            </>
          ) : null}

          {step === "submitted" ? (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-lg font-semibold">{t("subscriptionModal.submittedTitle")}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("subscriptionModal.submittedBody")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                {t("subscriptionModal.close")}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
