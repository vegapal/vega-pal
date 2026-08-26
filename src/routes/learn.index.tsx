import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PublicSiteFooter } from "@/components/landing/PublicSiteFooter";
import { LearnAiPlaceholder } from "@/components/learn/LearnAiPlaceholder";
import { LearnBrowseTopics } from "@/components/learn/LearnBrowseTopics";
import { LearnFaqPreview } from "@/components/learn/LearnFaqPreview";
import { LearnFeaturedGuides } from "@/components/learn/LearnFeaturedGuides";
import { LearnKnowledgeSearch } from "@/components/learn/LearnKnowledgeSearch";
import { LearnLatestArticles } from "@/components/learn/LearnLatestArticles";
import { LearnPopularSearches } from "@/components/learn/LearnPopularSearches";
import { LearnSupport } from "@/components/learn/LearnSupport";
import { LEARN_BASE_URL } from "@/lib/learn/categories";
import { FEATURED_GUIDES, LATEST_ARTICLES } from "@/lib/learn/registry";

const TITLE = "VegaPal Learn | Invoice, USDT Payments & Crypto Billing Guides";
const DESCRIPTION =
  "Learn how invoices, USDT payments, payment links, wallet payments, and secure business payments work with VegaPal.";

export const Route = createFileRoute("/learn/")({
  head: () => {
    const url = `${LEARN_BASE_URL}/learn`;
    const collectionLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Learn VegaPal",
      description: DESCRIPTION,
      url,
    };

    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESCRIPTION },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(collectionLd) }],
    };
  },
  component: LearnHubPage,
});

function LearnHubPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <section className="relative bg-hero overflow-hidden pb-16 sm:pb-20">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <LandingHeader />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-28 sm:pt-36 lg:pt-40">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-dark max-w-4xl">
            Learn VegaPal
          </h1>
          <p className="mt-4 text-base sm:text-lg text-on-dark-secondary max-w-3xl leading-relaxed">
            Professional guides for invoices, billing, USDT payments, crypto payments, bank transfers and secure
            business invoicing.
          </p>
          <p className="mt-4 text-base sm:text-lg text-on-dark-muted max-w-3xl leading-relaxed">
            Whether you are a freelancer, startup or enterprise, VegaPal helps you create invoices in seconds and
            receive payments securely.
          </p>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <LearnKnowledgeSearch />
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 sm:pt-20 pb-14 sm:pb-16 space-y-14">
        <LearnFeaturedGuides guides={FEATURED_GUIDES} />
        <LearnLatestArticles articles={LATEST_ARTICLES} />
        <LearnBrowseTopics />
        <LearnPopularSearches />
        <LearnFaqPreview />
        <LearnSupport />
        <LearnAiPlaceholder />
      </main>

      <PublicSiteFooter />
    </div>
  );
}
