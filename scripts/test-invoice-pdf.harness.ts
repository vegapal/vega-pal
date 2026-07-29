import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clientIdentityFromParts } from "../src/lib/invoice/document-identity.ts";
import { documentTypeHeading } from "../src/lib/invoice/document-labels.ts";
import { DEFAULT_DISPLAY_OPTIONS } from "../src/lib/invoice-constants.ts";
import type { Invoice } from "../src/lib/vegapal-store.ts";
import {
  buildInvoicePdfDocument,
  buildPdfTestInvoice,
  PDF_CONTENT_WIDTH,
  PDF_LEFT,
  PDF_TOP,
  verifyPdfLayout,
} from "../src/lib/invoice-pdf.ts";
import { footerTop, PAGE_HEIGHT } from "../src/lib/pdf/layout-context.ts";

assert.equal(documentTypeHeading("quotation"), "QUOTATION");
assert.equal(documentTypeHeading("proforma_invoice"), "PROFORMA INVOICE");
assert.equal(documentTypeHeading("tax_invoice"), "TAX INVOICE");

const dupClient = clientIdentityFromParts({
  name: "Eye Media LLC",
  company: "Eye Media LLC",
  email: "a@example.com",
});
assert.equal(dupClient.length, 2);

const engineSource = readFileSync(join(process.cwd(), "src/lib/pdf/invoice-layout-engine.ts"), "utf8");
const pdfSource = readFileSync(join(process.cwd(), "src/lib/invoice-pdf.ts"), "utf8");
assert.ok(engineSource.includes("PAYMENT DETAILS"));
assert.ok(!engineSource.includes("HOW TO PAY"));
assert.ok(!pdfSource.includes("PDF_PAYMENT_STAY_ON_PAGE1_MIN_MM"));
assert.ok(engineSource.includes("drawAllFooters"));
assert.ok(engineSource.includes("ensureSectionSpace"));
assert.ok(engineSource.includes('halign: "center"'));
assert.ok(!engineSource.includes("if (email) push(email)"));
assert.ok(!engineSource.includes("sellerEmail"));

const outDir = join(process.cwd(), "tmp", "pdf-layout-engine");
mkdirSync(outDir, { recursive: true });

const footerTopY = footerTop(PAGE_HEIGHT);

async function buildAndWrite(name: string, inv: Invoice) {
  const { doc, layout, layoutRecords } = await buildInvoicePdfDocument(inv);
  verifyPdfLayout(layout, layoutRecords, doc.getNumberOfPages());
  const pages = doc.getNumberOfPages();
  const pdfBytes = Buffer.from(doc.output("arraybuffer"));
  writeFileSync(join(outDir, name), pdfBytes);
  const text = pdfBytes.toString("latin1");
  assert.ok(!text.includes("billing@example.com"), `${name} must not contain seller email`);
  for (const r of layoutRecords.filter((x) => x.section !== "footer")) {
    assert.ok(
      r.rect.y + r.rect.height <= footerTopY + 1,
      `${name} section ${r.section} page ${r.page} below footerTop`,
    );
  }
  return pages;
}

const minimal = buildPdfTestInvoice({
  number: "INV-MINIMAL",
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showPaymentInstructions: false,
    showTerms: false,
    showClientInfo: false,
    showDueDate: false,
  },
  paymentMethods: {
    method: "cash",
    crypto: { enabled: false, currency: "USDT", network: "TRON TRC20", walletAddress: "" },
    bank: { enabled: false },
    cash: { enabled: false },
  },
});

const bank = buildPdfTestInvoice({
  number: "INV-BANK",
  items: [
    { description: "Design", quantity: 1, unitPrice: 200, total: 200 },
    { description: "Development", quantity: 1, unitPrice: 800, total: 800 },
  ],
  total: 1000,
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showTerms: true,
    showTax: false,
    showPaymentInstructions: true,
    showClientInfo: true,
  },
  termsAndConditions: "Payment within 14 days.",
});

const bankLong = buildPdfTestInvoice({
  number: "INV-BANK-LONG",
  sellerBusiness: "International Beneficiary Holdings With A Very Long Legal Name",
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showPaymentInstructions: true, showTerms: false },
  paymentMethods: {
    method: "bank_transfer",
    crypto: { enabled: false, currency: "USDT", network: "TRON TRC20", walletAddress: "" },
    bank: {
      enabled: true,
      bankName: "First National Bank of Extended Naming Conventions Worldwide",
      accountName: "Beneficiary With An Exceptionally Long Account Holder Name",
      accountNumber: "00998877665544332211",
      iban: "AE070331234567890123456",
      swift: "EBILAEADXXX",
      instructions:
        "Include invoice number in transfer reference. Allow 2 business days for reconciliation. Contact finance if amount differs.",
    },
    cash: { enabled: false },
  },
});

const cryptoInv = buildPdfTestInvoice({
  number: "INV-CRYPTO",
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showPaymentInstructions: true },
  paymentMethods: {
    method: "crypto",
    crypto: {
      enabled: true,
      currency: "USDT",
      network: "TRON TRC20",
      walletAddress: "TXYZ1234567890abcdefghijklmnopqrstuvwxyz1234567890",
    },
    bank: { enabled: false },
    cash: { enabled: false },
  },
});

const dual = buildPdfTestInvoice({
  number: "INV-DUAL",
  displayOptions: {
    ...DEFAULT_DISPLAY_OPTIONS,
    showTerms: true,
    showPaymentInstructions: true,
    showClientInfo: true,
  },
  termsAndConditions: "100% advance.\nValid 14 days.",
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

const termsLong = buildPdfTestInvoice({
  number: "INV-TERMS-LONG",
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showTerms: true, showPaymentInstructions: false },
  termsAndConditions: Array.from({ length: 20 }, (_, i) => `Term clause ${i + 1} with enough text to wrap.`).join(
    "\n",
  ),
});

const items100 = buildPdfTestInvoice({
  number: "INV-100-ITEMS",
  items: Array.from({ length: 100 }, (_, i) => ({
    description: `Service line ${i + 1} with description`,
    quantity: 1,
    unitPrice: 10,
    total: 10,
  })),
  total: 1000,
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showPaymentInstructions: true },
});

const quotation = buildPdfTestInvoice({
  number: "QTN-0001",
  documentType: "quotation",
  paymentStatus: "not_applicable",
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showPaymentInstructions: false },
});

const proforma = buildPdfTestInvoice({
  number: "PI-0001",
  documentType: "proforma_invoice",
});

const hiddenClient = buildPdfTestInvoice({
  number: "INV-NO-CLIENT",
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showClientInfo: false, showDueDate: false },
});

const hiddenDue = buildPdfTestInvoice({
  number: "INV-NO-DUE",
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showDueDate: false },
});

const longCompany = buildPdfTestInvoice({
  number: "INV-LONG-CO",
  sellerBusiness: "Very Long Company Name International Holdings And Services Limited Liability Company",
});

const paid = buildPdfTestInvoice({
  number: "INV-PAID",
  paymentStatus: "paid",
});

const partial = buildPdfTestInvoice({
  number: "INV-PARTIAL",
  paymentStatus: "partially_paid",
});

const counts: Record<string, number> = {};
counts["INV-MINIMAL.pdf"] = await buildAndWrite("INV-MINIMAL.pdf", minimal);
counts["INV-BANK.pdf"] = await buildAndWrite("INV-BANK.pdf", bank);
counts["INV-BANK-LONG.pdf"] = await buildAndWrite("INV-BANK-LONG.pdf", bankLong);
counts["INV-CRYPTO.pdf"] = await buildAndWrite("INV-CRYPTO.pdf", cryptoInv);
counts["INV-DUAL.pdf"] = await buildAndWrite("INV-DUAL.pdf", dual);
counts["INV-TERMS-LONG.pdf"] = await buildAndWrite("INV-TERMS-LONG.pdf", termsLong);
counts["INV-100-ITEMS.pdf"] = await buildAndWrite("INV-100-ITEMS.pdf", items100);
counts["QTN-0001.pdf"] = await buildAndWrite("QTN-0001.pdf", quotation);
counts["PI-0001.pdf"] = await buildAndWrite("PI-0001.pdf", proforma);

await buildAndWrite("INV-NO-CLIENT.pdf", hiddenClient);
await buildAndWrite("INV-NO-DUE.pdf", hiddenDue);
await buildAndWrite("INV-LONG-CO.pdf", longCompany);
await buildAndWrite("INV-PAID.pdf", paid);
await buildAndWrite("INV-PARTIAL.pdf", partial);

assert.equal(counts["INV-MINIMAL.pdf"], 1);
assert.ok(counts["INV-100-ITEMS.pdf"] >= 3);

const { layoutRecords: bankLayout } = await buildInvoicePdfDocument(bank);
const table = bankLayout.find((r) => r.section === "items");
assert.ok(table && Math.abs(table.rect.width - PDF_CONTENT_WIDTH) < 0.5, "table full content width");

const { layoutRecords: headerLayout } = await buildInvoicePdfDocument(minimal);
const header = headerLayout.find((r) => r.section === "header");
assert.ok(header && Math.abs(header.rect.x - PDF_LEFT) < 0.1 && Math.abs(header.rect.y - PDF_TOP) < 0.1);

console.log("PDF samples written to", outDir);
console.log("Page counts:", counts);
console.log("Invoice PDF harness: all tests passed");
