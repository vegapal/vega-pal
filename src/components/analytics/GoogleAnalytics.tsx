import { useEffect } from "react";
import { GOOGLE_ADS_ID, GOOGLE_ANALYTICS_ID, hasGoogleAnalytics } from "@/lib/analytics/config";
import { getAnalyticsPageContext } from "@/lib/analytics/privacy";

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
    window.gtag = function gtag() {
      // Match Google's queue contract: the Arguments object, not a plain array.
      window.dataLayer?.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("set", getAnalyticsPageContext());
    if (GOOGLE_ANALYTICS_ID) {
      window.gtag("config", GOOGLE_ANALYTICS_ID, {
        anonymize_ip: true,
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        ...getAnalyticsPageContext(),
      });
    }
    if (GOOGLE_ADS_ID) {
      window.gtag("config", GOOGLE_ADS_ID, {
        send_page_view: false,
        allow_ad_personalization_signals: false,
        ...getAnalyticsPageContext(),
      });
    }
  }, []);

  return null;
}
