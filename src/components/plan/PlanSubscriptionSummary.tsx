import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlanBadge } from "@/components/admin/AdminBadges";
import { getInvoicePlanUsage, type InvoicePlanUsage } from "@/lib/vegapal-store";
import { FREE_PLAN_MONTHLY_INVOICE_LIMIT } from "@/lib/plan/invoice-limit";

function formatPlanDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function PlanSubscriptionSummary() {
  const { t, i18n } = useTranslation("common");
  const { t: ts } = useTranslation("settings");
  const [usage, setUsage] = useState<InvoicePlanUsage | null>(null);

  useEffect(() => {
    void getInvoicePlanUsage().then(setUsage);
  }, []);

  if (!usage) {
    return <p className="text-sm text-muted-foreground">{ts("sections.plan.loading")}</p>;
  }

  const isFree = usage.plan === "free";
  const progressValue =
    isFree && usage.monthlyLimit
      ? Math.min(100, (usage.invoicesThisMonth / usage.monthlyLimit) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <PlanBadge plan={usage.plan} />
        <span className="text-sm text-muted-foreground">
          {isFree ? t("plan.status.active") : t(`plan.status.${usage.cancelAtPeriodEnd ? "cancelsAtPeriodEnd" : "active"}`)}
        </span>
      </div>

      {isFree ? (
        <div className="space-y-2">
          <p className="text-sm text-foreground">
            {t("plan.freeAllowance", { limit: FREE_PLAN_MONTHLY_INVOICE_LIMIT })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("plan.usageFree", {
              used: usage.invoicesThisMonth,
              limit: usage.monthlyLimit ?? FREE_PLAN_MONTHLY_INVOICE_LIMIT,
            })}
          </p>
          <Progress value={progressValue} className="h-2" />
        </div>
      ) : (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{t("plan.usageUnlimited")}</p>
          {usage.startsAt ? (
            <p>
              <span className="text-muted-foreground">{t("plan.started")}: </span>
              {formatPlanDate(usage.startsAt, i18n.language)}
            </p>
          ) : null}
          {usage.endsAt ? (
            <p>
              <span className="text-muted-foreground">{t("plan.expires")}: </span>
              {formatPlanDate(usage.endsAt, i18n.language)}
            </p>
          ) : null}
          {usage.isExpiringSoon && usage.daysRemaining != null && usage.daysRemaining >= 0 ? (
            <p className="text-warning">
              {usage.daysRemaining === 0
                ? t("plan.expiresToday")
                : t("plan.expiresInDays", { count: usage.daysRemaining, plan: t(`plan.badges.${usage.plan}`) })}
            </p>
          ) : null}
        </div>
      )}

      <Button asChild size="sm" variant={isFree ? "hero" : "outline"}>
        <Link to="/" hash="pricing">
          {isFree ? t("plan.viewPlans") : t("plan.renewPlan")}
        </Link>
      </Button>
    </div>
  );
}
