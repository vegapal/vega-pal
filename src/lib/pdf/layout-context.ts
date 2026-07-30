import type { jsPDF } from "jspdf";

/** Blueprint V3 — A4 portrait */
export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const PAGE_MARGIN_LEFT = 18;
export const PAGE_MARGIN_RIGHT = 18;
export const PAGE_MARGIN_TOP = 18;
export const PAGE_MARGIN_BOTTOM = 16;
export const CONTENT_WIDTH = 174;
export const FOOTER_RESERVE_MM = 20;

export const FOOTER_TEXT_BASELINE_Y = PAGE_HEIGHT - PAGE_MARGIN_BOTTOM - 4;

export function footerTop(pageHeight = PAGE_HEIGHT): number {
  return pageHeight - PAGE_MARGIN_BOTTOM - FOOTER_RESERVE_MM;
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
  /** Y after grand-total block (before trailing gap to next section). */
  totalsContentBottom?: number;
  totalsBlockStartY?: number;
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
  ctx.pageNumber = ctx.doc.getNumberOfPages();
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

export function advanceCursor(ctx: PdfPageContext, gapMm: number): void {
  ctx.cursorY += gapMm;
}

/** Reserve below autoTable body so rows never enter footer band. */
export function tableMarginBottomMm(ctx: PdfPageContext): number {
  return ctx.pageHeight - ctx.footerTop;
}
