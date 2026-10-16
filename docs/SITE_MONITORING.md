# VegaPal audience and new account alerts

The admin overview includes a first-party audience panel and a private inbox for
new registrations. Apply `supabase/migrations/20261016090000_site_monitoring.sql`
before deploying. The application handles an unavailable migration explicitly;
it never presents unavailable monitoring as measured zero traffic.

## What the numbers mean

- Visitors are approximate distinct browser identifiers over the current UTC
  date plus the preceding 29 UTC dates. They are not verified unique people.
- Visits count one public-page browser session per UTC date. Reloads and route
  changes in the same tab/day do not add visits. Separate tabs count separately.
- New accounts come from profile creation dates. They include unconfirmed email
  registrations; a new account is not the same thing as a successful sign-in.
- Signed-in users and login events come from successful, confirmed, enabled
  password sign-ins verified by the server. Refreshing a saved session does not
  count as another sign-in. These events begin at deployment, with no backfill.
- Only public sitemap pages are tracked. Auth, admin, invoice and payment pages
  are excluded. No query strings, account identifiers, raw IP addresses, user
  agents, full referrers or invoice data are stored with anonymous visits.
- The browser identifier expires after 30 days. Do Not Track and Global Privacy
  Control are respected; blocked storage or collection can reduce counts.
- Raw visit/login rows are pruned to 90 UTC dates by dashboard reads and by the
  existing daily authenticated subscription job. Configure `CRON_SECRET` in
  Vercel for retention even when nobody opens the dashboard.

## Signup inbox and optional owner delivery

Every profile inserted after migration creates one admin inbox row in the same
database transaction. Historical profiles are not backfilled as new alerts.
Only the existing server-authorized admin API can read or acknowledge these
rows. Acknowledgement is shared by administrators.

External delivery is optional and disabled until all channel settings exist.
Set the owner's chosen destination in **server-side production** environment
variables; never put provider credentials in `VITE_*` or commit them.

For email, set `SIGNUP_NOTIFICATION_CHANNEL=email`, `RESEND_API_KEY`,
`SIGNUP_NOTIFICATION_EMAIL_FROM` (a verified sender) and
`SIGNUP_NOTIFICATION_EMAIL_TO` (the owner's address).

For Telegram, set `SIGNUP_NOTIFICATION_CHANNEL=telegram`, `TELEGRAM_BOT_TOKEN`
and `TELEGRAM_CHAT_ID`. The owner must first start the bot or add it to the
destination chat. Creating accounts/bots or paid provider plans is a separate
owner setup step.

Messages contain a registration timestamp and `https://vega-pal.com/admin`;
new users' names and email addresses remain in the private admin inbox.
Provider requests time out after four seconds and the complete delivery batch
has a six-second deadline, including database calls. Login metrics have a
1.5-second deadline. Failures do not change account creation or login success.
Database claims prevent concurrent workers from sending the same
queued row. Email uses a stable provider idempotency key; Telegram can duplicate
an alert after an ambiguous timeout. Pending work is retried with backoff on
later registrations, the authenticated daily cron, or an administrator's
`POST /api/admin/monitoring/deliver` request with `{}`. This is best-effort
delivery; the database inbox is authoritative.

## Deployment and checks

1. Confirm the production Supabase project before applying this one migration.
   Do not replay all historical migrations against a production database.
2. Deploy the tested commit through the existing GitHub/Vercel project.
3. Confirm `/api/analytics/visit` accepts a valid same-origin public visit, and
   `/api/admin/monitoring` rejects unauthenticated/non-admin access.
4. In an authorized admin session, verify measured visits and the configured
   delivery badge. Use a staging registration to check the complete notification
   flow before claiming external delivery is operational.
5. Existing GA4/GTM remain separate optional integrations. Console configuration
   and Google Search Console access must be verified in the owner's accounts.

Anonymous collection is a public endpoint with strict input, size, origin and
rate checks. Counts remain approximate and are not fraud-resistant.
The in-memory rate limiter is a per-process safeguard, not a distributed quota.
