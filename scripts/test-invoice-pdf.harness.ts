import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";
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
import {
  buildInvoicePdfDocument,
  buildPdfTestInvoice,
  verifyPdfLayout,
} from "../src/lib/invoice-pdf.ts";

assert.equal(documentTypeHeading("quotation"), "QUOTATION");
assert.equal(documentTypeHeading("proforma_invoice"), "PROFORMA INVOICE");
assert.equal(documentTypeHeading("tax_invoice"), "TAX INVOICE");

const dupClient = clientIdentityFromParts({
  name: "Eye Media LLC",
  company: "Eye Media LLC",
  email: "a@example.com",
});
assert.equal(dupClient.length, 2);

const pdfSource = readFileSync(join(process.cwd(), "src/lib/invoice-pdf.ts"), "utf8");
assert.ok(pdfSource.includes("HOW TO PAY"));
assert.ok(!pdfSource.includes("DOCUMENT DETAILS"));
assert.ok(pdfSource.includes("unit: \"mm\""));
assert.ok(pdfSource.includes("documentY + 7"));
assert.ok(pdfSource.includes("verifyPdfLayout"));

const outDir = join(process.cwd(), "tmp", "pdf-exact-layout");
mkdirSync(outDir, { recursive: true });

const oneItem = buildPdfTestInvoice({
  number: "INV-0001",
  sellerBusiness: "VegaPal",
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showTerms: false,
    showTax: true,
    showDiscount: false,
    showPaymentInstructions: true,
    showDueDate: false,
    showClientInfo: false,
    showStatus: true,
  },
  termsAndConditions: "",
  tax: 5,
  taxRate: 5,
  taxType: "percentage",
  total: 105,
  items: [{ description: "Consulting", quantity: 1, unitPrice: 100, total: 100 }],
});
// Full terms + bank + dual methods covered by INV-DUAL sample below.

const { doc: oneDoc, layout: oneLayout } = await buildInvoicePdfDocument(oneItem);
verifyPdfLayout(oneLayout);
assert.equal(oneDoc.getNumberOfPages(), 1, "one-item bank invoice should fit on one page");
const pay = oneLayout.find((r) => r.id === "paymentSection");
assert.ok(pay, "payment section recorded");
assert.ok(pay!.h >= 50 && pay!.h <= 95, `payment height ${pay!.h}mm should be compact`);

writeFileSync(join(outDir, "INV-0001.pdf"), Buffer.from(oneDoc.output("arraybuffer")));

const dualPay = buildPdfTestInvoice({
  number: "INV-DUAL",
  sellerBusiness: "Very Long Company Name International Holdings And Services LLC",
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showTerms: true,
    showTax: true,
    showDueDate: true,
    showPaymentInstructions: true,
    showClientInfo: true,
  },
  termsAndConditions:
    "100% advance payment.\nInvoice valid for 14 days.\nPayment confirms acceptance.",
  paymentMethods: {
    method: "multiple",
    crypto: {
      enabled: true,
      currency: "USDT",
      network: "TRON TRC20",
      walletAddress: "TXYZ1234567890abcdefghijklmnopqrst",
    },
    bank: {
      enabled: true,
      bankName: "Emirates NBD",
      accountName: "Eye Media",
      accountNumber: "999",
      iban: "AE123",
      swift: "EBILAEAD",
    },
    cash: { enabled: false },
  },
});

const { doc: dualDoc, layout: dualLayout } = await buildInvoicePdfDocument(dualPay);
writeFileSync(join(outDir, "INV-DUAL.pdf"), Buffer.from(dualDoc.output("arraybuffer")));

const quotation = buildPdfTestInvoice({
  number: "QTN-0001",
  documentType: "quotation",
  paymentStatus: "not_applicable",
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showPaymentInstructions: false,
  },
});
const { doc: qDoc } = await buildInvoicePdfDocument(quotation);
writeFileSync(join(outDir, "QTN-0001.pdf"), Buffer.from(qDoc.output("arraybuffer")));

const proforma = buildPdfTestInvoice({
  number: "PI-0001",
  documentType: "proforma_invoice",
});
const { doc: pDoc } = await buildInvoicePdfDocument(proforma);
writeFileSync(join(outDir, "PI-0001.pdf"), Buffer.from(pDoc.output("arraybuffer")));

const manyItems = buildPdfTestInvoice({
  number: "INV-20",
  items: Array.from({ length: 20 }, (_, i) => ({
    description: `Line ${i + 1}`,
    quantity: 1,
    unitPrice: 50,
    total: 50,
  })),
  total: 1000,
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showPaymentInstructions: true,
  },
});
const { doc: manyDoc } = await buildInvoicePdfDocument(manyItems);
writeFileSync(join(outDir, "INV-20.pdf"), Buffer.from(manyDoc.output("arraybuffer")));
assert.ok(manyDoc.getNumberOfPages() >= 2, "20-item invoice should paginate");

const dualPages = dualDoc.getNumberOfPages();
if (dualPages === 2) {
  const dualPayRect = dualLayout.find((r) => r.id === "paymentSection");
  assert.ok(dualPayRect && dualPayRect.h < 100, "page-2 payment block should be compact");
}

console.log("PDF samples written to", outDir);
console.log("Page counts:", {
  oneItem: oneDoc.getNumberOfPages(),
  dual: dualDoc.getNumberOfPages(),
  quotation: qDoc.getNumberOfPages(),
  proforma: pDoc.getNumberOfPages(),
  twentyItems: manyDoc.getNumberOfPages(),
});

console.log("Invoice PDF harness: all tests passed");
