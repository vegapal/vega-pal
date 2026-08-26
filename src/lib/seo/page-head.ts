import {
  SITE_NAME,
  SITE_ORIGIN,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE_PATH,
  absoluteUrl,
} from "@/lib/seo/site";

export type PublicPageHeadInput = {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  robots?: string;
  imagePath?: string;
  jsonLd?: unknown | unknown[];
  /** When localized public URLs exist, pass alternate language paths. Empty = no hreflang yet. */
  hreflangAlternates?: ReadonlyArray<{ lang: string; path: string }>;
};

export type PublicPageHeadResult = {
  meta: Array<Record<string, string>>;
  links: Array<{ rel: string; href: string; hreflang?: string }>;
  scripts?: Array<{ type: string; children: string }>;
};

/**
 * Shared public-page head builder: title, description, canonical, OG/Twitter, robots, optional JSON-LD + hreflang.
 * Do not emit hreflang until reciprocal localized URLs exist.
 */
export function createPublicPageHead(input: PublicPageHeadInput): PublicPageHeadResult {
  const url = absoluteUrl(input.path);
  const image = absoluteUrl(input.imagePath ?? DEFAULT_OG_IMAGE_PATH);
  const robots = input.robots ?? "index, follow";
  const ogType = input.ogType ?? "website";

  const meta: Array<Record<string, string>> = [
    { title: input.title },
    { name: "description", content: input.description },
    { name: "robots", content: robots },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: url },
    { property: "og:type", content: ogType },
    { property: "og:image", content: image },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
  ];

  const links: Array<{ rel: string; href: string; hreflang?: string }> = [
    { rel: "canonical", href: url },
  ];

  const alternates = input.hreflangAlternates ?? [];
  if (alternates.length > 0) {
    for (const alt of alternates) {
      links.push({
        rel: "alternate",
        hreflang: alt.lang,
        href: absoluteUrl(alt.path),
      });
    }
    const hasXDefault = alternates.some((a) => a.lang === "x-default");
    if (!hasXDefault) {
      links.push({
        rel: "alternate",
        hreflang: "x-default",
        href: url,
      });
    }
  }

  const scripts: Array<{ type: string; children: string }> = [];
  if (input.jsonLd !== undefined) {
    const blocks = Array.isArray(input.jsonLd) ? input.jsonLd : [input.jsonLd];
    for (const block of blocks) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify(block),
      });
    }
  }

  return { meta, links, scripts: scripts.length ? scripts : undefined };
}

export function createBreadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function createFaqJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function createWebPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };
}
