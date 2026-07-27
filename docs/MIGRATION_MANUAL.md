# Database migration — manual run

> **Prefer:** [`docs/MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) and **`docs/BOOTSTRAP_FRESH_DATABASE.sql`** (regenerate with `npm run db:bootstrap`).

## Run migrations in Supabase SQL Editor

1. Create a **new** Supabase project (you own the org account).
2. Open **SQL → New query** in that project’s dashboard.
3. Paste the full contents of **`docs/BOOTSTRAP_FRESH_DATABASE.sql`**.
4. Click **Run** and confirm no errors.

## Optional: CLI runner

1. **Project Settings → Database** — copy database password and pooler host (region-specific).
2. Add to `.env.local`:
   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_DB_PASSWORD=your-database-password
   SUPABASE_DB_POOLER_HOST=<from-dashboard-session-pooler-host>
   ```
3. Run:
   ```bash
   node scripts/run-migrations.mjs
   node scripts/verify-supabase-sql.mjs
   node scripts/verify-supabase-infra.mjs
   ```

## After migrations

See **Final verification** in [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md).

### First admin user

After you register and sign in once (creates a profile via `handle_new_user` trigger):

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### Auth redirect URLs

**Authentication → URL Configuration** — add:

- `http://localhost:5173/**`
- `http://localhost:8080/**`
- `https://vega-pal.com/**`
- `https://www.vega-pal.com/**`
- `https://*.vercel.app/**`

## Storage

No storage buckets are required. Logos are stored as data URLs in `profiles.logo_url`.
