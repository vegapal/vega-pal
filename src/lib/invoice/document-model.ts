export type LegacyInvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export type DocumentType = "quotation" | "proforma_invoice" | "tax_invoice";

export type DocumentStatus =
  | "draft"
  | "issued"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired";

export type PaymentStatus =
  | "not_applicable"
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "refunded";

export const DOCUMENT_TYPE_PREFIX: Record<DocumentType, string> = {
  quotation: "QTN",
  proforma_invoice: "PI",
  tax_invoice: "INV",
};

export function defaultPaymentStatusForType(documentType: DocumentType): PaymentStatus {
  return documentType === "quotation" ? "not_applicable" : "unpaid";
}

export function mapLegacyStatusToFields(
  legacyStatus: string,
  documentType: DocumentType = "tax_invoice",
): {
  documentStatus: DocumentStatus;
  paymentStatus: PaymentStatus;
} {
  switch (legacyStatus) {
    case "draft":
      return {
        documentStatus: "draft",
        paymentStatus: documentType === "quotation" ? "not_applicable" : "unpaid",
      };
    case "cancelled":
      return {
        documentStatus: "cancelled",
        paymentStatus: documentType === "quotation" ? "not_applicable" : "unpaid",
      };
    case "paid":
      return { documentStatus: "issued", paymentStatus: "paid" };
    case "overdue":
      return { documentStatus: "issued", paymentStatus: "overdue" };
    case "pending":
    default:
      return {
        documentStatus: "issued",
        paymentStatus: documentType === "quotation" ? "not_applicable" : "unpaid",
      };
  }
}

export function syncLegacyStatus(input: {
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  paymentStatus: PaymentStatus;
  dueDate: string;
  today?: string;
}): LegacyInvoiceStatus {
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  if (input.documentStatus === "draft") return "draft";
  if (input.documentStatus === "cancelled") return "cancelled";

  if (input.documentType !== "quotation") {
    if (input.paymentStatus === "paid") return "paid";
    if (input.paymentStatus === "overdue") return "overdue";
    if (
      input.paymentStatus === "unpaid" &&
      input.dueDate &&
      input.dueDate < today &&
      input.documentStatus === "issued"
    ) {
      return "overdue";
    }
  }

  return "pending";
}

export function applyAutoOverduePayment(input: {
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  paymentStatus: PaymentStatus;
  dueDate: string;
  today?: string;
}): PaymentStatus {
  if (input.documentType === "quotation") return "not_applicable";
  if (input.paymentStatus === "paid" || input.paymentStatus === "refunded") {
    return input.paymentStatus;
  }
  if (input.documentStatus === "draft" || input.documentStatus === "cancelled") {
    return input.paymentStatus === "not_applicable" ? "not_applicable" : "unpaid";
  }
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  if (
    (input.paymentStatus === "unpaid" || input.paymentStatus === "partially_paid") &&
    input.dueDate &&
    input.dueDate < today
  ) {
    return "overdue";
  }
  return input.paymentStatus;
}

export function documentTypeLabelKey(documentType: DocumentType): string {
  switch (documentType) {
    case "quotation":
      return "documentType.quotation";
    case "proforma_invoice":
      return "documentType.proforma";
    default:
      return "documentType.taxInvoice";
  }
}

export function canShowPaymentStatus(documentType: DocumentType): boolean {
  return documentType !== "quotation";
}

export function isValidPaymentTransition(
  documentType: DocumentType,
  documentStatus: DocumentStatus,
  next: PaymentStatus,
): boolean {
  if (documentType === "quotation") return false;
  if (documentStatus === "cancelled" || documentStatus === "draft") {
    return next === "unpaid" || next === "not_applicable";
  }
  return true;
}

export function isValidDocumentStatusTransition(
  documentType: DocumentType,
  current: DocumentStatus,
  next: DocumentStatus,
): boolean {
  if (current === "cancelled" && next !== "cancelled") return false;
  if (documentType === "quotation") {
    return ["draft", "issued", "accepted", "rejected", "cancelled", "expired"].includes(next);
  }
  return ["draft", "issued", "cancelled", "expired"].includes(next) || next === current;
}
