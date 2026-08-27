import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Wrench } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PublicSiteFooter } from "@/components/landing/PublicSiteFooter";
import { SeoBreadcrumb } from "@/components/seo/SeoBreadcrumb";
import {
  createBreadcrumbJsonLd,
  createPublicPageHead,
  createWebPageJsonLd,
} from "@/lib/seo/page-head";
import { TOOLS_HUB_HEAD, TOOLS_HUB_PATH, listToolsByCategory } from "@/lib/seo/tools-registry";

export const Route = createFileRoute("/tools/")({
  head: () =>
    createPublicPageHead({
      title: TOOLS_HUB_HEAD.title,
      description: TOOLS_HUB_HEAD.description,
      path: TOOLS_HUB_PATH,
      jsonLd: [
        createWebPageJsonLd({
          title: TOOLS_HUB_HEAD.title,
          description: TOOLS_HUB_HEAD.description,
          path: TOOLS_HUB_PATH,
        }),
        createBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Tools", path: TOOLS_HUB_PATH },
        ]),
      ],
    }),
  component: ToolsHubPage,
});

function ToolsHubPage() {
  const groups = listToolsByCategory();

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <LandingHeader />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-16">
          <SeoBreadcrumb items={[{ name: "Home", href: "/" }, { name: "Tools" }]} />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1.5 text-xs sm:text-sm font-semibold text-on-dark-secondary">
            <Wrench className="h-3.5 w-3.5 text-primary" aria-hidden />
            Free tools
          </p>
          <h1 className="mt-5 text-[1.7rem] leading-[1.15] sm:text-3xl lg:text-[2.6rem] font-bold tracking-tight text-balance text-on-dark">
            {TOOLS_HUB_HEAD.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-[0.95rem] sm:text-lg text-on-dark-secondary leading-relaxed">
            {TOOLS_HUB_HEAD.intro}
          </p>
        </div>
      </section>

      <main>
        <section className="py-14 sm:py-20 bg-canvas">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
            {groups.map((group) => (
              <div key={group.category}>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                  {group.label}
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {group.tools.map((tool) => (
                    <Link
                      key={tool.slug}
                      to="/tools/$slug"
                      params={{ slug: tool.slug }}
                      preload="intent"
                      className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
                    >
                      <p className="font-semibold text-ink group-hover:text-primary transition-colors">
                        {tool.name}
                      </p>
                      <p className="mt-2 text-sm text-slate leading-relaxed">{tool.summary}</p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        Open tool
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14 sm:py-20 bg-soft-section border-y border-border">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              What these tools are, and what they are not
            </h2>
            <div className="mt-4 space-y-4 max-w-3xl">
              <p className="text-[0.95rem] sm:text-base text-slate leading-relaxed">
                Every tool on this page runs entirely in your browser. There is no signup wall on
                the results, no input stored, and no calculation sent to a server. The crypto QR
                generator draws its code locally and accepts public receiving addresses only — never
                a private key or seed phrase.
              </p>
              <p className="text-[0.95rem] sm:text-base text-slate leading-relaxed">
                They are also not advice. The VAT, late-fee and payment-terms tools produce
                arithmetic and plain wording; tax treatment and the enforceability of a payment term
                depend on your jurisdiction and your contract, and belong to a qualified accountant
                or adviser. And VegaPal itself never processes, holds or verifies a payment — it
                produces documents and presents the payment instructions you save.
              </p>
            </div>
            <p className="mt-6 text-sm text-slate">
              For background reading, the{" "}
              <Link to="/learn" className="text-primary hover:underline">
                Learn guides
              </Link>{" "}
              cover invoicing and crypto payments in more depth, and{" "}
              <Link to="/pricing" className="text-primary hover:underline">
                pricing
              </Link>{" "}
              lists what each plan includes.
            </p>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
