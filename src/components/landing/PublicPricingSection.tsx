import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserPlan } from "@/lib/admin/plans";
import {
  PRO_MONTHLY_PRICE_USD,
  PRO_SEMIANNUAL_MONTHLY_EQUIVALENT_TOTAL_USD,
  PRO_SEMIANNUAL_PER_MONTH_USD,
  PRO_SEMIANNUAL_PRICE_USD,
  PRO_SEMIANNUAL_SAVE_PERCENT,
  PRO_SEMIANNUAL_SAVINGS_USD,
  getProCheckoutPrice,
  type PublicBillingPeriod,
} from "@/lib/billing/public-pricing";

export type PublicProCheckoutSelection = {
  planKey: "pro";
  price: number;
  billingPeriod: PublicBillingPeriod;
};

const FREE_FEATURES = [
  "documents",
  "pdf",
  "paymentPages",
  "payments",
  "dashboard",
  "branding",
  "qr",
  "excel",
  "multiCurrency",
  "footer",
] as const;

const PRO_FEATURES = [
  "documents",
  "savedPaymentMethods",
  "everythingFree",
  "prioritySupport",
  "earlyAccess",
  "footer",
] as const;

type Props = {
  currentPlan: UserPlan | null;
  isAuthenticated: boolean;
  onSelectPro: (selection: PublicProCheckoutSelection) => void;
};

export function PublicPricingSection({ currentPlan, isAuthenticated, onSelectPro }: Props) {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const [billingPeriod, setBillingPeriod] = useState<PublicBillingPeriod>("semiannual");

  const freeCta = useMemo(() => {
    if (currentPlan === "free") {
      return { label: t("pricing.plans.free.ctaCurrent"), href: "/dashboard" as const };
    }
    if (currentPlan) {
      return { label: t("pricing.plans.free.cta"), href: "/dashboard" as const };
    }
    return { label: t("pricing.plans.free.cta"), href: "/register" as const };
  }, [currentPlan, t]);

  const proCtaLabel =
    currentPlan === "pro"
      ? t("pricing.plans.pro.ctaCurrent")
      : currentPlan === "business"
        ? t("pricing.plans.pro.ctaContact")
        : billingPeriod === "semiannual"
          ? t("pricing.plans.pro.ctaSemiannual", {
              price: `$${PRO_SEMIANNUAL_PRICE_USD}`,
            })
          : isAuthenticated
            ? t("pricing.plans.pro.ctaUpgrade")
            : t("pricing.plans.pro.cta");

  const handleProClick = () => {
    if (currentPlan === "business") {
      window.location.hash = "contact";
      return;
    }
    if (currentPlan === "pro") return;
    if (!isAuthenticated) {
      window.location.assign("/register");
      return;
    }
    onSelectPro({
      planKey: "pro",
      billingPeriod,
      price: getProCheckoutPrice(billingPeriod),
    });
  };

  return (
    <section id="pricing" className="py-24 bg-background scroll-mt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {t("pricing.eyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-slate">{t("pricing.subtitle")}</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl items-start gap-6 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-soft">
            <h3 className="text-lg font-semibold">{t("pricing.plans.free.name")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pricing.plans.free.description")}
            </p>
            <p className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">
              $0
              <span className="text-base font-medium text-muted-foreground">{tc("monthly")}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {FREE_FEATURES.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t(`pricing.plans.free.features.${key}`)}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="lg" className="mt-8 w-full">
              <Link to={freeCta.href}>{freeCta.label}</Link>
            </Button>
          </div>

          <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-elevated">
            <div className="absolute -top-3 left-6 right-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {t("pricing.plans.pro.recommendedBadge")}
              </span>
              {billingPeriod === "semiannual" ? (
                <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                  {t("pricing.plans.pro.bestValueBadge")}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border">
                  {t("pricing.plans.pro.launchPriceBadge")}
                </span>
              )}
            </div>

            <h3 className="mt-2 text-lg font-semibold">{t("pricing.plans.pro.name")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pricing.plans.pro.description")}
            </p>

            <div
              className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1"
              role="tablist"
              aria-label={t("pricing.plans.pro.billingAria")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={billingPeriod === "monthly"}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  billingPeriod === "monthly"
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setBillingPeriod("monthly")}
              >
                {t("pricing.plans.pro.billingMonthly")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={billingPeriod === "semiannual"}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  billingPeriod === "semiannual"
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setBillingPeriod("semiannual")}
              >
                {t("pricing.plans.pro.billingSemiannual", {
                  percent: PRO_SEMIANNUAL_SAVE_PERCENT,
                })}
              </button>
            </div>

            <div className="mt-6 space-y-2">
              {billingPeriod === "monthly" ? (
                <>
                  <p className="text-3xl font-bold tracking-tight sm:text-5xl">
                    ${PRO_MONTHLY_PRICE_USD}
                    <span className="text-base font-medium text-muted-foreground">
                      {tc("monthly")}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {t("pricing.plans.pro.launchPriceLabel")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("pricing.plans.pro.launchPriceSupport")}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-lg text-muted-foreground line-through tabular-nums">
                      ${PRO_SEMIANNUAL_MONTHLY_EQUIVALENT_TOTAL_USD}
                    </span>
                    <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-5xl">
                      ${PRO_SEMIANNUAL_PRICE_USD}
                    </span>
                    <span className="text-base font-medium text-muted-foreground">
                      {t("pricing.plans.pro.perSixMonths")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {t("pricing.plans.pro.saveAmount", {
                      amount: `$${PRO_SEMIANNUAL_SAVINGS_USD}`,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("pricing.plans.pro.perMonthEquivalent", {
                      amount: `$${PRO_SEMIANNUAL_PER_MONTH_USD.toFixed(2)}`,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("pricing.plans.pro.semiannualSupport", {
                      offer: `$${PRO_SEMIANNUAL_PRICE_USD}`,
                      monthlyTotal: `$${PRO_SEMIANNUAL_MONTHLY_EQUIVALENT_TOTAL_USD}`,
                    })}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("pricing.plans.pro.limitedLaunchOffer")}
                  </p>
                </>
              )}
            </div>

            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {PRO_FEATURES.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t(`pricing.plans.pro.features.${key}`)}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="hero"
              size="lg"
              className="mt-8 w-full"
              disabled={currentPlan === "pro"}
              onClick={handleProClick}
            >
              {proCtaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
