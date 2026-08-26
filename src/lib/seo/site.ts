export const SITE_NAME = "VegaPal";
export const SITE_ORIGIN = "https://vega-pal.com";

export const DEFAULT_TITLE =
  "VegaPal — Invoice Generator for Bank, Crypto & USDT Payments";
export const DEFAULT_DESCRIPTION =
  "Create professional invoices, proforma invoices and quotations with bank transfer, crypto and USDT payment details. Generate PDFs and share payment pages with VegaPal.";

export const DEFAULT_OG_IMAGE_PATH = "/brand/og-brand.jpg";

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, SITE_ORIGIN).toString();
}
