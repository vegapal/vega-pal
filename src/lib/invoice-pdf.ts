import type { jsPDF } from "jspdf";
import { DEFAULT_DISPLAY_OPTIONS } from "@/lib/invoice-constants";
import {
  CONTENT_WIDTH,
  PAGE_MARGIN_LEFT,
  PAGE_MARGIN_RIGHT,
  PAGE_MARGIN_TOP,
  PAGE_MARGIN_BOTTOM,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  footerTop,
} from "@/lib/pdf/layout-context";
import {
  legacyLayoutFromRecords,
  verifyLayoutRecords,
  type LayoutRecord,
  type LayoutRect,
} from "@/lib/pdf/layout-debug";
import { renderInvoiceLayoutEngine, measurePaymentSectionBodyHeight } from "@/lib/pdf/invoice-layout-engine";
import type { Invoice } from "./vegapal-store";

/** @deprecated Use layout engine margins */
export const PDF_LEFT = PAGE_MARGIN_LEFT;
export const PDF_RIGHT = PAGE_MARGIN_RIGHT;
export const PDF_TOP = PAGE_MARGIN_TOP;
export const PDF_BOTTOM = PAGE_MARGIN_BOTTOM;
export const PDF_PAGE_WIDTH = PAGE_WIDTH;
export const PDF_PAGE_HEIGHT = PAGE_HEIGHT;
export const PDF_CONTENT_WIDTH = CONTENT_WIDTH;
export const PDF_TABLE_WIDTH = CONTENT_WIDTH;
export const PDF_TABLE_RIGHT = PDF_LEFT + PDF_TABLE_WIDTH;
export const PDF_FOOTER_RESERVE = PAGE_HEIGHT - footerTop();
export const PDF_LEFT_COLUMN_WIDTH = CONTENT_WIDTH * 0.65;
export const PDF_RIGHT_COLUMN_WIDTH = CONTENT_WIDTH * 0.35;
export const PDF_COLUMN_GAP = CONTENT_WIDTH - PDF_LEFT_COLUMN_WIDTH - PDF_RIGHT_COLUMN_WIDTH;

export type { LayoutRect };

export type PdfBuildResult = {
  doc: jsPDF;
  layout: LayoutRect[];
  layoutRecords: LayoutRecord[];
};

export function verifyPdfLayout(layout: LayoutRect[], layoutRecords?: LayoutRecord[], pageCount?: number): void {
  if (layoutRecords && pageCount) {
    verifyLayoutRecords(layoutRecords, pageCount);
  }
}

export { measurePaymentSectionBodyHeight };

export async function buildInvoicePdfDocument(inv: Invoice): Promise<PdfBuildResult> {
  const { doc, layoutRecords } = await renderInvoiceLayoutEngine(inv, { collectLayout: true });
  const layout = legacyLayoutFromRecords(layoutRecords);
  verifyPdfLayout(layout, layoutRecords, doc.getNumberOfPages());
  return { doc, layout, layoutRecords };
}

export async function generateInvoicePDF(inv: Invoice) {
  const { isHtmlInvoicePdfEnabled } = await import("@/lib/pdf/html-invoice-pdf-flag");
  if (isHtmlInvoicePdfEnabled() && typeof window !== "undefined") {
    const { downloadInvoicePdf } = await import("@/lib/pdf/download-invoice-pdf");
    await downloadInvoicePdf(inv);
    return;
  }
  const { doc } = await buildInvoicePdfDocument(inv);
  doc.save(`${inv.number}.pdf`);
}

/** @internal test fixtures */
export function buildPdfTestInvoice(
  partial: Partial<Invoice> & { number: string; items?: Invoice["items"] },
): Invoice {
  const items = partial.items ?? [{ description: "Service", quantity: 1, unitPrice: 100, total: 100 }];
  const base: Invoice = {
    id: "test",
    number: partial.number,
    invoiceCurrency: "AED",
    clientName: "Client Co",
    clientEmail: "c@example.com",
    clientCompany: "Client Co",
    title: partial.title ?? "Website Development",
    description: partial.description ?? "",
    termsAndConditions: partial.termsAndConditions ?? "",
    documentType: partial.documentType ?? "tax_invoice",
    documentStatus: "issued",
    paymentStatus: partial.paymentStatus ?? "unpaid",
    status: "pending",
    createdAt: new Date().toISOString(),
    issueDate: "2026-07-29",
    dueDate: "2026-08-12",
    items,
    subtotal: items.reduce((s, i) => s + i.total, 0),
    discount: partial.discount ?? 0,
    tax: partial.tax ?? 0,
    discountType: partial.discountType ?? "percentage",
    taxType: partial.taxType ?? "percentage",
    discountRate: partial.discountRate ?? 0,
    taxRate: partial.taxRate ?? 5,
    total: partial.total ?? items.reduce((s, i) => s + i.total, 0),
    amount: partial.total ?? items.reduce((s, i) => s + i.total, 0),
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, ...partial.displayOptions },
    paymentMethods: partial.paymentMethods ?? {
      method: "bank_transfer",
      crypto: { enabled: false, currency: "USDT", network: "TRON TRC20", walletAddress: "" },
      bank: {
        enabled: true,
        bankName: "Test Bank",
        accountName: "VegaPal",
        accountNumber: "123",
        iban: "AE000000000000000000000",
        swift: "TESTAEAA",
      },
      cash: { enabled: false },
    },
    walletAddress: "",
    network: "TRON TRC20",
    sellerName: "Founder",
    sellerBusiness: partial.sellerBusiness ?? "Acme Studio LLC",
    sellerEmail: "billing@example.com",
    sellerAddress: partial.sellerAddress,
  };
  return { ...base, ...partial, number: partial.number, items: partial.items ?? base.items };
}
