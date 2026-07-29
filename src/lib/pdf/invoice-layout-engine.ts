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
import { clientIdentityLines, normalizeIdentity, identitiesEqual } from "@/lib/invoice/document-identity";
import {
  compactStatusLabel,
  documentTypeHeading,
  dueDateFieldLabel,
  finalTotalLabel,
} from "@/lib/invoice/document-labels";
import { documentTotalsView } from "@/lib/invoice/document-totals-display";
import {
  canFit,
  createPageContext,
  ensureSectionSpace,
  FOOTER_DIVIDER_Y,
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
export const BORDER: [number, number, number] = [209, 213, 219];
export const HEAD_FILL: [number, number, number] = [248, 249, 250];

const PAYMENT_CARD_GAP = 6;
const PAYMENT_CARD_PAD = 6;
const PAYMENT_HEADING_H = 8;
const PAYMENT_AFTER_PRIOR_GAP = 12;
const TOTALS_WIDTH = 76;
const TOTALS_AFTER_GAP = 12;

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

function sellerContactLines(inv: Invoice): string[] {
  const lines: string[] = [];
  const company = sellerCompanyName(inv);
  const person = normalizeIdentity(inv.sellerName);
  const address = normalizeIdentity(inv.sellerAddress);
  const push = (v: string) => {
    const t = normalizeIdentity(v);
    if (!t) return;
    if (lines.some((l) => identitiesEqual(l, t))) return;
    if (company && identitiesEqual(t, company)) return;
    lines.push(t);
  };
  if (person && company && !identitiesEqual(person, company)) push(person);
  if (address) push(address);
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
  return ctx.contentWidth * 0.62;
}

function renderHeader(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const doc = ctx.doc;
  const startY = ctx.cursorY;
  const sellerW = sellerColWidth(ctx);
  const rightX = contentRightX(ctx);

  let sellerBottom = ctx.cursorY;
  if (inv.displayOptions.showSellerInfo) {
    const company = sellerCompanyName(inv);
    let textX = ctx.marginLeft;
    const sy = ctx.cursorY;
    if (!company && inv.sellerLogoUrl) {
      try {
        doc.addImage(inv.sellerLogoUrl, "PNG", ctx.marginLeft, sy, 14, 14);
        textX = ctx.marginLeft + 16;
      } catch {
        /* ignore */
      }
    }
    if (company) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(27);
      doc.setTextColor(...BLACK);
      const { lines } = truncateLines(doc, company, sellerW - (textX - ctx.marginLeft), 2, 10.5);
      let cy = sy + 8;
      for (const line of lines) {
        doc.text(line, textX, cy);
        cy += 10.5;
      }
      sellerBottom = cy;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_555);
    let contactY = sellerBottom + 4;
    for (const line of sellerContactLines(inv)) {
      doc.text(line, textX, contactY);
      contactY += 5;
    }
    sellerBottom = Math.max(sellerBottom, contactY);
  }

  let docY = ctx.cursorY;
  const typeHeading = documentTypeHeading(inv.documentType);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_555);
  doc.text(typeHeading, rightX, docY + 3, { align: "right" });
  docY += 8;

  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text(inv.number, rightX, docY + 4, { align: "right" });
  docY += 10;

  if (inv.displayOptions.showStatus) {
    const status = compactStatusLabel({
      documentType: inv.documentType,
      documentStatus: inv.documentStatus,
      paymentStatus: inv.paymentStatus,
    });
    if (status) {
      doc.setFontSize(7.5);
      const tw = doc.getTextWidth(status);
      const badgeW = Math.min(44, tw + 8);
      const badgeH = 6;
      const bx = rightX - badgeW;
      doc.setDrawColor(...BORDER);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(bx, docY, badgeW, badgeH, 1.5, 1.5, "FD");
      doc.setTextColor(...BLACK);
      doc.text(status, rightX - badgeW / 2, docY + badgeH / 2 + 1, { align: "center" });
      docY += badgeH + 6;
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_777);
  doc.text("ISSUE DATE", rightX, docY + 3, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(formatPdfDate(inv.issueDate), rightX, docY + 7, { align: "right" });
  docY += 8;

  if (inv.displayOptions.showDueDate && inv.dueDate) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_777);
    doc.text(dueDateFieldLabel(inv.documentType).toUpperCase(), rightX, docY + 3, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(formatPdfDate(inv.dueDate), rightX, docY + 7, { align: "right" });
    docY += 8;
  }

  ctx.cursorY = Math.max(sellerBottom, docY) + 9;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(ctx.marginLeft, ctx.cursorY, contentRightX(ctx), ctx.cursorY);
  ctx.cursorY += 9;

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
  let leftBottom = startY;
  let rightBottom = startY;

  if (d.showClientInfo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_777);
    doc.text("BILL TO", ctx.marginLeft, startY + 3);
    let ly = startY + 8;
    const clientLines = clientIdentityLines(inv);
    for (let i = 0; i < clientLines.length; i++) {
      const line = clientLines[i];
      if (i === 0) {
        doc.setFontSize(13);
        doc.setTextColor(...BLACK);
        doc.text(line.text, ctx.marginLeft, ly + 4);
        ly += 8;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_555);
        doc.text(line.text, ctx.marginLeft, ly);
        ly += 4.5;
      }
    }
    leftBottom = ly;
  }

  const metaRows: [string, string][] = [];
  if (showReferenceField(d, "showPoNumber", inv.poNumber)) metaRows.push(["PO number", inv.poNumber!]);
  if (showReferenceField(d, "showReferenceNumber", inv.referenceNumber)) {
    metaRows.push(["Reference number", inv.referenceNumber!]);
  }
  if (showReferenceField(d, "showProjectCode", inv.projectCode)) {
    metaRows.push(["Project code", inv.projectCode!]);
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

  ctx.cursorY = Math.max(leftBottom, rightBottom);
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
  ctx.cursorY += 7;
  const startY = ctx.cursorY;
  const doc = ctx.doc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...BLACK);
  const { lines } = truncateLines(doc, title, ctx.contentWidth, 3, 7);
  let ty = startY + 5;
  for (const line of lines) {
    doc.text(line, ctx.marginLeft, ty);
    ty += 7;
  }
  ctx.cursorY = ty + 7;
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
  const colDesc = ctx.contentWidth * 0.58;
  const colQty = ctx.contentWidth * 0.09;
  const colUnit = ctx.contentWidth * 0.165;
  const colTotal = ctx.contentWidth * 0.165;
  const unitHead = `Unit price (${currency})`;
  const totalHead = `Line total (${currency})`;

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
      cellPadding: 3,
      minCellHeight: 10,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.1,
      font: "helvetica",
      valign: "middle",
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: BLACK,
      fontStyle: "bold",
      fontSize: 9,
      minCellHeight: 11,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: colDesc, halign: "left" },
      1: { cellWidth: colQty, halign: "center" },
      2: { cellWidth: colUnit, halign: "right" },
      3: { cellWidth: colTotal, halign: "right" },
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
  ctx.cursorY = finalY;
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
  return rows * 7 + 5 + 12 + TOTALS_AFTER_GAP;
}

function renderTotals(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  ensureSectionSpace(ctx, measureTotalsHeight(inv));
  const startY = ctx.cursorY + 6;
  const doc = ctx.doc;
  const currency = inv.invoiceCurrency;
  const totals = documentTotalsView(inv);
  const totalsRightX = contentRightX(ctx);
  const totalsLeft = totalsRightX - TOTALS_WIDTH;
  let y = startY;

  const drawLine = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
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
  doc.setLineWidth(0.3);
  doc.line(totalsLeft, y + 1, totalsRightX, y + 1);
  y += 5;

  const finalLabel = finalTotalLabel(inv.documentType, inv.paymentStatus);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(finalLabel.toUpperCase(), totalsLeft, y + 5);
  doc.setFontSize(19);
  doc.text(amt(inv.total, currency), totalsRightX, y + 5, { align: "right" });
  y += 12;

  ctx.cursorY = y + TOTALS_AFTER_GAP;
  recordSection(collector, ctx.pageNumber, "totals", {
    x: totalsLeft,
    y: startY,
    width: TOTALS_WIDTH,
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  doc.text("Notes", ctx.marginLeft, startY + 4);
  let y = startY + headingH + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const line of bodyLines) {
    if (y + 5 > ctx.footerTop) {
      startNewPage(ctx);
      y = ctx.cursorY;
    }
    doc.text(line, ctx.marginLeft, y);
    y += 5;
  }
  ctx.cursorY = y + 10;
  recordSection(collector, ctx.pageNumber, "notes", {
    x: ctx.marginLeft,
    y: startY,
    width: ctx.contentWidth,
    height: ctx.cursorY - startY,
  });
  return ctx;
}

function renderTerms(ctx: PdfPageContext, inv: Invoice, collector: LayoutCollector): PdfPageContext {
  const d = inv.displayOptions;
  const raw = inv.termsAndConditions?.trim();
  if (!d.showTerms || !raw) return ctx;

  const doc = ctx.doc;
  const bullets = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s*/, ""));

  const headingH = 6;
  const bulletGap = 2.5;
  const textX = ctx.marginLeft + 5;
  const textW = ctx.contentWidth - 5;
  const minWithHeading = headingH + 4 + 10;

  let startY = ctx.cursorY;
  let y = startY;

  const drawHeading = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
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
    const blockH = wrapped.length * 5 + bulletGap;
    if (y + blockH > ctx.footerTop) {
      recordSection(collector, ctx.pageNumber, "terms", {
        x: ctx.marginLeft,
        y: startY,
        width: ctx.contentWidth,
        height: y - startY,
      });
      startNewPage(ctx);
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
      ly += 5;
    }
    y = ly + bulletGap;
  }
  ctx.cursorY = y + 10;
  recordSection(collector, ctx.pageNumber, "terms", {
    x: ctx.marginLeft,
    y: startY,
    width: ctx.contentWidth,
    height: ctx.cursorY - startY,
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
  doc.setFontSize(8.5);
  return Math.max(6.5, doc.splitTextToSize(value, valueW).length * 4.5);
}

function measureBankCard(doc: JsPDFType, cardW: number, inv: Invoice): number {
  const inner = cardW - PAYMENT_CARD_PAD * 2;
  const valueW = inner * 0.68;
  let h = PAYMENT_CARD_PAD + 11;
  for (const [, v] of bankFieldRows(inv)) h += measureRowHeight(doc, v, valueW);
  const instr = inv.paymentMethods.bank.instructions?.trim();
  if (instr) h += 4 + doc.splitTextToSize(instr, valueW).length * 4.5;
  return h + PAYMENT_CARD_PAD;
}

function measureCryptoCard(doc: JsPDFType, cardW: number, inv: Invoice, qrSide: number, stackedQr: boolean): number {
  const inner = cardW - PAYMENT_CARD_PAD * 2;
  const currency = inv.invoiceCurrency;
  const crypto = inv.paymentMethods.crypto;
  const metaRows: [string, string][] = [
    ["Asset", crypto.currency],
    ["Network", crypto.network],
    ["Amount due", amt(inv.total, currency)],
    ["Payment reference", inv.number],
  ].filter(([, v]) => v?.trim()) as [string, string][];

  const valueW = stackedQr ? inner * 0.68 : inner * 0.68 - qrSide - 6;
  let metaH = 11;
  for (const [, v] of metaRows) metaH += measureRowHeight(doc, v, Math.max(20, valueW));
  const wallet = crypto.walletAddress?.trim();
  let walletH = 0;
  if (wallet) {
    const wW = stackedQr ? inner : inner - qrSide - 6;
    walletH = 8 + doc.splitTextToSize(wallet, wW).length * 4.5;
  }
  const qrBlock = qrSide + 10;
  const topH = stackedQr ? metaH + qrBlock : Math.max(metaH, qrBlock);
  return PAYMENT_CARD_PAD + 6 + topH + walletH + PAYMENT_CARD_PAD;
}

function measureCashCard(inv: Invoice): number {
  const cash = inv.paymentMethods.cash;
  let h = PAYMENT_CARD_PAD + 24 + PAYMENT_CARD_PAD;
  if (cash.instructions?.trim()) h += 10;
  if (cash.location?.trim()) h += 10;
  return h;
}

function drawCardBorder(doc: JsPDFType, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
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

  ctx.cursorY += PAYMENT_AFTER_PRIOR_GAP;

  const fullW = ctx.contentWidth;
  const dualW = (fullW - PAYMENT_CARD_GAP) / 2;
  const qrMm = 29;
  let useDual = showBank && showCrypto && !showCash && dualW >= 82;

  const bankHFull = showBank ? measureBankCard(doc, fullW, inv) : 0;
  const cryptoHFull = showCrypto ? measureCryptoCard(doc, fullW, inv, qrMm, true) : 0;
  const bankHDual = showBank ? measureBankCard(doc, dualW, inv) : 0;
  const cryptoHDual = showCrypto ? measureCryptoCard(doc, dualW, inv, qrMm, false) : 0;

  if (useDual) {
    const rowH = Math.max(bankHDual, cryptoHDual);
    if (rowH > ctx.footerTop - ctx.cursorY - PAYMENT_HEADING_H) useDual = false;
  }

  type CardSpec = { kind: "bank" | "crypto" | "cash"; w: number; h: number };
  const cards: CardSpec[] = [];
  if (showBank && showCrypto && useDual) {
    const rowH = Math.max(bankHDual, cryptoHDual);
    cards.push({ kind: "bank", w: dualW, h: rowH }, { kind: "crypto", w: dualW, h: rowH });
  } else {
    if (showBank) cards.push({ kind: "bank", w: fullW, h: bankHFull });
    if (showCrypto) cards.push({ kind: "crypto", w: fullW, h: cryptoHFull });
    if (showCash) cards.push({ kind: "cash", w: fullW, h: measureCashCard(inv) });
  }

  let qrDataUrl: string | null = null;
  if (showCrypto && crypto.walletAddress?.trim()) {
    try {
      qrDataUrl = await qrCodeToDataUrl(crypto.walletAddress, { margin: 1, width: 280 });
    } catch {
      qrDataUrl = null;
    }
  }

  const renderOneCard = async (card: CardSpec, x: number, y: number, sideBySide: boolean) => {
    if (card.kind === "bank") {
      drawCardBorder(doc, x, y, card.w, card.h);
      const inner = card.w - PAYMENT_CARD_PAD * 2;
      const labelW = inner * 0.32;
      const valueW = inner * 0.68;
      let cy = y + PAYMENT_CARD_PAD + 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      doc.text("Bank transfer", x + PAYMENT_CARD_PAD, cy);
      cy += 5;
      for (const [label, value] of bankFieldRows(inv)) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_777);
        doc.text(label, x + PAYMENT_CARD_PAD, cy);
        doc.setTextColor(...BLACK);
        doc.text(doc.splitTextToSize(value, valueW) as string[], x + PAYMENT_CARD_PAD + labelW, cy);
        cy += measureRowHeight(doc, value, valueW);
      }
      const instr = bank.instructions?.trim();
      if (instr) {
        doc.setTextColor(...GRAY_777);
        doc.text("Instructions", x + PAYMENT_CARD_PAD, cy + 2);
        doc.setTextColor(...BLACK);
        doc.text(doc.splitTextToSize(instr, valueW) as string[], x + PAYMENT_CARD_PAD + labelW, cy + 2);
      }
      return;
    }
    if (card.kind === "crypto") {
      drawCardBorder(doc, x, y, card.w, card.h);
      const inner = card.w - PAYMENT_CARD_PAD * 2;
      let cy = y + PAYMENT_CARD_PAD + 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Cryptocurrency", x + PAYMENT_CARD_PAD, cy);
      cy += 5;
      const stacked = !sideBySide || inner < qrMm + 40;
      const textW = stacked ? inner : inner - qrMm - 6;
      const metaRows: [string, string][] = [
        ["Asset", crypto.currency],
        ["Network", crypto.network],
        ["Amount due", amt(inv.total, currency)],
        ["Payment reference", inv.number],
      ].filter(([, v]) => v?.trim()) as [string, string][];
      const metaStartY = cy;
      for (const [label, value] of metaRows) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_777);
        doc.text(label, x + PAYMENT_CARD_PAD, cy);
        doc.setTextColor(...BLACK);
        doc.text(doc.splitTextToSize(value, textW - inner * 0.32) as string[], x + PAYMENT_CARD_PAD + inner * 0.32, cy);
        cy += measureRowHeight(doc, value, textW - inner * 0.32);
      }
      const qrSide = stacked ? Math.max(24, Math.min(qrMm, inner)) : qrMm;
      const qrX = stacked ? x + (card.w - qrSide) / 2 : x + card.w - PAYMENT_CARD_PAD - qrSide;
      const qrY = stacked ? cy + 4 : metaStartY;
      if (qrDataUrl) doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSide, qrSide);
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_777);
      doc.text(`Scan to pay · ${crypto.currency} / ${crypto.network}`, qrX + qrSide / 2, qrY + qrSide + 4, {
        align: "center",
      });
      if (!stacked) cy = Math.max(cy, qrY + qrSide + 6);
      else cy = qrY + qrSide + 10;
      const wallet = crypto.walletAddress?.trim();
      if (wallet) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_777);
        doc.text("Wallet address", x + PAYMENT_CARD_PAD, cy);
        doc.setFont("courier", "normal");
        doc.setTextColor(...BLACK);
        doc.text(doc.splitTextToSize(wallet, textW) as string[], x + PAYMENT_CARD_PAD, cy + 4);
        doc.setFont("helvetica", "normal");
      }
      return;
    }
    drawCardBorder(doc, x, y, card.w, card.h);
    let cy = y + PAYMENT_CARD_PAD + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cash payment", x + PAYMENT_CARD_PAD, cy);
    cy += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Amount", x + PAYMENT_CARD_PAD, cy);
    doc.setFont("helvetica", "bold");
    doc.text(amt(inv.total, currency), x + PAYMENT_CARD_PAD + (card.w - PAYMENT_CARD_PAD * 2) * 0.32, cy);
    if (cash.instructions?.trim()) {
      cy += 8;
      doc.setFont("helvetica", "normal");
      doc.text(cash.instructions.trim(), x + PAYMENT_CARD_PAD, cy);
    }
    if (cash.location?.trim()) {
      cy += 8;
      doc.text(cash.location.trim(), x + PAYMENT_CARD_PAD, cy);
    }
  };

  const sectionStartY = ctx.cursorY;
  const sectionStartPage = ctx.pageNumber;
  let idx = 0;
  while (idx < cards.length) {
    const card = cards[idx];
    const paired = useDual && cards[idx + 1];
    const rowH = paired ? Math.max(card.h, cards[idx + 1].h) : card.h;
    const need = (idx === 0 ? PAYMENT_HEADING_H : 0) + rowH + 6;
    ensureSectionSpace(ctx, need);
    if (!canFit(ctx, (idx === 0 ? PAYMENT_HEADING_H : 0) + rowH)) startNewPage(ctx);

    if (idx === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...BLACK);
      doc.text("PAYMENT DETAILS", ctx.marginLeft, ctx.cursorY + 4);
      ctx.cursorY += PAYMENT_HEADING_H;
    }

    const rowY = ctx.cursorY;
    if (paired) {
      await renderOneCard(card, ctx.marginLeft, rowY, true);
      await renderOneCard(cards[idx + 1], ctx.marginLeft + card.w + PAYMENT_CARD_GAP, rowY, true);
      idx += 2;
    } else {
      await renderOneCard(card, ctx.marginLeft, rowY, false);
      idx += 1;
    }
    ctx.cursorY = rowY + rowH + 6;
  }

  const payY = sectionStartPage === ctx.pageNumber ? sectionStartY : ctx.marginTop;
  recordSection(collector, ctx.pageNumber, "payment", {
    x: ctx.marginLeft,
    y: payY,
    width: ctx.contentWidth,
    height: ctx.cursorY - payY,
  });
  return ctx;
}

function drawAllFooters(ctx: PdfPageContext, collector: LayoutCollector): void {
  const doc = ctx.doc;
  const pageCount = doc.getNumberOfPages();
  const rightX = contentRightX(ctx);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(ctx.marginLeft, FOOTER_DIVIDER_Y, ctx.pageWidth - ctx.marginRight, FOOTER_DIVIDER_Y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_777);
    doc.text("Created with VegaPal · vega-pal.com", ctx.marginLeft, FOOTER_TEXT_BASELINE_Y);
    doc.text(`Page ${i} of ${pageCount}`, rightX, FOOTER_TEXT_BASELINE_Y, { align: "right" });
    recordSection(collector, i, "footer", {
      x: ctx.marginLeft,
      y: FOOTER_DIVIDER_Y,
      width: ctx.contentWidth,
      height: 12 + 6,
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
