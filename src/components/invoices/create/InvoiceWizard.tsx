import { defaultPaymentStatusForType } from "@/lib/invoice/document-model";
import { isAtFreePlanInvoiceLimit } from "@/lib/plan/invoice-limit";
import {
  getInvoicePlanUsage,
  invoices,
  notifyInvoices,
  useInvoice,
  useSession,
  type Invoice,
  type InvoicePlanUsage,
} from "@/lib/vegapal-store";
import { trackInvoiceCreated } from "@/lib/analytics/events";
import { formatAppError } from "@/lib/auth/errors";
import { checkClientRateLimit } from "@/lib/client-rate-limit";
import {
  buildDefaultPaymentMethods,
  INVOICE_CURRENCIES,
  DEFAULT_INVOICE_CURRENCY,
  type InvoiceCurrency,
} from "@/lib/invoice-constants";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { buildPaymentMethodsForSave } from "./build-payment-methods";
import { ClientStep } from "./ClientStep";
import { DocumentDetailsStep } from "./DocumentDetailsStep";
import { DocumentTypeStep } from "./DocumentTypeStep";
import { InvoiceDocumentPreview } from "./InvoiceDocumentPreview";
import { InvoiceItemsStep } from "./InvoiceItemsStep";
import { InvoiceWizardProgress } from "./InvoiceWizardProgress";
import { MobileInvoicePreview } from "./MobileInvoicePreview";
import { PaymentStep } from "./PaymentStep";
import { ReviewStep } from "./ReviewStep";
import { WizardFooter } from "./WizardFooter";
import {
  createInitialWizardState,
  displayOptionsFromWizard,
  financialFieldsForSave,
  type InvoiceWizardState,
  type OptionalFieldKey,
  type WizardStep,
} from "./wizard-state";
import { cleanItems, validateFinalSubmit, validateWizardStep } from "./wizard-validation";
import type { DocumentType } from "@/lib/vegapal-store";

type Props = {
  editId?: string;
};

function optionalFieldsFromExisting(existing: {
  poNumber?: string;
  referenceNumber?: string;
  projectCode?: string;
  description: string;
  termsAndConditions: string;
}): OptionalFieldKey[] {
  const keys: OptionalFieldKey[] = [];
  if (existing.poNumber?.trim()) keys.push("poNumber");
  if (existing.referenceNumber?.trim()) keys.push("referenceNumber");
  if (existing.projectCode?.trim()) keys.push("projectCode");
  if (existing.description?.trim()) keys.push("notes");
  if (existing.termsAndConditions?.trim()) keys.push("terms");
  return keys;
}

function stateFromExisting(existing: Invoice): InvoiceWizardState {
  const base = createInitialWizardState();
  return {
    ...base,
    documentType: existing.documentType,
    clientName: existing.clientName,
    clientEmail: existing.clientEmail,
    clientCompany: existing.clientCompany ?? "",
    title: existing.title,
    notes: existing.description,
    terms: existing.termsAndConditions,
    issueDate: existing.issueDate,
    dueDate: existing.dueDate,
    invoiceCurrency: (INVOICE_CURRENCIES as readonly string[]).includes(existing.invoiceCurrency)
      ? (existing.invoiceCurrency as InvoiceCurrency)
      : DEFAULT_INVOICE_CURRENCY,
    poNumber: existing.poNumber ?? "",
    referenceNumber: existing.referenceNumber ?? "",
    projectCode: existing.projectCode ?? "",
    activeOptionalFields: optionalFieldsFromExisting(existing),
    items:
      existing.items.length > 0
        ? existing.items
        : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    discountMode: existing.discountType,
    taxMode: existing.taxType,
    discountEnabled:
      existing.discountType === "percentage"
        ? (existing.discountRate ?? 0) > 0
        : existing.discount > 0,
    taxEnabled:
      existing.taxType === "percentage" ? (existing.taxRate ?? 0) > 0 : existing.tax > 0,
    discountPercent: existing.discountRate ?? 0,
    taxPercent: existing.taxRate ?? 0,
    legacyDiscountAmount: existing.discount,
    legacyTaxAmount: existing.tax,
    showClientOnDocument: existing.displayOptions.showClientInfo ?? true,
    showDueDateOnDocument: existing.displayOptions.showDueDate ?? true,
    showDiscountOnDocument: existing.displayOptions.showDiscount ?? true,
    showTaxOnDocument: existing.displayOptions.showTax ?? true,
    paymentMethod: existing.paymentMethods.method,
    crypto: { ...existing.paymentMethods.crypto },
    bank: { ...existing.paymentMethods.bank },
    cash: { ...existing.paymentMethods.cash },
    alreadyPaid: existing.paymentStatus === "paid",
    showExtraClient: false,
    saveBankForFuture: false,
    saveCryptoForFuture: false,
  };
}

export function InvoiceWizard({ editId }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const { data: existing, loading: loadingExisting } = useInvoice(editId);

  const [state, setState] = useState<InvoiceWizardState>(() => createInitialWizardState());
  const [hydrated, setHydrated] = useState(false);
  const [profilePaymentInitialized, setProfilePaymentInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [planUsage, setPlanUsage] = useState<InvoicePlanUsage | null>(null);

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const submitGuard = useSubmitGuard();

  const [maxVisitedStep, setMaxVisitedStep] = useState<WizardStep>(1);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedCryptoId, setSelectedCryptoId] = useState<string | null>(null);

  const patchState = useCallback((patch: Partial<InvoiceWizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    setMaxVisitedStep((m) => (state.step > m ? state.step : m));
  }, [state.step]);

  useEffect(() => {
    if (editId) return;
    void getInvoicePlanUsage().then(setPlanUsage);
  }, [editId]);

  const atInvoiceLimit = !editId && planUsage !== null && isAtFreePlanInvoiceLimit(planUsage);

  useEffect(() => {
    if (formError && formErrorRef.current) {
      formErrorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [formError]);

  useEffect(() => {
    if (editId || !user || profilePaymentInitialized) return;
    let cancelled = false;
    void (async () => {
      const defaults = buildDefaultPaymentMethods(user.wallet ?? "", user.network);
      let bank = defaults.bank;
      let crypto = defaults.crypto;
      let method = defaults.method;
      try {
        const { listSavedPaymentMethods } = await import("@/lib/payment-methods/store");
        const { applySavedMethodToBank, applySavedMethodToCrypto } = await import(
          "@/lib/payment-methods/types"
        );
        const saved = await listSavedPaymentMethods();
        if (cancelled) return;
        const defaultBank =
          saved.find((m) => m.type === "bank" && m.isDefault) ??
          saved.find((m) => m.type === "bank");
        const defaultCrypto =
          saved.find((m) => m.type === "crypto" && m.isDefault) ??
          saved.find((m) => m.type === "crypto");
        if (defaultBank) {
          bank = applySavedMethodToBank(defaultBank);
          setSelectedBankId(defaultBank.id);
          method = "bank_transfer";
        }
        if (defaultCrypto) {
          crypto = applySavedMethodToCrypto(defaultCrypto);
          setSelectedCryptoId(defaultCrypto.id);
          if (defaultBank) {
            bank = { ...bank, enabled: true };
            crypto = { ...crypto, enabled: true };
            method = "multiple";
          } else {
            method = "crypto";
          }
        }
      } catch {
        /* use profile defaults */
      }
      if (cancelled) return;
      patchState({
        crypto,
        bank,
        cash: defaults.cash,
        paymentMethod: method,
      });
      setProfilePaymentInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, editId, profilePaymentInitialized, patchState]);

  useEffect(() => {
    if (!editId) {
      setHydrated(true);
      return;
    }
    if (existing && !hydrated) {
      setState(stateFromExisting(existing));
      setHydrated(true);
    }
  }, [editId, existing, hydrated]);

  useEffect(() => {
    if (editId && !loadingExisting && !existing) navigate({ to: "/invoices" });
  }, [editId, loadingExisting, existing, navigate]);

  const goNext = () => {
    setFormError("");
    const result = validateWizardStep(state.step, state, t);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    if (state.step < 6) {
      patchState({ step: (state.step + 1) as WizardStep });
      requestAnimationFrame(() => stepHeadingRef.current?.focus());
    }
  };

  const goBack = () => {
    setFormError("");
    if (state.step > 1) {
      patchState({ step: (state.step - 1) as WizardStep });
      requestAnimationFrame(() => stepHeadingRef.current?.focus());
    }
  };

  const goToStep = (step: WizardStep) => {
    if (step > maxVisitedStep) return;
    setFormError("");
    patchState({ step });
    requestAnimationFrame(() => stepHeadingRef.current?.focus());
  };

  const handleDocumentTypeSelect = (_documentType: DocumentType) => {
    patchState({ step: 2 });
    setMaxVisitedStep((m) => (m < 2 ? 2 : m));
    requestAnimationFrame(() => stepHeadingRef.current?.focus());
  };

  const maxReachableStep = useMemo(() => maxVisitedStep, [maxVisitedStep]);

  const buildPayload = (documentStatus: "draft" | "issued") => {
    const items = cleanItems(state);
    const paymentMethods = buildPaymentMethodsForSave(
      state.paymentMethod,
      state.crypto,
      state.bank,
      state.cash,
    );
    const paymentStatus =
      documentStatus === "issued" &&
      state.alreadyPaid &&
      state.documentType !== "quotation"
        ? "paid"
        : defaultPaymentStatusForType(state.documentType);

    const financial = financialFieldsForSave(state);

    return {
      clientName: state.clientName.trim(),
      clientEmail: state.clientEmail.trim(),
      clientCompany: state.clientCompany.trim() || state.clientName.trim() || undefined,
      title: state.title.trim(),
      description: state.notes.trim() || undefined,
      termsAndConditions: state.terms.trim() || undefined,
      issueDate: state.issueDate,
      dueDate: state.dueDate,
      documentType: state.documentType,
      documentStatus,
      paymentStatus,
      items,
      discount: financial.discount,
      tax: financial.tax,
      discountType: financial.discountType,
      taxType: financial.taxType,
      discountRate: financial.discountRate,
      taxRate: financial.taxRate,
      invoiceCurrency: state.invoiceCurrency,
      poNumber: state.poNumber.trim() || undefined,
      referenceNumber: state.referenceNumber.trim() || undefined,
      projectCode: state.projectCode.trim() || undefined,
      displayOptions: displayOptionsFromWizard(state),
      paymentMethods,
    };
  };

  const submit = async (asDraft: boolean) => {
    if (!submitGuard.begin()) return;
    setFormError("");

    const validation = validateFinalSubmit(state, t);
    if (!validation.ok) {
      setFormError(validation.message);
      submitGuard.end();
      return;
    }

    if (!editId) {
      const rate = checkClientRateLimit("create-invoice", 20, 60 * 60_000);
      if (!rate.allowed) {
        setFormError(tc("errors.rateLimitCreate", { seconds: rate.retryAfterSec }));
        submitGuard.end();
        return;
      }
      if (atInvoiceLimit) {
        setFormError(tc("plan.limitReached"));
        submitGuard.end();
        return;
      }
    }

    setSaving(true);
    try {
      const documentStatus = asDraft ? "draft" : "issued";
      const payload = buildPayload(documentStatus);

      // Persist newly entered methods only when the user explicitly opted in.
      // Invoice payload always keeps a snapshot — editing saved methods later won't rewrite old invoices.
      if (!selectedBankId && state.saveBankForFuture) {
        const { bankConfigLooksSavable } = await import("@/lib/payment-methods/types");
        if (bankConfigLooksSavable(state.bank)) {
          try {
            const { createSavedPaymentMethod } = await import("@/lib/payment-methods/store");
            const created = await createSavedPaymentMethod({
              type: "bank",
              label:
                state.bank.bankName?.trim() ||
                state.bank.accountName?.trim() ||
                "Bank account",
              bankName: state.bank.bankName,
              accountHolderName: state.bank.accountName,
              accountName: state.bank.accountName,
              iban: state.bank.iban,
              accountNumber: state.bank.accountNumber,
              swiftBic: state.bank.swift,
              bankCurrency: state.bank.currency,
              paymentReference: state.bank.instructions,
              isDefault: false,
            });
            setSelectedBankId(created.id);
          } catch {
            /* invoice save still proceeds; method save is best-effort */
          }
        }
      }
      if (!selectedCryptoId && state.saveCryptoForFuture) {
        const { cryptoConfigLooksSavable } = await import("@/lib/payment-methods/types");
        if (cryptoConfigLooksSavable(state.crypto)) {
          try {
            const { createSavedPaymentMethod } = await import("@/lib/payment-methods/store");
            const created = await createSavedPaymentMethod({
              type: "crypto",
              label: `${state.crypto.currency} ${state.crypto.network}`.trim() || "Crypto wallet",
              cryptoCurrency: state.crypto.currency,
              network: state.crypto.network,
              walletAddress: state.crypto.walletAddress,
              isDefault: false,
            });
            setSelectedCryptoId(created.id);
          } catch {
            /* best-effort */
          }
        }
      }

      if (editId && existing) {
        await invoices.update(existing.id, payload);
        notifyInvoices();
        toast.success(t("wizard.toast.updated"));
        navigate({ to: "/invoices/$id", params: { id: existing.id } });
      } else {
        const inv = await invoices.create(payload);
        trackInvoiceCreated(inv.id, inv.invoiceCurrency, inv.documentType);
        notifyInvoices();
        toast.success(
          asDraft ? t("wizard.toast.savedDraft") : t("wizard.toast.created"),
        );
        navigate({ to: "/invoices/$id", params: { id: inv.id } });
      }
    } catch (err) {
      setFormError(formatAppError(err));
    } finally {
      setSaving(false);
      submitGuard.end();
    }
  };

  if (editId && loadingExisting) {
    return (
      <div
        className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        {t("create.loading")}
      </div>
    );
  }

  const stepProps = {
    state,
    onChange: patchState,
    headingRef: stepHeadingRef,
  };

  return (
    <div className="box-border mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-4 sm:px-6 lg:px-10 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-10">
      <Link
        to="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-ink mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> {t("create.backToInvoices")}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
        {editId ? t("create.editTitle") : t("wizard.pageTitle")}
      </h1>
      <p className="text-slate mt-1">
        {editId ? t("create.subtitle") : t("wizard.pageSubtitle")}
      </p>

      {!editId && planUsage ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {planUsage.monthlyLimit === null
              ? tc("plan.usageUnlimited")
              : tc("plan.usageFree", {
                  used: planUsage.invoicesThisMonth,
                  limit: planUsage.monthlyLimit,
                })}
          </p>
          {atInvoiceLimit ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-relaxed">{tc("plan.limitReached")}</p>
              <Button asChild size="sm" variant="hero">
                <Link to="/pricing">{tc("plan.upgradePlan")}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 mb-6">
        <InvoiceWizardProgress
          currentStep={state.step}
          maxReachableStep={maxReachableStep}
          onStepClick={goToStep}
        />
      </div>

      <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <MobileInvoicePreview state={state} user={user} />

          {state.step === 1 ? (
            <DocumentTypeStep {...stepProps} onSelectType={() => handleDocumentTypeSelect(state.documentType)} />
          ) : null}
          {state.step === 2 ? <ClientStep {...stepProps} /> : null}
          {state.step === 3 ? <DocumentDetailsStep {...stepProps} /> : null}
          {state.step === 4 ? <InvoiceItemsStep {...stepProps} /> : null}
          {state.step === 5 ? (
            <PaymentStep
              {...stepProps}
              selectedBankId={selectedBankId}
              selectedCryptoId={selectedCryptoId}
              onSavedMethodApplied={(type, id) => {
                if (type === "bank") setSelectedBankId(id);
                else setSelectedCryptoId(id);
              }}
            />
          ) : null}
          {state.step === 6 ? <ReviewStep state={state} headingRef={stepHeadingRef} /> : null}

          <div ref={formErrorRef}>
            <FormError message={formError} />
          </div>

          <div className="hidden lg:block">
            <WizardFooter
              step={state.step}
              documentType={state.documentType}
              saving={saving}
              atInvoiceLimit={atInvoiceLimit}
              editId={editId}
              onBack={goBack}
              onContinue={goNext}
              onSaveDraft={() => void submit(true)}
              onCreate={() => void submit(false)}
              variant="inline"
            />
          </div>
        </div>

        <aside className="hidden lg:block min-w-0 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("create.preview.livePreview")}
          </p>
          <InvoiceDocumentPreview
            state={state}
            user={user}
            className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
          />
        </aside>
      </div>

      <WizardFooter
        step={state.step}
        documentType={state.documentType}
        saving={saving}
        atInvoiceLimit={atInvoiceLimit}
        editId={editId}
        onBack={goBack}
        onContinue={goNext}
        onSaveDraft={() => void submit(true)}
        onCreate={() => void submit(false)}
        variant="sticky"
      />
    </div>
  );
}
