export const SITE_NAME = "VegaPal";
export const SITE_ORIGIN = "https://vega-pal.com";
export const DEFAULT_TITLE =
  "VegaPal — Secure Invoices & Crypto Payments";
export const DEFAULT_DESCRIPTION =
  "Create professional invoices, share secure payment pages, and accept bank or crypto payments with VegaPal.";

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, SITE_ORIGIN).toString();
}
