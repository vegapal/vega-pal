import {
  SITE_NAME,
  SITE_ORIGIN,
  DEFAULT_DESCRIPTION,
} from "@/lib/seo/site";

export const LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: SITE_ORIGIN,
      name: SITE_NAME,
      publisher: {
        "@id": `${SITE_ORIGIN}/#organization`,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#software`,
      name: SITE_NAME,
      url: SITE_ORIGIN,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: DEFAULT_DESCRIPTION,
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
        },
      ],
      publisher: {
        "@id": `${SITE_ORIGIN}/#organization`,
      },
    },
  ],
} as const;
