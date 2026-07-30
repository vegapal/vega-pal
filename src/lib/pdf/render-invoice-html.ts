import type { Invoice } from "@/lib/vegapal-store";
import { isCryptoPaymentVisible } from "@/lib/invoice-display";
import { qrCodeToDataUrl } from "@/lib/qrcode-lazy";
import { mapInvoiceToDocumentModel } from "@/lib/invoice/invoice-document.mapper";
import type { InvoiceDocumentModel } from "@/components/invoice-document/invoice-document.types";
import { renderInvoiceDocumentHtmlDocument } from "@/lib/pdf/invoice-document-html.server";

export type HtmlInvoicePdfOptions = {
  timeoutMs?: number;
  locale?: string;
  timeZone?: string;
};

const DEFAULT_TIMEOUT_MS = 45_000;

let playwrightModule: typeof import("playwright") | null = null;

async function loadPlaywright() {
  if (!playwrightModule) {
    playwrightModule = await import("playwright");
  }
  return playwrightModule;
}

export async function buildInvoiceDocumentModel(inv: Invoice): Promise<InvoiceDocumentModel> {
  let qrDataUrl: string | null = null;
  const crypto = inv.paymentMethods.crypto;
  if (
    isCryptoPaymentVisible(inv) &&
    inv.displayOptions.showPaymentInstructions &&
    crypto.walletAddress?.trim()
  ) {
    try {
      qrDataUrl = await qrCodeToDataUrl(crypto.walletAddress, { margin: 1, width: 280 });
    } catch {
      qrDataUrl = null;
    }
  }
  return mapInvoiceToDocumentModel(inv, { qrDataUrl, locale: "en", dir: "ltr" });
}

const CHROMIUM_FOOTER_TEMPLATE = `
  <div style="width:100%;height:100%;padding:0 14mm 2mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-end;font-size:8px;color:#707070;font-family:system-ui,sans-serif;line-height:1.35;">
    <div style="display:flex;flex-direction:column;align-items:flex-start;">
      <span>Created with VegaPal</span>
      <span>vega-pal.com</span>
    </div>
    <span style="white-space:nowrap;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;

export async function renderInvoicePdfFromHtml(
  model: InvoiceDocumentModel,
  options?: HtmlInvoicePdfOptions,
): Promise<Uint8Array> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const html = renderInvoiceDocumentHtmlDocument(model);
  const { chromium } = await loadPlaywright();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: options?.locale ?? "en-GB",
    timezoneId: options?.timeZone ?? "UTC",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  try {
    await page.setContent(html, { waitUntil: "networkidle", timeout: timeoutMs });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) resolve();
              else {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              }
            }),
        ),
      );
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: CHROMIUM_FOOTER_TEMPLATE,
      margin: { top: "0", right: "0", bottom: "14mm", left: "0" },
    });

    return new Uint8Array(pdf);
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function renderInvoicePdfBufferFromInvoice(
  inv: Invoice,
  options?: HtmlInvoicePdfOptions,
): Promise<Uint8Array> {
  const model = await buildInvoiceDocumentModel(inv);
  return renderInvoicePdfFromHtml(model, options);
}
