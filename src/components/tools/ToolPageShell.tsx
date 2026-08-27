import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Wrench } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PublicSiteFooter } from "@/components/landing/PublicSiteFooter";
import { SeoBreadcrumb } from "@/components/seo/SeoBreadcrumb";
import { SessionAwareCta } from "@/components/seo/SessionAwareCta";
import { getMarketingPage } from "@/lib/seo/marketing-pages";
import { getTool, type ToolDefinition } from "@/lib/seo/tools-registry";

type ToolPageShellProps = {
  tool: ToolDefinition;
  /** The interactive calculator or generator. */
  children: ReactNode;
};

export function ToolPageShell({ tool, children }: ToolPageShellProps) {
  const relatedTools = tool.relatedToolSlugs.map((slug) => getTool(slug));
  const relatedPages = tool.relatedPageSlugs.map((slug) => getMarketingPage(slug));

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <LandingHeader />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-16">
          <SeoBreadcrumb
            items={[
              { name: "Home", href: "/" },
              { name: "Tools", href: "/tools" },
              { name: tool.name },
            ]}
          />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1.5 text-xs sm:text-sm font-semibold text-on-dark-secondary">
            <Wrench className="h-3.5 w-3.5 text-primary" aria-hidden />
            {tool.eyebrow}
          </p>
          <h1 className="mt-5 text-[1.7rem] leading-[1.15] sm:text-3xl lg:text-[2.4rem] font-bold tracking-tight text-balance text-on-dark">
            {tool.h1}
          </h1>
          <p className="mt-5 text-[0.95rem] sm:text-lg text-on-dark-secondary leading-relaxed">
            {tool.intro}
          </p>
        </div>
      </section>

      <main>
        <section className="py-10 sm:py-14 bg-canvas">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 lg:p-8 shadow-elevated">
              {children}
            </div>

            {tool.disclaimer ? (
              <div className="mt-6 flex gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 sm:p-5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <p className="text-sm leading-relaxed text-amber-900">{tool.disclaimer}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="pb-14 sm:pb-20 bg-canvas">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-10">
            {tool.sections.map((section) => (
              <article key={section.heading}>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink text-balance">
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

        <section className="py-14 sm:py-20 bg-soft-section border-y border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="rounded-3xl bg-hero relative overflow-hidden p-6 sm:p-10">
              <div className="absolute inset-0 bg-mesh opacity-80" />
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-dark text-balance max-w-xl">
                    {tool.ctaHeading}
                  </h2>
                  <p className="mt-3 text-on-dark-secondary max-w-xl">{tool.ctaBody}</p>
                </div>
                <SessionAwareCta
                  className="shrink-0"
                  primaryLabel={tool.ctaLabel}
                  eventName="tool_cta_clicked"
                  pageSlug={tool.slug}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20 bg-canvas">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
              {tool.faqs.map((faq) => (
                <details key={faq.question} className="group p-5">
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
          <div className="mx-auto max-w-4xl px-4 sm:px-6 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Other free tools</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {relatedTools.map((related) => (
                  <li key={related.slug}>
                    <Link
                      to="/tools/$slug"
                      params={{ slug: related.slug }}
                      className="text-primary hover:underline"
                    >
                      {related.name}
                    </Link>
                    <span className="text-slate"> — {related.summary}</span>
                  </li>
                ))}
                <li>
                  <Link to="/tools" className="text-primary hover:underline">
                    All tools
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Read more</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {relatedPages.map((page) => (
                  <li key={page.slug}>
                    <a href={page.path} className="text-primary hover:underline">
                      {page.h1}
                    </a>
                  </li>
                ))}
                <li>
                  <Link to="/learn" className="text-primary hover:underline">
                    VegaPal Learn guides
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
