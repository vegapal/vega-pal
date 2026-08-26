# VegaPal i18n Audit

Last updated: 2026-08-27 (production sprint)

## Architecture

| Item | Location |
|------|----------|
| Reference locale | `en` (`locales/en/*.json`) |
| Supported locales | `en`, `ar`, `th`, `zh`, `ru` |
| Language storage | `localStorage` key `vegapal-language` |
| Bootstrap namespaces | `common`, `landing`, `auth` (bundled at init) |
| Lazy namespaces | `dashboard`, `invoices`, `settings`, `admin` |
| Loader | `src/lib/i18n/load-locale.ts`, `load-namespace.ts` |
| Language selector | `src/components/LanguageSwitcher.tsx` |
| RTL | `document.documentElement.dir` + `<html dir>` when `ar` |
| SEO locale routing | English canonical SEO URLs only (no localized SEO clones yet) |
| IndexNow / sitemap | English public URLs only |

## Locale files

```
locales/{en,ar,th,zh,ru}/{common,landing,auth,dashboard,invoices,settings,admin}.json
```

## Key counts (after sprint)

| Locale | Keys | vs English |
|--------|------|------------|
| en | 868 | — |
| ar | 868 | 0 missing |
| th | 868 | 0 missing |
| ru | 868 | 0 missing |
| zh | 868 | 0 missing |

### Before sprint

- Each non-English locale: **821 keys** (−47 vs English)
- Missing: `common.plans.*`, `landing.subscriptionModal.*` (partial), `invoices` status/type blocks, `admin.userDetail.successDeleted`
- Stale: Free limit copy referenced **5 invoices** in several locales
- Orphan keys: `wizard.validation.clientEmailRequired`, `titleRequired` (non-en only)

### After sprint

- Structural parity: **868/868** all locales
- Stale pricing patterns removed
- Orphan validation keys removed
- Arabic RTL enabled app-wide

## Tooling

| Command | Purpose |
|---------|---------|
| `npm run i18n:audit` | Structural key audit (exits non-zero on gaps/stale copy) |
| `npm run test:i18n` | Regression harness (parity, pricing guards, RTL helper) |
| `node scripts/i18n-apply-patches.mjs` | Re-apply sprint translation overrides |

## Terminology (core)

| English | Arabic | Thai | Chinese | Russian |
|---------|--------|------|---------|---------|
| Invoice / Document | فاتورة / مستند | เอกสาร | 文档 | Документ |
| Quotation | عرض سعر | ใบเสนอราคา | 报价单 | Коммерческое предложение |
| Dashboard | لوحة التحكم | แดชบอร์ด | 控制台 | Панель управления |
| Payment Request | طلب دفع | คำขอชำระเงิน | 付款请求 | Запрос на оплату |

Immutable in all locales: VegaPal, USDT, network names (TRC20, ERC20, BEP20, TON, opBNB), TxID, QR, PDF, IBAN, SWIFT.

## Pricing (all locales)

- Free: **$0**, **3 documents per month**
- Pro: **$29/month**
- 6 months: **$59**, comparison **$174**, save **$115**, ~**$9.83/month**
- **No Business plan** on public pricing

## RTL (Arabic)

- `<html lang="ar" dir="rtl">` on language change
- Invoice PDF/preview: content-based RTL when Arabic text detected
- LTR preserved for emails, URLs, IBAN, wallet addresses, TxID (`dir="ltr"` on payment blocks)

## SEO / hreflang

- **English SEO money pages** remain canonical and indexable (`/invoice-generator`, etc.)
- **No localized SEO URL clones** published in this sprint (quality threshold not met for unique localized SEO content)
- **No hreflang cluster** added for product UI locales (UI language ≠ URL locale)
- Sitemap unchanged (~29 English public URLs)

## Remaining limitations

1. **Human QA**: Automated audit confirms structural completeness; ar/th/zh/ru still share some English strings in low-traffic areas (warned in audit).
2. **Admin shell**: Some admin UI strings remain hardcoded English (`AdminShell.tsx`) — admin namespace exists but not fully wired.
3. **Invoice PDF labels**: `InvoiceDocument.tsx` has hardcoded English labels; PDF follows document content locale for RTL.
4. **Learn section**: English-only marketing/education content (intentional).
5. **Supabase Auth emails**: Configured in Supabase Dashboard — manual translation if multi-language auth emails are required.
6. **Localized SEO pages**: Architecture ready; publish only when unique high-quality localized SEO copy exists.

## Manual actions (owner)

1. Set `INDEXNOW_KEY` + optional `INDEXNOW_NOTIFY_SECRET` in Vercel if not already set.
2. Translate Supabase Auth email templates in Supabase Dashboard (if desired).
3. Bing / Google Search Console: submit sitemap (English).
4. Future: localized SEO URLs + hreflang when content is ready.
