import type { TFunction } from "i18next";
import { invoiceCreateSchema, firstZodError } from "@/lib/validation/schemas";
import type { InvoiceWizardState, WizardStep } from "./wizard-state";
import { financialFieldsForSave } from "./wizard-state";
import { buildPaymentMethodsForSave, showCryptoFields } from "./build-payment-methods";

export type StepValidationResult = { ok: true } | { ok: false; message: string };

function cleanItems(state: InvoiceWizardState) {
  return state.items
    .filter((i) => i.description.trim() && (Number(i.quantity) || 0) > 0)
    .map((i) => {
      const quantity = Number(i.quantity) || 0;
      const unitPrice = Number(i.unitPrice) || 0;
      return {
        description: i.description.trim(),
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });
}

export function validateWizardStep(
  step: WizardStep,
  state: InvoiceWizardState,
  t: TFunction<"invoices">,
): StepValidationResult {
  switch (step) {
    case 1:
      return { ok: true };
    case 2: {
      if (!state.clientName.trim()) {
        return { ok: false, message: t("wizard.validation.clientNameRequired") };
      }
      const email = state.clientEmail.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: t("wizard.validation.clientEmailInvalid") };
      }
      return { ok: true };
    }
    case 3: {
      if (!state.title.trim()) {
        return { ok: false, message: t("wizard.validation.subjectRequired") };
      }
      if (!state.issueDate) {
        return { ok: false, message: t("wizard.validation.issueDateRequired") };
      }
      if (!state.dueDate) {
        return { ok: false, message: t("wizard.validation.dueDateRequired") };
      }
      if (state.dueDate < state.issueDate) {
        return { ok: false, message: t("wizard.validation.dueBeforeIssue") };
      }
      return { ok: true };
    }
    case 4: {
      const items = cleanItems(state);
      if (items.length === 0) {
        return { ok: false, message: t("wizard.validation.itemsRequired") };
      }
      return { ok: true };
    }
    case 5: {
      if (state.documentType === "quotation") {
        return { ok: true };
      }
      const paymentMethods = buildPaymentMethodsForSave(
        state.paymentMethod,
        state.crypto,
        state.bank,
        state.cash,
      );
      if (
        showCryptoFields(state.paymentMethod, state.crypto) &&
        !state.crypto.walletAddress.trim()
      ) {
        return { ok: false, message: t("wizard.validation.walletRequired") };
      }
      if (state.paymentMethod === "multiple") {
        const anyEnabled =
          paymentMethods.crypto.enabled ||
          paymentMethods.bank.enabled ||
          paymentMethods.cash.enabled;
        if (!anyEnabled) {
          return { ok: false, message: t("wizard.validation.paymentMethodRequired") };
        }
      }
      return { ok: true };
    }
    case 6:
      return validateFinalSubmit(state, t);
    default:
      return { ok: true };
  }
}

export function validateFinalSubmit(
  state: InvoiceWizardState,
  t: TFunction<"invoices">,
): StepValidationResult {
  for (let s = 1; s <= 5; s++) {
    const result = validateWizardStep(s as WizardStep, state, t);
    if (!result.ok) return result;
  }

  const clean = cleanItems(state);
  const financial = financialFieldsForSave(state);
  const parsed = invoiceCreateSchema.safeParse({
    title: state.title,
    clientName: state.clientName,
    clientEmail: state.clientEmail || undefined,
    clientCompany: state.clientCompany || undefined,
    description: state.notes || undefined,
    termsAndConditions: state.terms || undefined,
    discount: financial.discount,
    tax: financial.tax,
    items: clean,
    cryptoWallet: state.crypto.walletAddress,
  });
  if (!parsed.success) {
    return { ok: false, message: firstZodError(parsed.error) };
  }
  return { ok: true };
}

export { cleanItems };
