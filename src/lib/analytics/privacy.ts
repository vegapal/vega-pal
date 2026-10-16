import { getPublicSitemapPaths } from "@/lib/seo/sitemap-urls";
import { SITE_ORIGIN } from "@/lib/seo/site";

const PUBLIC_PATHS = new Set(getPublicSitemapPaths());
const APP_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/dashboard",
  "/invoices",
  "/invoices/new",
  "/settings",
  "/settings/payment-methods",
  "/settings/invite",
  "/admin",
  "/admin/users",
  "/admin/payments",
  "/admin/growth",
]);

/** Only published routes or route templates may leave the app in analytics. */
export function sanitizeAnalyticsPath(input: string): string {
  try {
    const url = new URL(input, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return "/other";
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (PUBLIC_PATHS.has(path) || APP_PATHS.has(path)) return path;
    if (/^\/pay\/[^/]+$/.test(path)) return "/pay/:id";
    if (/^\/invoices\/[^/]+$/.test(path)) return "/invoices/:id";
    if (/^\/admin\/users\/[^/]+$/.test(path)) return "/admin/users/:id";
  } catch {
    // Malformed and unknown URLs have no diagnostic value worth sending.
  }
  return "/other";
}

export function isPublicAnalyticsPath(path: string): boolean {
  return PUBLIC_PATHS.has(sanitizeAnalyticsPath(path));
}

export function getAnalyticsPageContext(path?: string, title?: string) {
  const browser = typeof window !== "undefined";
  const safePath = sanitizeAnalyticsPath(path ?? (browser ? window.location.pathname : "/"));
  return {
    page_path: safePath,
    page_location: `${SITE_ORIGIN}${safePath}`,
    // Referrers can contain auth codes and private payment links, too.
    page_referrer: "",
    // Private document titles may contain a client or an invoice reference.
    page_title: PUBLIC_PATHS.has(safePath)
      ? (title ?? (browser ? document.title : "VegaPal"))
      : "VegaPal",
  };
}
