# Google measurement and advertising setup (VegaPal)

This guide describes how to configure Google Search Console, Google Analytics 4 (GA4), Google Tag Manager (GTM), Google Ads, and Microsoft Clarity for [https://vega-pal.com](https://vega-pal.com). Runtime IDs are supplied via Vite environment variables (see `.env.example`). Do not commit real values.

## A. Google Search Console

1. Add a property for **https://vega-pal.com**.
2. Prefer a **Domain** property when you can edit DNS at your registrar.
   - Add the TXT verification record Google provides at your DNS provider.
3. **URL-prefix alternative:** set `VITE_GOOGLE_SITE_VERIFICATION` to the meta tag `content` value from Search Console. The app adds a `google-site-verification` meta tag only when this variable is non-empty.
4. Submit the sitemap: **https://vega-pal.com/sitemap.xml**

## B. Google Analytics 4

1. Create a GA4 property and a **Web** data stream.
2. Set the stream URL to **https://vega-pal.com**.
3. Copy the **Measurement ID** (format `G-XXXXXXXX`) into `VITE_GOOGLE_ANALYTICS_ID`.
4. The app loads gtag with `anonymize_ip: true` and `send_page_view: false`; page views are sent from client-side routing via `trackPageView`.

## C. Google Tag Manager

1. Create a **Web** container and copy the container ID (format `GTM-XXXX`) into `VITE_GOOGLE_TAG_MANAGER_ID`.
2. The app injects the standard GTM script and noscript iframe when this ID is set.

### GTM vs direct GA4

The codebase supports **both** direct GA4 (`GoogleAnalytics.tsx`) and GTM (`GoogleTagManager.tsx`). If GA4 is also configured **inside** GTM (e.g. a GA4 Configuration tag that fires on all pages), you can **duplicate** page views and events.

**Recommended:** pick one ownership model:

- **Direct GA4:** set `VITE_GOOGLE_ANALYTICS_ID` only; use GTM only for non-GA tags, or leave GTM unset.
- **GTM-managed GA4:** set `VITE_GOOGLE_TAG_MANAGER_ID` and configure GA4 entirely in GTM; leave `VITE_GOOGLE_ANALYTICS_ID` empty unless you intentionally want the direct integration.

Operators must avoid configuring GA4 twice (direct + GTM).

## D. Google Ads

1. Link Google Ads to your GA4 property.
2. Import GA4 conversions where appropriate, or use the conversion labels below with the in-app `gtag` Ads config.

Environment variables:

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_ADS_ID` | Ads account ID (`AW-…`); also used in `gtag('config', …)` when GA loads |
| `VITE_GOOGLE_ADS_SIGNUP_LABEL` | Conversion label for sign-up |
| `VITE_GOOGLE_ADS_INVOICE_CREATED_LABEL` | Conversion label for invoice created |
| `VITE_GOOGLE_ADS_INVOICE_PAID_LABEL` | Conversion label for paid invoice (`purchase`) |
| `VITE_GOOGLE_ADS_SUBSCRIPTION_LABEL` | Conversion label for subscription started |

In-app GA4 event names (and Ads conversions when labels are set):

- `sign_up` — after successful email registration
- `invoice_created` — after invoice is persisted
- `purchase` — when an invoice is marked paid (manual status change)
- `subscription_started` — reserved; no automated success flow in the app yet

Conversion `send_to` format: `{VITE_GOOGLE_ADS_ID}/{label}`.

## E. Microsoft Clarity

1. Create a Clarity project for your site.
2. Set `VITE_MICROSOFT_CLARITY_ID` to the project ID (lowercase alphanumeric).

## F. Privacy

- Analytics helpers do **not** send email, names, addresses, phone numbers, or full invoice content. Only internal invoice IDs and non-PII metadata (currency, amounts where applicable) are used.
- Depending on your audience and tracking setup, **cookie consent** or similar notices may be required in some jurisdictions. This document does not provide legal advice or a compliance guarantee.

## G. Vercel

1. Add the `VITE_*` variables separately for **Preview** and **Production** in the Vercel project settings.
2. **Redeploy** after changing variables so the client bundle picks up new values.
3. These IDs are public in the browser bundle, but keeping them in env vars keeps configuration consistent across environments and out of source control.

## Local checks

```bash
npm run analytics:check
npm run analytics:check-pii
```
