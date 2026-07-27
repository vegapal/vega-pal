/**
 * SQL verification after migrations.
 * Usage:
 *   node scripts/verify-supabase-sql.mjs "<connection-string>"
 *   SUPABASE_DB_PASSWORD=... node scripts/verify-supabase-sql.mjs
 */
import pg from "pg";
import { resolveSupabaseProjectRef } from "./lib/supabase-project-ref.mjs";

const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
  "ap-south-1",
  "ca-central-1",
  "sa-east-1",
];

async function discoverConnectionString(explicit) {
  if (explicit) return explicit;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error(
      "Set SUPABASE_DB_PASSWORD in .env.local or pass a connection string as the first argument.",
    );
  }
  const ref = resolveSupabaseProjectRef();
  const encoded = encodeURIComponent(password);
  const candidates = [
    `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`,
    ...regions.flatMap((region) => [
      `postgresql://postgres.${ref}:${encoded}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres.${ref}:${encoded}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    ]),
  ];
  for (const connStr of candidates) {
    const client = new pg.Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return connStr;
    } catch {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw new Error("Could not connect.");
}

async function main() {
  const connStr = await discoverConnectionString(process.argv[2]);
  const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('profiles','invoices','invoice_items','admin_audit_logs')
    ORDER BY 1
  `);
  console.log("=== Tables ===");
  console.log(tables.rows.map((r) => r.table_name).join(", ") || "(none)");

  const phase1 = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices'
      AND column_name IN ('invoice_currency','po_number','reference_number','project_code','terms_and_conditions','display_options','payment_methods')
    ORDER BY 1
  `);
  console.log("\n=== Invoice Phase 1 columns ===");
  phase1.rows.forEach((r) => console.log("  OK:", r.column_name));

  const admin = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name IN ('plan','role','is_disabled')
    ORDER BY 1
  `);
  console.log("\n=== Admin columns ===");
  admin.rows.forEach((r) => console.log("  OK:", r.column_name));

  const audit = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs'
    ORDER BY ordinal_position
  `);
  console.log("\n=== Admin audit log columns ===");
  audit.rows.forEach((r) => console.log("  OK:", r.column_name));

  const enums = await client.query(`
    SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND typname IN ('user_plan','user_role')
    ORDER BY 1
  `);
  console.log("\n=== Enums ===");
  enums.rows.forEach((r) => console.log("  OK:", r.typname));

  const policies = await client.query(`
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('profiles','invoices','invoice_items','admin_audit_logs')
    ORDER BY tablename, policyname
  `);
  console.log("\n=== RLS policies ===");
  policies.rows.forEach((r) => console.log(`  ${r.tablename}: ${r.policyname}`));

  const triggers = await client.query(`
    SELECT tgname, relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname IN ('public','auth')
      AND (tgname LIKE '%updated_at%' OR tgname LIKE '%new_user%' OR tgname LIKE '%privileged%' OR tgname LIKE '%invoice_plan%')
    ORDER BY relname, tgname
  `);
  console.log("\n=== Triggers ===");
  triggers.rows.forEach((r) => console.log(`  ${r.table_name}: ${r.tgname}`));

  const functions = await client.query(`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND proname IN ('handle_new_user','set_updated_at','protect_profile_privileged_fields','get_invoice_plan_usage')
    ORDER BY 1
  `);
  console.log("\n=== Functions ===");
  functions.rows.forEach((r) => console.log("  OK:", r.proname));

  const migrations = await client.query(`
    SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version
  `);
  console.log("\n=== Applied migrations ===");
  migrations.rows.forEach((r) => console.log(`  ${r.version}  ${r.name}`));

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
