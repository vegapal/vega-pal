# VegaPal SEO Audit

**Audit date:** 2026-08-26  
**Canonical origin:** `https://vega-pal.com`

---

## Indexability Baseline

| Area | Status | Notes |
|------|--------|-------|
| Homepage `/` | Indexable | `robots: index, follow`; canonical via `absoluteUrl("/")` |
| Marketing SEO pages (15) | Indexable | `src/routes/$seoSlug.tsx` + `marketing-pages.ts` |
| Learn hub `/learn/*` | Indexable | In sitemap |
| Auth / app routes | Blocked | `robots.txt` Disallow + route meta noindex where set |
| `/pay/:id` | Blocked | `noindex, nofollow` + robots Disallow `/pay` |
| Preview domains | Non-canonical | `SITE_ORIGIN` fixed to production; `seo:check-origin` script |

---

## Titles / Meta / Canonical

| Page | Title source | Canonical |
|------|--------------|-----------|
| `/` | `DEFAULT_TITLE` in `src/lib/seo/site.ts` | Self-referencing production URL |
| SEO slugs | Per-page in `marketing-pages.ts` | `MarketingSeoPage` + `page-head.ts` |
| Private routes | Generic / noindex | No canonical to preview hosts |

**Homepage title:** `VegaPal — Invoice Generator for Bank, Crypto & USDT Payments`  
**Homepage H1 (i18n):** “Create your invoice in 30 Seconds. Get paid anywhere.”

---

## Sitemap

- **Generator:** `scripts/generate-sitemap.mjs` → `public/sitemap.xml`
- **URL count:** 29 public URLs (homepage, pricing, learn, 15 SEO pages, etc.)
- **Excluded:** dashboard, invoices, settings, admin, pay, API, auth flows

Run: `npm run seo:sitemap`

---

## Robots Strategy

`public/robots.txt`:

- Allow `/`
- Disallow private app paths (`/dashboard`, `/invoices`, `/settings`, `/admin`, `/pay`, auth)
- Sitemap: `https://vega-pal.com/sitemap.xml`

Customer invoice/payment pages default to **noindex** (correct).

---

## Structured Data

- Homepage: Organization / WebSite JSON-LD via `LANDING_JSON_LD`
- SEO pages: BreadcrumbList + page-appropriate schema in `MarketingSeoPage`
- No fake Review/AggregateRating

---

## Internal Linking Hubs

Defined in `marketing-pages.ts`:

- **Invoice hub:** invoice-generator, invoice-template, freelance-invoice, bank-transfer-invoice, multi-currency-invoice
- **Crypto hub:** crypto-invoice, crypto-invoice-generator, usdt-invoice, usdt-invoice-generator
- **Documents hub:** proforma, quotation, proposal, payment-request pages

---

## hreflang / Multilingual

- Architecture: `src/lib/seo/hreflang.ts` prepared for `/ar/`, `/ru/`, `/th/`, `/zh-cn/`
- **Policy:** Do not clone all 15 SEO pages until translations are quality-ready
- UI i18n: en, ar, th, zh, ru for product; SEO pages English-first this sprint

---

## IndexNow

- Implementation: `src/lib/seo/indexnow*.ts`, routes in `src/server.ts`
- Requires owner: `INDEXNOW_KEY` env + key file at site root
- See `docs/SEO_SEARCH_CONSOLES.md` for manual setup

---

## Search Console Ownership

Documented placeholders in `docs/SEO_SEARCH_CONSOLES.md` — owner provides real verification tokens.

---

## Performance / CWV Notes

- Hero image should remain LCP-priority (not lazy-loaded)
- SEO routes code-split via `$seoSlug` lazy page component
- Currency converter lazy-loaded on homepage

---

## Trust / Claims Audit

- Replaced “Verified payment pages” → “Shareable payment pages” in locale files
- No PCI/SOC2/bank-grade claims added
- USDT checkout copy states manual review (not automatic settlement)

---

## Gaps / Backlog

1. Localized SEO URLs when translations ready
2. Public invoice field allowlist (security + SEO overlap)
3. Core Web Vitals measurement in production (Search Console)
4. Baidu manual registration when `/zh-cn/` pages publish

---

## Verification Commands

```bash
npm run seo:sitemap
npm run seo:check-origin
npm run build
```

Manual: fetch `/robots.txt`, `/sitemap.xml`, sample SEO page view-source for canonical + JSON-LD.
