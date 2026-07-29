import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { qrCodeToDataUrl } from "@/lib/qrcode-lazy";
import type { Invoice } from "./vegapal-store";
import {
  formatInvoiceAmount,
  formatInvoiceAmountWithCurrency,
  isBankPaymentVisible,
  isCashPaymentVisible,
  isCryptoPaymentVisible,
  showReferenceField,
} from "./invoice-display";
import { clientIdentityLines, normalizeIdentity, identitiesEqual } from "@/lib/invoice/document-identity";
import {
  compactStatusLabel,
  documentTypeHeading,
  dueDateFieldLabel,
  finalTotalLabel,
} from "@/lib/invoice/document-labels";
import { documentTotalsView } from "@/lib/invoice/document-totals-display";
import { DEFAULT_DISPLAY_OPTIONS } from "@/lib/invoice-constants";

// ── Page constants (mm) ───────────────────────────────────────────────────
export const PDF_LEFT = 18;
export const PDF_RIGHT = 18;
export const PDF_TOP = 18;
export const PDF_BOTTOM = 18;
export const PDF_PAGE_WIDTH = 210;
export const PDF_PAGE_HEIGHT = 297;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_LEFT - PDF_RIGHT;
export const PDF_LEFT_COLUMN_WIDTH = 105;
export const PDF_RIGHT_COLUMN_WIDTH = 55;
export const PDF_COLUMN_GAP = PDF_CONTENT_WIDTH - PDF_LEFT_COLUMN_WIDTH - PDF_RIGHT_COLUMN_WIDTH;
export const PDF_FOOTER_RESERVE = 15;

const GRAY_555: [number, number, number] = [85, 85, 85];
const GRAY_777: [number, number, number] = [119, 119, 119];
const BLACK: [number, number, number] = [0, 0, 0];
const BORDER: [number, number, number] = [209, 213, 219];
const HEAD_FILL: [number, number, number] = [248, 249, 250];

export type LayoutRect = { id: string; x: number; y: number; w: number; h: number };

export type PdfBuildResult = {
  doc: jsPDF;
  layout: LayoutRect[];
};

const MIN_HEADER_GAP_MM = 1.5;

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
  const email = normalizeIdentity(inv.sellerEmail);
  const person = normalizeIdentity(inv.sellerName);
  const address = normalizeIdentity(inv.sellerAddress);

  const push = (v: string) => {
    const t = normalizeIdentity(v);
    if (!t) return;
    if (lines.some((l) => identitiesEqual(l, t))) return;
    if (company && identitiesEqual(t, company)) return;
    lines.push(t);
  };

  if (email) push(email);
  if (person && company && !identitiesEqual(person, company)) push(person);
  if (address) push(address);

  return lines;
}

function truncateCompanyLines(doc: jsPDF, name: string, maxW: number, maxLines: number): string[] {
  let lines = doc.splitTextToSize(name, maxW) as string[];
  if (lines.length <= maxLines) return lines;
  lines = lines.slice(0, maxLines);
  let last = lines[maxLines - 1];
  while (last.length > 3 && doc.getTextWidth(`${last}…`) > maxW) {
    last = last.slice(0, -1);
  }
  lines[maxLines - 1] = `${last}…`;
  return lines;
}

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function contentBottomY(): number {
  return PDF_PAGE_HEIGHT - PDF_BOTTOM - PDF_FOOTER_RESERVE;
}

function record(layout: LayoutRect[], rect: LayoutRect) {
  layout.push(rect);
}

export function verifyPdfLayout(layout: LayoutRect[]): void {
  const headerIds = [
    "documentType",
    "documentNumber",
    "statusBadge",
    "issueDateLabel",
    "issueDateValue",
    "dueDateLabel",
    "dueDateValue",
  ];
  const headerRects = layout.filter((r) => headerIds.includes(r.id)).sort((a, b) => a.y - b.y);
  for (let i = 0; i < headerRects.length - 1; i++) {
    const a = headerRects[i];
    const b = headerRects[i + 1];
    const gap = b.y - (a.y + a.h);
    if (gap < MIN_HEADER_GAP_MM - 0.01) {
      throw new Error(
        `Header overlap: ${a.id} (bottom ${a.y + a.h}) and ${b.id} (top ${b.y}) gap ${gap}mm`,
      );
    }
  }

  const payment = layout.find((r) => r.id === "paymentSection");
  if (payment && payment.h > 0 && payment.h < 20) {
    throw new Error(`Payment section height ${payment.h}mm looks too small`);
  }
}

export async function buildInvoicePdfDocument(inv: Invoice): Promise<PdfBuildResult> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const layout: LayoutRect[] = [];
  const sellerX = PDF_LEFT;
  const documentRightX = PDF_PAGE_WIDTH - PDF_RIGHT;
  const rightMetaX = documentRightX - PDF_RIGHT_COLUMN_WIDTH;

  const currency = inv.invoiceCurrency;
  const d = inv.displayOptions;
  const totals = documentTotalsView(inv);
  const typeHeading = documentTypeHeading(inv.documentType);

  // ── B. Header ───────────────────────────────────────────────────────────
  let sellerY = PDF_TOP;
  let companyBottom = PDF_TOP;

  if (d.showSellerInfo) {
    const company = sellerCompanyName(inv);
    const showLogo = !company && !!inv.sellerLogoUrl;
    let textX = sellerX;

    if (showLogo && inv.sellerLogoUrl) {
      try {
        doc.addImage(inv.sellerLogoUrl, "PNG", sellerX, sellerY, 14, 14);
        textX = sellerX + 16;
      } catch {
        /* ignore */
      }
    }

    if (company) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(30);
      doc.setTextColor(...BLACK);
      const lines = truncateCompanyLines(doc, company, PDF_LEFT_COLUMN_WIDTH, 2);
      let cy = sellerY + 8;
      for (const line of lines) {
        doc.text(line, textX, cy);
        cy += 11;
      }
      companyBottom = cy;
      record(layout, {
        id: "sellerBlock",
        x: sellerX,
        y: sellerY,
        w: PDF_LEFT_COLUMN_WIDTH,
        h: companyBottom - sellerY,
      });
    }

    let contactY = companyBottom + 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_555);
    for (const line of sellerContactLines(inv)) {
      doc.text(line, textX, contactY);
      contactY += 5;
    }
    const sellerBlockBottom = Math.max(companyBottom, contactY);
    if (!company) {
      record(layout, {
        id: "sellerBlock",
        x: sellerX,
        y: sellerY,
        w: PDF_LEFT_COLUMN_WIDTH,
        h: sellerBlockBottom - sellerY,
      });
    }
    companyBottom = sellerBlockBottom;
  } else {
    companyBottom = PDF_TOP;
  }

  const documentY = PDF_TOP + 1;
  const showDue = d.showDueDate && !!inv.dueDate;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_555);
  doc.text(typeHeading, documentRightX, documentY, { align: "right" });
  record(layout, { id: "documentType", x: rightMetaX, y: documentY - 3, w: PDF_RIGHT_COLUMN_WIDTH, h: 4 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text(inv.number, documentRightX, documentY + 7, { align: "right" });
  record(layout, {
    id: "documentNumber",
    x: rightMetaX,
    y: documentY + 4,
    w: PDF_RIGHT_COLUMN_WIDTH,
    h: 5,
  });

  let headerDocBottom = documentY + 34;
  if (d.showStatus) {
    const status = compactStatusLabel({
      documentType: inv.documentType,
      documentStatus: inv.documentStatus,
      paymentStatus: inv.paymentStatus,
    });
    if (status) {
      const badgeTop = documentY + 11;
      const badgeH = 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const tw = doc.getTextWidth(status);
      const badgeW = Math.min(42, tw + 8);
      const bx = documentRightX - badgeW;
      doc.setDrawColor(...BORDER);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(bx, badgeTop, badgeW, badgeH, 1.5, 1.5, "FD");
      doc.setTextColor(...BLACK);
      doc.text(status, documentRightX - badgeW / 2, badgeTop + badgeH / 2 + 1, { align: "center" });
      record(layout, {
        id: "statusBadge",
        x: bx,
        y: badgeTop,
        w: badgeW,
        h: badgeH,
      });
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_777);
  doc.text("Issue date", documentRightX, documentY + 25, { align: "right" });
  record(layout, {
    id: "issueDateLabel",
    x: rightMetaX,
    y: documentY + 22,
    w: PDF_RIGHT_COLUMN_WIDTH,
    h: 3,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(formatPdfDate(inv.issueDate), documentRightX, documentY + 30, { align: "right" });
  record(layout, {
    id: "issueDateValue",
    x: rightMetaX,
    y: documentY + 27,
    w: PDF_RIGHT_COLUMN_WIDTH,
    h: 4,
  });

  if (showDue) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_777);
    doc.text(dueDateFieldLabel(inv.documentType), documentRightX, documentY + 37, { align: "right" });
    record(layout, {
      id: "dueDateLabel",
      x: rightMetaX,
      y: documentY + 34,
      w: PDF_RIGHT_COLUMN_WIDTH,
      h: 3,
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text(formatPdfDate(inv.dueDate), documentRightX, documentY + 42, { align: "right" });
    record(layout, {
      id: "dueDateValue",
      x: rightMetaX,
      y: documentY + 39,
      w: PDF_RIGHT_COLUMN_WIDTH,
      h: 4,
    });
    headerDocBottom = documentY + 47;
  }

  const headerBottom = Math.max(companyBottom, headerDocBottom);
  const dividerY = headerBottom + 8;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(PDF_LEFT, dividerY, PDF_PAGE_WIDTH - PDF_RIGHT, dividerY);

  let bodyY = headerBottom + 17;

  // ── C. Bill to + metadata ─────────────────────────────────────────────────
  const identityTop = bodyY;
  let leftBottom = identityTop;
  let rightBottom = identityTop;

  if (d.showClientInfo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_777);
    doc.text("BILL TO", sellerX, bodyY);
    let ly = bodyY + 5;
    const clientLines = clientIdentityLines(inv);
    for (let i = 0; i < clientLines.length; i++) {
      const line = clientLines[i];
      if (i === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(...BLACK);
        doc.text(line.text, sellerX, ly + 4);
        ly += 9;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_555);
        doc.text(line.text, sellerX, ly);
        ly += 5;
      }
    }
    leftBottom = ly;
  }

  const metaRows: [string, string][] = [];
  if (showReferenceField(d, "showPoNumber", inv.poNumber)) {
    metaRows.push(["PO number", inv.poNumber!]);
  }
  if (showReferenceField(d, "showReferenceNumber", inv.referenceNumber)) {
    metaRows.push(["Reference number", inv.referenceNumber!]);
  }
  if (showReferenceField(d, "showProjectCode", inv.projectCode)) {
    metaRows.push(["Project code", inv.projectCode!]);
  }

  let ry = identityTop;
  for (const [label, value] of metaRows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_777);
    doc.text(label.toUpperCase(), documentRightX, ry, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text(value, documentRightX, ry + 4, { align: "right" });
    ry += 11;
  }
  rightBottom = metaRows.length ? ry : identityTop;

  const bodyIdentityBottom = Math.max(leftBottom, rightBottom);
  bodyY = bodyIdentityBottom + 12;

  // ── D. Subject ──────────────────────────────────────────────────────────
  if (inv.title?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...BLACK);
    const titleLines = doc.splitTextToSize(inv.title.trim(), PDF_CONTENT_WIDTH) as string[];
    let ty = bodyY + 6;
    for (const line of titleLines) {
      doc.text(line, sellerX, ty);
      ty += 9;
    }
    bodyY = ty + 16;
  } else {
    bodyY += 16;
  }

  // ── E. Items table ──────────────────────────────────────────────────────
  const colDesc = PDF_CONTENT_WIDTH * 0.61;
  const colQty = PDF_CONTENT_WIDTH * 0.09;
  const colUnit = PDF_CONTENT_WIDTH * 0.15;
  const colTotal = PDF_CONTENT_WIDTH * 0.15;
  const unitHead = `Unit price (${currency})`;
  const totalHead = `Line total (${currency})`;

  autoTable(doc, {
    startY: bodyY,
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
      fontSize: 8.5,
      cellPadding: 3,
      minCellHeight: 10,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.1,
      font: "helvetica",
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: BLACK,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: colDesc, halign: "left" },
      1: { cellWidth: colQty, halign: "right" },
      2: { cellWidth: colUnit, halign: "right" },
      3: { cellWidth: colTotal, halign: "right" },
    },
    margin: { left: PDF_LEFT, right: PDF_RIGHT, bottom: 24 },
  });

  const tableFinalY = (doc as DocWithTable).lastAutoTable?.finalY ?? bodyY;
  record(layout, {
    id: "itemsTable",
    x: PDF_LEFT,
    y: bodyY,
    w: PDF_CONTENT_WIDTH,
    h: tableFinalY - bodyY,
  });

  let y = tableFinalY + 8;

  // ── F. Totals ───────────────────────────────────────────────────────────
  const totalsW = 78;
  const totalsLeft = documentRightX - totalsW;

  const drawTotalLine = (label: string, value: string, fontSize: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...(bold ? BLACK : GRAY_555));
    doc.text(label, totalsLeft, y);
    doc.setTextColor(...BLACK);
    doc.text(value, documentRightX, y, { align: "right" });
    y += 8;
  };

  drawTotalLine("Subtotal", amt(totals.subtotal, currency), 9);
  if (totals.discountLabel && totals.discountAmount > 0) {
    drawTotalLine(totals.discountLabel, `(${amt(totals.discountAmount, currency)})`, 9);
  }
  if (totals.taxLabel && totals.taxAmount > 0) {
    drawTotalLine(totals.taxLabel, amt(totals.taxAmount, currency), 9);
  }

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(totalsLeft, y + 1, documentRightX, y + 1);
  y += 5;

  const finalLabel = finalTotalLabel(inv.documentType, inv.paymentStatus);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(finalLabel.toUpperCase(), totalsLeft, y + 5);
  doc.setFontSize(21);
  doc.text(amt(inv.total, currency), documentRightX, y + 5, { align: "right" });
  y += 14;

  const totalsBottom = y;
  record(layout, {
    id: "totals",
    x: totalsLeft,
    y: tableFinalY + 8,
    w: totalsW,
    h: totalsBottom - (tableFinalY + 8),
  });

  // ── G. Terms ────────────────────────────────────────────────────────────
  if (d.showTerms && inv.termsAndConditions?.trim()) {
    y = totalsBottom + 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...BLACK);
    doc.text("Terms & conditions", sellerX, y);
    y += 10;

    const bullets = inv.termsAndConditions
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[-*•]\s*/, ""));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const b of bullets) {
      const wrapped = doc.splitTextToSize(`• ${b}`, PDF_CONTENT_WIDTH) as string[];
      for (const line of wrapped) {
        doc.text(line, sellerX, y);
        y += 5;
      }
      y += 2;
    }
    record(layout, { id: "terms", x: sellerX, y: totalsBottom + 18, w: PDF_CONTENT_WIDTH, h: y - totalsBottom - 18 });
  }

  // ── H. How to pay ───────────────────────────────────────────────────────
  if (d.showPaymentInstructions) {
    const showCrypto = isCryptoPaymentVisible(inv);
    const showBank = isBankPaymentVisible(inv);
    const showCash = isCashPaymentVisible(inv);
    const crypto = inv.paymentMethods.crypto;
    const bank = inv.paymentMethods.bank;
    const cash = inv.paymentMethods.cash;

    if (showCrypto || showBank || showCash) {
      const cardPad = 6;
      const cardGap = 6;
      const qrMm = 30;
      const labelW = 32;
      const rowH = 8;

      const paymentStartY =
        d.showTerms && inv.termsAndConditions?.trim() ? y + 18 : totalsBottom + 18;

      const bankFieldRows = (showBank
        ? [
            ["Bank", bank.bankName ?? ""],
            ["IBAN", bank.iban ?? ""],
            ["SWIFT", bank.swift ?? ""],
            ["Account", bank.accountNumber ?? bank.accountName ?? ""],
            ["Reference", inv.number],
          ]
        : []).filter((row): row is [string, string] => !!row[1]?.trim());

      const cryptoMetaRows = (showCrypto
        ? [
            ["Asset", crypto.currency],
            ["Network", crypto.network],
            ["Reference", inv.number],
          ]
        : []).filter((row): row is [string, string] => !!row[1]?.trim());

      const measureCard = (opts: {
        title: boolean;
        rows: [string, string][];
        extraWallet?: string;
        qrColumn?: boolean;
      }) => {
        let h = cardPad + (opts.title ? 8 : 0);
        const innerW = PDF_CONTENT_WIDTH - cardPad * 2 - (opts.qrColumn ? qrMm + 8 : 0);
        for (const [, v] of opts.rows) {
          h += rowH;
        }
        if (opts.extraWallet) {
          doc.setFontSize(9);
          const lines = doc.splitTextToSize(opts.extraWallet, innerW).length;
          h += 6 + lines * 4.5;
        }
        if (opts.qrColumn) {
          h = Math.max(h, cardPad + qrMm + 4);
        }
        return h + cardPad;
      };

      const dual = showBank && showCrypto;
      const cardW = dual ? (PDF_CONTENT_WIDTH - cardGap) / 2 : PDF_CONTENT_WIDTH;

      const bankH = showBank
        ? measureCard({ title: true, rows: bankFieldRows }) +
          (bank.instructions?.trim()
            ? 6 + doc.splitTextToSize(bank.instructions.trim(), cardW - cardPad * 2 - labelW).length * 4
            : 0)
        : 0;

      const cryptoH = showCrypto
        ? measureCard({
            title: true,
            rows: cryptoMetaRows,
            extraWallet: crypto.walletAddress?.trim(),
            qrColumn: true,
          })
        : 0;

      const cashH = showCash
        ? cardPad + 8 + rowH + (cash.instructions?.trim() ? 10 : 0) + (cash.location?.trim() ? 10 : 0) + cardPad
        : 0;

      const sectionHeadingH = 6;
      const rowCardsH = dual ? Math.max(bankH, cryptoH) : Math.max(bankH, cryptoH, 0);
      const cashBlockH = showCash ? (dual ? cashH + 6 : cashH) : 0;
      const paymentHeight = sectionHeadingH + rowCardsH + cashBlockH;

      const remaining = contentBottomY() - paymentStartY;
      if (paymentHeight > remaining) {
        doc.addPage();
        y = PDF_TOP;
      } else {
        y = paymentStartY;
      }

      const payTop = y;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_555);
      doc.text("HOW TO PAY", sellerX, y);
      y += sectionHeadingH;

      const cardsY = y;

      const drawCardBorder = (x: number, w: number, h: number, cardY: number) => {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.4);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, cardY, w, h, 3, 3, "FD");
      };

      const drawRows = (
        x: number,
        w: number,
        cardY: number,
        title: string,
        rows: [string, string][],
        boldRefs: Set<string>,
      ) => {
        let cy = cardY + cardPad;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...BLACK);
        doc.text(title, x + cardPad, cy);
        cy += 8;
        for (const [label, value] of rows) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...GRAY_777);
          doc.text(label.toUpperCase(), x + cardPad, cy);
          doc.setFont("helvetica", boldRefs.has(label) ? "bold" : "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          const valX = x + cardPad + labelW;
          const valLines = doc.splitTextToSize(value, w - cardPad * 2 - labelW) as string[];
          doc.text(valLines, valX, cy);
          cy += rowH;
        }
        return cy;
      };

      if (showBank && bankH > 0) {
        const h = dual ? Math.max(bankH, cryptoH) : bankH;
        drawCardBorder(sellerX, dual ? cardW : PDF_CONTENT_WIDTH, h, cardsY);
        let by = drawRows(sellerX, cardW, cardsY, "Bank transfer", bankFieldRows, new Set(["Reference"]));
        if (bank.instructions?.trim()) {
          doc.setFontSize(7.5);
          doc.setTextColor(...GRAY_777);
          doc.text("INSTRUCTIONS", sellerX + cardPad, by);
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          const lines = doc.splitTextToSize(bank.instructions.trim(), cardW - cardPad * 2 - labelW);
          doc.text(lines, sellerX + cardPad + labelW, by);
        }
      }

      if (showCrypto && cryptoH > 0) {
        const cx = dual ? sellerX + cardW + cardGap : sellerX;
        const h = dual ? Math.max(bankH, cryptoH) : cryptoH;
        drawCardBorder(cx, cardW, h, cardsY);
        const innerLeft = cx + cardPad;
        const qrX = cx + cardW - cardPad - qrMm;
        const qrY = cardsY + cardPad;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Cryptocurrency", innerLeft, qrY + 4);

        if (crypto.walletAddress?.trim()) {
          try {
            const qr = await qrCodeToDataUrl(crypto.walletAddress, { margin: 0, width: 240 });
            doc.addImage(qr, "PNG", qrX, qrY, qrMm, qrMm);
          } catch {
            /* ignore */
          }
        }

        let cy = qrY + 10;
        const textW = cardW - cardPad * 2 - qrMm - 8;
        for (const [label, value] of cryptoMetaRows) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...GRAY_777);
          doc.text(label.toUpperCase(), innerLeft, cy);
          doc.setFont("helvetica", label === "Reference" ? "bold" : "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          const valLines = doc.splitTextToSize(value, textW - labelW) as string[];
          doc.text(valLines, innerLeft + labelW, cy);
          cy += rowH;
        }
        if (crypto.walletAddress?.trim()) {
          cy = Math.max(cy + 2, qrY + qrMm + 4);
          doc.setFontSize(7.5);
          doc.setTextColor(...GRAY_777);
          doc.text("WALLET", innerLeft, cy);
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          const wLines = doc.splitTextToSize(crypto.walletAddress.trim(), cardW - cardPad * 2) as string[];
          doc.text(wLines, innerLeft, cy + 4);
        }
      }

      y = cardsY + (dual ? Math.max(bankH, cryptoH) : Math.max(bankH, cryptoH, cashH));

      if (showCash) {
        const cashTop = y + 6;
        drawCardBorder(sellerX, PDF_CONTENT_WIDTH, cashH, cashTop);
        drawRows(
          sellerX,
          PDF_CONTENT_WIDTH,
          cashTop,
          "Cash payment",
          [["Amount", amt(inv.total, currency)]],
          new Set(),
        );
        if (cash.instructions?.trim()) {
          doc.setFontSize(9);
          doc.text(
            cash.instructions.trim(),
            sellerX + cardPad + labelW,
            cashTop + cardPad + 20,
          );
        }
        y = cashTop + cashH;
      }

      record(layout, {
        id: "paymentSection",
        x: sellerX,
        y: payTop,
        w: PDF_CONTENT_WIDTH,
        h: y - payTop,
      });
    }
  }

  // ── J. Footer every page ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  const footerY = PDF_PAGE_HEIGHT - 10;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(PDF_LEFT, footerY - 4, PDF_PAGE_WIDTH - PDF_RIGHT, footerY - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_777);
    doc.text("Created with VegaPal", PDF_LEFT, footerY);
    doc.text("vega-pal.com", PDF_LEFT, footerY + 3);
    doc.text(`Page ${i} of ${pageCount}`, documentRightX, footerY + 1.5, { align: "right" });
  }

  verifyPdfLayout(layout);

  return { doc, layout };
}

export async function generateInvoicePDF(inv: Invoice) {
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
    description: "",
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
    sellerBusiness: partial.sellerBusiness ?? "VegaPal",
    sellerEmail: "billing@vegapal.com",
    sellerAddress: partial.sellerAddress,
  };
  return { ...base, ...partial, number: partial.number, items: partial.items ?? base.items };
}
