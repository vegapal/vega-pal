import type { Invoice } from "@/lib/vegapal-store";
import type { InvoiceDocumentModel } from "@/components/invoice-document/invoice-document.types";
import {
  clientIdentityFromParts,
  sellerIdentityFromParts,
} from "@/lib/invoice/document-identity";
import {
  documentTypeHeading,
  dueDateFieldLabel,
  finalTotalLabel,
} from "@/lib/invoice/document-labels";
import { documentTotalsView } from "@/lib/invoice/document-totals-display";
import {
  formatInvoiceAmount,
  formatInvoiceAmountWithCurrency,
  isBankPaymentVisible,
  isCashPaymentVisible,
  isCryptoPaymentVisible,
  showReferenceField,
} from "@/lib/invoice-display";
import { normalizeInvoiceNoteBullets } from "@/lib/invoice/invoice-document-notes";

function formatDocDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function bankRows(inv: Invoice): { label: string; value: string; highlight?: boolean }[] {
  const bank = inv.paymentMethods.bank;
  const rows: { label: string; value: string; highlight?: boolean }[] = [];
  const push = (label: string, value?: string | null, highlight = false) => {
    const v = value?.trim();
    if (!v) return;
    rows.push({ label, value: v, highlight });
  };
  push("Bank name", bank.bankName);
  push("Account name", bank.accountName);
  push("Account number", bank.accountNumber);
  push("IBAN", bank.iban);
  push("SWIFT/BIC", bank.swift);
  push("Bank currency", bank.currency);
  push("Payment reference", inv.number, true);
  return rows;
}

function detectDocumentDirection(inv: Invoice): "ltr" | "rtl" {
  const sample = `${inv.clientName} ${inv.clientCompany} ${inv.title} ${inv.description}`;
  return /[\u0600-\u06FF]/.test(sample) ? "rtl" : "ltr";
}

export function mapInvoiceToDocumentModel(
  inv: Invoice,
  options?: { qrDataUrl?: string | null; locale?: string; dir?: "ltr" | "rtl" },
): InvoiceDocumentModel {
  const currency = inv.invoiceCurrency;
  const d = inv.displayOptions;
  const totals = documentTotalsView(inv);
  const sellerLines = sellerIdentityFromParts({
    business: inv.sellerBusiness,
    name: inv.sellerName,
    email: inv.sellerEmail,
    address: inv.sellerAddress,
  }).slice(0, 6);

  const clientLines = clientIdentityFromParts({
    name: inv.clientName,
    company: inv.clientCompany,
    email: inv.clientEmail,
  });

  const metaFields: { label: string; value: string }[] = [];
  if (showReferenceField(d, "showPoNumber", inv.poNumber)) {
    metaFields.push({ label: "PO number", value: inv.poNumber!.trim() });
  }
  if (showReferenceField(d, "showReferenceNumber", inv.referenceNumber)) {
    metaFields.push({ label: "Reference", value: inv.referenceNumber!.trim() });
  }
  if (showReferenceField(d, "showProjectCode", inv.projectCode)) {
    metaFields.push({ label: "Project", value: inv.projectCode!.trim() });
  }

  const noteBullets = normalizeInvoiceNoteBullets({
    description: inv.description,
    termsAndConditions: inv.termsAndConditions,
    includeDescription: d.showNotes,
    includeTerms: d.showTerms,
  });

  const showBank = isBankPaymentVisible(inv) && d.showPaymentInstructions;
  const showCrypto = isCryptoPaymentVisible(inv) && d.showPaymentInstructions;
  const showCash = isCashPaymentVisible(inv) && d.showPaymentInstructions;

  const crypto = inv.paymentMethods.crypto;
  const bank = inv.paymentMethods.bank;
  const cash = inv.paymentMethods.cash;

  const paymentShow = showBank || showCrypto || showCash;

  return {
    documentType: inv.documentType,
    documentTitle: documentTypeHeading(inv.documentType),
    documentNumber: inv.number,
    issueDateLabel: "Issue date",
    issueDate: formatDocDate(inv.issueDate),
    dueDateLabel: d.showDueDate && inv.dueDate ? dueDateFieldLabel(inv.documentType) : undefined,
    dueDate: d.showDueDate && inv.dueDate ? formatDocDate(inv.dueDate) : undefined,
    sellerLines,
    showClient: d.showClientInfo,
    clientLines,
    metaFields,
    subject: inv.title?.trim() || undefined,
    currency,
    items: inv.items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: formatInvoiceAmount(item.unitPrice, currency),
      amount: formatInvoiceAmount(item.total, currency),
    })),
    totals: [
      { label: "Subtotal", value: formatInvoiceAmountWithCurrency(totals.subtotal, currency) },
      ...(totals.discountLabel && totals.discountAmount > 0
        ? [
            {
              label: totals.discountLabel,
              value: `(${formatInvoiceAmountWithCurrency(totals.discountAmount, currency)})`,
            },
          ]
        : []),
      ...(totals.taxLabel && totals.taxAmount > 0
        ? [{ label: totals.taxLabel, value: formatInvoiceAmountWithCurrency(totals.taxAmount, currency) }]
        : []),
    ],
    finalTotalLabel: finalTotalLabel(inv.documentType, inv.paymentStatus).toUpperCase(),
    finalTotalAmount: formatInvoiceAmountWithCurrency(inv.total, currency),
    showNotes: noteBullets.length > 0,
    noteBullets,
    payment: {
      show: paymentShow,
      centerTitle: showCrypto && !showBank && !showCash,
      bank: showBank
        ? {
            title: "Bank transfer",
            rows: bankRows(inv),
            instructions: bank.instructions?.trim() || undefined,
          }
        : undefined,
      crypto:
        showCrypto && crypto.walletAddress?.trim() && options?.qrDataUrl
          ? {
              asset: crypto.currency,
              network: crypto.network,
              amountDue: formatInvoiceAmountWithCurrency(inv.total, currency),
              paymentReference: inv.number,
              walletAddress: crypto.walletAddress.trim(),
              qrDataUrl: options.qrDataUrl,
              caption: `Scan to pay · ${crypto.currency} / ${crypto.network}`,
            }
          : showCrypto && crypto.walletAddress?.trim()
            ? {
                asset: crypto.currency,
                network: crypto.network,
                amountDue: formatInvoiceAmountWithCurrency(inv.total, currency),
                paymentReference: inv.number,
                walletAddress: crypto.walletAddress.trim(),
                qrDataUrl: "",
                caption: `Scan to pay · ${crypto.currency} / ${crypto.network}`,
              }
            : undefined,
      cash: showCash
        ? {
            amountDue: formatInvoiceAmountWithCurrency(inv.total, currency),
            instructions: cash.instructions?.trim() || undefined,
            location: cash.location?.trim() || undefined,
          }
        : undefined,
    },
    locale: options?.locale ?? "en",
    dir: options?.dir ?? detectDocumentDirection(inv),
  };
}
