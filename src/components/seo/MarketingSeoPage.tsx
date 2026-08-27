import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PublicSiteFooter } from "@/components/landing/PublicSiteFooter";
import { SeoBreadcrumb } from "@/components/seo/SeoBreadcrumb";
import { SessionAwareCta } from "@/components/seo/SessionAwareCta";
import { FREE_PLAN_MONTHLY_INVOICE_LIMIT } from "@/lib/admin/plans";
import {
  getMarketingPage,
  getPrimaryHubFor,
  listHubSiblings,
  type MarketingPage,
} from "@/lib/seo/marketing-pages";

type MarketingSeoPageProps = {
  page: MarketingPage;
};

export function MarketingSeoPage({ page }: MarketingSeoPageProps) {
  const related = page.relatedSlugs.map((slug) => getMarketingPage(slug));
  const hub = getPrimaryHubFor(page);

  // Modest cluster strip: hub siblings that are not already in the related grid.
  const relatedSlugSet = new Set(page.relatedSlugs);
  const clusterLinks = listHubSiblings(page, 12)
    .filter((sibling) => !relatedSlugSet.has(sibling.slug))
    .slice(0, 6);

  const breadcrumbItems = hub
    ? [{ name: "Home", href: "/" }, { name: hub.label, href: hub.path }, { name: page.eyebrow }]
    : [{ name: "Home", href: "/" }, { name: page.eyebrow }];

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <LandingHeader />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-24 sm:pt-32 pb-14 sm:pb-20">
          <SeoBreadcrumb items={breadcrumbItems} />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1.5 text-xs sm:text-sm font-semibold text-on-dark-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            {page.eyebrow}
          </p>
          <h1 className="mt-5 text-[1.7rem] leading-[1.15] sm:text-3xl lg:text-[2.6rem] font-bold tracking-tight text-balance text-on-dark">
            {page.h1}
          </h1>
          <p className="mt-5 text-[0.95rem] sm:text-lg text-on-dark-secondary max-w-3xl leading-relaxed">
            {page.intro}
          </p>
          <SessionAwareCta
            className="mt-7"
            primaryLabel={page.primaryCtaLabel}
            secondaryLabel={page.secondaryCtaLabel}
            secondaryHref={page.secondaryHref}
            eventName="seo_page_cta"
            pageSlug={page.slug}
          />
        </div>
      </section>

      <main>
        <section className="py-16 sm:py-20 bg-canvas">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
            {page.sections.map((section) => (
              <article key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink text-balance">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-[0.95rem] sm:text-base text-slate leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="use-cases"
          className="py-16 sm:py-20 bg-soft-section border-y border-border scroll-mt-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink">
              Who this is for
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {page.useCases.map((useCase) => (
                <div
                  key={useCase.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Check className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-ink">{useCase.title}</h3>
                  <p className="mt-2 text-sm text-slate leading-relaxed">{useCase.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 sm:py-20 bg-canvas scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink">
              How it works
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-2">
              {page.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft"
                >
                  <span className="text-primary font-mono text-sm font-semibold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-soft-section border-y border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink">
              Related pages
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <a
                  key={item.slug}
                  href={`/${item.slug}`}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {item.eyebrow}
                  </span>
                  <p className="mt-2 font-semibold text-ink group-hover:text-primary transition-colors">
                    {item.h1}
                  </p>
                </a>
              ))}
            </div>
            {clusterLinks.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate">
                  More in {hub ? hub.label : "this cluster"}
                </h3>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {clusterLinks.map((item) => (
                    <li key={item.slug}>
                      <a href={item.path} className="text-primary hover:underline">
                        {item.eyebrow}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-8 text-sm text-slate">
              Free calculators for due dates, VAT and late fees live in the{" "}
              <Link to="/tools" className="text-primary hover:underline">
                tools hub
              </Link>
              .
            </p>

            <p className="mt-3 text-sm text-slate">
              Prefer background reading first? The{" "}
              <Link to="/learn" className="text-primary hover:underline">
                VegaPal Learn guides
              </Link>{" "}
              cover invoicing and payments in more depth, and{" "}
              <Link to="/pricing" className="text-primary hover:underline">
                pricing
              </Link>{" "}
              lists what each plan includes.
            </p>
          </div>
        </section>

        <section id="faq" className="py-16 sm:py-20 bg-canvas scroll-mt-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="group p-5 sm:p-6">
                  <summary className="cursor-pointer list-none font-semibold text-ink flex items-start justify-between gap-4">
                    {faq.question}
                    <span
                      aria-hidden
                      className="text-primary shrink-0 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-slate leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16 sm:pb-24 bg-canvas">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl bg-hero relative overflow-hidden p-6 sm:p-10 lg:p-14">
              <div className="absolute inset-0 bg-mesh opacity-80" />
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-on-dark text-balance max-w-xl">
                    {page.primaryCtaLabel} with VegaPal
                  </h2>
                  <p className="mt-3 text-on-dark-secondary max-w-xl">
                    The free plan covers {FREE_PLAN_MONTHLY_INVOICE_LIMIT} documents a month, with
                    PDF downloads and shareable payment pages included.
                  </p>
                </div>
                <SessionAwareCta
                  className="shrink-0"
                  primaryLabel={page.primaryCtaLabel}
                  eventName="seo_page_cta"
                  pageSlug={page.slug}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
