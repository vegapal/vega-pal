# Anti-abuse & rate limiting (manual setup)

VegaPal is a frontend + Supabase app. **Server-side rate limits are the real protection.**

## Already in app (client-side, soft)

- `src/lib/client-rate-limit.ts` throttles register, login, and forgot-password submissions in the browser (easy to bypass — UX guard only).

## Recommended: Supabase Auth

In [Supabase Dashboard → Authentication → Rate Limits](https://supabase.com/docs/guides/auth/rate-limits):

- Enable built-in email signup / sign-in / password recovery limits.
- Set sensible per-IP thresholds for production traffic.

## Cloudflare Turnstile (implemented)

### Environment variables

Set in Vercel / local env:

- `VITE_TURNSTILE_SITE_KEY` — public site key (widget on register, login, forgot-password)
- `TURNSTILE_SECRET_KEY` — server only; verified inside `POST /api/auth/signup`, `POST /api/auth/login`, and `POST /api/auth/forgot-password` (one Siteverify call per request; tokens are single-use)

### Where Turnstile runs

Turnstile is **required only on production** hostnames:

- `vega-pal.com`
- `www.vega-pal.com`

It is **bypassed** (login/register work without captcha) on:

- Local development (`localhost`, Vite dev server)
- Vercel preview deployments (`*.vercel.app`)
- Any hostname not listed above (e.g. `vegapal.com` unless added to policy and Cloudflare)

Policy logic: `src/lib/turnstile/policy.ts`

### Cloudflare dashboard (required for production)

In [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile):

1. Open your widget → **Hostname management**
2. Add **exact** production domains:
   - `vega-pal.com`
   - `www.vega-pal.com`
3. Optionally add `*.vercel.app` only if you want Turnstile enforced on previews (not recommended; the app bypasses previews by default).
4. Confirm **site key** matches `VITE_TURNSTILE_SITE_KEY` and **secret key** matches `TURNSTILE_SECRET_KEY`.

### "Unable to connect to website"

This Cloudflare widget error almost always means the **current page hostname is not allowed** for the site key. Common cases:

- `VITE_TURNSTILE_SITE_KEY` is set on Vercel for all environments, but the widget only allows `vega-pal.com` → previews show the error and block sign-in (fixed by production-only policy).
- Visiting `vegapal.com` while the widget only lists `vega-pal.com` → add both domains in Cloudflare or align DNS/canonical host.

If keys are omitted locally, auth works without captcha. In production on `vega-pal.com`, set both keys and allowlisted domains.

## Recommended: Vercel

- Enable **Vercel Firewall / WAF** on Pro plan for `/register`, `/login`, `/forgot-password`.
- Set deployment **Attack Challenge Mode** if under bot traffic.

## Invoice creation

- Supabase RLS already scopes writes to `auth.uid()`.
- Add Edge Function rate limit (e.g. max N invoices/hour per user) if abuse appears.
- Consider captcha on register only (highest ROI).

## Public pay page

- RLS now blocks **draft** invoices from anonymous reads (migration `20260626120000`).
- UUID links remain guessable — do not treat invoice UUID as a secret; use long random IDs or tokens if stricter privacy is required later.
