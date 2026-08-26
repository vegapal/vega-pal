import { createFileRoute, notFound } from "@tanstack/react-router";
import { MarketingSeoPage } from "@/components/seo/MarketingSeoPage";
import {
  createBreadcrumbJsonLd,
  createFaqJsonLd,
  createPublicPageHead,
  createWebPageJsonLd,
} from "@/lib/seo/page-head";
import {
  getMarketingPage,
  isMarketingPageSlug,
  type MarketingPageSlug,
} from "@/lib/seo/marketing-pages";

export const Route = createFileRoute("/$seoSlug")({
  beforeLoad: ({ params }) => {
    if (!isMarketingPageSlug(params.seoSlug)) throw notFound();
  },
  head: ({ params }) => {
    if (!isMarketingPageSlug(params.seoSlug)) return {};
    const page = getMarketingPage(params.seoSlug);
    return createPublicPageHead({
      title: page.title,
      description: page.description,
      path: page.path,
      jsonLd: [
        createWebPageJsonLd({
          title: page.title,
          description: page.description,
          path: page.path,
        }),
        createBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: page.eyebrow, path: page.path },
        ]),
        createFaqJsonLd(page.faqs),
      ],
    });
  },
  component: MarketingSlugPage,
});

function MarketingSlugPage() {
  const { seoSlug } = Route.useParams();
  const page = getMarketingPage(seoSlug as MarketingPageSlug);
  return <MarketingSeoPage page={page} />;
}
