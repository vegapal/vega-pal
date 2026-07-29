import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildPaymentMethodsForSave, showBankFields, showCashFields, showCryptoFields } from "./build-payment-methods";
import type { InvoiceWizardState } from "./wizard-state";

function fmtAmount(n: number, currency: string) {
  const maxDecimals = currency === "BTC" || currency === "ETH" ? 8 : 2;
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  })} ${currency}`;
}

type Props = {
  state: InvoiceWizardState;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

export function ReviewStep({ state, headingRef }: Props) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");

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

  const subtotal = items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0,
  );
  const total = Math.max(0, subtotal - state.discount + state.tax);

  const paymentMethods = buildPaymentMethodsForSave(
    state.paymentMethod,
    state.crypto,
    state.bank,
    state.cash,
  );
  const cryptoVisible = showCryptoFields(state.paymentMethod, state.crypto);
  const bankVisible = showBankFields(state.paymentMethod, state.bank);
  const cashVisible = showCashFields(state.paymentMethod, state.cash);

  const paymentLabel =
    state.paymentMethod === "crypto"
      ? t("create.paymentMethods.crypto")
      : state.paymentMethod === "bank_transfer"
        ? t("create.paymentMethods.bankTransfer")
        : state.paymentMethod === "cash"
          ? t("create.paymentMethods.cash")
          : t("create.paymentMethods.multiple");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none"
        >
          {t("wizard.review.heading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("wizard.review.subheading")}</p>
      </div>

      <dl className="divide-y divide-border text-sm">
        <ReviewRow label={t("wizard.review.documentType")} value={documentTypeLabel} />
        <ReviewRow label={t("create.fields.clientName")} value={state.clientName || "—"} />
        <ReviewRow label={t("create.fields.clientEmail")} value={state.clientEmail || "—"} />
        {state.clientCompany.trim() ? (
          <ReviewRow label={t("create.fields.companyOptional")} value={state.clientCompany} />
        ) : null}
        <ReviewRow label={t("create.fields.invoiceTitle")} value={state.title || "—"} />
        <ReviewRow
          label={t("create.fields.invoiceCurrency")}
          value={state.invoiceCurrency}
        />
        <ReviewRow label={t("create.fields.issueDate")} value={state.issueDate} />
        <ReviewRow label={t("wizard.details.dueDate")} value={state.dueDate} />
        {state.poNumber.trim() ? (
          <ReviewRow label={t("create.fields.poNumber")} value={state.poNumber} />
        ) : null}
        {state.referenceNumber.trim() ? (
          <ReviewRow label={t("create.fields.referenceNumber")} value={state.referenceNumber} />
        ) : null}
        {state.projectCode.trim() ? (
          <ReviewRow label={t("create.fields.projectCode")} value={state.projectCode} />
        ) : null}
        <ReviewRow
          label={t("wizard.review.lineItems")}
          value={t("wizard.review.lineItemsCount", { count: items.length })}
        />
        <ReviewRow label={tc("labels.total")} value={fmtAmount(total, state.invoiceCurrency)} />
        {state.documentType !== "quotation" ? (
          <ReviewRow label={t("wizard.review.paymentMethod")} value={paymentLabel} />
        ) : null}
        {state.alreadyPaid && state.documentType !== "quotation" ? (
          <ReviewRow label={t("wizard.payment.alreadyPaid")} value={tc("status.paid")} />
        ) : null}
      </dl>

      {state.documentType !== "quotation" &&
      (cryptoVisible || bankVisible || cashVisible) &&
      (paymentMethods.crypto.walletAddress || paymentMethods.bank.bankName) ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">{t("wizard.review.paymentSummary")}</p>
          {cryptoVisible && state.crypto.walletAddress ? (
            <p>
              {state.crypto.currency} · {state.crypto.network}
            </p>
          ) : null}
          {bankVisible && state.bank.bankName ? <p>{state.bank.bankName}</p> : null}
          {cashVisible && state.cash.instructions ? (
            <p className="line-clamp-2">{state.cash.instructions}</p>
          ) : null}
        </div>
      ) : null}

      {state.notes.trim() ? (
        <div className="text-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {t("create.fields.notes")}
          </p>
          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-4">{state.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground sm:text-right break-words">{value}</dd>
    </div>
  );
}
