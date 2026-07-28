import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
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
  ShieldCheck, Zap, Globe2, ArrowRight, Check, FileText, BarChart3,
  Sparkles, Banknote, Mail, Headphones,
} from "lucide-react";

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

const DemoPaymentQr = lazy(() =>
  import("@/components/landing/PaymentQr").then((m) => ({
    default: function DeferredDemoQr({ value }: { value: string }) {
      return <m.PaymentQr value={value} defer />;
    },
  })),
);

type SubscriptionPlan = import("@/components/landing/SubscriptionPaymentModal").SubscriptionPlan;

const DEMO_WALLET = "TUckRdnGxRY7VehPLfu5RLz6QspQ8T4Sj5";

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
}) {
  const { t: tc } = useTranslation("common");

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-8 flex flex-col relative",
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
        <Button asChild variant={variant} size="lg" className="mt-8 w-full">
          <Link to={href}>{cta}</Link>
        </Button>
      ) : (
        <Button type="button" variant={variant} size="lg" className="mt-8 w-full" onClick={onCtaClick}>
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
  { icon: ShieldCheck, key: "directWallet" },
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
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan | null>(null);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
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
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-28 sm:pt-36 pb-16 sm:pb-24 lg:pt-44 lg:pb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="text-navy-foreground min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-lg font-bold text-navy-foreground/85 mb-5 sm:mb-6">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
              {t("hero.badge")}
            </div>
            <h1 className="text-[1.75rem] leading-[1.15] sm:text-4xl lg:text-[3.35rem] font-bold tracking-tight text-balance text-navy-foreground">
              <span className="block">{t("hero.headlineLine1")}</span>
              <span className="block mt-2 lg:mt-3">
                {t("hero.headlineLine2Prefix")}{" "}
                <span className="text-primary text-[1.05em] sm:text-[1.1em]">{t("hero.headlineLine2Highlight")}</span>{" "}
                {t("hero.headlineLine2Suffix")}
              </span>
              <span className="block mt-2 lg:mt-3">{t("hero.headlineLine3")}</span>
            </h1>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg text-navy-foreground/70 max-w-xl leading-relaxed">
              {t("hero.description")}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
                <Link to="/register" preload="intent">
                  {t("hero.createFirstInvoice")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghostLight" size="xl" className="w-full sm:w-auto">
                <a href="#demo-invoice">{t("hero.viewDemoInvoice")}</a>
              </Button>
            </div>
            <ul className="mt-8 sm:mt-10 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3 text-sm text-navy-foreground/70">
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                {t("hero.features.pdfInvoices")}
              </li>
              <li className="flex items-center gap-2 font-semibold text-navy-foreground">
                <Banknote className="h-4 w-4 text-primary shrink-0" />
                {t("hero.features.paymentMethods")}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                {t("hero.features.verifiedPages")}
              </li>
            </ul>
          </div>

          {/* Mock invoice card */}
          <div id="demo-invoice" className="relative scroll-mt-24 sm:scroll-mt-28 w-full min-w-0 max-w-full">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
            <div className="relative rounded-2xl bg-background shadow-elevated border border-border overflow-hidden w-full">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive/70" />
                  <div className="h-2 w-2 rounded-full bg-warning/70" />
                  <div className="h-2 w-2 rounded-full bg-success/70" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">INV-0042</span>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("hero.demo.billedTo")}</p>
                    <p className="font-semibold">{t("hero.demo.clientName")}</p>
                    <p className="text-sm text-muted-foreground break-all">{t("hero.demo.clientEmail")}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-success/15 text-success text-xs sm:text-sm font-semibold ring-1 ring-success/25 self-start shrink-0">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    {t("hero.demo.paid")}
                  </span>
                </div>
                <p className="text-sm text-[#111827] font-semibold mb-2">
                  {t("hero.demo.title")}
                </p>
                <p className="text-[1.75rem] sm:text-[2.75rem] lg:text-5xl font-bold tracking-tight tabular-nums leading-none break-all sm:break-normal">
                  200,000.00{" "}
                  <span className="text-lg sm:text-xl lg:text-2xl text-muted-foreground font-semibold">USDT</span>
                </p>
                <div className="mt-6 rounded-xl bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    {t("hero.demo.cryptoPayment")}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Suspense
                      fallback={
                        <div
                          className="h-[132px] w-[132px] rounded-xl bg-muted animate-pulse shrink-0"
                          aria-hidden
                        />
                      }
                    >
                      <DemoPaymentQr value={DEMO_WALLET} />
                    </Suspense>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{tc("labels.network")}</p>
                        <p className="text-sm font-medium">{t("hero.demo.networkTron")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{tc("labels.walletAddress")}</p>
                        <p className="text-sm font-mono break-all leading-snug">{DEMO_WALLET}</p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        {tc("buttons.copyWallet")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div
              id="converter"
              className="border-t border-white/5 bg-navy/40 py-14 lg:py-20 min-h-[320px] animate-pulse"
              aria-hidden
            />
          }
        >
          <LiveCurrencyConverter />
        </Suspense>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("features.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance">
              {t("features.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {FEATURE_ITEMS.map((f) => (
              <div key={f.key} className="rounded-2xl border border-border bg-card p-6 hover:shadow-elevated transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t(`features.items.${f.key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`features.items.${f.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("howItWorks.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("howItWorks.title")}</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-background border border-border p-7">
                <span className="text-primary font-mono text-sm font-semibold">{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold">{t(`howItWorks.steps.${s.key}`)}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("pricing.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("pricing.title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>
          <div className="mt-14 grid lg:grid-cols-3 gap-6">
            <PricingCard
              name={t("pricing.plans.free.name")}
              description={t("pricing.plans.free.description")}
              price={0}
              features={FREE_PLAN_FEATURES.map((key) => t(`pricing.plans.free.features.${key}`))}
              cta={t("pricing.plans.free.cta")}
              variant="outline"
              href="/register"
            />
            <PricingCard
              name={t("pricing.plans.pro.name")}
              description={t("pricing.plans.pro.description")}
              price={19}
              popular
              features={PRO_PLAN_FEATURES.map((key) => t(`pricing.plans.pro.features.${key}`))}
              cta={t("pricing.plans.pro.cta")}
              variant="hero"
              onCtaClick={() => setSubscriptionPlan({ planKey: "pro", price: 19 })}
            />
            <PricingCard
              name={t("pricing.plans.business.name")}
              description={t("pricing.plans.business.description")}
              price={49}
              features={BUSINESS_PLAN_FEATURES.map((key) => t(`pricing.plans.business.features.${key}`))}
              cta={t("pricing.plans.business.cta")}
              variant="outline"
              onCtaClick={() => setSubscriptionPlan({ planKey: "business", price: 49 })}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-hero relative overflow-hidden p-6 sm:p-10 lg:p-16 text-navy-foreground">
            <div className="absolute inset-0 bg-mesh opacity-60" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight max-w-xl text-balance">
                  {t("cta.title")}
                </h2>
                <p className="mt-3 text-navy-foreground/70 max-w-lg">
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
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">{t("contact.eyebrow")}</p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy-foreground">{t("contact.title")}</h2>
            <p className="mt-4 text-lg text-navy-foreground/70">
              {t("contact.subtitle")}
            </p>
            <p className="mt-3 text-sm text-navy-foreground/60 max-w-2xl mx-auto leading-relaxed">
              {VEGAPAL_SUPPORT_TRUST}
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            <a
              href={VEGAPAL_SUPPORT_EMAIL_HREF}
              className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 transition-all duration-300 hover:bg-white/10 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg text-navy-foreground">{t("contact.email.title")}</h3>
              <p className="mt-2 text-sm text-primary group-hover:underline">{VEGAPAL_SUPPORT_EMAIL}</p>
            </a>

            <a
              href={VEGAPAL_SUPPORT_TELEGRAM_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 transition-all duration-300 hover:bg-white/10 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                <TelegramIcon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg text-navy-foreground">{t("contact.telegram.title")}</h3>
              <p className="mt-2 text-sm text-primary group-hover:underline">{VEGAPAL_SUPPORT_TELEGRAM_HANDLE}</p>
            </a>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5">
                <Headphones className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg text-navy-foreground">{t("contact.liveSupport.title")}</h3>
              <p className="mt-2 text-sm text-navy-foreground/70">{VEGAPAL_SUPPORT_AVAILABILITY}</p>
            </div>
          </div>
        </div>
      </section>

      <PublicSiteFooter copyright={tc("footer.copyright", { year: new Date().getFullYear() })} />
    </div>
  );
}
