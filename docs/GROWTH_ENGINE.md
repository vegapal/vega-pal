# VegaPal Growth Engine V1

## Metric definitions

| Metric | Definition |
|--------|------------|
| **Visitor** | Anonymous session/page view (GA4 / existing analytics) |
| **Signup** | Account successfully created |
| **Verified** | Email-confirmed / valid authenticated account |
| **Activated** | User creates their **first** real VegaPal document |
| **Sharer** | User downloads PDF, copies public link, or exposes a payment page |
| **Pro intent** | Upgrade / checkout started |
| **Pro customer** | Manual Pro subscription payment **approved** by admin |

Signup ≠ activated.

## Funnel

Visitor → Signup → Verified → First document (Activated) → Share → Return → Checkout → Approved Pro

## Referral

- Every profile gets a unique 6-char code (`A-Z0-9`, non-sequential).
- Capture `?ref=CODE` (and UTMs) client-side for up to **30 days**.
- Claim attribution **server-side** via `claim_referral_attribution` (never trust referrer ID from browser).
- Self-referral blocked; one referrer per referred user.
- **Qualified** only after first document (DB trigger, idempotent).
- **Reward**: +2 bonus documents to referrer and referred (Free monthly allowance), capped at **10 bonus docs/month**.
- Base Free remains **3 documents/month**. Pro stays unlimited.

## Affiliate

- Admin creates codes with configurable commission (default 30%).
- Commission earned only on **approved** USDT Pro payments (idempotent per payment request).
- Accounting only — no automated payouts.

## Attribution

- First-touch stored in `user_attribution` (source/medium/campaign/ref/landing).
- Valid `ref` takes precedence for referral rows.
- Query params must not appear in sitemap/canonical.

## Viral loops

- Public `/pay/:id`: “Create your own professional invoice free” → `/?ref=OWNER_CODE&utm_source=public_payment&utm_medium=referral`
- PDF: retain “Created with VegaPal · vega-pal.com” (no layout redesign)

## Migration

`supabase/migrations/20260827120000_growth_engine_v1.sql`

Apply to production before expecting referral RPCs / bonuses / admin growth data.
Code degrades gracefully if migration is not yet applied.
