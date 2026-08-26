# Search console and indexing checklist (VegaPal)

Operator checklist for getting [https://vega-pal.com](https://vega-pal.com) indexed across search engines. Google measurement setup lives in [GOOGLE_SETUP.md](./GOOGLE_SETUP.md); this file covers verification, sitemaps and IndexNow.

## 0. Before submitting anything

1. Regenerate the sitemap after adding or removing public pages:

   ```bash
   node scripts/generate-sitemap.mjs
   ```

   The URL list is duplicated in `scripts/generate-sitemap.mjs` and `src/lib/seo/sitemap-urls.ts` — update both.

2. Confirm the sitemap and robots files respond in production:
   - `https://vega-pal.com/sitemap.xml`
   - `https://vega-pal.com/robots.txt` (must keep `Disallow` rules for `/dashboard`, `/invoices`, `/settings`, `/admin`, `/pay`, `/login`, `/register`, password reset routes)
3. Spot-check that a marketing page has exactly one canonical tag and its JSON-LD blocks (`WebPage`, `BreadcrumbList`, `FAQPage`).

## 1. Google Search Console

1. Add a property for `https://vega-pal.com`, preferring a **Domain** property when DNS is editable.
2. Verify by DNS TXT record, or set `VITE_GOOGLE_SITE_VERIFICATION` for the meta-tag method.
3. Submit `https://vega-pal.com/sitemap.xml` under **Sitemaps**.
4. Use **URL Inspection → Request indexing** for new marketing pages, a few per day rather than in bulk.
5. Watch **Pages** for `Duplicate without user-selected canonical` and `Crawled – currently not indexed` after each content push.

## 2. Bing Webmaster Tools

1. Add the site at [bing.com/webmasters](https://www.bing.com/webmasters).
2. Fastest path is **Import from Google Search Console**; otherwise verify by DNS TXT or the `BingSiteAuth.xml` file.
3. Submit the same sitemap URL.
4. Bing consumes IndexNow submissions, so configure the keys below once verification is done.

## 3. Yandex Webmaster

1. Add the site at [webmaster.yandex.com](https://webmaster.yandex.com).
2. Verify by DNS TXT record or meta tag.
3. Submit `https://vega-pal.com/sitemap.xml` under **Indexing → Sitemap files**.
4. Yandex also accepts IndexNow, so the same key covers it.

## 4. Baidu (manual, later)

Baidu requires a Chinese-language surface and, for its webmaster platform, a mainland-China contactable account. Do not add Baidu verification scripts speculatively.

When it becomes relevant:

1. Ship genuinely translated `zh-CN` pages first (see `src/lib/seo/hreflang.ts` — localized SEO URLs are prepared but disabled).
2. Register at Baidu Search Resource Platform and verify the domain manually.
3. Submit the sitemap there separately. Baidu does not participate in IndexNow.

## 5. IndexNow

IndexNow notifies Bing, Yandex and other participants that a URL changed. Google does not use it.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `INDEXNOW_KEY` | Yes, to enable | 8–128 chars, letters/digits/dashes. Verification file at `public/{key}.txt` (served at `https://vega-pal.com/{key}.txt`). |
| `INDEXNOW_NOTIFY_SECRET` | Optional | Enables `POST /api/indexnow/notify`. Without it the endpoint 404s. |

### Setup

1. Generate a key (for example a UUID without braces) and set `INDEXNOW_KEY` in the hosting environment.
2. Deploy, then confirm `https://vega-pal.com/{key}.txt` returns the key as `text/plain`.
3. Optionally set `INDEXNOW_NOTIFY_SECRET` and submit URLs after a content change:

   ```bash
   curl -X POST https://vega-pal.com/api/indexnow/notify \
     -H "content-type: application/json" \
     -H "x-indexnow-secret: $INDEXNOW_NOTIFY_SECRET" \
     -d '{"urls":["https://vega-pal.com/invoice-generator"]}'
   ```

### Guardrails

- Only paths present in the public sitemap are accepted. Private and noindex routes are filtered out in `src/lib/seo/indexnow.ts` before any request is made.
- Submit real changes only. Repeatedly resubmitting unchanged URLs is treated as spam by IndexNow participants.

## 6. Recurring routine

- After a content release: regenerate the sitemap, deploy, submit changed URLs via IndexNow, request indexing in Search Console for the most important pages.
- Monthly: review Search Console and Bing query reports, and check that no private route has appeared in the index (`site:vega-pal.com` plus a spot-check of `/pay` and `/invoices`).
