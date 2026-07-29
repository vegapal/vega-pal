import type { DocumentType } from "@/lib/vegapal-store";
import type {
  BankPaymentConfig,
  CashPaymentConfig,
  CryptoPaymentConfig,
  DisplayOptions,
  InvoiceCurrency,
  PaymentMethodType,
} from "@/lib/invoice-constants";
import { DEFAULT_DISPLAY_OPTIONS, DEFAULT_INVOICE_CURRENCY } from "@/lib/invoice-constants";
import type { InvoiceItem } from "@/lib/vegapal-store";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export type OptionalFieldKey = "poNumber" | "referenceNumber" | "projectCode" | "notes" | "terms";

export type InvoiceWizardState = {
  step: WizardStep;
  documentType: DocumentType;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  clientPhone: string;
  clientAddress: string;
  clientTaxId: string;
  showExtraClient: boolean;
  title: string;
  invoiceCurrency: InvoiceCurrency;
  issueDate: string;
  dueDate: string;
  activeOptionalFields: OptionalFieldKey[];
  poNumber: string;
  referenceNumber: string;
  projectCode: string;
  notes: string;
  terms: string;
  items: InvoiceItem[];
  discount: number;
  tax: number;
  paymentMethod: PaymentMethodType;
  crypto: CryptoPaymentConfig;
  bank: BankPaymentConfig;
  cash: CashPaymentConfig;
  alreadyPaid: boolean;
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(base: string, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createInitialWizardState(): InvoiceWizardState {
  const issueDate = todayISO();
  return {
    step: 1,
    documentType: "tax_invoice",
    clientName: "",
    clientEmail: "",
    clientCompany: "",
    clientPhone: "",
    clientAddress: "",
    clientTaxId: "",
    showExtraClient: false,
    title: "",
    invoiceCurrency: DEFAULT_INVOICE_CURRENCY,
    issueDate,
    dueDate: addDaysISO(issueDate, 14),
    activeOptionalFields: [],
    poNumber: "",
    referenceNumber: "",
    projectCode: "",
    notes: "",
    terms: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    discount: 0,
    tax: 0,
    paymentMethod: "crypto",
    crypto: { enabled: true, currency: "USDT", network: "TRON TRC20", walletAddress: "" },
    bank: { enabled: false, accountName: "", bankName: "", accountNumber: "", iban: "", swift: "" },
    cash: { enabled: false, instructions: "" },
    alreadyPaid: false,
  };
}

export function displayOptionsFromWizard(state: InvoiceWizardState): DisplayOptions {
  const d: DisplayOptions = { ...DEFAULT_DISPLAY_OPTIONS };
  d.showPoNumber = state.activeOptionalFields.includes("poNumber") && !!state.poNumber.trim();
  d.showReferenceNumber =
    state.activeOptionalFields.includes("referenceNumber") && !!state.referenceNumber.trim();
  d.showProjectCode =
    state.activeOptionalFields.includes("projectCode") && !!state.projectCode.trim();
  d.showNotes = state.activeOptionalFields.includes("notes") && !!state.notes.trim();
  d.showTerms = state.activeOptionalFields.includes("terms") && !!state.terms.trim();
  d.showDiscount = state.discount > 0;
  d.showTax = state.tax > 0;
  return d;
}

export function defaultTitleForType(documentType: DocumentType): string {
  switch (documentType) {
    case "quotation":
      return "Quotation";
    case "proforma_invoice":
      return "Proforma Invoice";
    default:
      return "Tax Invoice";
  }
}
