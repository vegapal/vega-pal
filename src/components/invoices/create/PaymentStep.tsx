import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
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
import { Banknote, Building2, Coins, Layers, Plus } from "lucide-react";
import { showBankFields, showCashFields, showCryptoFields } from "./build-payment-methods";
import type { InvoiceWizardState } from "./wizard-state";
import { SavedPaymentMethodCard } from "@/components/payment-methods/SavedPaymentMethodCard";
import {
  listSavedPaymentMethods,
  touchSavedPaymentMethodUsed,
} from "@/lib/payment-methods/store";
import {
  applySavedMethodToBank,
  applySavedMethodToCrypto,
  bankConfigLooksSavable,
  cryptoConfigLooksSavable,
  findDuplicateBank,
  findDuplicateCrypto,
  type SavedPaymentMethod,
} from "@/lib/payment-methods/types";

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
  /** Called when a saved method is applied so parent can track ids for last_used. */
  onSavedMethodApplied?: (type: "bank" | "crypto", id: string | null) => void;
  selectedBankId?: string | null;
  selectedCryptoId?: string | null;
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
          ? "border-primary bg-primary/5 shadow-soft ring-1 ring-primary/25"
          : "border-border bg-card hover:border-primary/30 hover:shadow-soft",
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

function SaveForFutureCheckbox({
  id,
  checked,
  onCheckedChange,
  title,
  description,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-xl border border-border bg-soft-section/80 p-4 cursor-pointer"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <span className="space-y-0.5 min-w-0">
        <span className="text-sm font-medium block text-ink">{title}</span>
        <span className="text-xs text-slate block leading-relaxed">{description}</span>
      </span>
    </label>
  );
}

export function PaymentStep({
  state,
  onChange,
  headingRef,
  onSavedMethodApplied,
  selectedBankId,
  selectedCryptoId,
}: Props) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const { t: ts } = useTranslation("settings");

  const [saved, setSaved] = useState<SavedPaymentMethod[]>([]);
  const [manualBank, setManualBank] = useState(false);
  const [manualCrypto, setManualCrypto] = useState(false);

  useEffect(() => {
    void listSavedPaymentMethods()
      .then((methods) => {
        setSaved(methods);
        const banks = methods.filter((m) => m.type === "bank");
        const cryptos = methods.filter((m) => m.type === "crypto");
        // No saved methods → stay in the new-details form so the save checkbox is visible.
        if (banks.length === 0) setManualBank(true);
        if (cryptos.length === 0) setManualCrypto(true);
      })
      .catch(() => {
        setSaved([]);
        setManualBank(true);
        setManualCrypto(true);
      });
  }, []);

  useEffect(() => {
    if (!selectedBankId && bankConfigLooksSavable(state.bank)) setManualBank(true);
    if (!selectedCryptoId && cryptoConfigLooksSavable(state.crypto)) setManualCrypto(true);
    // Intentionally once when the payment step mounts (edit vs create).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const banks = saved.filter((m) => m.type === "bank");
  const cryptos = saved.filter((m) => m.type === "crypto");

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

  const selectBank = (method: SavedPaymentMethod) => {
    onChange({ bank: applySavedMethodToBank(method), saveBankForFuture: false });
    onSavedMethodApplied?.("bank", method.id);
    setManualBank(false);
    void touchSavedPaymentMethodUsed(method.id);
  };

  const selectCrypto = (method: SavedPaymentMethod) => {
    onChange({ crypto: applySavedMethodToCrypto(method), saveCryptoForFuture: false });
    onSavedMethodApplied?.("crypto", method.id);
    setManualCrypto(false);
    void touchSavedPaymentMethodUsed(method.id);
  };

  const startManualBank = () => {
    setManualBank(true);
    onSavedMethodApplied?.("bank", null);
  };

  const startManualCrypto = () => {
    setManualCrypto(true);
    onSavedMethodApplied?.("crypto", null);
  };

  const isQuotation = state.documentType === "quotation";
  const showAlreadyPaid =
    state.documentType === "tax_invoice" || state.documentType === "proforma_invoice";

  const cryptoVisible = showCryptoFields(state.paymentMethod, state.crypto);
  const bankVisible = showBankFields(state.paymentMethod, state.bank);
  const cashVisible = showCashFields(state.paymentMethod, state.cash);

  const bankDup = findDuplicateBank(saved, state.bank.iban, state.bank.accountNumber);
  const cryptoDup = findDuplicateCrypto(
    saved,
    state.crypto.walletAddress,
    state.crypto.network,
    state.crypto.currency,
  );

  const editingNewBank = bankVisible && (manualBank || banks.length === 0) && !selectedBankId;
  const editingNewCrypto =
    cryptoVisible && (manualCrypto || cryptos.length === 0) && !selectedCryptoId;

  const showBankSaveCheckbox =
    editingNewBank && bankConfigLooksSavable(state.bank) && !bankDup;
  const showCryptoSaveCheckbox =
    editingNewCrypto && cryptoConfigLooksSavable(state.crypto) && !cryptoDup;

  const showBankChooser = banks.length > 0 && !manualBank;
  const showCryptoChooser = cryptos.length > 0 && !manualCrypto;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 space-y-6 shadow-soft">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none text-ink"
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

        {bankVisible && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">{t("create.paymentMethods.bankTransferTitle")}</p>
              <p className="text-[11px] text-muted-foreground">{ts("paymentMethods.securityNote")}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("create.savedPaymentMethods.useSavedBank")}
              </p>
              <Link
                to="/settings/payment-methods"
                className="text-xs text-primary underline-offset-2 hover:underline font-medium"
              >
                {t("create.savedPaymentMethods.manageInSettings")}
              </Link>
            </div>

            {showBankChooser ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {banks.map((m) => (
                    <SavedPaymentMethodCard
                      key={m.id}
                      method={m}
                      selected={selectedBankId === m.id}
                      onSelect={() => selectBank(m)}
                      compact
                    />
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={startManualBank}>
                  <Plus className="h-4 w-4" /> {t("create.savedPaymentMethods.addNewBank")}
                </Button>
              </div>
            ) : (
              <>
                {banks.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-0"
                    onClick={() => {
                      setManualBank(false);
                      onChange({ saveBankForFuture: false });
                    }}
                  >
                    {t("create.savedPaymentMethods.backToSaved")}
                  </Button>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={tc("labels.bankName")}>
                    <Input
                      value={state.bank.bankName ?? ""}
                      onChange={(e) =>
                        onChange({ bank: { ...state.bank, bankName: e.target.value } })
                      }
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
                {showBankSaveCheckbox ? (
                  <SaveForFutureCheckbox
                    id="save-bank-for-future"
                    checked={state.saveBankForFuture}
                    onCheckedChange={(next) => onChange({ saveBankForFuture: next })}
                    title={t("create.savedPaymentMethods.saveBankCheckbox")}
                    description={t("create.savedPaymentMethods.saveCheckboxHint")}
                  />
                ) : null}
              </>
            )}
          </div>
        )}

        {cryptoVisible && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">{t("create.paymentMethods.cryptoPayment")}</p>
              <p className="text-[11px] text-muted-foreground">{ts("paymentMethods.securityNote")}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("create.savedPaymentMethods.useSavedCrypto")}
              </p>
              <Link
                to="/settings/payment-methods"
                className="text-xs text-primary underline-offset-2 hover:underline font-medium"
              >
                {t("create.savedPaymentMethods.manageInSettings")}
              </Link>
            </div>

            {showCryptoChooser ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {cryptos.map((m) => (
                    <SavedPaymentMethodCard
                      key={m.id}
                      method={m}
                      selected={selectedCryptoId === m.id}
                      onSelect={() => selectCrypto(m)}
                      compact
                    />
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={startManualCrypto}>
                  <Plus className="h-4 w-4" /> {t("create.savedPaymentMethods.addNewCrypto")}
                </Button>
              </div>
            ) : (
              <>
                {cryptos.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-0"
                    onClick={() => {
                      setManualCrypto(false);
                      onChange({ saveCryptoForFuture: false });
                    }}
                  >
                    {t("create.savedPaymentMethods.backToSaved")}
                  </Button>
                ) : null}
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
                {showCryptoSaveCheckbox ? (
                  <SaveForFutureCheckbox
                    id="save-crypto-for-future"
                    checked={state.saveCryptoForFuture}
                    onCheckedChange={(next) => onChange({ saveCryptoForFuture: next })}
                    title={t("create.savedPaymentMethods.saveCryptoCheckbox")}
                    description={t("create.savedPaymentMethods.saveCheckboxHint")}
                  />
                ) : null}
              </>
            )}
          </div>
        )}

        {cashVisible && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-sm font-medium text-ink">{t("create.paymentMethods.cashPayment")}</p>
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
