import { jsPDF } from "jspdf";
import type { jsPDF as JsPDFType } from "jspdf";
import autoTable from "jspdf-autotable";
import { qrCodeToDataUrl } from "@/lib/qrcode-lazy";
import type { Invoice } from "@/lib/vegapal-store";
import {
  formatInvoiceAmount,
  formatInvoiceAmountWithCurrency,
  isBankPaymentVisible,
  isCashPaymentVisible,
  isCryptoPaymentVisible,
  showReferenceField,
} from "@/lib/invoice-display";
import { normalizeIdentity, identitiesEqual } from "@/lib/invoice/document-identity";
import {
  compactStatusLabel,
  documentTypeHeading,
  dueDateFieldLabel,
  finalTotalLabel,
} from "@/lib/invoice/document-labels";
import { documentTotalsView } from "@/lib/invoice/document-totals-display";
import {
  canFit,
  advanceCursor,
  availableHeight,
  createPageContext,
  ensureSectionSpace,
  FOOTER_TEXT_BASELINE_Y,
  PAGE_MARGIN_LEFT,
  PAGE_MARGIN_RIGHT,
  startNewPage,
  syncPageFromDoc,
  tableMarginBottomMm,
  type PdfPageContext,
} from "@/lib/pdf/layout-context";
import {
  createLayoutCollector,
  recordSection,
  verifyLayoutRecords,
  type LayoutCollector,
  type LayoutRecord,
} from "@/lib/pdf/layout-debug";

export const GRAY_555: [number, number, number] = [85, 85, 85];
export const GRAY_777: [number, number, number] = [119, 119, 119];
export const BLACK: [number, number, number] = [0, 0, 0];
export const BORDER: [number, number, number] = [229, 229, 229];
export const HEAD_FILL: [number, number, number] = [247, 247, 247];
const ROW_ALT: [number, number, number] = [252, 252, 252];
const REF_HIGHLIGHT: [number, number, number] = [245, 245, 245];

/** Blueprint V3 */
const GAP_AFTER_HEADER_MM = 12;
const GAP_AFTER_CLIENT_MM = 10;
const GAP_AFTER_SUBJECT_MM = 7;
const GAP_AFTER_TABLE_MM = 12;
const HEADER_LEFT_FRAC = 0.65;
const CLIENT_LEFT_FRAC = 0.6;
const TOTALS_WIDTH_MM = 72;
const TERMS_MIN_REMAINING_MM = 35;
const QR_SIZE_MM = 30;
const CARD_PAD_MM = 6;
const CARD_RADIUS_MM = 3;
const CARD_BORDER_PT = 0.3;

const PAYMENT_TOP_GAP_PREFERRED_MM = 10;
const PAYMENT_TOP_GAP_MIN_MM = 7;
const GAP_AFTER_TOTALS_MM = 12;
const PAYMENT_HEADING_H_MM = 10;
const PAYMENT_CARD_STACK_GAP_MM = 8;

type DocWithTable = JsPDFType & { lastAutoTable?: { finalY: number } };

export type PdfBuildOptions = { collectLayout?: boolean };

export type PdfBuildResult = { doc: JsPDFType; layoutRecords: LayoutRecord[] };

function formatPdfDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function amt(n: number, currency: string) {
  return formatInvoiceAmountWithCurrency(n, currency);
}

function sellerCompanyName(inv: Invoice): string {
  const company = normalizeIdentity(inv.sellerBusiness);
  const person = normalizeIdentity(inv.sellerName);
  return company || person;
}

/** Seller PDF lines: phone, website, VAT, address — only fields present on the invoice snapshot. */
function sellerContactLines(inv: Invoice): string[] {
  const lines: string[] = [];
  const address = normalizeIdentity(inv.sellerAddress);
  if (address) lines.push(address);
  return lines;
}

function truncateLines(
  doc: JsPDFType,
  text: string,
  maxW: number,
  maxLines: number,
  lineH: number,
): { lines: string[]; height: number } {
  let lines = doc.splitTextToSize(text, maxW) as string[];
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 3 && doc.getTextWidth(`${last}…`) > maxW) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return { lines, height: lines.length * lineH };
}

function contentRightX(ctx: PdfPageContext): number {
  return ctx.pageWidth - ctx.marginRight;
}

function sellerColWidth(ctx: PdfPageContext): number {
  return ctx.contentWidth * HEADER_LEFT_FRAC;
}

function clientDetailLines(inv: Invoice): { primary: string; secondary: string[] } {
  const name = normalizeIdentity(inv.clientName);
  const company = normalizeIdentity(inv.clientCompany);
  const email = normalizeIdentity(inv.clientEmail);
  const primary = name || company;
  const secondary: string[] = [];
  const push = (t: string) => {
    if (!t || secondary.some((s) => identitiesEqual(s, t)) || (primary && identitiesEqual(t, primary))) return;
    secondary.push(t);
  };
  if (company && primary && !identitiesEqual(company, primary)) push(company);
  if (email) push(email);
  return { primary: primary || "—", secondary };
}

function measureClientSection(ctx: PdfPageContext, inv: Invoice): number {
  if (!inv.displayOptions.showClientInfo) return 0;
  const { secondary } = clientDetailLines(inv);
  return 4 + 10 + secondary.length * 5 + 4;
}

function renderHeader(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const doc = ctx.doc;
  const startY = ctx.cursorY;
  const sellerW = sellerColWidth(ctx);
  const rightX = contentRightX(ctx);
  const blockTop = ctx.cursorY;
  const heroBaseline = blockTop + 9;

  let sellerBottom = blockTop;
  let nameBottom = heroBaseline;

  if (inv.displayOptions.showSellerInfo) {
    const company = sellerCompanyName(inv);
    let textX = ctx.marginLeft;
    if (!company && inv.sellerLogoUrl) {
      try {
        doc.addImage(inv.sellerLogoUrl, "PNG", ctx.marginLeft, blockTop, 14, 14);
        textX = ctx.marginLeft + 16;
      } catch {
        /* ignore */
      }
    }
    if (company) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(31);
      doc.setTextColor(...BLACK);
      const { lines } = truncateLines(doc, company, sellerW - (textX - ctx.marginLeft), 2, 11);
      let cy = heroBaseline;
      for (const line of lines) {
        doc.text(line, textX, cy);
        cy += 11;
      }
      nameBottom = cy;
    }
    const contacts = sellerContactLines(inv);
    if (contacts.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_555);
      let contactY = nameBottom + 5;
      for (const line of contacts) {
        doc.text(line, textX, contactY);
        contactY += 5;
      }
      sellerBottom = contactY;
    } else {
      sellerBottom = nameBottom;
    }
  }

  let docY = heroBaseline;
  const typeHeading = documentTypeHeading(inv.documentType);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(typeHeading, rightX, docY, { align: "right" });
  docY += 5;

  doc.setFontSize(11);
  doc.text(inv.number, rightX, docY, { align: "right" });
  docY += 6;

  if (inv.displayOptions.showStatus) {
    const status = compactStatusLabel({
      documentType: inv.documentType,
      documentStatus: inv.documentStatus,
      paymentStatus: inv.paymentStatus,
    });
    if (status) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_777);
      doc.text(status.toUpperCase(), rightX, docY, { align: "right" });
      docY += 8;
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_777);
  doc.text("Issue date", rightX, docY, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(formatPdfDate(inv.issueDate), rightX, docY + 4, { align: "right" });
  docY += 9;

  if (inv.displayOptions.showDueDate && inv.dueDate) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_777);
    doc.text(dueDateFieldLabel(inv.documentType), rightX, docY, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(formatPdfDate(inv.dueDate), rightX, docY + 4, { align: "right" });
    docY += 9;
  }

  ctx.cursorY = Math.max(sellerBottom, docY) + GAP_AFTER_HEADER_MM;

  recordSection(collector, ctx.pageNumber, "header", {
    x: ctx.marginLeft,
    y: startY,
    width: ctx.contentWidth,
    height: ctx.cursorY - startY,
  });
  return ctx;
}

function renderClientMetadata(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const doc = ctx.doc;
  const startY = ctx.cursorY;
  const d = inv.displayOptions;
  const rightX = contentRightX(ctx);
  const metaRows: [string, string][] = [];
  if (showReferenceField(d, "showPoNumber", inv.poNumber)) metaRows.push(["PO", inv.poNumber!]);
  if (showReferenceField(d, "showReferenceNumber", inv.referenceNumber)) {
    metaRows.push(["Reference", inv.referenceNumber!]);
  }
  if (showReferenceField(d, "showProjectCode", inv.projectCode)) {
    metaRows.push(["Project", inv.projectCode!]);
  }

  const blockH = Math.max(measureClientSection(ctx, inv), metaRows.length * 8);
  ensureSectionSpace(ctx, blockH);

  let leftBottom = startY;
  let rightBottom = startY;

  if (d.showClientInfo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_777);
    doc.text("BILL TO", ctx.marginLeft, startY + 3);
    const { primary, secondary } = clientDetailLines(inv);
    let ly = startY + 8;
    doc.setFontSize(13);
    doc.setTextColor(...BLACK);
    doc.text(primary, ctx.marginLeft, ly + 4);
    ly += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_555);
    for (const line of secondary) {
      doc.text(line, ctx.marginLeft, ly);
      ly += 5;
    }
    leftBottom = ly;
  }

  let ry = startY;
  for (const [label, value] of metaRows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_777);
    doc.text(label.toUpperCase(), rightX, ry + 3, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(value, rightX, ry + 7, { align: "right" });
    ry += 8;
  }
  rightBottom = metaRows.length ? ry : startY;

  ctx.cursorY = Math.max(leftBottom, rightBottom) + GAP_AFTER_CLIENT_MM;
  recordSection(collector, ctx.pageNumber, "client", {
    x: ctx.marginLeft,
    y: startY,
    width: ctx.contentWidth,
    height: ctx.cursorY - startY,
  });
  return ctx;
}

function renderSubject(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const title = inv.title?.trim();
  if (!title) return ctx;
  const startY = ctx.cursorY;
  const doc = ctx.doc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...BLACK);
  const { lines } = truncateLines(doc, title, ctx.contentWidth, 2, 7);
  let ty = startY + 4;
  for (const line of lines) {
    doc.text(line, ctx.marginLeft, ty);
    ty += 7;
  }
  ctx.cursorY = ty + GAP_AFTER_SUBJECT_MM;
  recordSection(collector, ctx.pageNumber, "subject", {
    x: ctx.marginLeft,
    y: startY,
    width: ctx.contentWidth,
    height: ctx.cursorY - startY,
  });
  return ctx;
}

function renderItems(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const doc = ctx.doc;
  const startY = ctx.cursorY;
  const startPage = doc.getNumberOfPages();
  const currency = inv.invoiceCurrency;
  const colDesc = ctx.contentWidth * 0.6;
  const colQty = ctx.contentWidth * 0.08;
  const colUnit = ctx.contentWidth * 0.16;
  const colTotal = ctx.contentWidth * 0.16;
  const unitHead = `Unit price (${currency})`;
  const totalHead = `Amount (${currency})`;

  autoTable(doc, {
    startY: ctx.cursorY,
    head: [["Description", "Qty", unitHead, totalHead]],
    body: inv.items.map((i) => [
      i.description,
      String(i.quantity),
      formatInvoiceAmount(i.unitPrice, currency),
      formatInvoiceAmount(i.total, currency),
    ]),
    theme: "plain",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    styles: {
      fontSize: 9,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
      minCellHeight: 11,
      textColor: BLACK,
      fillColor: [255, 255, 255],
      lineColor: BORDER,
      lineWidth: 0.12,
      font: "helvetica",
      valign: "middle",
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: BLACK,
      fontStyle: "bold",
      fontSize: 9.5,
      minCellHeight: 12,
      valign: "middle",
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: colDesc, halign: "left", fontSize: 9.5 },
      1: { cellWidth: colQty, halign: "center" },
      2: { cellWidth: colUnit, halign: "right" },
      3: { cellWidth: colTotal, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index % 2 === 1) {
        data.cell.styles.fillColor = ROW_ALT;
      }
      if (data.section === "head") {
        data.cell.styles.lineWidth = { bottom: 0.15 };
      }
      if (data.section === "body") {
        data.cell.styles.lineWidth = { bottom: 0.08 };
      }
    },
    margin: {
      left: PAGE_MARGIN_LEFT,
      right: PAGE_MARGIN_RIGHT,
      top: ctx.marginTop,
      bottom: tableMarginBottomMm(ctx),
    },
    tableWidth: ctx.contentWidth,
  });

  syncPageFromDoc(ctx);
  const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? startY;
  ctx.cursorY = finalY + GAP_AFTER_TABLE_MM;
  const endPage = doc.getNumberOfPages();
  ctx.pageNumber = endPage;
  const itemsH =
    endPage === startPage
      ? finalY - startY
      : ctx.footerTop - startY;
  recordSection(collector, startPage, "items", {
    x: ctx.marginLeft,
    y: startY,
    width: ctx.contentWidth,
    height: Math.max(0, itemsH),
  });
  return ctx;
}

function measureTotalsHeight(inv: Invoice): number {
  const totals = documentTotalsView(inv);
  let rows = 1;
  if (totals.discountLabel && totals.discountAmount > 0) rows++;
  if (totals.taxLabel && totals.taxAmount > 0) rows++;
  return rows * 7 + 6 + 16 + GAP_AFTER_TOTALS_MM;
}

function renderTotals(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  ensureSectionSpace(ctx, measureTotalsHeight(inv));
  const startY = ctx.cursorY;
  const doc = ctx.doc;
  const currency = inv.invoiceCurrency;
  const totals = documentTotalsView(inv);
  const totalsRightX = contentRightX(ctx);
  const totalsLeft = totalsRightX - TOTALS_WIDTH_MM;
  let y = startY;

  const drawLine = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_555);
    doc.text(label, totalsLeft, y);
    doc.setTextColor(...BLACK);
    doc.text(value, totalsRightX, y, { align: "right" });
    y += 7;
  };

  drawLine("Subtotal", amt(totals.subtotal, currency));
  if (totals.discountLabel && totals.discountAmount > 0) {
    drawLine(totals.discountLabel, `(${amt(totals.discountAmount, currency)})`);
  }
  if (totals.taxLabel && totals.taxAmount > 0) {
    drawLine(totals.taxLabel, amt(totals.taxAmount, currency));
  }

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.line(totalsLeft, y + 2, totalsRightX, y + 2);
  y += 6;

  const finalLabel = finalTotalLabel(inv.documentType, inv.paymentStatus);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(finalLabel.toUpperCase(), totalsLeft, y + 6);
  doc.setFontSize(22);
  doc.text(amt(inv.total, currency), totalsRightX, y + 6, { align: "right" });
  y += 16;

  ctx.totalsBlockStartY = startY;
  ctx.totalsContentBottom = y;
  ctx.cursorY = y + GAP_AFTER_TOTALS_MM;
  recordSection(collector, ctx.pageNumber, "totals", {
    x: totalsLeft,
    y: startY,
    width: TOTALS_WIDTH_MM,
    height: ctx.cursorY - startY,
  });
  return ctx;
}

function renderNotes(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const d = inv.displayOptions;
  const text = inv.description?.trim();
  if (!d.showNotes || !text) return ctx;

  const doc = ctx.doc;
  const bodyLines = doc.splitTextToSize(text, ctx.contentWidth) as string[];
  const headingH = 6;
  const minFragment = headingH + 4 + 10;
  ensureSectionSpace(ctx, minFragment);

  const startY = ctx.cursorY;
  let blockStartY = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text("Notes", ctx.marginLeft, startY + 4);
  let y = startY + headingH + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const line of bodyLines) {
    if (y + 5 > ctx.footerTop) {
      recordSection(collector, ctx.pageNumber, "notes", {
        x: ctx.marginLeft,
        y: blockStartY,
        width: ctx.contentWidth,
        height: Math.max(0, y - blockStartY),
      });
      startNewPage(ctx);
      blockStartY = ctx.cursorY;
      y = ctx.cursorY;
    }
    doc.text(line, ctx.marginLeft, y);
    y += 5;
  }
  ctx.cursorY = y + 10;
  recordSection(collector, ctx.pageNumber, "notes", {
    x: ctx.marginLeft,
    y: blockStartY,
    width: ctx.contentWidth,
    height: Math.max(0, ctx.cursorY - blockStartY),
  });
  return ctx;
}

function renderTerms(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const d = inv.displayOptions;
  const raw = inv.termsAndConditions?.trim();
  if (!d.showTerms || !raw) return ctx;

  if (availableHeight(ctx) < TERMS_MIN_REMAINING_MM) {
    startNewPage(ctx);
  }

  const doc = ctx.doc;
  const bullets = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s*/, ""));

  const headingH = 6;
  const bulletGap = 6;
  const textX = ctx.marginLeft + 5;
  const textW = ctx.contentWidth - 5;
  const minWithHeading = headingH + 4 + 10;

  let startY = ctx.cursorY;
  let blockStartY = startY;
  let y = startY;

  const drawHeading = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BLACK);
    doc.text("Terms & conditions", ctx.marginLeft, y + 4);
    y += headingH + 4;
  };

  ensureSectionSpace(ctx, minWithHeading);
  drawHeading();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const b of bullets) {
    const wrapped = doc.splitTextToSize(b, textW) as string[];
    const blockH = wrapped.length * 6 + bulletGap;
    if (y + blockH > ctx.footerTop) {
      recordSection(collector, ctx.pageNumber, "terms", {
        x: ctx.marginLeft,
        y: blockStartY,
        width: ctx.contentWidth,
        height: Math.max(0, y - blockStartY),
      });
      startNewPage(ctx);
      blockStartY = ctx.cursorY;
      startY = ctx.cursorY;
      y = startY;
      ensureSectionSpace(ctx, minWithHeading);
      drawHeading();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    doc.text("•", ctx.marginLeft, y);
    let ly = y;
    for (const line of wrapped) {
      doc.text(line, textX, ly);
      ly += 6;
    }
    y = ly + bulletGap;
  }
  if (y + 10 > ctx.footerTop) {
    recordSection(collector, ctx.pageNumber, "terms", {
      x: ctx.marginLeft,
      y: blockStartY,
      width: ctx.contentWidth,
      height: Math.max(0, y - blockStartY),
    });
    startNewPage(ctx);
    blockStartY = ctx.cursorY;
    y = ctx.cursorY;
  }
  ctx.cursorY = y + 10;
  recordSection(collector, ctx.pageNumber, "terms", {
    x: ctx.marginLeft,
    y: blockStartY,
    width: ctx.contentWidth,
    height: Math.max(0, ctx.cursorY - blockStartY),
  });
  return ctx;
}

function bankFieldRows(inv: Invoice): [string, string][] {
  const bank = inv.paymentMethods.bank;
  const rows: [string, string][] = [];
  const push = (label: string, value?: string | null) => {
    const v = value?.trim();
    if (v) rows.push([label, v]);
  };
  push("Bank name", bank.bankName);
  push("Account name", bank.accountName);
  push("Account number", bank.accountNumber);
  push("IBAN", bank.iban);
  push("SWIFT/BIC", bank.swift);
  push("Bank currency", bank.currency);
  push("Payment reference", inv.number);
  return rows;
}

function measureRowHeight(doc: JsPDFType, value: string, valueW: number): number {
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(value, valueW).length;
  if (lines <= 1) return 6;
  return lines * 4.5;
}

const CARD_SURFACE: [number, number, number] = [255, 255, 255];

function drawPaymentSurface(doc: JsPDFType, x: number, y: number, w: number, h: number) {
  doc.setFillColor(...CARD_SURFACE);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(CARD_BORDER_PT);
  doc.roundedRect(x, y, w, h, CARD_RADIUS_MM, CARD_RADIUS_MM, "FD");
}

function drawBankIcon(doc: JsPDFType, x: number, y: number) {
  doc.setFillColor(238, 238, 238);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.circle(x + 4, y + 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text("B", x + 4, y + 5.2, { align: "center" });
}

function drawCryptoIcon(doc: JsPDFType, x: number, y: number) {
  doc.setFillColor(238, 238, 238);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.circle(x + 4, y + 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("₿", x + 4, y + 5.4, { align: "center" });
}

function cardDivider(doc: JsPDFType, x: number, y: number, w: number) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.line(x, y, x + w, y);
}

function measureBankCard(doc: JsPDFType, cardW: number, inv: Invoice): number {
  const pad = CARD_PAD_MM;
  const inner = cardW - pad * 2;
  const valueW = inner * 0.66;
  let h = pad + 5 + 6 + 6;
  for (const [, v] of bankFieldRows(inv)) h += measureRowHeight(doc, v, valueW);
  const instr = inv.paymentMethods.bank.instructions?.trim();
  if (instr) h += 2 + measureRowHeight(doc, instr, valueW);
  return h + pad;
}

function measureCryptoCardStacked(doc: JsPDFType, cardW: number, inv: Invoice, qrSide: number): number {
  const pad = CARD_PAD_MM;
  const inner = cardW - pad * 2;
  const labelW = inner * 0.34;
  const valueW = inner - labelW;
  const currency = inv.invoiceCurrency;
  const crypto = inv.paymentMethods.crypto;
  const metaRows: [string, string][] = [
    ["Asset", crypto.currency],
    ["Network", crypto.network],
    ["Amount due", amt(inv.total, currency)],
    ["Payment reference", inv.number],
  ].filter(([, v]) => v?.trim()) as [string, string][];

  let h = pad + 5 + 6 + 6;
  for (const [, v] of metaRows) h += measureRowHeight(doc, v, valueW);
  h += 3 + qrSide + 3.5;
  const wallet = crypto.walletAddress?.trim();
  if (wallet) {
    h += 6 + 4 + doc.splitTextToSize(wallet, inner).length * 4.5;
  }
  return h + pad;
}

/** Section body height: heading through last card — excludes top gap before heading and trailing gap after cards. */
export function measurePaymentSectionBodyHeight(doc: JsPDFType, inv: Invoice, contentWidth: number): number {
  const showBank = isBankPaymentVisible(inv);
  const showCrypto = isCryptoPaymentVisible(inv);
  const showCash = isCashPaymentVisible(inv);
  const cardHeights: number[] = [];
  if (showBank) cardHeights.push(measureBankCard(doc, contentWidth, inv));
  if (showCrypto) cardHeights.push(measureCryptoCardStacked(doc, contentWidth, inv, QR_SIZE_MM));
  if (showCash) cardHeights.push(measureCashCard(inv));
  if (cardHeights.length === 0) return 0;
  let h = PAYMENT_HEADING_H_MM;
  for (let i = 0; i < cardHeights.length; i++) {
    h += cardHeights[i];
    if (i < cardHeights.length - 1) h += PAYMENT_CARD_STACK_GAP_MM;
  }
  return h;
}

function resolvePaymentTopGap(anchorY: number, footerTop: number, bodyHeight: number, onFreshPage: boolean): number {
  if (onFreshPage) {
    if (anchorY + PAYMENT_TOP_GAP_PREFERRED_MM + bodyHeight <= footerTop) return PAYMENT_TOP_GAP_PREFERRED_MM;
    if (anchorY + PAYMENT_TOP_GAP_MIN_MM + bodyHeight <= footerTop) return PAYMENT_TOP_GAP_MIN_MM;
    return PAYMENT_TOP_GAP_PREFERRED_MM;
  }
  if (anchorY + PAYMENT_TOP_GAP_PREFERRED_MM + bodyHeight <= footerTop) return PAYMENT_TOP_GAP_PREFERRED_MM;
  if (anchorY + PAYMENT_TOP_GAP_MIN_MM + bodyHeight <= footerTop) return PAYMENT_TOP_GAP_MIN_MM;
  if (anchorY + bodyHeight <= footerTop) return 0;
  return PAYMENT_TOP_GAP_MIN_MM;
}

function paymentAnchorY(ctx: PdfPageContext, inv: Invoice): number {
  const notesRendered =
    inv.displayOptions.showNotes && Boolean(inv.description?.trim());
  const termsRendered =
    inv.displayOptions.showTerms && Boolean(inv.termsAndConditions?.trim());
  if (!notesRendered && !termsRendered && ctx.totalsContentBottom != null) {
    return ctx.totalsContentBottom;
  }
  return ctx.cursorY;
}

function tryPlacePaymentOnPage(
  anchorY: number,
  footerTop: number,
  bodyHeight: number,
  minAnchorY: number,
): { sectionStartY: number; topGap: number } | null {
  let topGap = resolvePaymentTopGap(anchorY, footerTop, bodyHeight, false);
  if (anchorY + topGap + bodyHeight <= footerTop) {
    return { sectionStartY: anchorY, topGap };
  }
  const flushStart = footerTop - bodyHeight;
  if (flushStart >= minAnchorY) {
    return { sectionStartY: flushStart, topGap: 0 };
  }
  return null;
}

function measureCashCard(inv: Invoice): number {
  const cash = inv.paymentMethods.cash;
  let h = CARD_PAD_MM + 24 + CARD_PAD_MM;
  if (cash.instructions?.trim()) h += 10;
  if (cash.location?.trim()) h += 10;
  return h;
}

function drawCardBorder(doc: JsPDFType, x: number, y: number, w: number, h: number) {
  drawPaymentSurface(doc, x, y, w, h);
}

async function renderPayment(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): Promise<PdfPageContext> {
  const d = inv.displayOptions;
  if (!d.showPaymentInstructions) return ctx;

  const showBank = isBankPaymentVisible(inv);
  const showCrypto = isCryptoPaymentVisible(inv);
  const showCash = isCashPaymentVisible(inv);
  if (!showBank && !showCrypto && !showCash) return ctx;

  const doc = ctx.doc;
  const currency = inv.invoiceCurrency;
  const bank = inv.paymentMethods.bank;
  const crypto = inv.paymentMethods.crypto;
  const cash = inv.paymentMethods.cash;
  const fullW = ctx.contentWidth;
  const qrMm = QR_SIZE_MM;

  type CardSpec = { kind: "bank" | "crypto" | "cash"; w: number; h: number };
  const cards: CardSpec[] = [];
  if (showBank) cards.push({ kind: "bank", w: fullW, h: measureBankCard(doc, fullW, inv) });
  if (showCrypto) cards.push({ kind: "crypto", w: fullW, h: measureCryptoCardStacked(doc, fullW, inv, qrMm) });
  if (showCash) cards.push({ kind: "cash", w: fullW, h: measureCashCard(inv) });

  const paymentBodyH = measurePaymentSectionBodyHeight(doc, inv, fullW);
  const anchor = paymentAnchorY(ctx, inv);
  const notesRendered = inv.displayOptions.showNotes && Boolean(inv.description?.trim());
  const termsRendered = inv.displayOptions.showTerms && Boolean(inv.termsAndConditions?.trim());
  const minAnchor =
    !notesRendered && !termsRendered && ctx.totalsBlockStartY != null
      ? ctx.totalsBlockStartY
      : ctx.marginTop;

  let placement = tryPlacePaymentOnPage(anchor, ctx.footerTop, paymentBodyH, minAnchor);
  let topGap = placement?.topGap ?? PAYMENT_TOP_GAP_PREFERRED_MM;
  if (!placement) {
    startNewPage(ctx);
    placement = tryPlacePaymentOnPage(ctx.cursorY, ctx.footerTop, paymentBodyH, ctx.marginTop);
    if (!placement) {
      topGap = resolvePaymentTopGap(ctx.cursorY, ctx.footerTop, paymentBodyH, true);
      placement = { sectionStartY: ctx.cursorY, topGap };
    } else {
      topGap = placement.topGap;
    }
  }

  const sectionStartY = placement.sectionStartY;
  ctx.cursorY = sectionStartY + topGap;

  let qrDataUrl: string | null = null;
  if (showCrypto && crypto.walletAddress?.trim()) {
    try {
      qrDataUrl = await qrCodeToDataUrl(crypto.walletAddress, { margin: 1, width: 280 });
    } catch {
      qrDataUrl = null;
    }
  }

  const renderOneCard = async (card: CardSpec, x: number, y: number) => {
    if (card.kind === "bank") {
      drawCardBorder(doc, x, y, card.w, card.h);
      const pad = CARD_PAD_MM;
      const inner = card.w - pad * 2;
      const labelW = inner * 0.34;
      const valueW = inner * 0.66;
      let cy = y + pad + 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      doc.text("Bank transfer", x + pad, cy);
      cy += 6;
      cardDivider(doc, x + pad, cy, inner);
      cy += 6;
      for (const [label, value] of bankFieldRows(inv)) {
        const isRef = label === "Payment reference";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY_777);
        doc.text(label, x + pad, cy);
        const valX = x + pad + labelW;
        if (isRef) {
          doc.setFillColor(...REF_HIGHLIGHT);
          doc.roundedRect(valX - 1, cy - 3.5, valueW, 5.5, 1, 1, "F");
        }
        doc.setFont("helvetica", isRef ? "bold" : "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        doc.text(doc.splitTextToSize(value, valueW) as string[], valX, cy);
        cy += measureRowHeight(doc, value, valueW);
      }
      const instr = bank.instructions?.trim();
      if (instr) {
        cy += 2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY_777);
        doc.text("Instructions", x + pad, cy);
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        doc.text(doc.splitTextToSize(instr, valueW) as string[], x + pad + labelW, cy);
        cy += measureRowHeight(doc, instr, valueW);
      }
      return;
    }
    if (card.kind === "crypto") {
      drawCardBorder(doc, x, y, card.w, card.h);
      const pad = CARD_PAD_MM;
      const inner = card.w - pad * 2;
      let cy = y + pad + 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Cryptocurrency", x + pad, cy);
      cy += 6;
      cardDivider(doc, x + pad, cy, inner);
      cy += 6;

      const stacked = true;
      const metaRows: [string, string][] = [
        ["Asset", crypto.currency],
        ["Network", crypto.network],
        ["Amount due", amt(inv.total, currency)],
        ["Payment reference", inv.number],
      ].filter(([, v]) => v?.trim()) as [string, string][];

      const labelW = inner * 0.34;
      const metaTop = cy;
      let metaBottom = cy;

      const drawMeta = (valueW: number, leftX: number) => {
        let rowY = metaTop;
        for (const [label, value] of metaRows) {
          const isRef = label === "Payment reference";
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...GRAY_777);
          doc.text(label, leftX, rowY);
          doc.setFont("helvetica", isRef ? "bold" : "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text(doc.splitTextToSize(value, valueW) as string[], leftX + labelW, rowY);
          rowY += measureRowHeight(doc, value, valueW);
        }
        metaBottom = rowY;
      };

      const qrSide = stacked ? Math.max(24, Math.min(qrMm, inner)) : qrMm;
      if (stacked) {
        drawMeta(inner - labelW, x + pad);
        const qrX = x + (card.w - qrSide) / 2;
        const qrY = metaBottom + 3;
        if (qrDataUrl) doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSide, qrSide);
        doc.setFontSize(7);
        doc.setTextColor(...GRAY_777);
        doc.text(`Scan to pay · ${crypto.currency} / ${crypto.network}`, qrX + qrSide / 2, qrY + qrSide + 3.5, {
          align: "center",
        });
        const wallet = crypto.walletAddress?.trim();
        if (wallet) {
          const walletY = qrY + qrSide + 6;
          cardDivider(doc, x + pad, walletY - 3, inner);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...GRAY_777);
          doc.text("Wallet address", x + pad, walletY + 2);
          doc.setFont("courier", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...BLACK);
          doc.text(doc.splitTextToSize(wallet, inner) as string[], x + pad, walletY + 6);
        }
      }
      return;
    }
    drawCardBorder(doc, x, y, card.w, card.h);
    let cy = y + CARD_PAD_MM + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cash payment", x + CARD_PAD_MM, cy);
    cy += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Amount", x + CARD_PAD_MM, cy);
    doc.setFont("helvetica", "bold");
    doc.text(amt(inv.total, currency), x + CARD_PAD_MM + (card.w - CARD_PAD_MM * 2) * 0.32, cy);
    if (cash.instructions?.trim()) {
      cy += 8;
      doc.setFont("helvetica", "normal");
      doc.text(cash.instructions.trim(), x + CARD_PAD_MM, cy);
    }
    if (cash.location?.trim()) {
      cy += 8;
      doc.text(cash.location.trim(), x + CARD_PAD_MM, cy);
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  doc.text("PAYMENT DETAILS", ctx.marginLeft, ctx.cursorY + 4);
  ctx.cursorY += PAYMENT_HEADING_H_MM;

  for (let idx = 0; idx < cards.length; idx++) {
    const card = cards[idx];
    if (cards.length > 1 && !canFit(ctx, card.h)) {
      startNewPage(ctx);
    }
    const rowY = ctx.cursorY;
    await renderOneCard(card, ctx.marginLeft, rowY);
    ctx.cursorY = rowY + card.h;
    if (idx < cards.length - 1) ctx.cursorY += PAYMENT_CARD_STACK_GAP_MM;
  }

  recordSection(collector, ctx.pageNumber, "payment", {
    x: ctx.marginLeft,
    y: sectionStartY,
    width: ctx.contentWidth,
    height: ctx.cursorY - sectionStartY,
  });
  return ctx;
}

function drawAllFooters(ctx: PdfPageContext, collector: LayoutCollector): void {
  const doc = ctx.doc;
  const pageCount = doc.getNumberOfPages();
  const rightX = contentRightX(ctx);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_777);
    doc.text("Created with VegaPal", ctx.marginLeft, FOOTER_TEXT_BASELINE_Y - 2);
    doc.text("vega-pal.com", ctx.marginLeft, FOOTER_TEXT_BASELINE_Y + 1.5);
    doc.text(`Page ${i} of ${pageCount}`, rightX, FOOTER_TEXT_BASELINE_Y, { align: "right" });
    recordSection(collector, i, "footer", {
      x: ctx.marginLeft,
      y: FOOTER_TEXT_BASELINE_Y - 6,
      width: ctx.contentWidth,
      height: 10,
    });
  }
}

export async function renderInvoiceLayoutEngine(
  inv: Invoice,
  options?: PdfBuildOptions,
): Promise<PdfBuildResult> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const collector = createLayoutCollector(!!options?.collectLayout);
  let ctx = createPageContext(doc);

  ctx = renderHeader(ctx, inv, collector);
  ctx = renderClientMetadata(ctx, inv, collector);
  ctx = renderSubject(ctx, inv, collector);
  ctx = renderItems(ctx, inv, collector);
  ctx = renderTotals(ctx, inv, collector);
  ctx = renderNotes(ctx, inv, collector);
  ctx = renderTerms(ctx, inv, collector);
  ctx = await renderPayment(ctx, inv, collector);
  drawAllFooters(ctx, collector);

  if (collector.enabled) {
    verifyLayoutRecords(collector.records, doc.getNumberOfPages());
  }

  return { doc, layoutRecords: collector.records };
}
