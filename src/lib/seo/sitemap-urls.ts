import { absoluteUrl } from "@/lib/seo/site";
import { getMarketingSitemapPaths } from "@/lib/seo/marketing-pages";

export type SitemapUrl = {
  loc: string;
  changefreq: string;
  priority: string;
};

/**
 * Public, indexable paths only. Authenticated areas (/dashboard, /invoices,
 * /settings, /admin), public invoice pages (/pay) and auth routes are excluded
 * on purpose — they are noindex and must never appear in the sitemap.
 */
const LEARN_PATHS = [
  "/learn",
  "/learn/getting-started",
  "/learn/invoice",
  "/learn/payments",
  "/learn/security",
  "/learn/business",
  "/learn/faq",
  "/learn/what-is-an-invoice",
  "/learn/what-is-a-bill",
  "/learn/invoice-vs-bill",
  "/learn/invoice-generator",
  "/learn/invoice-software",
] as const;

const HUB_LEARN_PATHS = new Set<string>([
  "/learn",
  "/learn/what-is-an-invoice",
  "/learn/what-is-a-bill",
  "/learn/invoice-vs-bill",
  "/learn/invoice-generator",
  "/learn/invoice-software",
]);

export function getPublicSitemapUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = [
    { loc: absoluteUrl("/"), changefreq: "weekly", priority: "1.0" },
    { loc: absoluteUrl("/pricing"), changefreq: "monthly", priority: "0.8" },
  ];

  for (const path of LEARN_PATHS) {
    urls.push({
      loc: absoluteUrl(path),
      changefreq: path === "/learn" ? "weekly" : "monthly",
      priority: HUB_LEARN_PATHS.has(path) ? "0.8" : "0.7",
    });
  }

  for (const path of getMarketingSitemapPaths()) {
    urls.push({ loc: absoluteUrl(path), changefreq: "weekly", priority: "0.9" });
  }

  return urls;
}

export function getPublicSitemapPaths(): string[] {
  return getPublicSitemapUrls().map((url) => new URL(url.loc).pathname);
}
