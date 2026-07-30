import { writeFileSync } from "node:fs";
import { buildInvoiceDocumentModel } from "../src/lib/pdf/render-invoice-html.ts";
import { renderInvoiceDocumentHtmlDocument } from "../src/lib/pdf/invoice-document-html.server.tsx";
import { INVOICE_HTML_FIXTURES } from "../tests/visual-invoice/fixtures.ts";

const fixtureId = process.argv[2];
const outPath = process.argv[3];
if (!fixtureId || !outPath) {
  console.error("Usage: tsx scripts/invoice-visual-html.harness.ts <fixtureId> <out.html>");
  process.exit(1);
}

const fixture = INVOICE_HTML_FIXTURES.find((f) => f.id === fixtureId);
if (!fixture) {
  console.error("Unknown fixture", fixtureId);
  process.exit(1);
}

const model = await buildInvoiceDocumentModel(fixture.invoice);
writeFileSync(outPath, renderInvoiceDocumentHtmlDocument(model), "utf8");
