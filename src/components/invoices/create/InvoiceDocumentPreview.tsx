import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@/lib/vegapal-store";
import { cn } from "@/lib/utils";
import {
  buildPaymentMethodsForSave,
  showBankFields,
  showCashFields,
  showCryptoFields,
} from "./build-payment-methods";
import { displayOptionsFromWizard, wizardFinancialTotals, type InvoiceWizardState } from "./wizard-state";

function fmtAmount(n: number, currency: string) {
  const maxDecimals = currency === "BTC" || currency === "ETH" ? 8 : 2;
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  })} ${currency}`;
}

type Props = {
  state: InvoiceWizardState;
  user: User | null;
  className?: string;
};

export function InvoiceDocumentPreview({ state, user, className }: Props) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");

  const displayOptions = displayOptionsFromWizard(state);

  const documentTypeLabel =
    state.documentType === "quotation"
      ? t("wizard.documentTypes.quotation.title")
      : state.documentType === "proforma_invoice"
        ? t("wizard.documentTypes.proforma.title")
        : t("wizard.documentTypes.taxInvoice.title");

  const items = useMemo(
    () =>
      state.items.filter((i) => i.description.trim() && (Number(i.quantity) || 0) > 0),
    [state.items],
  );

  const subtotal = wizardFinancialTotals(state).subtotal;
  const financial = wizardFinancialTotals(state);
  const total = financial.total;

  const paymentMethods = buildPaymentMethodsForSave(
    state.paymentMethod,
    state.crypto,
    state.bank,
    state.cash,
  );
  const cryptoVisible = showCryptoFields(state.paymentMethod, state.crypto);
  const bankVisible = showBankFields(state.paymentMethod, state.bank);
  const cashVisible = showCashFields(state.paymentMethod, state.cash);

  const statusLabel = state.alreadyPaid
    ? tc("status.paid")
    : state.documentType === "quotation"
      ? tc("status.pending")
      : tc("status.awaitingPayment");

  const showPaymentBlock =
    state.documentType !== "quotation" &&
    (cryptoVisible || bankVisible || cashVisible);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4 min-w-0 max-w-full box-border",
        className,
      )}
    >
      <div className="border-b border-border pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{documentTypeLabel}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t("wizard.preview.sampleNumber")}</p>
      </div>

      <div className="text-sm border-b border-border pb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{tc("labels.from")}</p>
        <p className="font-semibold">
          {user?.business || user?.name || t("create.preview.sellerFallback")}
        </p>
        <p className="text-muted-foreground text-xs">{user?.contactEmail || user?.email}</p>
      </div>

      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="font-semibold truncate">
            {state.title || t("create.preview.invoiceTitleFallback")}
          </p>
          {displayOptions.showPoNumber && state.poNumber.trim() ? (
            <p className="text-xs text-muted-foreground mt-1">
              {tc("labels.po")}: {state.poNumber}
            </p>
          ) : null}
          {displayOptions.showReferenceNumber && state.referenceNumber.trim() ? (
            <p className="text-xs text-muted-foreground">
              {tc("labels.reference")}: {state.referenceNumber}
            </p>
          ) : null}
          {displayOptions.showProjectCode && state.projectCode.trim() ? (
            <p className="text-xs text-muted-foreground">
              {tc("labels.project")}: {state.projectCode}
            </p>
          ) : null}
        </div>
        {state.documentType !== "quotation" ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 text-warning text-xs font-medium shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            {statusLabel}
          </span>
        ) : null}
      </div>

      <div className="text-sm">
        {displayOptions.showClientInfo ? (
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {tc("labels.billTo")}
            </p>
            <p className="font-semibold">
              {state.clientName || state.clientCompany || t("create.preview.clientFallback")}
            </p>
            {state.clientEmail.trim() ? (
              <p className="text-muted-foreground text-xs">{state.clientEmail}</p>
            ) : null}
            {state.clientPhone.trim() ? (
              <p className="text-muted-foreground text-xs mt-0.5">{state.clientPhone}</p>
            ) : null}
            {state.clientTaxId.trim() ? (
              <p className="text-muted-foreground text-xs">{state.clientTaxId}</p>
            ) : null}
            {state.clientAddress.trim() ? (
              <p className="text-muted-foreground text-xs whitespace-pre-line">{state.clientAddress}</p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="space-y-1.5 text-sm border-t border-border pt-3">
        {(items.length > 0 ? items : state.items).map((it, i) => (
          <div key={i} className="flex justify-between gap-3">
            <span className="truncate text-muted-foreground">
              {it.description || t("create.preview.itemFallback", { index: i + 1 })} ×{" "}
              {it.quantity || 0}
            </span>
            <span className="tabular-nums shrink-0">
              {fmtAmount(
                (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
                state.invoiceCurrency,
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 space-y-1 text-sm">
        <PreviewLine label={tc("labels.subtotal")} value={fmtAmount(subtotal, state.invoiceCurrency)} />
        {displayOptions.showDiscount && financial.discountAmount > 0 ? (
          <PreviewLine
            label={tc("labels.discount")}
            value={`− ${fmtAmount(financial.discountAmount, state.invoiceCurrency)}`}
          />
        ) : null}
        {displayOptions.showTax && financial.taxAmount > 0 ? (
          <PreviewLine
            label={tc("labels.tax")}
            value={fmtAmount(financial.taxAmount, state.invoiceCurrency)}
          />
        ) : null}
      </div>

      <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums break-all">
        {fmtAmount(total, state.invoiceCurrency)}
      </p>

      {state.dueDate ? (
        <p className="text-xs text-muted-foreground">
          {state.documentType === "quotation"
            ? t("wizard.preview.validUntil", { date: state.dueDate })
            : tc("labels.due", { date: state.dueDate })}
        </p>
      ) : null}

      {displayOptions.showNotes && state.notes.trim() ? (
        <div className="text-xs border-t border-border pt-3">
          <p className="font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {tc("labels.notes")}
          </p>
          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">{state.notes}</p>
        </div>
      ) : null}

      {displayOptions.showTerms && state.terms.trim() ? (
        <div className="text-xs border-t border-border pt-3">
          <p className="font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {tc("labels.terms")}
          </p>
          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">{state.terms}</p>
        </div>
      ) : null}

      {showPaymentBlock ? (
        <div className="text-xs border-t border-border pt-3 space-y-2">
          <p className="font-medium text-muted-foreground uppercase tracking-wider">
            {tc("labels.payment")}
          </p>
          {cryptoVisible && paymentMethods.crypto.walletAddress ? (
            <p className="text-muted-foreground">
              {paymentMethods.crypto.currency} · {paymentMethods.crypto.network}
              <span className="block font-mono truncate mt-0.5">
                {paymentMethods.crypto.walletAddress}
              </span>
            </p>
          ) : null}
          {bankVisible && paymentMethods.bank.bankName ? (
            <p className="text-muted-foreground">
              {tc("labels.bank")}: {paymentMethods.bank.bankName}
            </p>
          ) : null}
          {cashVisible && paymentMethods.cash.instructions ? (
            <p className="text-muted-foreground line-clamp-2">{paymentMethods.cash.instructions}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
