# VegaPal Security Audit

**Audit date:** 2026-08-26  
**Branch baseline:** `main` @ `55659facdf790a32218c4c49d0b99f951267b0e0`  
**Scope:** OWASP Top 10:2025-oriented review of this repository (React/TS, Supabase, Vercel, Turnstile).

This document lists **repository-relevant findings only**. Status reflects work in this sprint unless marked as owner/platform action.

---

## Summary

| Severity | Open (fixable locally) | Open (owner action) | Fixed this sprint |
|----------|------------------------|---------------------|-------------------|
| Critical | 0 | 0 | 0 |
| High     | 0 | 1 (npm supply chain) | 1 (RPC auth) |
| Medium   | 2 | 2 | 4 |
| Low      | 3 | 1 | 2 |

**Security gate:** No unresolved **Critical** or locally-fixable **High** findings remain after migration `20260826240000_security_rls_hardening.sql` is applied and tests pass.

---

## Findings

### F-1 — `log_user_activity` cross-user write (High) — FIXED (migration required)

| Field | Detail |
|-------|--------|
| Component | `public.log_user_activity()` RPC |
| Attack scenario | Authenticated user A calls RPC with `p_user_id = B`, polluting B's activity log |
| Required fix | Reject when `auth.uid() IS NOT NULL AND auth.uid() <> p_user_id` |
| Fix status | Fixed in `supabase/migrations/20260826240000_security_rls_hardening.sql` |
| Verification | Apply migration; cross-user RPC should raise `42501` |

### F-2 — Anon invoice SELECT exposes full row (Medium) — PARTIALLY MITIGATED

| Field | Detail |
|-------|--------|
| Component | RLS on `invoices`; pay page `select("*")` |
| Attack scenario | Holder of UUID reads full row including `user_id` via anon client |
| Fix status | RLS tightened; public field allowlist deferred (backlog) |
| Verification | Draft/cancelled blocked at DB; extra columns still returned to anon client |

### F-3 — Legacy status vs document_status (Medium) — FIXED (migration required)

Policy now checks both `status` and `document_status` for anon reads.

### F-4 — `get_effective_plan(uuid)` cross-user enumeration (Medium) — FIXED (migration required)

Caller guard added; service role / trigger paths (`auth.uid() IS NULL`) still allowed.

### F-5 — Missing service_role grant on payment_methods (Low) — FIXED (migration required)

### F-6 — `/api/health` information disclosure (Medium) — FIXED

Production returns `{ ok: boolean }` only. Verified by `npm run test:security-contracts`.

### F-7 — Public pay links use UUIDs (Medium) — DOCUMENTED

UUID v4 used (not sequential). Opaque tokens + revocation = future enhancement. `/pay` is noindex + robots Disallow.

### F-8 — In-memory rate limits on serverless (Low) — DOCUMENTED

Best-effort Map limiter; billing POST now rate-limited. Persistent limiter = platform decision.

### F-9 — Resend confirmation without Turnstile (Low) — FIXED

Server verification + client widget on email confirmation actions.

### F-10 — Admin API authorization — PASS

Unauthenticated admin API returns 401/403 (`scripts/qa-smoke.mjs`).

### F-11 — IDOR — PASS with RLS

Owner policies use `auth.uid() = user_id`.

### F-12 — USDT subscription checkout — PASS

Server-derived amount/network/address; idempotent approval.

### F-13 — PDF/HTML XSS — PASS

React `renderToStaticMarkup` escapes user content.

### F-14 — Elevated secrets in client — PASS

`npm run security:check-client-secrets`.

### F-15 — Security headers — PASS with notes

CSP uses `unsafe-inline` for Vite/React compatibility (documented tradeoff).

### F-16 — Turnstile fail-closed on production — PASS

`npm run test:turnstile`.

### F-17 — npm audit (High — owner/supply chain)

`xlsx` has high severity with no fix — evaluate replacement. Run `npm audit --omit=dev`.

### F-18 — Admin MFA — OWNER ACTION

Enable TOTP on admin in Supabase dashboard when ready; not forced this sprint.

---

## Owner / Platform Actions

1. Apply `20260826240000_security_rls_hardening.sql` in production Supabase.
2. Rotate secrets if found in git history (manual; do not rewrite history).
3. Configure Turnstile production secret + hostname allowlist.
4. Evaluate `xlsx` vulnerability.
5. Consider distributed rate limiting (WAF or DB-backed).

---

## Tests

| Command | Purpose |
|---------|---------|
| `npm run security:check-client-secrets` | Client secret scan |
| `npm run test:security-contracts` | Static security contracts |
| `npm run test:turnstile` | Turnstile behavior |
| `npm run test:auth-persistence` | Remember Me |
| `npm run test:smoke` | Admin denial, bundle scan |
| `npm run typecheck` / `npm run build` | Compile gate |
