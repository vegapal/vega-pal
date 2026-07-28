import { useEffect } from "react";
import { GOOGLE_TAG_MANAGER_ID, hasGoogleTagManager } from "@/lib/analytics/config";

const GTM_SCRIPT_ATTR = "data-vegapal-gtm";

export function GoogleTagManager() {
  useEffect(() => {
    if (!hasGoogleTagManager || !GOOGLE_TAG_MANAGER_ID) return;
    if (document.querySelector(`script[${GTM_SCRIPT_ATTR}]`)) return;

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GOOGLE_TAG_MANAGER_ID)}`;
    script.setAttribute(GTM_SCRIPT_ATTR, "true");
    document.head.appendChild(script);
  }, []);

  if (!hasGoogleTagManager || !GOOGLE_TAG_MANAGER_ID) {
    return null;
  }

  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GOOGLE_TAG_MANAGER_ID)}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
