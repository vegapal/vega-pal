# VegaPal → New Supabase project (≤30 minutes)

Use this guide when the original Supabase project is unavailable and you need a **brand-new** Supabase project. **Do not change production Vercel env until the new database and auth are verified.**

---

## Overview

| Area | VegaPal dependency |
|------|-------------------|
| Database | Postgres schema in `supabase/migrations/` |
| Auth | Supabase Auth (email/password); no custom Auth Hooks in repo |
| Storage | **None required** (logos = data URLs in `profiles.logo_url`) |
| Edge Functions | **None** in this repository |
| Email | Supabase Auth default templates (customize in Dashboard) |
| Turnstile | Cloudflare (Vercel env), not Supabase |
| App runtime | Vercel + env vars only (no hardcoded project refs in app code) |

---

## Phase 1 — Create Supabase project (5 min)

1. Sign in to [Supabase](https://supabase.com) with an **account you control** (not a suspended GitHub-linked org if that blocks access).
2. **New project** → choose org, name (e.g. `vegapal-prod`), region, database password (**save it**).
3. Wait until the project is **Active**.
4. **Settings → API** — note:
   - **Project URL** → `https://<project-ref>.supabase.co`
   - **Publishable (anon) key**
   - **Service role key** (server only; never commit or expose to the browser)

5. **Settings → Database** — note **Session pooler** host (for optional CLI migrations), e.g. `aws-0-<region>.pooler.supabase.com`.

**Sanity check (local):**

```powershell
Invoke-RestMethod "https://<project-ref>.supabase.co/auth/v1/health"
```

Must return JSON (not “remote name could not be resolved”).

---

## Phase 2 — Database bootstrap (10 min)

### Option A — SQL Editor (recommended for first migration)

1. Regenerate the single-file script (if you changed migrations):

   ```bash
   npm run db:bootstrap
   ```

2. Open **SQL → New query** in the new project.
3. Paste **`docs/BOOTSTRAP_FRESH_DATABASE.sql`** entirely → **Run**.
4. Confirm **Success** (no errors).

### Option B — Node migration runner

`.env.local` (do not commit):

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_DB_PASSWORD=<database-password>
SUPABASE_DB_POOLER_HOST=<session-pooler-host-from-dashboard>
```

```bash
node scripts/run-migrations.mjs
node scripts/verify-supabase-sql.mjs
```

### SQL execution order (same as bootstrap file)

| Order | File | Purpose |
|------:|------|---------|
| 1 | `20260624073831_*.sql` | `profiles`, `invoices`, `invoice_items`, RLS, `handle_new_user`, `set_updated_at` |
| 2 | `20260624073841_*.sql` | Revoke execute on trigger functions from public roles |
| 3 | `20260625120000_invoice_phase1.sql` | Currency, JSONB display/payment options, terms |
| 4 | `20260626120000_tighten_public_invoice_rls.sql` | Anon read only **non-draft** invoices/items |
| 5 | `20260627120000_admin_plans.sql` | `user_plan`, `user_role`, `protect_profile_privileged_fields` |
| 6 | `20260629120000_grant_initial_admin.sql` | Optional one-time admin grant (see below) |
| 7 | `20260630120000_invoice_plan_limit.sql` | Free plan 5 invoices/month trigger + `get_invoice_plan_usage()` |
| 8 | `20260630140000_admin_audit_logs.sql` | `admin_audit_logs` table + indexes |
| 9 | `20260630150000_admin_audit_logs_grants.sql` | `GRANT` for `service_role` on audit logs |

Bootstrap also runs: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` (for `gen_random_uuid()`).

---

## Phase 3 — Auth settings (5 min)

**Authentication → Providers**

- Enable **Email** provider (password sign-in).

**Authentication → URL configuration**

| Setting | Value |
|---------|--------|
| Site URL | `https://vega-pal.com` |
| Redirect URLs | `http://localhost:5173/**`, `http://localhost:8080/**`, `https://vega-pal.com/**`, `https://www.vega-pal.com/**`, `https://*.vercel.app/**` |

**Authentication → Email templates** (optional)

- Customize confirm signup, reset password, magic link copy/branding.
- Redirect links must match URLs above; app uses `https://vega-pal.com` for production redirects (`src/lib/auth/redirect-url.ts`).

**Authentication → Rate limits**

- Keep Supabase defaults or tighten per `docs/ANTI_ABUSE.md`.

**Auth hooks**

- **None** required by VegaPal (no `supabase/functions`, no hook SQL in migrations).

---

## Phase 4 — Environment variables (5 min)

Set on **Vercel** (Production + Preview + Development) — values from the **new** project only:

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | Yes | Same as Project URL; **redeploy** after change |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable/anon key |
| `SUPABASE_URL` | Yes | Same Project URL (server) |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Same publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only |
| `VITE_TURNSTILE_SITE_KEY` | Prod | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Prod | Server only |

Local: copy `.env.example` → `.env.local` and fill the same keys.

**Optional (scripts only, not Vercel):**

| Variable | Purpose |
|----------|---------|
| `SUPABASE_PROJECT_REF` | Parsed from `SUPABASE_URL` if omitted |
| `SUPABASE_DB_PASSWORD` | Postgres for migration scripts |
| `SUPABASE_DB_POOLER_HOST` | Pooler hostname for `run-migrations.mjs` |

See also: `docs/SUPABASE_ENV.md`.

---

## Phase 5 — Deploy app (5 min)

1. Update Vercel env with **new** Supabase values.
2. **Redeploy** production (required for `VITE_*` embed).
3. Do **not** point production at the new project until health checks pass (use Preview first if you prefer).

---

## Schema reference (verification)

### Extensions

- `pgcrypto` (bootstrap ensures it exists).

### Tables

- `public.profiles` — user profile, plan, role, branding, wallet defaults.
- `public.invoices` — invoice header + payment JSONB.
- `public.invoice_items` — line items.
- `public.admin_audit_logs` — admin API audit trail (service role writes).

### Triggers

| Trigger | Function | Role |
|---------|----------|------|
| `on_auth_user_created` | `handle_new_user()` | Inserts `profiles` row on signup |
| `profiles_updated_at` | `set_updated_at()` | `updated_at` |
| `invoices_updated_at` | `set_updated_at()` | `updated_at` |
| `profiles_protect_privileged_fields` | `protect_profile_privileged_fields()` | Blocks self-service role/plan/disabled changes |
| `invoices_enforce_plan_limit` | `enforce_invoice_plan_limit()` | Free plan 5 invoices/month |

### RLS (summary)

| Table | authenticated | anon | service_role |
|-------|---------------|------|----------------|
| `profiles` | Own row SELECT/INSERT/UPDATE | — | ALL (bypass via service key in admin API) |
| `invoices` | Own rows ALL | SELECT where `status <> 'draft'` | ALL |
| `invoice_items` | Via owning invoice | SELECT for non-draft invoices | ALL |
| `admin_audit_logs` | **No policies** (deny) | — | Table `GRANT` + service role inserts |

### Indexes

- `invoices_user_id_idx` on `invoices(user_id)`
- `invoice_items_invoice_id_idx` on `invoice_items(invoice_id)`
- `admin_audit_logs_target_user_id_idx`, `admin_audit_logs_created_at_idx`

### Functions (RPC)

- `get_invoice_plan_usage()` — `authenticated` execute; used for plan UI/limits.

### Storage buckets

- **Not required.** No bucket policies in migrations.

### Edge Functions

- **None** in repo.

---

## Application features (post-migration)

| Feature | Depends on |
|---------|------------|
| Register / login / reset password | Auth + `/api/auth/*` + env keys |
| Profile after signup | `handle_new_user` trigger |
| Invoices CRUD | RLS + authenticated client |
| Free plan limit (5/mo) | `enforce_invoice_plan_limit` trigger |
| Public payment page `/pay/$id` | Anon RLS on non-draft invoices |
| Crypto payments | `payment_methods` JSONB + wallet fields (USDT/TRC20 defaults) |
| Admin `/admin` | `profiles.role = 'admin'` + `/api/admin/*` + service role |
| Admin audit log | `admin_audit_logs` + service role |
| Turnstile | `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` on Vercel |
| PDF / Excel | Client-side (no Supabase) |

---

## First admin user

After **one** successful register + email confirm + login (creates `profiles` row):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) = lower('your@email.com');
```

Migration `20260629120000_grant_initial_admin.sql` may promote a specific email **only if** no admin exists; edit that migration before bootstrap if you use a different bootstrap email, or rely on the SQL above.

---

## Required secrets (checklist)

- [ ] Supabase **service role** key (Vercel only, never `VITE_`)
- [ ] Supabase **publishable** key (Vercel + `VITE_`)
- [ ] Database password (secure store; scripts only)
- [ ] Turnstile **secret** (Vercel only)
- [ ] Turnstile **site** key (`VITE_`)

---

## Final verification checklist

### Supabase

- [ ] `Invoke-RestMethod https://<ref>.supabase.co/auth/v1/health` succeeds
- [ ] Tables exist: `profiles`, `invoices`, `invoice_items`, `admin_audit_logs`
- [ ] Trigger `on_auth_user_created` exists on `auth.users`
- [ ] Test user: sign up → row in `profiles` with `plan = free`
- [ ] Create 5 invoices on free plan → 6th blocked (DB or app message)
- [ ] Public `/pay/<uuid>` works for `pending` invoice; draft not visible to anon

### Vercel (Preview first recommended)

- [ ] `GET /api/health` → `"supabase": true`, `"ok": true`
- [ ] Register → confirm email → login → dashboard
- [ ] Create / edit invoice → PDF
- [ ] Admin user can open `/admin` (after role SQL)
- [ ] `node scripts/qa-auth-api.mjs https://<preview-url>`
- [ ] `node scripts/qa-smoke.mjs https://<preview-url>`

### Production cutover

- [ ] Update **Production** Vercel env to new Supabase project
- [ ] Redeploy production
- [ ] Re-run health + smoke on `https://vega-pal.com`
- [ ] Confirm old project ref no longer appears in built HTML `preconnect` (view page source)

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `TypeError: fetch failed` / `ENOTFOUND` | Wrong or non-existent `<ref>.supabase.co` in env |
| Health `env` all true, `supabase: false` | Service role key wrong or DB schema not bootstrapped |
| Signup works, no profile | `handle_new_user` trigger missing — re-run bootstrap |
| Admin API 403 | `role` not `admin` or user disabled |
| Turnstile blocks login on prod | Keys missing or domain not `vega-pal.com` |

---

## Repo maintenance

- **Never** commit real keys or `SUPABASE_DB_PASSWORD`.
- **No** hardcoded Supabase project refs in source — use env (`scripts/lib/supabase-project-ref.mjs`).
- After editing `supabase/migrations/*.sql`, run `npm run db:bootstrap` and commit `docs/BOOTSTRAP_FRESH_DATABASE.sql`.
- Legacy `docs/MIGRATION_ALL.sql` is **deprecated**; use `BOOTSTRAP_FRESH_DATABASE.sql`.

---

## Quick timeline (target ≤30 min)

| Minutes | Task |
|--------:|------|
| 0–5 | Create Supabase project, copy API keys |
| 5–15 | Run `BOOTSTRAP_FRESH_DATABASE.sql`, configure Auth URLs |
| 15–20 | Set Vercel Preview env, redeploy Preview |
| 20–25 | Smoke test Preview, promote first admin |
| 25–30 | Production env + redeploy + health check |
