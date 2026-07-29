import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { THEME_INIT_SCRIPT } from "../lib/theme";
import i18n from "@/lib/i18n";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/languages";
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  absoluteUrl,
} from "@/lib/seo/site";
import { GOOGLE_SITE_VERIFICATION } from "@/lib/analytics/config";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("errors.pageNotFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.pageNotFoundDesc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("buttons.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { t } = useTranslation("common");

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errors.pageLoadFailed")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.pageLoadFailedDesc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("buttons.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("buttons.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const links: Array<{
      rel: string;
      href: string;
      as?: string;
      type?: string;
      sizes?: string;
      crossOrigin?: "anonymous" | "use-credentials" | "" | undefined;
    }> = [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      {
        rel: "preload",
        href: "/fonts/inter/inter-latin-400-normal.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/inter/inter-latin-700-normal.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "dns-prefetch", href: "https://challenges.cloudflare.com" },
      { rel: "canonical", href: absoluteUrl("/") },
    ];

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (supabaseUrl) {
      try {
        links.push({ rel: "preconnect", href: new URL(supabaseUrl).origin });
      } catch {
        /* ignore invalid URL */
      }
    }

    const meta: Array<Record<string, string>> = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESCRIPTION },
      { property: "og:title", content: DEFAULT_TITLE },
      { property: "og:description", content: DEFAULT_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: DEFAULT_TITLE },
      { name: "twitter:description", content: DEFAULT_DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/") },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#0B1220" },
      { property: "og:site_name", content: SITE_NAME },
    ];

    if (GOOGLE_SITE_VERIFICATION) {
      meta.push({
        name: "google-site-verification",
        content: GOOGLE_SITE_VERIFICATION,
      });
    }

    return {
      meta,
      links,
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const lang = typeof document !== "undefined" ? i18n.language : DEFAULT_LANGUAGE;

  return (
    <html lang={lang}>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AnalyticsScripts />
        {children}
        <Toaster richColors position="top-center" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <PageViewTracker />
        <Outlet />
      </QueryClientProvider>
    </I18nextProvider>
  );
}
