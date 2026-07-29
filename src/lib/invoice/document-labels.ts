import type { DocumentStatus, DocumentType, PaymentStatus } from "@/lib/vegapal-store";

export function documentTypeHeading(type: DocumentType): string {
  if (type === "quotation") return "QUOTATION";
  if (type === "proforma_invoice") return "PROFORMA INVOICE";
  return "TAX INVOICE";
}

export function dueDateFieldLabel(type: DocumentType): string {
  if (type === "quotation") return "Valid until";
  return "Due date";
}

export function documentStatusLabel(status: DocumentStatus): string {
  const map: Record<DocumentStatus, string> = {
    draft: "Draft",
    issued: "Issued",
    accepted: "Accepted",
    rejected: "Rejected",
    cancelled: "Cancelled",
    expired: "Expired",
  };
  return map[status] ?? "Issued";
}

export function paymentStatusLabel(
  paymentStatus: PaymentStatus,
  documentType: DocumentType,
): string | null {
  if (documentType === "quotation") return null;
  const map: Record<PaymentStatus, string> = {
    not_applicable: "",
    unpaid: "Awaiting payment",
    partially_paid: "Partially paid",
    paid: "Paid",
    overdue: "Overdue",
    refunded: "Refunded",
  };
  const label = map[paymentStatus];
  return label || null;
}

export function finalTotalLabel(
  documentType: DocumentType,
  paymentStatus: PaymentStatus,
): string {
  if (documentType === "quotation" || documentType === "proforma_invoice") return "Total";
  if (paymentStatus === "partially_paid") return "Balance due";
  if (paymentStatus === "paid") return "Total";
  return "Total due";
}

export function compactStatusLabel(input: {
  documentType: DocumentType;
  documentStatus: DocumentStatus;
  paymentStatus: PaymentStatus;
}): string | null {
  if (input.documentType === "quotation") {
    return documentStatusLabel(input.documentStatus);
  }
  const pay = paymentStatusLabel(input.paymentStatus, input.documentType);
  if (pay) return pay;
  if (input.documentStatus === "draft") return "Draft";
  if (input.documentStatus === "issued") return "Issued";
  return documentStatusLabel(input.documentStatus);
}
