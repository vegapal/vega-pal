import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PublicSiteFooter } from "@/components/landing/PublicSiteFooter";
import { TelegramIcon } from "@/components/icons/TelegramIcon";
import {
  VEGAPAL_SUPPORT_AVAILABILITY,
  VEGAPAL_SUPPORT_EMAIL,
  VEGAPAL_SUPPORT_EMAIL_HREF,
  VEGAPAL_SUPPORT_TELEGRAM_HANDLE,
  VEGAPAL_SUPPORT_TELEGRAM_HREF,
  VEGAPAL_SUPPORT_TRUST,
} from "@/lib/support-contact";
import { cn } from "@/lib/utils";
import { LANDING_JSON_LD } from "@/lib/seo/landing-json-ld";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  absoluteUrl,
} from "@/lib/seo/site";
import {
  Wallet, Zap, Globe2, ArrowRight, Check, FileText, BarChart3,
  Sparkles, Banknote, Mail, Headphones, BadgeCheck,
} from "lucide-react";
import { useSession } from "@/lib/vegapal-store";
import type { UserPlan } from "@/lib/admin/plans";

const LiveCurrencyConverter = lazy(() =>
  import("@/components/landing/LiveCurrencyConverter").then((m) => ({
    default: m.LiveCurrencyConverter,
  })),
);

const SubscriptionPaymentModal = lazy(() =>
  import("@/components/landing/SubscriptionPaymentModal").then((m) => ({
    default: m.SubscriptionPaymentModal,
  })),
);

type SubscriptionPlan = import("@/components/landing/SubscriptionPaymentModal").SubscriptionPlan;

function PricingCard({
  name,
  description,
  price,
  features,
  cta,
  variant,
  popular = false,
  href,
  onCtaClick,
  disabled = false,
}: {
  name: string;
  description: string;
  price: number;
  features: string[];
  cta: string;
  variant: "outline" | "hero";
  popular?: boolean;
  href?: string;
  onCtaClick?: () => void;
  disabled?: boolean;
}) {
  const { t: tc } = useTranslation("common");

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-8 flex flex-col relative shadow-soft",
        popular ? "border-2 border-primary shadow-elevated" : "border-border",
      )}
    >
      {popular && (
        <span className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {tc("popular")}
        </span>
      )}
      <h3 className="font-semibold text-lg">{name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <p className="mt-6 text-3xl sm:text-5xl font-bold tracking-tight">
        ${price}
        <span className="text-base text-muted-foreground font-medium">{tc("monthly")}</span>
      </p>
      <ul className="mt-6 space-y-3 text-sm flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {href ? (
        <Button asChild variant={variant} size="lg" className="mt-8 w-full" disabled={disabled}>
          <Link to={href}>{cta}</Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant={variant}
          size="lg"
          className="mt-8 w-full"
          onClick={onCtaClick}
          disabled={disabled || !onCtaClick}
        >
          {cta}
        </Button>
      )}
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESCRIPTION },
      { property: "og:title", content: DEFAULT_TITLE },
      { property: "og:description", content: DEFAULT_DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: DEFAULT_TITLE },
      { name: "twitter:description", content: DEFAULT_DESCRIPTION },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(LANDING_JSON_LD),
      },
    ],
  }),
  component: Landing,
});

const FEATURE_ITEMS = [
  { icon: Zap, key: "fastPayments" },
  { icon: Wallet, key: "directWallet" },
  { icon: Globe2, key: "multiplePayments" },
  { icon: FileText, key: "professionalInvoices" },
  { icon: BarChart3, key: "dashboard" },
  { icon: Sparkles, key: "trusted" },
] as const;

const HOW_IT_WORKS_STEPS = [
  { n: "01", key: "create" },
  { n: "02", key: "share" },
  { n: "03", key: "getPaid" },
] as const;

const FREE_PLAN_FEATURES = [
  "invoices", "pdf", "paymentPages", "payments", "dashboard", "branding",
  "qr", "excel", "reports", "multiCurrency", "footer",
] as const;

const PRO_PLAN_FEATURES = [
  "invoices", "users", "everythingFree", "prioritySupport", "earlyAccess", "footer",
] as const;

const BUSINESS_PLAN_FEATURES = [
  "invoices", "users", "everythingPro", "teamManagement", "multipleWallets",
  "analytics", "api", "prioritySupport", "footer",
] as const;

function Landing() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const { user, loading: sessionLoading } = useSession();
  const isAuthenticated = Boolean(user);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan | null>(null);
  const currentPlan = (user?.plan ?? null) as UserPlan | null;

  const freeCta =
    currentPlan === "free"
      ? { label: t("pricing.plans.free.ctaCurrent"), href: "/dashboard" as const, onClick: undefined }
      : currentPlan
        ? { label: t("pricing.plans.free.cta"), href: "/dashboard" as const, onClick: undefined }
        : { label: t("pricing.plans.free.cta"), href: "/register" as const, onClick: undefined };

  const proCta =
    currentPlan === "pro"
      ? { label: t("pricing.plans.pro.ctaCurrent"), href: undefined, onClick: undefined, disabled: true }
      : currentPlan === "business"
        ? { label: t("pricing.plans.pro.ctaContact"), href: "/#contact" as const, onClick: undefined }
        : currentPlan === "free"
          ? {
              label: t("pricing.plans.pro.ctaUpgrade"),
              href: undefined,
              onClick: () => setSubscriptionPlan({ planKey: "pro", price: 19 }),
            }
          : {
              label: t("pricing.plans.pro.cta"),
              href: undefined,
              onClick: () => setSubscriptionPlan({ planKey: "pro", price: 19 }),
            };

  const businessCta =
    currentPlan === "business"
      ? { label: t("pricing.plans.business.ctaCurrent"), href: undefined, onClick: undefined, disabled: true }
      : currentPlan === "pro" || currentPlan === "free"
        ? {
            label: t("pricing.plans.business.ctaUpgrade"),
            href: undefined,
            onClick: () => setSubscriptionPlan({ planKey: "business", price: 49 }),
          }
        : {
            label: t("pricing.plans.business.cta"),
            href: undefined,
            onClick: () => setSubscriptionPlan({ planKey: "business", price: 49 }),
          };

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      {subscriptionPlan !== null && (
        <Suspense fallback={null}>
          <SubscriptionPaymentModal
            plan={subscriptionPlan}
            open
            onOpenChange={(open) => {
              if (!open) setSubscriptionPlan(null);
            }}
          />
        </Suspense>
      )}
      <LandingHeader />

      {/* HERO */}
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-24 sm:pt-28 pb-14 sm:pb-20 lg:pt-32 lg:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1.5 text-xs sm:text-sm font-semibold text-on-dark-secondary mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {t("hero.badge")}
            </div>
            <h1 className="text-[1.65rem] leading-[1.15] sm:text-3xl lg:text-[2.75rem] font-bold tracking-tight text-balance text-on-dark">
              <span className="block">{t("hero.headlineLine1")}</span>
              <span className="block mt-1.5 lg:mt-2">
                {t("hero.headlineLine2Prefix")}{" "}
                <span className="text-primary">{t("hero.headlineLine2Highlight")}</span>{" "}
                {t("hero.headlineLine2Suffix")}
              </span>
              <span className="block mt-1.5 lg:mt-2">{t("hero.headlineLine3")}</span>
            </h1>
            <p className="mt-4 sm:mt-5 text-[0.95rem] sm:text-base text-on-dark-secondary max-w-lg leading-relaxed">
              {t("hero.description")}
            </p>
            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              {sessionLoading ? (
                <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3" aria-hidden>
                  <div className="h-11 w-full sm:w-52 rounded-md bg-white/10" />
                  <div className="h-11 w-full sm:w-40 rounded-md bg-white/10" />
                </div>
              ) : isAuthenticated ? (
                <>
                  <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
                    <Link to="/invoices/new" preload="intent">
                      {t("hero.createNewDocument")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghostLight" size="lg" className="w-full sm:w-auto">
                    <Link to="/dashboard" preload="intent">
                      {t("hero.goToDashboard")}
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
                    <Link to="/register" preload="intent">
                      {t("hero.createFirstInvoice")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghostLight" size="lg" className="w-full sm:w-auto">
                    <a href="#demo-invoice">{t("hero.viewDemoInvoice")}</a>
                  </Button>
                </>
              )}
            </div>
            <ul className="mt-7 sm:mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2 text-sm text-on-dark-secondary">
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                {t("hero.features.pdfInvoices")}
              </li>
              <li className="flex items-center gap-2 font-semibold text-on-dark">
                <Banknote className="h-4 w-4 text-primary shrink-0" />
                {t("hero.features.paymentMethods")}
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                {t("hero.features.verifiedPages")}
              </li>
            </ul>
          </div>

          {/* Premium marketing visual */}
          <div
            id="demo-invoice"
            className="relative scroll-mt-24 sm:scroll-mt-28 w-full min-w-0 max-w-full lg:justify-self-end"
          >
            <div
              className={cn(
                "relative mx-auto w-full max-w-[min(100%,40rem)] lg:max-w-[42.5rem] xl:max-w-[45rem]",
                "rounded-2xl sm:rounded-3xl overflow-hidden",
                "bg-white/5 ring-1 ring-white/10 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.45)]",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
              )}
            >
              <img
                src="/marketing/hero-invoice-dashboard.png"
                alt="VegaPal dashboard and invoice payment interface"
                width={1448}
                height={1086}
                decoding="async"
                fetchPriority="high"
                className="block w-full h-auto aspect-[1448/1086] object-contain object-center select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Converter — light section so the card does not merge into the navy hero */}
      <section className="bg-soft-section border-y border-border">
        <Suspense
          fallback={
            <div
              id="converter"
              className="py-14 lg:py-20 min-h-[320px] animate-pulse"
              aria-hidden
            />
          }
        >
          <LiveCurrencyConverter />
        </Suspense>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-canvas">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("features.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance text-ink">
              {t("features.title")}
            </h2>
            <p className="mt-4 text-lg text-slate">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {FEATURE_ITEMS.map((f) => (
              <div key={f.key} className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-elevated transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-ink">{t(`features.items.${f.key}.title`)}</h3>
                <p className="mt-2 text-sm text-slate leading-relaxed">{t(`features.items.${f.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-soft-section border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("howItWorks.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink">{t("howItWorks.title")}</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-card border border-border p-7 shadow-soft">
                <span className="text-primary font-mono text-sm font-semibold">{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold text-ink">{t(`howItWorks.steps.${s.key}`)}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("pricing.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink">{t("pricing.title")}</h2>
            <p className="mt-4 text-slate">
              {t("pricing.subtitle")}
            </p>
          </div>
          <div className="mt-14 grid lg:grid-cols-3 gap-6">
            <PricingCard
              name={t("pricing.plans.free.name")}
              description={t("pricing.plans.free.description")}
              price={0}
              features={FREE_PLAN_FEATURES.map((key) => t(`pricing.plans.free.features.${key}`))}
              cta={freeCta.label}
              variant="outline"
              href={freeCta.href}
            />
            <PricingCard
              name={t("pricing.plans.pro.name")}
              description={t("pricing.plans.pro.description")}
              price={19}
              popular
              features={PRO_PLAN_FEATURES.map((key) => t(`pricing.plans.pro.features.${key}`))}
              cta={proCta.label}
              variant="hero"
              href={proCta.href}
              onCtaClick={proCta.onClick}
              disabled={Boolean(proCta.disabled)}
            />
            <PricingCard
              name={t("pricing.plans.business.name")}
              description={t("pricing.plans.business.description")}
              price={49}
              features={BUSINESS_PLAN_FEATURES.map((key) => t(`pricing.plans.business.features.${key}`))}
              cta={businessCta.label}
              variant="outline"
              href={businessCta.href}
              onCtaClick={businessCta.onClick}
              disabled={Boolean(businessCta.disabled)}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 bg-canvas">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-hero relative overflow-hidden p-6 sm:p-10 lg:p-16">
            <div className="absolute inset-0 bg-mesh opacity-80" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight max-w-xl text-balance text-on-dark">
                  {t("cta.title")}
                </h2>
                <p className="mt-3 text-on-dark-secondary max-w-lg">
                  {t("cta.subtitle")}
                </p>
              </div>
              <Button asChild variant="hero" size="xl" className="w-full sm:w-auto shrink-0">
                <Link to="/register">
                  {t("cta.button")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="relative py-24 bg-hero overflow-hidden scroll-mt-28">
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("contact.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-dark">{t("contact.title")}</h2>
            <p className="mt-4 text-lg text-on-dark-secondary">
              {t("contact.subtitle")}
            </p>
            <p className="mt-3 text-sm text-on-dark-muted max-w-2xl mx-auto leading-relaxed">
              {VEGAPAL_SUPPORT_TRUST}
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            <a
              href={VEGAPAL_SUPPORT_EMAIL_HREF}
              className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 transition-colors hover:bg-white/[0.08]"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg text-on-dark">{t("contact.email.title")}</h3>
              <p className="mt-2 text-sm text-primary group-hover:underline">{VEGAPAL_SUPPORT_EMAIL}</p>
            </a>

            <a
              href={VEGAPAL_SUPPORT_TELEGRAM_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 transition-colors hover:bg-white/[0.08]"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                <TelegramIcon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg text-on-dark">{t("contact.telegram.title")}</h3>
              <p className="mt-2 text-sm text-primary group-hover:underline">{VEGAPAL_SUPPORT_TELEGRAM_HANDLE}</p>
            </a>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                <Headphones className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg text-on-dark">{t("contact.liveSupport.title")}</h3>
              <p className="mt-2 text-sm text-on-dark-secondary">{VEGAPAL_SUPPORT_AVAILABILITY}</p>
            </div>
          </div>
        </div>
      </section>

      <PublicSiteFooter copyright={tc("footer.copyright", { year: new Date().getFullYear() })} />
    </div>
  );
}
