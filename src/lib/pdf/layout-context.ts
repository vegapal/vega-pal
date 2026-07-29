import type { jsPDF } from "jspdf";

export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const PAGE_MARGIN_LEFT = 16;
export const PAGE_MARGIN_RIGHT = 16;
export const PAGE_MARGIN_TOP = 16;
export const PAGE_MARGIN_BOTTOM = 15;
export const FOOTER_HEIGHT = 12;
export const FOOTER_GAP = 6;

export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_LEFT - PAGE_MARGIN_RIGHT;
export const FOOTER_DIVIDER_Y = PAGE_HEIGHT - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT;
export const FOOTER_TEXT_BASELINE_Y = PAGE_HEIGHT - PAGE_MARGIN_BOTTOM - 3;

export function footerTop(pageHeight = PAGE_HEIGHT): number {
  return pageHeight - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT - FOOTER_GAP;
}

export type PdfRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfPageContext = {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  footerTop: number;
  contentWidth: number;
  cursorY: number;
  pageNumber: number;
};

export function createPageContext(doc: jsPDF): PdfPageContext {
  return {
    doc,
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
    marginLeft: PAGE_MARGIN_LEFT,
    marginRight: PAGE_MARGIN_RIGHT,
    marginTop: PAGE_MARGIN_TOP,
    footerTop: footerTop(),
    contentWidth: CONTENT_WIDTH,
    cursorY: PAGE_MARGIN_TOP,
    pageNumber: 1,
  };
}

export function availableHeight(ctx: PdfPageContext): number {
  return ctx.footerTop - ctx.cursorY;
}

export function canFit(ctx: PdfPageContext, height: number): boolean {
  return ctx.cursorY + height <= ctx.footerTop;
}

export function syncPageFromDoc(ctx: PdfPageContext): void {
  const page = ctx.doc.getNumberOfPages();
  ctx.pageNumber = page;
}

export function startNewPage(ctx: PdfPageContext): void {
  ctx.doc.addPage();
  ctx.pageNumber += 1;
  ctx.cursorY = ctx.marginTop;
}

export function ensureSectionSpace(ctx: PdfPageContext, requiredHeight: number): void {
  if (!canFit(ctx, requiredHeight)) {
    startNewPage(ctx);
  }
}

/** Reserve below autoTable body so rows never enter footer band. */
export function tableMarginBottomMm(ctx: PdfPageContext): number {
  return ctx.pageHeight - ctx.footerTop;
}
