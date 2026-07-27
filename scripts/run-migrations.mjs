/**
 * Run supabase/migrations/*.sql in order against a Postgres connection.
 * Usage: node scripts/run-migrations.mjs "<connection-string>"
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSupabaseProjectRef } from "./lib/supabase-project-ref.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

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

  const ref = resolveSupabaseProjectRef();
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password && !explicit) {
    throw new Error("Set SUPABASE_DB_PASSWORD in .env.local (Database password from Supabase Dashboard).");
  }
  const dbPassword = password || "";

  const directConfigs = [
    ...(process.env.SUPABASE_DB_POOLER_HOST
      ? [
          {
            label: "pooler-env-session",
            host: process.env.SUPABASE_DB_POOLER_HOST.trim(),
            port: 5432,
            user: `postgres.${ref}`,
          },
          {
            label: "pooler-env-tx",
            host: process.env.SUPABASE_DB_POOLER_HOST.trim(),
            port: 6543,
            user: `postgres.${ref}`,
          },
        ]
      : []),
    {
      label: "pooler-ap-south-1-session",
      host: "aws-1-ap-south-1.pooler.supabase.com",
      port: 5432,
      user: `postgres.${ref}`,
    },
    {
      label: "pooler-ap-south-1-tx",
      host: "aws-1-ap-south-1.pooler.supabase.com",
      port: 6543,
      user: `postgres.${ref}`,
    },
    {
      label: "direct-db-host",
      host: `db.${ref}.supabase.co`,
      port: 5432,
      user: "postgres",
    },
  ];

  for (const cfg of directConfigs) {
    const client = new pg.Client({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: dbPassword,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log(`Connected via ${cfg.label}`);
      return {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: dbPassword,
        database: "postgres",
        ssl: { rejectUnauthorized: false },
      };
    } catch (err) {
      console.log(`${cfg.label}: ${String(err.message ?? err).split("\n")[0]}`);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  const encoded = encodeURIComponent(dbPassword);
  const poolerCandidates = regions.flatMap((region) => [
    `postgresql://postgres.${ref}:${encoded}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${encoded}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
  ]);

  for (const connStr of poolerCandidates) {
    const client = new pg.Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log(`Connected: ${connStr.replace(/:[^:@]+@/, ":***@")}`);
      return connStr;
    } catch {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  throw new Error("Could not connect to Supabase Postgres.");
}

async function main() {
  const conn = await discoverConnectionString(process.argv[2]);
  const client = new pg.Client(
    typeof conn === "string"
      ? { connectionString: conn, ssl: { rejectUnauthorized: false } }
      : conn,
  );
  await client.connect();

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      name text,
      inserted_at timestamptz DEFAULT now()
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (await client.query("SELECT version FROM supabase_migrations.schema_migrations")).rows.map(
      (r) => r.version,
    ),
  );

  for (const file of files) {
    const version = file.split("_")[0];
    const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
    if (applied.has(version)) {
      console.log(`SKIP (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`APPLY: ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)",
        [version, name],
      );
      await client.query("COMMIT");
      console.log(`OK: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`FAILED: ${file}`, err);
      process.exit(1);
    }
  }

  await client.end();
  console.log("\nAll migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
