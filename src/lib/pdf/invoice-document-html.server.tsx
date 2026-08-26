import React from "react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import type { InvoiceDocumentModel } from "@/components/invoice-document/invoice-document.types";
import { InvoiceDocument } from "@/components/invoice-document/InvoiceDocument";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function fontDataUrl(fileName: string): string {
  const buf = readFileSync(join(moduleDir, "../../../public/fonts/inter", fileName));
  return `data:font/woff2;base64,${buf.toString("base64")}`;
}

/** Official brand mark as data URI so Playwright PDF has no broken /brand/* fetches. */
function brandMarkDataUrl(): string {
  const buf = readFileSync(join(moduleDir, "../../../public/brand/mark-primary.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function invoiceDocumentCssForPdf(): string {
  const raw = readFileSync(
    join(moduleDir, "../../components/invoice-document/invoice-document.css"),
    "utf8",
  );
  const w400 = fontDataUrl("inter-latin-400-normal.woff2");
  const w700 = fontDataUrl("inter-latin-700-normal.woff2");
  return raw
    .replace(
      'url("/fonts/inter/inter-latin-400-normal.woff2")',
      `url("${w400}")`,
    )
    .replace(
      'url("/fonts/inter/inter-latin-700-normal.woff2")',
      `url("${w700}")`,
    );
}

export function renderInvoiceDocumentMarkup(model: InvoiceDocumentModel): string {
  return renderToStaticMarkup(React.createElement(InvoiceDocument, { model }));
}

export function renderInvoiceDocumentHtmlDocument(model: InvoiceDocumentModel): string {
  const css = invoiceDocumentCssForPdf();
  const mark = brandMarkDataUrl();
  const body = renderInvoiceDocumentMarkup(model).replaceAll(
    'src="/brand/mark-primary.png"',
    `src="${mark}"`,
  );
  return `<!DOCTYPE html>
<html lang="${model.locale}" dir="${model.dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}
