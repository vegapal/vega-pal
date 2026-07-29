import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clientIdentityFromParts,
  sellerIdentityFromParts,
} from "../src/lib/invoice/document-identity.ts";
import {
  documentTypeHeading,
  dueDateFieldLabel,
  finalTotalLabel,
} from "../src/lib/invoice/document-labels.ts";
import { documentTotalsView } from "../src/lib/invoice/document-totals-display.ts";
import { DEFAULT_DISPLAY_OPTIONS } from "../src/lib/invoice-constants.ts";
import type { Invoice } from "../src/lib/vegapal-store.ts";

assert.equal(documentTypeHeading("quotation"), "QUOTATION");
assert.equal(documentTypeHeading("proforma_invoice"), "PROFORMA INVOICE");
assert.equal(documentTypeHeading("tax_invoice"), "TAX INVOICE");
assert.notEqual(documentTypeHeading("quotation"), "INVOICE");

assert.equal(dueDateFieldLabel("quotation"), "Valid until");
assert.equal(dueDateFieldLabel("tax_invoice"), "Due date");

const dupClient = clientIdentityFromParts({
  name: "Eye Media LLC",
  company: "Eye Media LLC",
  email: "a@example.com",
});
assert.equal(dupClient.length, 2);
assert.equal(dupClient[0].text, "Eye Media LLC");

const dupEmail = clientIdentityFromParts({
  name: "yjaafreh90@gmail.com",
  company: "",
  email: "yjaafreh90@gmail.com",
});
assert.equal(dupEmail.length, 1);

const seller = sellerIdentityFromParts({
  business: "Acme",
  name: "Acme",
  email: "hi@acme.com",
});
assert.equal(seller.filter((l) => l.text === "Acme").length, 1);

assert.equal(finalTotalLabel("quotation", "not_applicable"), "Total");
assert.equal(finalTotalLabel("tax_invoice", "unpaid"), "Total due");
assert.equal(finalTotalLabel("tax_invoice", "paid"), "Total");
assert.equal(finalTotalLabel("tax_invoice", "partially_paid"), "Balance due");

const baseInvoice = {
  items: [{ description: "Item", quantity: 1, unitPrice: 100, total: 100 }],
  discountType: "percentage" as const,
  taxType: "percentage" as const,
  discount: 10,
  tax: 4.5,
  discountRate: 10,
  taxRate: 5,
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showDiscount: true,
    showTax: true,
  },
} as Pick<
  Invoice,
  | "items"
  | "discountType"
  | "taxType"
  | "discount"
  | "tax"
  | "discountRate"
  | "taxRate"
  | "displayOptions"
>;

const totals = documentTotalsView(baseInvoice as Invoice);
assert.equal(totals.discountLabel, "Discount 10%");
assert.equal(totals.taxLabel, "Tax 5%");
assert.equal(totals.subtotal, 100);

const hiddenDue = { ...DEFAULT_DISPLAY_OPTIONS, showDueDate: false };
assert.equal(hiddenDue.showDueDate, false);
assert.equal(DEFAULT_DISPLAY_OPTIONS.showDueDate, true);

const pdfSource = readFileSync(join(process.cwd(), "src/lib/invoice-pdf.ts"), "utf8");
assert.ok(pdfSource.includes("Payment details"), "PDF uses Payment details heading");
assert.ok(!pdfSource.includes("Payment instructions"), "PDF must not use Payment instructions");
assert.ok(!pdfSource.includes("Powered by VegaPal"), "PDF must not use mid-page Powered by");
assert.ok(pdfSource.includes("Created with VegaPal"), "PDF footer branding");
assert.ok(!pdfSource.includes('doc.text("INVOICE"'), "PDF must not hardcode INVOICE title");
assert.ok(pdfSource.includes("documentTypeHeading"), "PDF uses document type helper");
assert.ok(pdfSource.includes('showHead: "everyPage"'), "Table headers repeat on pages");
assert.ok(pdfSource.includes('rowPageBreak: "avoid"'), "Rows avoid page breaks");

console.log("Invoice PDF harness: all tests passed");
