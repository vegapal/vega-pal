import { useEffect } from "react";
import {
  GOOGLE_ADS_ID,
  GOOGLE_ANALYTICS_ID,
  hasGoogleAnalytics,
} from "@/lib/analytics/config";

const GA_SCRIPT_ATTR = "data-vegapal-ga";

export function GoogleAnalytics() {
  useEffect(() => {
    if (!hasGoogleAnalytics || !GOOGLE_ANALYTICS_ID) return;
    if (document.querySelector(`script[${GA_SCRIPT_ATTR}]`)) return;

    const loader = document.createElement("script");
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`;
    loader.setAttribute(GA_SCRIPT_ATTR, "true");
    document.head.appendChild(loader);

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ANALYTICS_ID, {
      anonymize_ip: true,
      send_page_view: false,
    });
    if (GOOGLE_ADS_ID) {
      window.gtag("config", GOOGLE_ADS_ID);
    }
  }, []);

  return null;
}
