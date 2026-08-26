/**
 * Multilingual SEO architecture (prepared, not activated).
 *
 * Product UI languages today: en, ar, th, zh, ru (client locale via localStorage — no URL prefixes).
 *
 * Future public SEO URLs (when translation quality is ready):
 *   /en/... (or unprefixed English as default)
 *   /ar/...
 *   /ru/...
 *   /th/...
 *   /zh-cn/...
 *
 * Rules when activating:
 * - Self-referencing canonical per locale URL
 * - Reciprocal hreflang + x-default
 * - No automatic IP redirects for crawlers
 * - Sitemap entries per locale only when pages are genuinely translated
 * - Do not publish thin auto-translated SEO landings
 *
 * Baidu: keep zh-CN routing + crawlable HTML ready; verify manually in Baidu Search Resource Platform later.
 * Do not inject unverified Baidu scripts.
 */

export const SEO_UI_LOCALES = ["en", "ar", "th", "zh", "ru"] as const;
export type SeoUiLocale = (typeof SEO_UI_LOCALES)[number];

/** Dedicated SEO URL locales — empty until localized marketing routes ship. */
export const SEO_URL_LOCALES: readonly string[] = [];

export const LOCALIZED_SEO_ROUTES_ENABLED = false;

export function buildHreflangAlternatesForPath(_englishPath: string): Array<{
  lang: string;
  path: string;
}> {
  if (!LOCALIZED_SEO_ROUTES_ENABLED || SEO_URL_LOCALES.length === 0) {
    return [];
  }
  // Placeholder for future reciprocal locale paths.
  return [];
}
