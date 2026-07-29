/**
 * Static guards for invoice wizard entry (imports + locale keys).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const wizardPath = join(ROOT, "src/components/invoices/create/InvoiceWizard.tsx");
const wizard = readFileSync(wizardPath, "utf8");

const requiredImports = [
  "useSession",
  "useInvoice",
  "getInvoicePlanUsage",
  "isAtFreePlanInvoiceLimit",
  "defaultPaymentStatusForType",
  "notifyInvoices",
  "invoices",
  "InvoicePlanUsage",
];

let failed = 0;
for (const name of requiredImports) {
  if (!wizard.includes(name)) {
    console.error(`FAIL: InvoiceWizard.tsx missing reference to ${name}`);
    failed++;
  }
}

const importBlock = wizard.slice(0, wizard.indexOf("type Props"));
for (const name of ["useSession", "useInvoice", "invoices", "notifyInvoices"]) {
  if (!importBlock.includes(name)) {
    console.error(`FAIL: InvoiceWizard.tsx missing import for ${name}`);
    failed++;
  }
}

const localeDir = join(ROOT, "locales");
const requiredKeys = [
  "wizard.pageTitle",
  "wizard.steps.document",
  "wizard.steps.client",
  "wizard.steps.details",
  "wizard.steps.items",
  "wizard.steps.payment",
  "wizard.steps.review",
  "wizard.documentType.heading",
  "wizard.documentTypes.taxInvoice.title",
  "wizard.client.nameLabel",
  "wizard.client.showOnDocument",
  "wizard.details.subjectTaxInvoice",
  "wizard.items.addDiscount",
  "wizard.preview.openMobile",
  "wizard.error.title",
  "wizard.actions.createInvoice",
  "list.title",
];

for (const lang of readdirSync(localeDir)) {
  const file = join(localeDir, lang, "invoices.json");
  let json;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    continue;
  }
  for (const keyPath of requiredKeys) {
    const parts = keyPath.split(".");
    let cur = json;
    for (const p of parts) {
      cur = cur?.[p];
    }
    if (typeof cur !== "string" || !cur.trim()) {
      console.error(`FAIL: locales/${lang}/invoices.json missing string key ${keyPath}`);
      failed++;
    }
  }
}

if (failed > 0) process.exit(1);
console.log("Invoice wizard guard passed");
process.exit(0);
