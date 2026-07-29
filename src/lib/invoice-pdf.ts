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
import { clientIdentityLines, sellerIdentityLines } from "@/lib/invoice/document-identity";
import {
  compactStatusLabel,
  documentTypeHeading,
  dueDateFieldLabel,
  finalTotalLabel,
} from "@/lib/invoice/document-labels";
import { documentTotalsView } from "@/lib/invoice/document-totals-display";

const MARGIN = 40;
const FOOTER_H = 32;
const ROW_GAP = 8;
const SECTION_GAP = 16;

const BLACK: [number, number, number] = [20, 20, 22];
const MUTED: [number, number, number] = [100, 105, 112];
const BORDER: [number, number, number] = [220, 223, 228];
const HEAD_FILL: [number, number, number] = [245, 246, 248];

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function pageHeight(doc: jsPDF) {
  return doc.internal.pageSize.getHeight();
}

function pageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth();
}

function contentBottom(doc: jsPDF) {
  return pageHeight(doc) - FOOTER_H - 8;
}

function amt(n: number, currency: string) {
  return formatInvoiceAmountWithCurrency(n, currency);
}

export async function generateInvoicePDF(inv: Invoice) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = pageWidth(doc);
  const H = pageHeight(doc);
  const currency = inv.invoiceCurrency;
  const d = inv.displayOptions;
  const totals = documentTotalsView(inv);
  const typeHeading = documentTypeHeading(inv.documentType);

  let y = MARGIN;

  const drawPageFooters = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      const footerY = H - 18;
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, H - FOOTER_H, W - MARGIN, H - FOOTER_H);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text("Created with VegaPal · vega-pal.com", MARGIN, footerY);

      if (total > 1) {
        doc.text(`Page ${i} of ${total}`, W - MARGIN, footerY, { align: "right" });
      }
    }
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > contentBottom(doc)) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const drawBodyText = (text: string, x: number, yy: number, maxW: number, size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(text, maxW);
    doc.text(lines, x, yy);
    return yy + lines.length * (size + 3);
  };

  const measureWrapped = (text: string, maxW: number, size = 9) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(text, maxW).length * (size + 3);
  };

  const drawKvRow = (label: string, value: string, x: number, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(value, x, yy + 12);
    return yy + 12 + ROW_GAP + 4;
  };

  // ── Header ───────────────────────────────────────────────────────────────
  const headerTop = y;
  let leftX = MARGIN;
  const rightX = W - MARGIN;

  if (d.showSellerInfo) {
    if (inv.sellerLogoUrl) {
      try {
        doc.addImage(inv.sellerLogoUrl, "PNG", MARGIN, y, 40, 40);
        leftX = MARGIN + 48;
      } catch {
        leftX = MARGIN;
      }
    }

    const sellerLines = sellerIdentityLines(inv);
    let sy = y + (inv.sellerLogoUrl ? 4 : 0);
    for (let i = 0; i < sellerLines.length; i++) {
      const line = sellerLines[i];
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(i === 0 ? 12 : 9);
      doc.setTextColor(...(line.muted ? MUTED : BLACK));
      doc.text(line.text, leftX, sy);
      sy += i === 0 ? 16 : 13;
    }
    y = Math.max(y + 44, sy);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(typeHeading, rightX, headerTop + 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(inv.number, rightX, headerTop + 28, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Issue date: ${inv.issueDate}`, rightX, headerTop + 42, { align: "right" });

  let metaY = headerTop + 56;
  if (d.showDueDate && inv.dueDate) {
    doc.text(`${dueDateFieldLabel(inv.documentType)}: ${inv.dueDate}`, rightX, metaY, {
      align: "right",
    });
    metaY += 14;
  }

  if (d.showStatus) {
    const status = compactStatusLabel({
      documentType: inv.documentType,
      documentStatus: inv.documentStatus,
      paymentStatus: inv.paymentStatus,
    });
    if (status) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      doc.text(status, rightX, metaY, { align: "right" });
    }
  }

  y = Math.max(y, metaY) + SECTION_GAP;
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += SECTION_GAP;

  // ── Bill to / Document details ───────────────────────────────────────────
  const colW = (W - MARGIN * 2 - 24) / 2;
  const leftCol = MARGIN;
  const rightCol = MARGIN + colW + 24;
  const infoStartY = y;
  let leftBottom = infoStartY;
  let rightBottom = infoStartY;

  const detailRows: [string, string][] = [];
  detailRows.push(["Issue date", inv.issueDate]);
  if (d.showDueDate && inv.dueDate) {
    detailRows.push([dueDateFieldLabel(inv.documentType), inv.dueDate]);
  }
  if (showReferenceField(d, "showPoNumber", inv.poNumber)) {
    detailRows.push(["PO number", inv.poNumber!]);
  }
  if (showReferenceField(d, "showReferenceNumber", inv.referenceNumber)) {
    detailRows.push(["Reference number", inv.referenceNumber!]);
  }
  if (showReferenceField(d, "showProjectCode", inv.projectCode)) {
    detailRows.push(["Project code", inv.projectCode!]);
  }

  if (d.showClientInfo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("BILL TO", leftCol, infoStartY);
    const clientLines = clientIdentityLines(inv);
    let cy = infoStartY + 12;
    for (let i = 0; i < clientLines.length; i++) {
      const line = clientLines[i];
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(i === 0 ? 11 : 9);
      doc.setTextColor(...(line.muted ? MUTED : BLACK));
      doc.text(line.text, leftCol, cy);
      cy += i === 0 ? 16 : 13;
    }
    leftBottom = cy;
  }

  if (detailRows.length > 0) {
    const detailsX = d.showClientInfo ? rightCol : leftCol;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("DOCUMENT DETAILS", detailsX, infoStartY);
    let dy = infoStartY + 12;
    for (const [label, value] of detailRows) {
      dy = drawKvRow(label, value, detailsX, dy);
    }
    rightBottom = dy;
  }

  y = Math.max(leftBottom, rightBottom) + SECTION_GAP;

  // ── Subject ──────────────────────────────────────────────────────────────
  if (inv.title?.trim()) {
    ensureSpace(36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BLACK);
    const titleLines = doc.splitTextToSize(inv.title.trim(), W - MARGIN * 2);
    doc.text(titleLines, MARGIN, y);
    y += titleLines.length * 16 + 8;
  }

  // ── Line items ───────────────────────────────────────────────────────────
  const unitHead = `Unit price (${currency})`;
  const totalHead = `Line total (${currency})`;

  autoTable(doc, {
    startY: y,
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
      cellPadding: 6,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.4,
      font: "helvetica",
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: BLACK,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 40 },
      2: { halign: "right", cellWidth: 82 },
      3: { halign: "right", cellWidth: 82 },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H + 12 },
  });

  y = ((doc as DocWithTable).lastAutoTable?.finalY ?? y) + 14;

  // ── Totals ───────────────────────────────────────────────────────────────
  ensureSpace(100);
  const totalsX = W - MARGIN - 200;
  const totalsXR = W - MARGIN;

  const totalRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    doc.setTextColor(...(bold ? BLACK : MUTED));
    doc.text(label, totalsX, y);
    doc.setTextColor(...BLACK);
    doc.text(value, totalsXR, y, { align: "right" });
    y += bold ? 20 : 15;
  };

  totalRow("Subtotal", amt(totals.subtotal, currency));
  if (totals.discountLabel && totals.discountAmount > 0) {
    totalRow(totals.discountLabel, `(${amt(totals.discountAmount, currency)})`);
  }
  if (totals.taxLabel && totals.taxAmount > 0) {
    totalRow(totals.taxLabel, amt(totals.taxAmount, currency));
  }

  y += 4;
  doc.setDrawColor(...BORDER);
  doc.line(totalsX, y, totalsXR, y);
  y += 16;

  const finalLabel = finalTotalLabel(inv.documentType, inv.paymentStatus);
  totalRow(finalLabel, amt(inv.total, currency), true);
  y += 8;

  // ── Notes & terms ────────────────────────────────────────────────────────
  if (d.showNotes && inv.description?.trim()) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text("Notes", MARGIN, y);
    y += 14;
    y = drawBodyText(inv.description.trim(), MARGIN, y, W - MARGIN * 2, 9) + 12;
  }

  if (d.showTerms && inv.termsAndConditions?.trim()) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text("Terms & conditions", MARGIN, y);
    y += 14;
    y = drawBodyText(inv.termsAndConditions.trim(), MARGIN, y, W - MARGIN * 2, 9) + 12;
  }

  // ── Payment details ──────────────────────────────────────────────────────
  if (d.showPaymentInstructions) {
    const showCrypto = isCryptoPaymentVisible(inv);
    const showBank = isBankPaymentVisible(inv);
    const showCash = isCashPaymentVisible(inv);
    const crypto = inv.paymentMethods.crypto;
    const bank = inv.paymentMethods.bank;
    const cash = inv.paymentMethods.cash;

    if (showCrypto || showBank || showCash) {
      const contentW = W - MARGIN * 2;
      const measureBlock = (): number => {
        let h = 14 + SECTION_GAP;
        const blockTitle = 12 + 8;
        const row = 22;

        if (showCrypto) {
          h += blockTitle;
          h += row * 3;
          if (crypto.walletAddress) h += measureWrapped(crypto.walletAddress, contentW - 100, 9);
          h += SECTION_GAP;
        }
        if (showBank) {
          h += blockTitle;
          const bankRows = [
            bank.bankName,
            bank.accountName,
            bank.accountNumber,
            bank.iban,
            bank.swift,
            bank.currency,
          ].filter((v) => v?.trim()).length;
          h += row * (bankRows + 2);
          if (bank.instructions?.trim()) {
            h += 14 + measureWrapped(bank.instructions, contentW, 9);
          }
          h += SECTION_GAP;
        }
        if (showCash) {
          h += blockTitle + row;
          if (cash.instructions?.trim()) {
            h += 14 + measureWrapped(cash.instructions, contentW, 9);
          }
          if (cash.location?.trim()) {
            h += 14 + measureWrapped(cash.location, contentW, 9);
          }
        }
        return h;
      };

      const blockH = measureBlock();
      ensureSpace(blockH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      doc.text("Payment details", MARGIN, y);
      y += 18;

      const drawMethodTitle = (title: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        doc.text(title, MARGIN, y);
        y += 14;
      };

      const drawSimpleRows = (rows: [string, string][]) => {
        for (const [label, value] of rows) {
          if (!value?.trim()) continue;
          y = drawKvRow(label, value.trim(), MARGIN, y);
        }
      };

      if (showCrypto) {
        drawMethodTitle("Crypto payment details");
        drawSimpleRows([
          ["Asset", crypto.currency],
          ["Network", crypto.network],
          ["Amount due", amt(inv.total, currency)],
          ["Payment reference", inv.number],
        ]);
        if (crypto.walletAddress?.trim()) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...MUTED);
          doc.text("Wallet address", MARGIN, y);
          y += 12;
          y =
            drawBodyText(crypto.walletAddress.trim(), MARGIN, y, contentW - 100, 9) + 6;
          try {
            const qr = await qrCodeToDataUrl(crypto.walletAddress, { margin: 0, width: 160 });
            doc.addImage(qr, "PNG", W - MARGIN - 88, y - 40, 80, 80);
          } catch {
            /* ignore */
          }
        }
        y += SECTION_GAP;
      }

      if (showBank) {
        drawMethodTitle("Bank transfer details");
        drawSimpleRows([
          ["Bank name", bank.bankName ?? ""],
          ["Account name", bank.accountName ?? ""],
          ["Account number", bank.accountNumber ?? ""],
          ["IBAN", bank.iban ?? ""],
          ["SWIFT/BIC", bank.swift ?? ""],
          ["Bank currency", bank.currency ?? ""],
          ["Payment reference", inv.number],
        ]);
        if (bank.instructions?.trim()) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text("Additional instructions", MARGIN, y);
          y += 12;
          y = drawBodyText(bank.instructions.trim(), MARGIN, y, contentW, 9) + 8;
        }
        y += SECTION_GAP;
      }

      if (showCash) {
        drawMethodTitle("Cash payment");
        drawSimpleRows([["Amount due", amt(inv.total, currency)]]);
        if (cash.instructions?.trim()) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text("Instructions", MARGIN, y);
          y += 12;
          y = drawBodyText(cash.instructions.trim(), MARGIN, y, contentW, 9) + 8;
        }
        if (cash.location?.trim()) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text("Payment location", MARGIN, y);
          y += 12;
          y = drawBodyText(cash.location.trim(), MARGIN, y, contentW, 9) + 8;
        }
      }
    }
  }

  drawPageFooters();
  doc.save(`${inv.number}.pdf`);
}
