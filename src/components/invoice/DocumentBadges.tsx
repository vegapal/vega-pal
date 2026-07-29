import { useTranslation } from "react-i18next";
import type { DocumentStatus, DocumentType, PaymentStatus } from "@/lib/vegapal-store";
import { canShowPaymentStatus } from "@/lib/invoice/document-model";

const DOC_STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-primary/10 text-primary",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-warning/15 text-warning",
};

const PAY_STATUS_STYLES: Record<PaymentStatus, string> = {
  not_applicable: "bg-muted text-muted-foreground",
  unpaid: "bg-warning/15 text-warning",
  partially_paid: "bg-primary/10 text-primary",
  paid: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const { t } = useTranslation("invoices");
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-muted text-foreground">
      {t(`documentType.${type === "proforma_invoice" ? "proforma" : type === "quotation" ? "quotation" : "taxInvoice"}`)}
    </span>
  );
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation("invoices");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${DOC_STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {t(`documentStatus.${status}`)}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  documentType,
}: {
  status: PaymentStatus;
  documentType: DocumentType;
}) {
  const { t } = useTranslation("invoices");
  if (!canShowPaymentStatus(documentType)) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${PAY_STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {t(`paymentStatus.${status}`)}
    </span>
  );
}
