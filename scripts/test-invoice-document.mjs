/**
 * Invoice document model and migration mapping tests.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const harness = spawnSync("npx", ["--yes", "tsx", "scripts/test-invoice-document.harness.ts"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

if (harness.status !== 0) {
  process.exit(harness.status ?? 1);
}

const migration = readFileSync(
  join(ROOT, "supabase/migrations/20260729120000_invoice_document_lifecycle.sql"),
  "utf8",
);
if (!migration.includes("allocate_invoice_document_number")) {
  console.error("Migration missing allocate_invoice_document_number");
  process.exit(1);
}
if (!migration.includes("document_type")) {
  console.error("Migration missing document_type");
  process.exit(1);
}
if (migration.includes("DROP COLUMN status")) {
  console.error("Migration must not drop legacy status column");
  process.exit(1);
}

console.log("Invoice document tests passed");
process.exit(0);
