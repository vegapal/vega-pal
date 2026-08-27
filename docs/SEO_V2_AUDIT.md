# VegaPal SEO Engine V2 — Architecture Audit

Baseline captured before V2, plus the state after V2 shipped. This is an
architecture document: it records where the public surface is defined, which
invariants the build enforces, and what is deliberately excluded.

For per-keyword decisions and rejected candidates, see
[`SEO_KEYWORD_MAP.md`](./SEO_KEYWORD_MAP.md). The pre-V2 baseline is preserved
in [`SEO_AUDIT.md`](./SEO_AUDIT.md).

---

## 1. Before and after

| Surface                  | V1 (baseline)       | V2 (now)              | Source of truth                  |
| ------------------------ | ------------------- | --------------------- | -------------------------------- |
| Sitemap URLs             | 29                  | **52**                | `src/lib/seo/sitemap-urls.ts`    |
| Marketing (money) pages  | 15                  | **24**                | `src/lib/seo/marketing-pages.ts` |
| Free tool pages          | 0                   | **8**                 | `src/lib/seo/tools-registry.ts`  |
| Tool hub                 | —                   | **1**                 | `src/lib/seo/tools-registry.ts`  |
| Learn guides             | 5                   | **10**                | `src/lib/learn/registry.ts`      |
| Learn category/hub pages | 6                   | 6                     | `src/lib/learn/categories.ts`    |
| Static public pages      | 2 (`/`, `/pricing`) | **2** (`/`, `/about`) | `src/lib/seo/sitemap-urls.ts`    |

52 = 2 static + 17 learn + 24 marketing + 1 tools hub + 8 tools.

`/pricing` left the sitemap. It is not a page: `src/routes/pricing.tsx` throws a
307 redirect to `/#pricing`, so every crawl of that URL was a wasted request
advertising a destination that does not exist. Its redirect target `/` is
already listed, internal `Link to="/pricing"` usage still works for humans, and
`seo:audit` now fails if a redirect-only path is ever added back. `/about` took
its place as the second static entry, which is why the static count is unchanged
at 2 despite a page being added.

## 2. Where the public surface is defined

Every indexable page resolves from one of four registries. Nothing is
hand-written into the sitemap.

**`src/lib/seo/marketing-pages.ts`** — the 24 money pages. `MARKETING_PAGE_SLUGS`
is the source of both the `MarketingPageSlug` union and the sitemap paths, so a
page cannot exist in one without the other. Each `MarketingPage` carries its own
title, description, H1, intro, intent, hub membership, sections, use cases,
steps, FAQs and `relatedSlugs`. Rendered by the catch-all route
`src/routes/$seoSlug.tsx` through `src/components/seo/MarketingSeoPage.tsx`.

**`src/lib/seo/tools-registry.ts`** — the 8 free tools plus the `/tools` hub.
Deliberately React-free so audit scripts and the sitemap generator can import it
without a DOM. Rendered by `src/routes/tools.$slug.tsx`, which looks the slug up
in the registry and pairs it with a calculator component from
`src/components/tools/tool-components.tsx`.

**`src/lib/learn/registry.ts`** — learn metadata. `SPRINT1_ARTICLE_META` and
`SPRINT2_ARTICLE_META` compose into `GUIDE_ARTICLE_META`; category pages live in
`CATEGORY_ARTICLE_META`; `LEARN_ARTICLE_REGISTRY` is the union. Article bodies
live beside the metadata in `src/lib/learn/sprint1/` and `sprint2/`, each route
being a thin file that reads its config and renders `LearnSeoArticle`.

**`src/lib/seo/sitemap-urls.ts`** — the single source of truth for what is
public. It composes the three registries above plus the static paths, and is the
only place that decides `changefreq` and `priority`.

## 3. Sitemap unification (the main V2 structural fix)

In V1, `scripts/generate-sitemap.mjs` duplicated the URL list in plain JavaScript
because it ran under bare `node` and could not resolve TypeScript or `@/` path
aliases. The file carried a comment asking future editors to keep two lists in
sync by hand — which is exactly the kind of invariant that silently rots.

V2 removes the duplicate. `npm run seo:sitemap` now runs the generator under
`tsx`, so it imports `getPublicSitemapUrls()` from
`src/lib/seo/sitemap-urls.ts` directly. Adding a marketing slug, a tool or a
learn guide changes the sitemap with no second edit, and `npm run test:seo`
fails if `public/sitemap.xml` has drifted from the registry.

The same function backs the IndexNow allowlist. `isNotifiableUrl()` in
`src/lib/seo/indexnow.ts` compares an incoming URL's pathname against
`getPublicSitemapPaths()`, so a URL that is not in the sitemap cannot be pushed
to a search engine — no separate allowlist to maintain, and new tool pages became
submittable the moment they entered the sitemap.

## 4. Hub clusters and internal linking

Three hubs are declared in `MARKETING_HUBS`, each with a pillar page:

| Hub                | Pillar               | Members |
| ------------------ | -------------------- | ------- |
| Invoicing          | `/invoice-generator` | 9       |
| Crypto invoicing   | `/crypto-invoice`    | 9       |
| Business documents | `/proforma-invoice`  | 8       |

`crypto-payment-request` and `usdt-payment-request` belong to two hubs (crypto
and documents), which is why the member counts sum to more than 24.

`getPrimaryHubFor()` returns the pillar for breadcrumbs and returns `null` for
pillar pages themselves, so a pillar never links to itself in its own
breadcrumb. Breadcrumbs are therefore `Home → Hub → Page` for members and
`Home → Page` for pillars, and the JSON-LD `BreadcrumbList` emitted by
`createPublicPageHead` matches the visible trail exactly.

Each page also renders a related-pages grid from `relatedSlugs` and a short
cluster strip from `listHubSiblings()` capped at 6 links, with the sibling list
filtered to exclude anything already in the grid. The public footer carries one
link per cluster. This is deliberately modest — link volume is not the goal,
crawlable topical structure is.

## 5. Head tags and structured data

All public pages route their metadata through `createPublicPageHead` in
`src/lib/seo/page-head.ts`, which owns:

- Title, description, canonical, `og:*` and `twitter:*` tags.
- **Path-only canonicals.** The canonical is built from the path, so `?ref=` and
  `?utm_*` are stripped by construction rather than by a rule someone has to
  remember. Affiliate and campaign traffic cannot fragment a page's signals.
- JSON-LD: `WebPage`, `BreadcrumbList`, and `FAQPage` where the page has FAQs.
  Learn guides add `Article` via `createLearnHead`.

No `Review` or `AggregateRating` schema exists anywhere, and no author,
certification or credential is claimed. Learn guides expose `publishedAt` /
`updatedAt` dates only.

## 6. Indexability boundaries

Indexable: `/`, `/about`, `/tools`, the 8 tool pages, the 24 marketing pages,
`/learn` and its 16 category and guide pages.

Never indexable, never in the sitemap: `/dashboard`, `/invoices/*`,
`/settings/*`, `/admin/*`, `/pay/*` (public invoice pages are shared by link,
not crawled), and auth routes (`/login`, `/register`, `/forgot-password`,
`/reset-password`). `npm run test:seo` asserts each of these prefixes is absent
from the sitemap and rejected by the IndexNow allowlist.

## 7. Quality gates

Three commands enforce the invariants, all runnable offline against the
registries — no dev server or network needed.

**`npm run seo:audit`** — registry integrity. Unique titles, descriptions and
H1s across marketing, tools and learn; title and description length bounds
(measured before the ` | VegaPal` brand suffix); `public/sitemap.xml` matching
`getPublicSitemapUrls()` exactly; every sitemap path resolving to a real route;
`relatedSlugs`, hub pillars and tool cross-links pointing only at published
pages; no noindex prefix and no redirect-only path in the sitemap. Warnings are
advisory; failures exit non-zero.

**`npm run seo:content-audit`** — near-duplicate detection. Normalized,
stopword-filtered token sets are compared pairwise on Jaccard similarity across
title, intro and full registry body. Failure thresholds are 0.72 title, 0.62
intro, 0.58 body. Short-copy surfaces (learn metadata, hubs) are only compared
against their own kind, and fields with fewer than three meaningful tokens are
skipped, because two-word titles collapse to the same token after stopword
removal and produce false positives. A thin-content floor also applies: 550
words of registry copy for a marketing page, 220 for a tool. This is the gate
that would catch a keyword-swapped doorway page.

**`npm run test:seo`** (`scripts/test-seo-v2.harness.ts`) — regression
assertions: registry shape and minimum section/FAQ/use-case/step counts, every
page carrying a common-mistakes and a worked-example section, hub pillar
consistency, the six rejected slugs staying unrouted and out of the sitemap,
uniqueness across all four fields, tool registry completeness against the spec
list, sitemap sync with `public/sitemap.xml`, `/pricing` staying out, IndexNow
allowlist behaviour, and product-truth claims (no payment processing, custody or
chain-verification language; free plan limit copy must say 3).

A one-off HTTP smoke pass over all 52 URLs against a dev server confirmed
status 200, a non-empty `<title>` and `<h1>`, a path-only canonical matching the
requested path, and no stray `noindex`, on every route. That check is what
surfaced the `/pricing` redirect.

## 8. Product truth encoded as tests

Marketing copy is asserted against the product, not just proofread. The harness
fails the build on:

- Claims that VegaPal processes, settles, holds or custodies payments or funds.
  VegaPal presents payment **instructions** — bank transfer, crypto address,
  cash — and never touches money.
- Claims of automatic blockchain or on-chain confirmation. There is no chain
  watcher; the seller confirms receipt.
- Any free-plan document limit other than 3 per month.
- Fake review or rating schema.

Document types are constrained to `quotation`, `proforma_invoice` and
`tax_invoice`. Pages targeting vocabulary outside that set map to a real type
honestly: proposal pages produce a quotation, payment-request pages produce an
invoice, and the copy says so rather than implying a separate document exists.
`documentTypeHint` on every page is asserted to be one of the three.

TRC20 is the default crypto network, and the network-specific pages
(`trc20-invoice`, `erc20-invoice`, `bep20-invoice`) are each asserted to explain
the network rather than imply automatic settlement.

## 9. Tools: why they are not gated

All 8 tools compute in the browser, show every result without a signup, store
nothing, and call no API. `/tools/crypto-payment-qr-generator` accepts a public
receiving address only, warns against private keys, and encodes locally with the
bundled `qrcode` library — no remote fetch. `/tools/usdt-aed-converter` reuses
the existing `getExchangeRates` logic for reference rates and labels them as
reference, not a quote. Tools carry jurisdiction and not-legal-advice
disclaimers where relevant (VAT, late fees).

The trade is deliberate: a gated calculator earns no links and no return visits.
An ungated one earns both, and the CTA converts a solved problem into a document.

## 10. Analytics

`src/lib/analytics/events.ts` adds `seo_primary_cta`, `tool_started`,
`tool_completed` and `tool_cta_clicked`, each carrying `page_slug` and the
current path. `page_slug` identifies the page, never the visitor; no PII, no
input values, no addresses or amounts are sent. `SessionAwareCta` takes an
optional `pageSlug` so CTA clicks are attributable to the page that earned them.
`npm run analytics:check-pii` remains the guard.

## 11. Internationalization

English-only, by choice. The app UI is translated into five locales, but the SEO
surface is not, and no `hreflang` alternates are emitted — advertising
alternates that do not exist is worse than having none. Revisit only when a
locale gets genuinely written (not machine-translated) content.

## 12. Known gaps

- **Title length.** `/bank-transfer-invoice` runs one character over the 65-char
  budget before the brand suffix. Advisory warning only.
- **Learn hub pages for clusters.** `/learn/invoicing` and
  `/learn/crypto-invoicing` were considered and skipped: the existing category
  pages (`/learn/invoice`, `/learn/payments`) already serve that role, and
  adding parallel hubs would have created two competing collection pages per
  topic — the exact cannibalization V2 set out to remove.
- **No rendered-HTML audit.** The audit scripts validate registries, not served
  markup. A crawl-based check (real fetch, real head tags, real status codes)
  against a running build would be the natural next gate.
- **Tool depth.** The 8 tools cover invoice arithmetic and admin. Nothing yet
  covers multi-currency reconciliation or per-jurisdiction VAT rules, both of
  which would need maintained data rather than pure arithmetic.
