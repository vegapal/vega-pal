import { absoluteUrl } from "@/lib/seo/site";
import { getMarketingSitemapPaths } from "@/lib/seo/marketing-pages";
import { TOOLS_HUB_PATH, getToolsSitemapPaths } from "@/lib/seo/tools-registry";

export type SitemapUrl = {
  loc: string;
  changefreq: string;
  priority: string;
};

/**
 * Single source of truth for the public sitemap. scripts/generate-sitemap.mjs
 * imports this module (via tsx) so the XML file can never drift from the app.
 *
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
  "/learn/invoice-vs-proforma-invoice",
  "/learn/quotation-vs-invoice",
  "/learn/invoice-payment-terms",
  "/learn/proforma-invoice-example",
  "/learn/trc20-vs-erc20-for-usdt-payments",
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
  // /pricing is intentionally absent: it 307-redirects to /#pricing, and a
  // sitemap should only list URLs that return 200. The redirect target is "/",
  // which is already listed.
  const urls: SitemapUrl[] = [
    { loc: absoluteUrl("/"), changefreq: "weekly", priority: "1.0" },
    { loc: absoluteUrl("/about"), changefreq: "monthly", priority: "0.5" },
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

  urls.push({ loc: absoluteUrl(TOOLS_HUB_PATH), changefreq: "weekly", priority: "0.8" });
  for (const path of getToolsSitemapPaths()) {
    urls.push({ loc: absoluteUrl(path), changefreq: "monthly", priority: "0.7" });
  }

  return urls;
}

/**
 * Path-only allowlist used by the IndexNow submitter: only URLs that are in the
 * sitemap may be pushed to search engines.
 */
export function getPublicSitemapPaths(): string[] {
  return getPublicSitemapUrls().map((url) => new URL(url.loc).pathname);
}

export function isPublicSitemapPath(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const trimmed = normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
  return getPublicSitemapPaths().includes(trimmed);
}
