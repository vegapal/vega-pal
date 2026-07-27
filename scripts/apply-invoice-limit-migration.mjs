import { readFileSync, existsSync } from "fs";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSupabaseProjectRef } from "./lib/supabase-project-ref.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || line.trimStart().startsWith("#")) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("BLOCKER: SUPABASE_DB_PASSWORD not set in .env.local");
  process.exit(1);
}

const ref = resolveSupabaseProjectRef();
const version = "20260630120000";
const file = "20260630120000_invoice_plan_limit.sql";
const sql = readFileSync(path.join(__dirname, "..", "supabase", "migrations", file), "utf8");

const configs = [
  { host: "aws-1-ap-south-1.pooler.supabase.com", port: 5432, user: `postgres.${ref}` },
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
];

let client;
for (const cfg of configs) {
  const c = new pg.Client({
    ...cfg,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  try {
    await c.connect();
    await c.query("SELECT 1");
    client = c;
    console.log(`Connected via ${cfg.host}`);
    break;
  } catch (e) {
    try {
      await c.end();
    } catch {
      /* ignore */
    }
  }
}

if (!client) {
  console.error("BLOCKER: Could not connect to Supabase Postgres");
  process.exit(1);
}

const applied = await client.query(
  "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = $1",
  [version],
);
if (applied.rowCount > 0) {
  console.log("SKIP: migration already applied");
} else {
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)",
      [version, "invoice_plan_limit"],
    );
    await client.query("COMMIT");
    console.log("OK: migration applied");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("FAIL:", e.message);
    process.exit(1);
  }
}

await client.end();
