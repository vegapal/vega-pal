import type { DocumentType } from "@/lib/vegapal-store";

export type InvoiceDocumentIdentityLine = Readonly<{
  text: string;
  muted?: boolean;
}>;

export type InvoiceDocumentItemRow = Readonly<{
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}>;

export type InvoiceDocumentTotalsRow = Readonly<{
  label: string;
  value: string;
}>;

export type InvoiceDocumentBankRow = Readonly<{
  label: string;
  value: string;
  highlight?: boolean;
}>;

export type InvoiceDocumentCrypto = Readonly<{
  asset: string;
  network: string;
  amountDue: string;
  paymentReference: string;
  walletAddress: string;
  qrDataUrl: string;
  caption: string;
}>;

export type InvoiceDocumentBank = Readonly<{
  title: string;
  rows: readonly InvoiceDocumentBankRow[];
  instructions?: string;
}>;

export type InvoiceDocumentCash = Readonly<{
  amountDue: string;
  instructions?: string;
  location?: string;
}>;

export type InvoiceDocumentPayment = Readonly<{
  show: boolean;
  bank?: InvoiceDocumentBank;
  crypto?: InvoiceDocumentCrypto;
  cash?: InvoiceDocumentCash;
  /** Center payment title when crypto is the only method */
  centerTitle: boolean;
}>;

export type InvoiceDocumentMetaField = Readonly<{
  label: string;
  value: string;
}>;

/** Normalized read-only model for preview and PDF (no payment/status badges). */
export type InvoiceDocumentModel = Readonly<{
  documentType: DocumentType;
  documentTitle: string;
  documentNumber: string;
  issueDateLabel: string;
  issueDate: string;
  dueDateLabel?: string;
  dueDate?: string;
  sellerLines: readonly InvoiceDocumentIdentityLine[];
  showClient: boolean;
  clientLines: readonly InvoiceDocumentIdentityLine[];
  metaFields: readonly InvoiceDocumentMetaField[];
  subject?: string;
  currency: string;
  items: readonly InvoiceDocumentItemRow[];
  totals: readonly InvoiceDocumentTotalsRow[];
  finalTotalLabel: string;
  finalTotalAmount: string;
  showNotes: boolean;
  noteBullets: readonly string[];
  payment: InvoiceDocumentPayment;
  locale: string;
  dir: "ltr" | "rtl";
}>;
