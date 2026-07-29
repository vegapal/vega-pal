/**
 * Guards for quotation → invoice conversion (migration, RPC, store, UI).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed++;
}

const migrationPath = join(
  ROOT,
  "supabase/migrations/20260729150000_quotation_to_invoice_conversion.sql",
);
const migration = readFileSync(migrationPath, "utf8");

for (const needle of [
  "source_document_id",
  "converted_document_id",
  "invoices_source_document_id_unique",
  "convert_quotation_to_invoice",
  "FOR UPDATE",
  "allocate_invoice_document_number",
  "GRANT EXECUTE ON FUNCTION public.convert_quotation_to_invoice",
]) {
  if (!migration.includes(needle)) fail(`migration missing ${needle}`);
}

if (migration.toLowerCase().includes("drop table")) {
  fail("migration must not drop tables");
}

const bootstrap = readFileSync(join(ROOT, "docs/BOOTSTRAP_FRESH_DATABASE.sql"), "utf8");
if (!bootstrap.includes("convert_quotation_to_invoice")) {
  fail("BOOTSTRAP_FRESH_DATABASE.sql missing convert_quotation_to_invoice — run npm run db:bootstrap");
}

const types = readFileSync(join(ROOT, "src/integrations/supabase/types.ts"), "utf8");
if (!types.includes("convert_quotation_to_invoice")) {
  fail("supabase types missing convert_quotation_to_invoice");
}
if (!types.includes("source_document_id")) {
  fail("supabase types missing source_document_id");
}

const store = readFileSync(join(ROOT, "src/lib/vegapal-store.ts"), "utf8");
if (!store.includes("convertQuotationToInvoice")) {
  fail("vegapal-store missing convertQuotationToInvoice");
}
if (!store.includes('rpc("convert_quotation_to_invoice"')) {
  fail("must call convert_quotation_to_invoice RPC");
}
if (store.includes("nextInvoiceNumber") && store.includes("convertQuotationToInvoice")) {
  const convertBlock = store.slice(
    store.indexOf("convertQuotationToInvoice"),
    store.indexOf("async duplicate"),
  );
  if (convertBlock.includes("nextInvoiceNumber")) {
    fail("conversion must not allocate numbers on client");
  }
}

const detail = readFileSync(join(ROOT, "src/routes/invoices.$id.tsx"), "utf8");
for (const needle of ["ConvertQuotationDialog", "conversion.action", "convertQuotationToInvoice"]) {
  if (!detail.includes(needle)) fail(`invoices.$id missing ${needle}`);
}

const shell = readFileSync(join(ROOT, "src/components/AppShell.tsx"), "utf8");
if (!shell.includes("h-[100dvh]") || !shell.includes("mt-auto shrink-0")) {
  fail("AppShell sidebar must pin account section with h-[100dvh] and mt-auto shrink-0");
}

const events = readFileSync(join(ROOT, "src/lib/analytics/events.ts"), "utf8");
if (!events.includes("quotation_converted_to_invoice")) {
  fail("analytics missing quotation_converted_to_invoice");
}
if (/invoice_number|clientName|client_name/.test(events.slice(events.indexOf("trackQuotationConverted")))) {
  fail("conversion analytics must not include PII fields");
}

const localeDir = join(ROOT, "locales");
const conversionKeys = [
  "conversion.action",
  "conversion.dialogTitle",
  "conversion.confirm",
  "conversion.listBadge",
];

for (const lang of readdirSync(localeDir)) {
  const file = join(localeDir, lang, "invoices.json");
  let json;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    continue;
  }
  for (const keyPath of conversionKeys) {
    const parts = keyPath.split(".");
    let cur = json;
    for (const p of parts) cur = cur?.[p];
    if (typeof cur !== "string" || !cur.trim()) {
      fail(`locales/${lang}/invoices.json missing ${keyPath}`);
    }
  }
}

if (failed > 0) process.exit(1);
console.log("Quotation conversion guard passed");
