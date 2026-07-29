import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CRYPTO_PAYMENT_CURRENCIES,
  INVOICE_CURRENCIES,
  PAYMENT_NETWORKS,
  type PaymentMethodType,
} from "@/lib/invoice-constants";
import { cn } from "@/lib/utils";
import { Banknote, Building2, Coins, Layers } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { showBankFields, showCashFields, showCryptoFields } from "./build-payment-methods";
import type { InvoiceWizardState } from "./wizard-state";

const PRIMARY: {
  value: Exclude<PaymentMethodType, "multiple">;
  icon: typeof Banknote;
}[] = [
  { value: "cash", icon: Banknote },
  { value: "bank_transfer", icon: Building2 },
  { value: "crypto", icon: Coins },
];

type Props = {
  state: InvoiceWizardState;
  onChange: (patch: Partial<InvoiceWizardState>) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

function PaymentMethodCard({
  label,
  description,
  icon: Icon,
  selected,
  onClick,
  fullWidth,
}: {
  label: string;
  description: string;
  icon: typeof Banknote;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "box-border w-full min-w-0 rounded-xl border p-4 text-left transition cursor-pointer",
        fullWidth && "md:col-span-3",
        selected
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("space-y-2 min-w-0", full && "md:col-span-2")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function PaymentStep({ state, onChange, headingRef }: Props) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");

  const primaryPaymentMethods = useMemo(
    () =>
      PRIMARY.map((opt) => ({
        ...opt,
        label:
          opt.value === "cash"
            ? t("create.paymentMethods.cash")
            : opt.value === "bank_transfer"
              ? t("create.paymentMethods.bankTransfer")
              : t("create.paymentMethods.crypto"),
        description:
          opt.value === "cash"
            ? t("create.paymentMethods.cashDesc")
            : opt.value === "bank_transfer"
              ? t("create.paymentMethods.bankDesc")
              : t("create.paymentMethods.cryptoDesc"),
      })),
    [t],
  );

  const onPaymentMethodChange = (method: PaymentMethodType) => {
    if (method === "crypto") {
      onChange({
        paymentMethod: method,
        crypto: { ...state.crypto, enabled: true },
        bank: { ...state.bank, enabled: false },
        cash: { ...state.cash, enabled: false },
      });
    } else if (method === "bank_transfer") {
      onChange({
        paymentMethod: method,
        crypto: { ...state.crypto, enabled: false },
        bank: { ...state.bank, enabled: true },
        cash: { ...state.cash, enabled: false },
      });
    } else if (method === "cash") {
      onChange({
        paymentMethod: method,
        crypto: { ...state.crypto, enabled: false },
        bank: { ...state.bank, enabled: false },
        cash: { ...state.cash, enabled: true },
      });
    } else {
      onChange({ paymentMethod: method });
    }
  };

  const isQuotation = state.documentType === "quotation";
  const showAlreadyPaid =
    state.documentType === "tax_invoice" || state.documentType === "proforma_invoice";

  const cryptoVisible = showCryptoFields(state.paymentMethod, state.crypto);
  const bankVisible = showBankFields(state.paymentMethod, state.bank);
  const cashVisible = showCashFields(state.paymentMethod, state.cash);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none"
        >
          {t("wizard.payment.heading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isQuotation ? t("wizard.payment.subheadingQuotation") : t("wizard.payment.subheading")}
        </p>
      </div>

      {showAlreadyPaid ? (
        <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 cursor-pointer">
          <Checkbox
            checked={state.alreadyPaid}
            onCheckedChange={(v) => onChange({ alreadyPaid: v === true })}
            className="mt-0.5"
          />
          <span className="space-y-0.5">
            <span className="text-sm font-medium block">{t("wizard.payment.alreadyPaid")}</span>
            <span className="text-xs text-muted-foreground block">
              {t("wizard.payment.alreadyPaidHint")}
            </span>
          </span>
        </label>
      ) : null}

      {isQuotation ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-4">
          {t("wizard.payment.quotationOptional")}
        </p>
      ) : null}

      <div className={cn("space-y-5", isQuotation && "opacity-90")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {primaryPaymentMethods.map((opt) => (
            <PaymentMethodCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              icon={opt.icon}
              selected={state.paymentMethod === opt.value}
              onClick={() => onPaymentMethodChange(opt.value)}
            />
          ))}
        </div>

        <PaymentMethodCard
          label={t("create.paymentMethods.multiple")}
          description={t("create.paymentMethods.multipleDesc")}
          icon={Layers}
          selected={state.paymentMethod === "multiple"}
          onClick={() => onPaymentMethodChange("multiple")}
          fullWidth
        />

        {state.paymentMethod === "multiple" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("create.paymentMethods.enableMethods")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {primaryPaymentMethods.map((opt) => {
                const enabled =
                  opt.value === "cash"
                    ? state.cash.enabled
                    : opt.value === "bank_transfer"
                      ? state.bank.enabled
                      : state.crypto.enabled;
                const toggle = () => {
                  if (opt.value === "cash") {
                    onChange({ cash: { ...state.cash, enabled: !state.cash.enabled } });
                  } else if (opt.value === "bank_transfer") {
                    onChange({ bank: { ...state.bank, enabled: !state.bank.enabled } });
                  } else {
                    onChange({ crypto: { ...state.crypto, enabled: !state.crypto.enabled } });
                  }
                };
                return (
                  <PaymentMethodCard
                    key={opt.value}
                    label={opt.label}
                    description={
                      enabled
                        ? t("create.paymentMethods.shownOnInvoice")
                        : t("create.paymentMethods.tapToEnable")
                    }
                    icon={opt.icon}
                    selected={enabled}
                    onClick={toggle}
                  />
                );
              })}
            </div>
          </div>
        )}

        {cryptoVisible && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <p className="text-sm font-medium">{t("create.paymentMethods.cryptoPayment")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t("create.paymentMethods.cryptoCurrency")}>
                <Select
                  value={state.crypto.currency}
                  onValueChange={(v) => onChange({ crypto: { ...state.crypto, currency: v } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_PAYMENT_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tc("labels.network")}>
                <Select
                  value={state.crypto.network}
                  onValueChange={(v) => onChange({ crypto: { ...state.crypto, network: v } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tc("labels.walletAddress")} full>
                <Input
                  value={state.crypto.walletAddress}
                  onChange={(e) =>
                    onChange({ crypto: { ...state.crypto, walletAddress: e.target.value } })
                  }
                  placeholder={t("create.paymentMethods.walletPlaceholder")}
                  className="font-mono text-sm"
                />
              </Field>
            </div>
          </div>
        )}

        {bankVisible && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <p className="text-sm font-medium">{t("create.paymentMethods.bankTransferTitle")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={tc("labels.bankName")}>
                <Input
                  value={state.bank.bankName ?? ""}
                  onChange={(e) => onChange({ bank: { ...state.bank, bankName: e.target.value } })}
                />
              </Field>
              <Field label={tc("labels.accountName")}>
                <Input
                  value={state.bank.accountName ?? ""}
                  onChange={(e) =>
                    onChange({ bank: { ...state.bank, accountName: e.target.value } })
                  }
                />
              </Field>
              <Field label={tc("labels.accountNumber")}>
                <Input
                  value={state.bank.accountNumber ?? ""}
                  onChange={(e) =>
                    onChange({ bank: { ...state.bank, accountNumber: e.target.value } })
                  }
                />
              </Field>
              <Field label={tc("labels.iban")}>
                <Input
                  value={state.bank.iban ?? ""}
                  onChange={(e) => onChange({ bank: { ...state.bank, iban: e.target.value } })}
                />
              </Field>
              <Field label={tc("labels.swift")}>
                <Input
                  value={state.bank.swift ?? ""}
                  onChange={(e) => onChange({ bank: { ...state.bank, swift: e.target.value } })}
                />
              </Field>
              <Field label={tc("labels.bankCurrency")}>
                <Select
                  value={state.bank.currency ?? ""}
                  onValueChange={(v) => onChange({ bank: { ...state.bank, currency: v } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc("labels.selectCurrency")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tc("labels.instructions")} full>
                <Textarea
                  rows={3}
                  value={state.bank.instructions ?? ""}
                  onChange={(e) =>
                    onChange({ bank: { ...state.bank, instructions: e.target.value } })
                  }
                  placeholder={t("create.paymentMethods.bankInstructionsPlaceholder")}
                />
              </Field>
            </div>
          </div>
        )}

        {cashVisible && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <p className="text-sm font-medium">{t("create.paymentMethods.cashPayment")}</p>
            <div className="grid gap-4">
              <Field label={tc("labels.instructions")}>
                <Textarea
                  rows={3}
                  value={state.cash.instructions ?? ""}
                  onChange={(e) =>
                    onChange({ cash: { ...state.cash, instructions: e.target.value } })
                  }
                  placeholder={t("create.paymentMethods.cashInstructionsPlaceholder")}
                />
              </Field>
              <Field label={t("create.paymentMethods.cashLocation")}>
                <Input
                  value={state.cash.location ?? ""}
                  onChange={(e) => onChange({ cash: { ...state.cash, location: e.target.value } })}
                  placeholder={t("create.paymentMethods.cashLocationPlaceholder")}
                />
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
