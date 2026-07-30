import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { normalizeInvoiceNoteBullets } from "../src/lib/invoice/invoice-document-notes.ts";
import { renderInvoicePdfBufferFromInvoice } from "../src/lib/pdf/render-invoice-html.ts";
import { INVOICE_HTML_FIXTURES } from "../tests/visual-invoice/fixtures.ts";

GlobalWorkerOptions.workerSrc = pathToFileURL(
  join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

async function pdfText(pdfBytes: Uint8Array): Promise<string> {
  const data = new Uint8Array(pdfBytes);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return parts.join("\n");
}

assert.deepEqual(
  normalizeInvoiceNoteBullets({
    description: "Note A\nNote B",
    termsAndConditions: "Term A\nNote A",
    includeDescription: true,
    includeTerms: true,
  }),
  ["Note A", "Note B", "Term A"],
);

const outDir = join(process.cwd(), "tmp", "html-invoice-pdf");
mkdirSync(outDir, { recursive: true });

const pageCounts: Record<string, number> = {};
const started = performance.now();

for (const fixture of INVOICE_HTML_FIXTURES) {
  const pdf = await renderInvoicePdfBufferFromInvoice(fixture.invoice);
  writeFileSync(join(outDir, `${fixture.id}.pdf`), pdf);
  const data = new Uint8Array(pdf);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  pageCounts[fixture.id] = doc.numPages;
  if (fixture.expectPages != null) {
    assert.equal(doc.numPages, fixture.expectPages, `${fixture.id} page count`);
  }

  const text = await pdfText(pdf);
  assert.ok(!/AWAITING PAYMENT/i.test(text), fixture.id);
  assert.ok(!/Terms & conditions/i.test(text), fixture.id);
  if (fixture.id === "long-notes") {
    assert.ok(text.includes("NOTES"));
    assert.ok(text.includes("Thank you for your business"));
    assert.ok(text.includes("Payment within 14 days"));
  }
  if (fixture.id === "tax-invoice-crypto" || fixture.id === "currency-usdt") {
    assert.ok(text.includes("Scan to pay"));
  }
}

const elapsedMs = Math.round(performance.now() - started);
console.log("HTML invoice PDF integration:", { pageCounts, elapsedMs });
console.log("Wrote PDFs to", outDir);
