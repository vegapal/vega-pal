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
import type { AmountMode } from "@/lib/invoice/financial-totals";
import {
  computeFinancialTotals,
  wizardPercentToStoredAmounts,
} from "@/lib/invoice/financial-totals";

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
  showClientOnDocument: boolean;
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
  discountEnabled: boolean;
  taxEnabled: boolean;
  discountPercent: number;
  taxPercent: number;
  showDiscountOnDocument: boolean;
  showTaxOnDocument: boolean;
  discountMode: AmountMode;
  taxMode: AmountMode;
  legacyDiscountAmount: number;
  legacyTaxAmount: number;
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
    showClientOnDocument: true,
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
    discountEnabled: false,
    taxEnabled: false,
    discountPercent: 0,
    taxPercent: 0,
    showDiscountOnDocument: true,
    showTaxOnDocument: true,
    discountMode: "percentage",
    taxMode: "percentage",
    legacyDiscountAmount: 0,
    legacyTaxAmount: 0,
    paymentMethod: "crypto",
    crypto: { enabled: true, currency: "USDT", network: "TRON TRC20", walletAddress: "" },
    bank: { enabled: false, accountName: "", bankName: "", accountNumber: "", iban: "", swift: "" },
    cash: { enabled: false, instructions: "" },
    alreadyPaid: false,
  };
}

export function wizardFinancialTotals(state: InvoiceWizardState) {
  return computeFinancialTotals({
    items: state.items,
    discountType: state.discountMode,
    taxType: state.taxMode,
    discountAmount: state.legacyDiscountAmount,
    taxAmount: state.legacyTaxAmount,
    discountRate: state.discountEnabled ? state.discountPercent : 0,
    taxRate: state.taxEnabled ? state.taxPercent : 0,
  });
}

export function financialFieldsForSave(state: InvoiceWizardState) {
  if (state.discountMode === "percentage" && state.taxMode === "percentage") {
    return wizardPercentToStoredAmounts(state);
  }
  const totals = wizardFinancialTotals(state);
  return {
    discountType: state.discountMode,
    taxType: state.taxMode,
    discountRate: state.discountMode === "percentage" ? state.discountPercent : 0,
    taxRate: state.taxMode === "percentage" ? state.taxPercent : 0,
    discount: totals.discountAmount,
    tax: totals.taxAmount,
  };
}

export function displayOptionsFromWizard(state: InvoiceWizardState): DisplayOptions {
  const d: DisplayOptions = { ...DEFAULT_DISPLAY_OPTIONS };
  d.showClientInfo = state.showClientOnDocument;
  d.showPoNumber = state.activeOptionalFields.includes("poNumber") && !!state.poNumber.trim();
  d.showReferenceNumber =
    state.activeOptionalFields.includes("referenceNumber") && !!state.referenceNumber.trim();
  d.showProjectCode =
    state.activeOptionalFields.includes("projectCode") && !!state.projectCode.trim();
  d.showNotes = state.activeOptionalFields.includes("notes") && !!state.notes.trim();
  d.showTerms = state.activeOptionalFields.includes("terms") && !!state.terms.trim();
  d.showDiscount = state.discountEnabled && state.showDiscountOnDocument;
  d.showTax = state.taxEnabled && state.showTaxOnDocument;
  return d;
}

export function storedAmountsFromWizard(state: InvoiceWizardState) {
  return financialFieldsForSave(state);
}

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  1: "wizard.steps.document",
  2: "wizard.steps.client",
  3: "wizard.steps.details",
  4: "wizard.steps.items",
  5: "wizard.steps.payment",
  6: "wizard.steps.review",
};
