import type { User } from "@/lib/vegapal-store";
import type { InvoiceWizardState } from "@/components/invoices/create/wizard-state";
import {
  displayOptionsFromWizard,
  financialFieldsForSave,
  wizardFinancialTotals,
} from "@/components/invoices/create/wizard-state";
import { buildPaymentMethodsForSave } from "@/components/invoices/create/build-payment-methods";
import { mapInvoiceToDocumentModel } from "@/lib/invoice/invoice-document.mapper";
import type { InvoiceDocumentModel } from "@/components/invoice-document/invoice-document.types";
import type { Invoice } from "@/lib/vegapal-store";

export function mapWizardToDocumentModel(
  state: InvoiceWizardState,
  user: User | null,
): InvoiceDocumentModel {
  const financial = wizardFinancialTotals(state);
  const amounts = financialFieldsForSave(state);
  const items = state.items
    .filter((i) => i.description.trim() && (Number(i.quantity) || 0) > 0)
    .map((i) => ({
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      total: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    }));

  const draft: Invoice = {
    id: "preview",
    number: "PREVIEW",
    invoiceCurrency: state.invoiceCurrency,
    clientName: state.clientName,
    clientEmail: state.clientEmail,
    clientCompany: state.clientCompany,
    title: state.title,
    description: state.notes,
    termsAndConditions: state.terms,
    documentType: state.documentType,
    documentStatus: "draft",
    paymentStatus: state.alreadyPaid ? "paid" : "unpaid",
    status: state.alreadyPaid ? "paid" : "pending",
    createdAt: new Date().toISOString(),
    issueDate: state.issueDate,
    dueDate: state.dueDate,
    items: items.length > 0 ? items : state.items,
    subtotal: financial.subtotal,
    discount: amounts.discount,
    tax: amounts.tax,
    discountType: amounts.discountType,
    taxType: amounts.taxType,
    discountRate: amounts.discountRate,
    taxRate: amounts.taxRate,
    total: financial.total,
    amount: financial.total,
    displayOptions: displayOptionsFromWizard(state),
    paymentMethods: buildPaymentMethodsForSave(
      state.paymentMethod,
      state.crypto,
      state.bank,
      state.cash,
    ),
    walletAddress: state.crypto.walletAddress,
    network: state.crypto.network,
    sellerName: user?.name ?? "",
    sellerBusiness: user?.business,
    sellerEmail: user?.contactEmail || user?.email || "",
    sellerAddress: user?.companyAddress,
    poNumber: state.poNumber,
    referenceNumber: state.referenceNumber,
    projectCode: state.projectCode,
  };

  return mapInvoiceToDocumentModel(draft, { locale: "en", dir: "ltr" });
}
