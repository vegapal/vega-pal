import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getInvoicePlanUsage, type InvoicePlanUsage } from "@/lib/vegapal-store";
import {
  FREE_PLAN_MONTHLY_INVOICE_LIMIT,
  isAtFreePlanInvoiceLimit,
  isNearFreePlanInvoiceLimit,
} from "@/lib/plan/invoice-limit";

type InvoicePlanUsageIndicatorProps = {
  className?: string;
  showUpgradeWhenLimited?: boolean;
};

export function InvoicePlanUsageIndicator({
  className,
  showUpgradeWhenLimited = false,
}: InvoicePlanUsageIndicatorProps) {
  const { t } = useTranslation("common");
  const [usage, setUsage] = useState<InvoicePlanUsage | null>(null);

  useEffect(() => {
    void getInvoicePlanUsage().then(setUsage);
  }, []);

  if (!usage) return null;

  const limited = isAtFreePlanInvoiceLimit(usage);
  const nearLimit = isNearFreePlanInvoiceLimit(usage);
  const isFree = usage.monthlyLimit !== null;
  const progressValue = isFree
    ? Math.min(100, (usage.invoicesThisMonth / usage.monthlyLimit!) * 100)
    : 0;
  const planLabel = t(`plan.badges.${usage.plan}`);

  return (
    <div className={className}>
      <p className="text-sm font-medium text-foreground">
        {t("plan.planLabel", { plan: planLabel })}
      </p>
      <p className="text-sm text-muted-foreground mt-0.5">
        {isFree
          ? t("plan.usageFree", {
              used: usage.invoicesThisMonth,
              limit: usage.monthlyLimit,
            })
          : t("plan.usageUnlimited")}
      </p>
      {!isFree && usage.endsAt ? (
        <p className="text-xs text-muted-foreground mt-1">
          {usage.cancelAtPeriodEnd
            ? t("plan.expiresOn", { date: new Date(usage.endsAt).toLocaleDateString() })
            : t("plan.renewsOn", { date: new Date(usage.endsAt).toLocaleDateString() })}
        </p>
      ) : null}

      {isFree ? (
        <Progress value={progressValue} className="mt-2 h-2" aria-label={t("plan.usageFree", {
          used: usage.invoicesThisMonth,
          limit: usage.monthlyLimit,
        })} />
      ) : null}

      {isFree && nearLimit && !limited ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm leading-relaxed text-foreground">
            {t("plan.warningNearLimit", {
              used: usage.invoicesThisMonth,
              limit: usage.monthlyLimit ?? FREE_PLAN_MONTHLY_INVOICE_LIMIT,
            })}
          </p>
        </div>
      ) : null}

      {showUpgradeWhenLimited && limited ? (
        <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
          <p className="text-sm leading-relaxed">{t("plan.limitReached")}</p>
          <Button asChild size="sm" variant="hero">
            <Link to="/" hash="pricing">{t("plan.upgradeToPro")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link to="/settings/invite">{t("plan.inviteEarnCta")}</Link>
          </Button>
        </div>
      ) : null}

      {!isFree && usage.isExpiringSoon && usage.daysRemaining != null && usage.daysRemaining >= 0 ? (
        <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
          <p className="text-sm leading-relaxed">
            {usage.daysRemaining === 0
              ? t("plan.expiresToday")
              : t("plan.expiresInDays", { count: usage.daysRemaining, plan: planLabel })}
          </p>
          <Button asChild size="sm" variant="hero">
            <Link to="/" hash="pricing">{t("plan.renewPlan")}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
