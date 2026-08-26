import { SITE_ORIGIN } from "@/lib/seo/site";
import { getPublicSitemapPaths } from "@/lib/seo/sitemap-urls";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Key file is served from the site root: https://vega-pal.com/{key}.txt */
export function indexNowKeyLocation(key: string): string {
  return `${SITE_ORIGIN}/${key}.txt`;
}

export function isValidIndexNowKey(key: string | undefined | null): boolean {
  if (!key) return false;
  // IndexNow keys are 8-128 chars, letters, digits and dashes only.
  return /^[A-Za-z0-9-]{8,128}$/.test(key);
}

/**
 * Only public marketing, learn and homepage URLs may be submitted. Private and
 * noindex areas (/dashboard, /invoices, /settings, /admin, /pay, auth routes)
 * must never be sent to a search engine.
 */
export function isNotifiableUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.origin !== SITE_ORIGIN) return false;
  if (parsed.search || parsed.hash) return false;

  const allowed = new Set(getPublicSitemapPaths());
  return allowed.has(parsed.pathname);
}

export function filterNotifiableUrls(urls: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const url of urls) {
    if (isNotifiableUrl(url)) unique.add(url);
  }
  return [...unique];
}
