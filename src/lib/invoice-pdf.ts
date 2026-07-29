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
import { clientIdentityLines } from "@/lib/invoice/document-identity";
import {
  compactStatusLabel,
  documentTypeHeading,
  dueDateFieldLabel,
  finalTotalLabel,
} from "@/lib/invoice/document-labels";
import { documentTotalsView } from "@/lib/invoice/document-totals-display";

const MARGIN = 44;
const FOOTER_H = 36;
const ROW_GAP = 10;
const SECTION_GAP = 22;
const BLOCK_GAP = 28;

const BLACK: [number, number, number] = [15, 15, 17];
const MUTED: [number, number, number] = [95, 98, 104];
const BORDER: [number, number, number] = [218, 220, 224];
const HEAD_FILL: [number, number, number] = [248, 249, 250];
const BADGE_FILL: [number, number, number] = [250, 250, 251];

function formatPdfDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function sellerCompanyName(inv: Invoice): string {
  const company = (inv.sellerBusiness ?? "").trim();
  const person = (inv.sellerName ?? "").trim();
  return company || person;
}

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
      const lineY = H - FOOTER_H;
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, lineY, W - MARGIN, lineY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text("Created with VegaPal", MARGIN, lineY + 12);
      doc.text("vega-pal.com", MARGIN, lineY + 21);

      if (total > 1) {
        doc.text(`Page ${i} of ${total}`, W - MARGIN, lineY + 16, { align: "right" });
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

  const drawKvRow = (label: string, value: string, x: number, yy: number, valueBold = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont("helvetica", valueBold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(value, x, yy + 13);
    return yy + 13 + ROW_GAP + 6;
  };

  const drawStatusBadge = (text: string, rightX: number, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const padX = 8;
    const tw = doc.getTextWidth(text);
    const bw = tw + padX * 2;
    const bh = 14;
    const bx = rightX - bw;
    const by = yy - 9;
    doc.setDrawColor(...BORDER);
    doc.setFillColor(...BADGE_FILL);
    doc.roundedRect(bx, by, bw, bh, 3, 3, "FD");
    doc.setTextColor(...BLACK);
    doc.text(text, bx + padX, yy);
    return yy + bh + 8;
  };

  const drawRightField = (label: string, value: string, rightX: number, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, rightX, yy, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(value, rightX, yy + 13, { align: "right" });
    return yy + 13 + ROW_GAP + 4;
  };

  // ── Header ───────────────────────────────────────────────────────────────
  const headerTop = y;
  const rightX = W - MARGIN;
  const SELLER_MAX_W = W * 0.48;
  const companyName = sellerCompanyName(inv);
  let sellerBottom = headerTop;

  if (d.showSellerInfo) {
    let textX = MARGIN;
    const showLogo = !companyName && !!inv.sellerLogoUrl;
    let sy = headerTop;

    if (showLogo && inv.sellerLogoUrl) {
      try {
        doc.addImage(inv.sellerLogoUrl, "PNG", MARGIN, sy, 44, 44);
        textX = MARGIN + 52;
        sy += 8;
      } catch {
        textX = MARGIN;
      }
    }

    const email = (inv.sellerEmail ?? "").trim();
    const person = (inv.sellerName ?? "").trim();
    const business = (inv.sellerBusiness ?? "").trim();
    const displayName = companyName || person;

    if (displayName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.setTextColor(...BLACK);
      const nameLines = doc.splitTextToSize(displayName, SELLER_MAX_W);
      doc.text(nameLines, textX, sy + 28);
      sy += 28 + nameLines.length * 34;
    }

    if (business && person && person.toLowerCase() !== business.toLowerCase()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(person, textX, sy);
      sy += 16;
    }

    if (email && email.toLowerCase() !== displayName.toLowerCase()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(email, textX, sy);
      sy += 16;
    }

    const address = (inv.sellerAddress ?? "").trim();
    if (address) {
      const addrLines = doc.splitTextToSize(address, SELLER_MAX_W);
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(addrLines, textX, sy);
      sy += addrLines.length * 14;
    }

    sellerBottom = sy;
  }

  let metaY = headerTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(typeHeading, rightX, metaY + 8, { align: "right" });
  metaY += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(inv.number, rightX, metaY, { align: "right" });
  metaY += 20;

  if (d.showStatus) {
    const status = compactStatusLabel({
      documentType: inv.documentType,
      documentStatus: inv.documentStatus,
      paymentStatus: inv.paymentStatus,
    });
    if (status) {
      metaY = drawStatusBadge(status, rightX, metaY);
    }
  }

  metaY = drawRightField("Issue date", formatPdfDate(inv.issueDate), rightX, metaY);

  if (d.showDueDate && inv.dueDate) {
    metaY = drawRightField(dueDateFieldLabel(inv.documentType), formatPdfDate(inv.dueDate), rightX, metaY);
  }

  y = Math.max(sellerBottom, metaY) + SECTION_GAP;
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += SECTION_GAP;

  // ── Reference metadata (no heading, no issue date repeat) ────────────────
  const metaFields: [string, string][] = [];
  if (showReferenceField(d, "showPoNumber", inv.poNumber)) {
    metaFields.push(["PO number", inv.poNumber!]);
  }
  if (showReferenceField(d, "showReferenceNumber", inv.referenceNumber)) {
    metaFields.push(["Reference", inv.referenceNumber!]);
  }
  if (showReferenceField(d, "showProjectCode", inv.projectCode)) {
    metaFields.push(["Project", inv.projectCode!]);
  }

  if (metaFields.length > 0) {
    const colW = (W - MARGIN * 2 - 16 * (metaFields.length - 1)) / metaFields.length;
    let mx = MARGIN;
    let metaBottom = y;
    for (const [label, value] of metaFields) {
      metaBottom = Math.max(metaBottom, drawKvRow(label, value, mx, y));
      mx += colW + 16;
    }
    y = metaBottom + SECTION_GAP;
  }

  // ── Bill to ──────────────────────────────────────────────────────────────
  if (d.showClientInfo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("BILL TO", MARGIN, y);
    y += 14;

    const clientLines = clientIdentityLines(inv);
    for (let i = 0; i < clientLines.length; i++) {
      const line = clientLines[i];
      if (i === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...BLACK);
        doc.text(line.text, MARGIN, y);
        y += 20;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        doc.text(line.text, MARGIN, y);
        y += 16;
      }
    }
    y += BLOCK_GAP;
  }

  // ── Document title ─────────────────────────────────────────────────────
  if (inv.title?.trim()) {
    ensureSpace(48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...BLACK);
    const titleLines = doc.splitTextToSize(inv.title.trim(), W - MARGIN * 2);
    doc.text(titleLines, MARGIN, y);
    y += titleLines.length * 26 + BLOCK_GAP;
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
      fontSize: 10,
      cellPadding: { top: 10, right: 8, bottom: 10, left: 8 },
      minCellHeight: 28,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.35,
      font: "helvetica",
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: BLACK,
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
      cellPadding: { top: 12, right: 8, bottom: 12, left: 8 },
    },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left" },
      1: { halign: "right", cellWidth: 44 },
      2: { halign: "right", cellWidth: 82 },
      3: { halign: "right", cellWidth: 82 },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H + 12 },
  });

  y = ((doc as DocWithTable).lastAutoTable?.finalY ?? y) + BLOCK_GAP;

  // ── Totals ───────────────────────────────────────────────────────────────
  ensureSpace(120);
  const totalsX = W - MARGIN - 220;
  const totalsXR = W - MARGIN;

  const totalRow = (label: string, value: string, opts?: { grand?: boolean }) => {
    const grand = opts?.grand;
    const labelText = grand || label === "Subtotal" ? label.toUpperCase() : label;
    if (grand) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      doc.text(labelText, totalsX, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...BLACK);
      doc.text(value, totalsXR, y + 6, { align: "right" });
      y += 38;
      return;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(labelText, totalsX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(value, totalsXR, y, { align: "right" });
    y += 22;
  };

  totalRow("Subtotal", amt(totals.subtotal, currency));
  if (totals.discountLabel && totals.discountAmount > 0) {
    totalRow(totals.discountLabel, `(${amt(totals.discountAmount, currency)})`);
  }
  if (totals.taxLabel && totals.taxAmount > 0) {
    totalRow(totals.taxLabel, amt(totals.taxAmount, currency));
  }

  y += 6;
  doc.setDrawColor(...BORDER);
  doc.line(totalsX, y, totalsXR, y);
  y += 22;

  const finalLabel = finalTotalLabel(inv.documentType, inv.paymentStatus);
  totalRow(finalLabel, amt(inv.total, currency), { grand: true });
  y += BLOCK_GAP;

  const drawTermsBullets = (raw: string, startY: number) => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[-*•]\s*/, ""));
    let cy = startY;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(`• ${line}`, W - MARGIN * 2 - 8);
      doc.text(wrapped, MARGIN + 4, cy);
      cy += wrapped.length * 16 + 6;
    }
    return cy;
  };

  // ── Notes & terms ────────────────────────────────────────────────────────
  if (d.showNotes && inv.description?.trim()) {
    ensureSpace(48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BLACK);
    doc.text("Notes", MARGIN, y);
    y += 18;
    y = drawBodyText(inv.description.trim(), MARGIN, y, W - MARGIN * 2, 10) + BLOCK_GAP;
  }

  if (d.showTerms && inv.termsAndConditions?.trim()) {
    ensureSpace(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...BLACK);
    doc.text("Terms & conditions", MARGIN, y);
    y += 24;
    y = drawTermsBullets(inv.termsAndConditions.trim(), y) + BLOCK_GAP + 12;
  }

  const PAY_SECTION_GAP = 40;
  // ── How to pay ───────────────────────────────────────────────────────────
  if (d.showPaymentInstructions) {
    const showCrypto = isCryptoPaymentVisible(inv);
    const showBank = isBankPaymentVisible(inv);
    const showCash = isCashPaymentVisible(inv);
    const crypto = inv.paymentMethods.crypto;
    const bank = inv.paymentMethods.bank;
    const cash = inv.paymentMethods.cash;

    if (showCrypto || showBank || showCash) {
      const contentW = W - MARGIN * 2;
      const cardGap = 14;
      const cardPad = 16;
      const qrSize = 72;

      const cardField = (label: string, value: string, x: number, cy: number, maxW: number, bold = false) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        doc.text(label.toUpperCase(), x, cy);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(...BLACK);
        const lines = doc.splitTextToSize(value, maxW);
        doc.text(lines, x, cy + 12);
        return cy + 12 + lines.length * 12 + 10;
      };

      const measureCardFields = (rows: [string, string][], innerW: number) => {
        let h = cardPad + 22;
        for (const [label, value] of rows) {
          if (!value?.trim()) continue;
          doc.setFontSize(10);
          h += 12 + doc.splitTextToSize(value.trim(), innerW).length * 12 + 10;
        }
        return h + cardPad;
      };

      const bankRows: [string, string][] = showBank
        ? [
            ["Bank", bank.bankName ?? ""],
            ["IBAN", bank.iban ?? ""],
            ["SWIFT", bank.swift ?? ""],
            ["Account", bank.accountNumber ?? bank.accountName ?? ""],
            ["Reference", inv.number],
          ]
        : [];

      const cryptoDetailRows: [string, string][] = showCrypto
        ? [
            ["Asset", crypto.currency],
            ["Network", crypto.network],
            ["Reference", inv.number],
          ]
        : [];

      const halfW = Math.floor((contentW - cardGap) / 2);
      const bankCardW = showBank && showCrypto ? halfW : showBank ? contentW : 0;
      const cryptoCardW = showBank && showCrypto ? contentW - halfW - cardGap : showCrypto ? contentW : 0;

      const bankInnerW = Math.max(0, bankCardW - cardPad * 2);

      const measureCryptoCardHeight = (cardW: number) => {
        if (!showCrypto) return 0;
        const innerW = cardW - cardPad * 2;
        const textBesideQrW = innerW - qrSize - 12;
        let h = cardPad + 22;
        for (const [, value] of cryptoDetailRows) {
          if (!value?.trim()) continue;
          doc.setFontSize(10);
          h += 12 + doc.splitTextToSize(value.trim(), Math.max(textBesideQrW, 80)).length * 12 + 10;
        }
        const wallet = crypto.walletAddress?.trim() ?? "";
        const walletTop = cardPad + qrSize + 16;
        h = Math.max(h, walletTop);
        if (wallet) {
          h += 12 + doc.splitTextToSize(wallet, innerW).length * 12 + 10;
        }
        return h + cardPad;
      };

      let bankH = showBank ? measureCardFields(bankRows, bankInnerW) : 0;
      let cryptoH = measureCryptoCardHeight(cryptoCardW);

      if (showBank && bank.instructions?.trim()) {
        bankH += 16 + measureWrapped(bank.instructions, bankInnerW, 10);
      }

      const rowH = Math.max(showBank ? bankH : 0, showCrypto ? cryptoH : 0);
      const cashExtra =
        (cash.instructions?.trim() ? 40 + measureWrapped(cash.instructions, contentW - cardPad * 2, 10) : 0) +
        (cash.location?.trim() ? 40 + measureWrapped(cash.location, contentW - cardPad * 2, 10) : 0);

      ensureSpace(
        PAY_SECTION_GAP +
          BLOCK_GAP +
          20 +
          (rowH > 0 ? rowH + SECTION_GAP : 0) +
          (showCash ? Math.max(100, cashExtra + cardPad * 2) : 0),
      );

      y += PAY_SECTION_GAP;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text("HOW TO PAY", MARGIN, y);
      y += 20;

      const cardsY = y;

      const drawOutlinedCard = (x: number, w: number, h: number) => {
        doc.setDrawColor(...BORDER);
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.6);
        doc.roundedRect(x, cardsY, w, h, 6, 6, "FD");
      };

      if (showBank && bankCardW > 0) {
        drawOutlinedCard(MARGIN, bankCardW, rowH);
        let by = cardsY + cardPad;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text("Bank transfer", MARGIN + cardPad, by);
        by += 18;
        for (const [label, value] of bankRows) {
          if (!value?.trim()) continue;
          by = cardField(label, value.trim(), MARGIN + cardPad, by, bankInnerW, label === "Reference");
        }
        if (bank.instructions?.trim()) {
          by += 4;
          by = cardField("Additional instructions", bank.instructions.trim(), MARGIN + cardPad, by, bankInnerW);
        }
      }

      if (showCrypto && cryptoCardW > 0) {
        const cx = showBank ? MARGIN + bankCardW + cardGap : MARGIN;
        drawOutlinedCard(cx, cryptoCardW, rowH);
        const innerLeft = cx + cardPad;
        const innerW = cryptoCardW - cardPad * 2;
        const qrX = cx + cryptoCardW - cardPad - qrSize;
        const qrY = cardsY + cardPad;

        let cy = cardsY + cardPad;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text("Cryptocurrency", innerLeft, cy);

        if (crypto.walletAddress?.trim()) {
          try {
            const qr = await qrCodeToDataUrl(crypto.walletAddress, { margin: 0, width: 200 });
            doc.addImage(qr, "PNG", qrX, qrY, qrSize, qrSize);
          } catch {
            /* ignore */
          }
        }

        cy += 20;
        const fieldW = Math.max(innerW - qrSize - 14, innerW * 0.55);
        for (const [label, value] of cryptoDetailRows) {
          if (!value?.trim()) continue;
          cy = cardField(label, value.trim(), innerLeft, cy, fieldW, label === "Reference");
        }

        if (crypto.walletAddress?.trim()) {
          const walletY = Math.max(cy + 4, qrY + qrSize + 14);
          cardField("Wallet", crypto.walletAddress.trim(), innerLeft, walletY, innerW, false);
        }
      }

      if ((showBank || showCrypto) && rowH > 0) {
        y = cardsY + rowH + SECTION_GAP;
      } else if (!showCash) {
        y = cardsY;
      }

      if (showCash) {
        const cashH = Math.max(100, cashExtra + cardPad * 2);
        ensureSpace(cashH + 20);
        const cashTop = y;
        doc.setDrawColor(...BORDER);
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.6);
        doc.roundedRect(MARGIN, cashTop, contentW, cashH, 6, 6, "FD");
        let cy = cashTop + cardPad;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text("Cash payment", MARGIN + cardPad, cy);
        cy += 18;
        cy = cardField("Amount due", amt(inv.total, currency), MARGIN + cardPad, cy, contentW - cardPad * 2);
        if (cash.instructions?.trim()) {
          cy = cardField("Instructions", cash.instructions.trim(), MARGIN + cardPad, cy, contentW - cardPad * 2);
        }
        if (cash.location?.trim()) {
          cardField("Location", cash.location.trim(), MARGIN + cardPad, cy, contentW - cardPad * 2);
        }
        y = cashTop + cashH + SECTION_GAP;
      }
    }
  }

  drawPageFooters();
  doc.save(`${inv.number}.pdf`);
}
