# Supabase & Vercel environment variables

**Migrating to a new project?** Start with [`docs/MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md).

VegaPal reads Supabase config from environment variables. After migrating to a new Supabase project, update **all** of the following.

## Variable reference

| Variable | Where used | Environments |
|----------|------------|--------------|
| `VITE_SUPABASE_URL` | Browser client (`client.ts`) | Local, Vercel Preview, Vercel Production |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser client | Local, Vercel Preview, Vercel Production |
| `SUPABASE_URL` | SSR, admin API, auth middleware | Local, Vercel (all) |
| `SUPABASE_PUBLISHABLE_KEY` | SSR session validation | Local, Vercel (all) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API (`client.server.ts`) — **secret** | Local, Vercel (all) |

`VITE_*` vars are embedded at build time on Vercel. Changing them requires a **redeploy**.

## Local development

1. Copy `.env.example` → `.env.local`
2. Fill in values from [Supabase Dashboard → Project Settings → API](https://supabase.com/dashboard/project/_/settings/api)
3. Run `npm run dev`

## Vercel

**Project → Settings → Environment Variables**

Set the same six Supabase variables for:

- **Production** — `vega-pal.com`
- **Preview** — `*.vercel.app` deployments
- **Development** — optional (for `vercel dev`)

### Suggested values per environment

Use the **same new Supabase project** for Production and Preview unless you intentionally maintain separate databases.

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `VITE_SUPABASE_URL` | New project URL | Same | Same |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | New anon key | Same | Same |
| `SUPABASE_URL` | New project URL | Same | Same |
| `SUPABASE_PUBLISHABLE_KEY` | New anon key | Same | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | New service role key | Same | Same |

After updating, trigger a new deployment (Settings → Deployments → Redeploy).

## Supabase Auth redirect URLs

In **Authentication → URL Configuration** on the new project, set:

- **Site URL:** `https://vega-pal.com` (not a `*.vercel.app` URL)

Auth emails (`signUp`, `resend`, `resetPassword`) always use `https://vega-pal.com/...` redirect targets except on `localhost` dev.

Add **Redirect URLs**:

- `http://localhost:5173/**` (local Vite)
- `https://vega-pal.com/**`
- `https://www.vega-pal.com/**`
- `https://*.vercel.app/**` (preview)

## Database migrations

Schema is managed only via files in `supabase/migrations/`. On a **new** Supabase project, run **`docs/BOOTSTRAP_FRESH_DATABASE.sql`** in the SQL Editor (see [`docs/MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md)).

Regenerate the bootstrap file after editing migrations:

```bash
npm run db:bootstrap
```

Optional script env (local migrations only — never commit passwords):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_PROJECT_REF` | Project ref; auto-derived from `SUPABASE_URL` if omitted |
| `SUPABASE_DB_PASSWORD` | Postgres password for `run-migrations.mjs` / `verify-supabase-sql.mjs` |
| `SUPABASE_DB_POOLER_HOST` | Session pooler hostname from Supabase Dashboard |

## Storage

VegaPal stores logos as **data URLs** in `profiles.logo_url` — no Supabase Storage buckets are required by the migrations.

## First admin (manual, after migrations)

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```
