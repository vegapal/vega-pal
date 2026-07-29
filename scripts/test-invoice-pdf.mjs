/**
 * PDF layout helpers, identity deduplication, and static PDF renderer guards.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const harness = spawnSync("npx", ["--yes", "tsx", "scripts/test-invoice-pdf.harness.ts"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

if (harness.status !== 0) {
  process.exit(harness.status ?? 1);
}

const localeDir = join(ROOT, "locales");
const langs = ["en", "ar", "th", "zh", "ru"];
const invoiceKeys = [
  "wizard.details.showDueDateOnDocument",
  "wizard.details.showDueDateOnDocumentHint",
];
const commonKeys = [
  "labels.paymentDetails",
  "labels.bankTransferDetails",
  "labels.cryptoPaymentDetails",
  "labels.cashPayment",
  "footer.createdWithVegapal",
];

let failed = 0;

for (const lang of langs) {
  if (!readdirSync(localeDir).includes(lang)) continue;
  const inv = JSON.parse(readFileSync(join(localeDir, lang, "invoices.json"), "utf8"));
  const com = JSON.parse(readFileSync(join(localeDir, lang, "common.json"), "utf8"));
  for (const keyPath of invoiceKeys) {
    const parts = keyPath.split(".");
    let cur = inv;
    for (const p of parts) cur = cur?.[p];
    if (typeof cur !== "string" || !cur.trim()) {
      console.error(`FAIL: locales/${lang}/invoices.json missing ${keyPath}`);
      failed++;
    }
  }
  for (const keyPath of commonKeys) {
    const parts = keyPath.split(".");
    let cur = com;
    for (const p of parts) cur = cur?.[p];
    if (typeof cur !== "string" || !cur.trim()) {
      console.error(`FAIL: locales/${lang}/common.json missing ${keyPath}`);
      failed++;
    }
  }
}

if (failed > 0) process.exit(1);

console.log("Invoice PDF tests passed");
process.exit(0);
