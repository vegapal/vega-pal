import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@/lib/vegapal-store";
import { cn } from "@/lib/utils";
import {
  clientIdentityFromParts,
  sellerIdentityFromParts,
} from "@/lib/invoice/document-identity";
import { documentTypeHeading, dueDateFieldLabel, finalTotalLabel } from "@/lib/invoice/document-labels";
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
  const typeLabel = documentTypeHeading(state.documentType);

  const items = useMemo(
    () =>
      state.items.filter((i) => i.description.trim() && (Number(i.quantity) || 0) > 0),
    [state.items],
  );

  const financial = wizardFinancialTotals(state);
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
      ? tc("status.draft")
      : tc("status.awaitingPayment");

  const showPaymentBlock =
    state.documentType !== "quotation" &&
    (cryptoVisible || bankVisible || cashVisible);

  const sellerLines = sellerIdentityFromParts({
    business: user?.business,
    name: user?.name,
    email: user?.contactEmail || user?.email,
    address: user?.companyAddress,
  });

  const clientLines = clientIdentityFromParts({
    name: state.clientName,
    company: state.clientCompany,
    email: state.clientEmail,
  });

  const discountLabel =
    state.discountEnabled && displayOptions.showDiscount && financial.discountAmount > 0
      ? state.discountMode === "percentage" && state.discountPercent > 0
        ? `Discount ${state.discountPercent}%`
        : tc("labels.discount")
      : null;

  const taxLabel =
    state.taxEnabled && displayOptions.showTax && financial.taxAmount > 0
      ? state.taxMode === "percentage" && state.taxPercent > 0
        ? `Tax ${state.taxPercent}%`
        : tc("labels.tax")
      : null;

  const finalLabel = finalTotalLabel(
    state.documentType,
    state.alreadyPaid ? "paid" : "unpaid",
  );

  const dueLabel = dueDateFieldLabel(state.documentType);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white text-foreground p-4 sm:p-6 space-y-4 min-w-0 max-w-full box-border shadow-sm",
        className,
      )}
    >
      <div className="flex justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="min-w-0 space-y-0.5">
          {sellerLines.map((line, i) => (
            <p
              key={i}
              className={cn(
                "text-sm truncate",
                i === 0 ? "font-semibold text-foreground" : "text-muted-foreground text-xs",
              )}
            >
              {line.text}
            </p>
          ))}
          {sellerLines.length === 0 ? (
            <p className="font-semibold text-sm">{t("create.preview.sellerFallback")}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold tracking-wide text-foreground">{typeLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("wizard.preview.sampleNumber")}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {tc("labels.issued")}: {state.issueDate}
          </p>
          {displayOptions.showDueDate && state.dueDate ? (
            <p className="text-xs text-muted-foreground">
              {dueLabel}: {state.dueDate}
            </p>
          ) : null}
          {state.documentType !== "quotation" ? (
            <p className="text-[10px] font-medium text-foreground mt-2">{statusLabel}</p>
          ) : null}
        </div>
      </div>

      {(displayOptions.showClientInfo || displayOptions.showDueDate) && (
        <div
          className={cn(
            "grid gap-4 text-sm border-b border-neutral-200 pb-4",
            displayOptions.showClientInfo ? "sm:grid-cols-2" : "grid-cols-1",
          )}
        >
          {displayOptions.showClientInfo ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {tc("labels.billTo")}
              </p>
              {clientLines.map((line, i) => (
                <p
                  key={i}
                  className={cn(i === 0 ? "font-semibold" : "text-xs text-muted-foreground")}
                >
                  {line.text}
                </p>
              ))}
              {!clientLines.length ? (
                <p className="font-semibold">{t("create.preview.clientFallback")}</p>
              ) : null}
            </div>
          ) : null}
          <div className={displayOptions.showClientInfo ? "" : "sm:col-span-1"}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Document details
            </p>
            <p className="text-xs text-muted-foreground">
              {tc("labels.issued")}: <span className="text-foreground">{state.issueDate}</span>
            </p>
            {displayOptions.showDueDate && state.dueDate ? (
              <p className="text-xs text-muted-foreground">
                {dueLabel}: <span className="text-foreground">{state.dueDate}</span>
              </p>
            ) : null}
            {displayOptions.showPoNumber && state.poNumber.trim() ? (
              <p className="text-xs text-muted-foreground">
                {tc("labels.po")}: <span className="text-foreground">{state.poNumber}</span>
              </p>
            ) : null}
            {displayOptions.showReferenceNumber && state.referenceNumber.trim() ? (
              <p className="text-xs text-muted-foreground">
                {tc("labels.reference")}:{" "}
                <span className="text-foreground">{state.referenceNumber}</span>
              </p>
            ) : null}
            {displayOptions.showProjectCode && state.projectCode.trim() ? (
              <p className="text-xs text-muted-foreground">
                {tc("labels.project")}: <span className="text-foreground">{state.projectCode}</span>
              </p>
            ) : null}
          </div>
        </div>
      )}

      <p className="font-semibold text-base">
        {state.title || t("create.preview.invoiceTitleFallback")}
      </p>

      <div className="text-sm border border-neutral-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_44px_88px_88px] gap-2 px-3 py-2 bg-neutral-50 text-[10px] font-bold text-foreground">
          <span>{tc("labels.description")}</span>
          <span className="text-right tabular-nums">{tc("labels.qty")}</span>
          <span className="text-right tabular-nums">
            {tc("labels.unitPrice")} ({state.invoiceCurrency})
          </span>
          <span className="text-right tabular-nums">
            {tc("labels.total")} ({state.invoiceCurrency})
          </span>
        </div>
        {(items.length > 0 ? items : state.items).map((it, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_44px_88px_88px] gap-2 px-3 py-2 border-t border-neutral-200 text-xs"
          >
            <span className="text-foreground break-words">{it.description || "—"}</span>
            <span className="text-right tabular-nums">{it.quantity || 0}</span>
            <span className="text-right tabular-nums">
              {(Number(it.unitPrice) || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-right tabular-nums font-medium">
              {(
                (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
      </div>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <PreviewLine label={tc("labels.subtotal")} value={fmtAmount(financial.subtotal, state.invoiceCurrency)} />
        {discountLabel ? (
          <PreviewLine
            label={discountLabel}
            value={`(${fmtAmount(financial.discountAmount, state.invoiceCurrency)})`}
          />
        ) : null}
        {taxLabel ? (
          <PreviewLine label={taxLabel} value={fmtAmount(financial.taxAmount, state.invoiceCurrency)} />
        ) : null}
        <div className="flex justify-between gap-3 pt-2 border-t border-neutral-300 font-bold text-foreground">
          <span>{finalLabel}</span>
          <span className="tabular-nums">{fmtAmount(financial.total, state.invoiceCurrency)}</span>
        </div>
      </div>

      {displayOptions.showNotes && state.notes.trim() ? (
        <div className="text-xs border-t border-neutral-200 pt-3">
          <p className="font-semibold text-foreground mb-1">{tc("labels.notes")}</p>
          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-4">{state.notes}</p>
        </div>
      ) : null}

      {displayOptions.showTerms && state.terms.trim() ? (
        <div className="text-xs border-t border-neutral-200 pt-3">
          <p className="font-semibold text-foreground mb-1">{tc("labels.termsAndConditions")}</p>
          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-4">{state.terms}</p>
        </div>
      ) : null}

      {showPaymentBlock ? (
        <div className="text-xs border-t border-neutral-200 pt-3 space-y-2">
          <p className="font-semibold text-foreground">{tc("labels.paymentDetails")}</p>
          {cryptoVisible && paymentMethods.crypto.walletAddress ? (
            <div>
              <p className="font-medium text-foreground">{tc("labels.cryptoPaymentDetails")}</p>
              <p className="text-muted-foreground">
                {paymentMethods.crypto.currency} · {paymentMethods.crypto.network}
              </p>
              <p className="font-mono break-all text-muted-foreground mt-0.5">
                {paymentMethods.crypto.walletAddress}
              </p>
            </div>
          ) : null}
          {bankVisible && paymentMethods.bank.bankName ? (
            <div>
              <p className="font-medium text-foreground">{tc("labels.bankTransferDetails")}</p>
              <p className="text-muted-foreground">{paymentMethods.bank.bankName}</p>
            </div>
          ) : null}
          {cashVisible ? (
            <p className="font-medium text-foreground">{tc("labels.cashPayment")}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-neutral-100">
        {tc("footer.createdWithVegapal")}
      </p>
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
