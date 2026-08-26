import type {
  BankPaymentConfig,
  CryptoPaymentConfig,
  PaymentMethodsConfig,
} from "@/lib/invoice-constants";

export type SavedPaymentMethodType = "bank" | "crypto";

export type SavedPaymentMethod = {
  id: string;
  userId: string;
  type: SavedPaymentMethodType;
  label: string;
  isDefault: boolean;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountName?: string | null;
  iban?: string | null;
  accountNumber?: string | null;
  swiftBic?: string | null;
  bankCurrency?: string | null;
  paymentReference?: string | null;
  cryptoCurrency?: string | null;
  network?: string | null;
  walletAddress?: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
};

export type SavedPaymentMethodInput = {
  type: SavedPaymentMethodType;
  label: string;
  isDefault?: boolean;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountName?: string | null;
  iban?: string | null;
  accountNumber?: string | null;
  swiftBic?: string | null;
  bankCurrency?: string | null;
  paymentReference?: string | null;
  cryptoCurrency?: string | null;
  network?: string | null;
  walletAddress?: string | null;
};

export type PaymentMethodRow = {
  id: string;
  user_id: string;
  type: string;
  label: string;
  is_default: boolean;
  bank_name: string | null;
  account_holder_name: string | null;
  account_name: string | null;
  iban: string | null;
  account_number: string | null;
  swift_bic: string | null;
  bank_currency: string | null;
  payment_reference: string | null;
  crypto_currency: string | null;
  network: string | null;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

export function rowToSavedPaymentMethod(row: PaymentMethodRow): SavedPaymentMethod {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type === "crypto" ? "crypto" : "bank",
    label: row.label ?? "",
    isDefault: !!row.is_default,
    bankName: row.bank_name,
    accountHolderName: row.account_holder_name,
    accountName: row.account_name,
    iban: row.iban,
    accountNumber: row.account_number,
    swiftBic: row.swift_bic,
    bankCurrency: row.bank_currency,
    paymentReference: row.payment_reference,
    cryptoCurrency: row.crypto_currency,
    network: row.network,
    walletAddress: row.wallet_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

export function savedMethodToInsert(input: SavedPaymentMethodInput, userId: string) {
  return {
    user_id: userId,
    type: input.type,
    label: input.label.trim(),
    is_default: !!input.isDefault,
    bank_name: input.bankName?.trim() || null,
    account_holder_name: input.accountHolderName?.trim() || null,
    account_name: input.accountName?.trim() || null,
    iban: input.iban?.trim() || null,
    account_number: input.accountNumber?.trim() || null,
    swift_bic: input.swiftBic?.trim() || null,
    bank_currency: input.bankCurrency?.trim() || null,
    payment_reference: input.paymentReference?.trim() || null,
    crypto_currency: input.cryptoCurrency?.trim() || null,
    network: input.network?.trim() || null,
    wallet_address: input.walletAddress?.trim() || null,
  };
}

export function normalizeIban(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, "").toUpperCase();
}

export function normalizeWallet(value?: string | null): string {
  return (value ?? "").trim();
}

export function maskIban(iban?: string | null): string {
  const raw = normalizeIban(iban);
  if (raw.length < 8) return raw || "—";
  const start = raw.slice(0, 4);
  const end = raw.slice(-4);
  return `${start} •••• •••• •••• ${end}`;
}

export function maskWallet(address?: string | null): string {
  const raw = normalizeWallet(address);
  if (raw.length <= 10) return raw || "—";
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
}

export function findDuplicateBank(
  methods: SavedPaymentMethod[],
  iban?: string | null,
  accountNumber?: string | null,
): SavedPaymentMethod | undefined {
  const nIban = normalizeIban(iban);
  const nAcct = (accountNumber ?? "").replace(/\s+/g, "");
  return methods.find((m) => {
    if (m.type !== "bank") return false;
    if (nIban && normalizeIban(m.iban) === nIban) return true;
    if (nAcct && (m.accountNumber ?? "").replace(/\s+/g, "") === nAcct) return true;
    return false;
  });
}

export function findDuplicateCrypto(
  methods: SavedPaymentMethod[],
  wallet?: string | null,
  network?: string | null,
  currency?: string | null,
): SavedPaymentMethod | undefined {
  const w = normalizeWallet(wallet).toLowerCase();
  const n = (network ?? "").trim().toLowerCase();
  const c = (currency ?? "").trim().toUpperCase();
  return methods.find((m) => {
    if (m.type !== "crypto") return false;
    return (
      normalizeWallet(m.walletAddress).toLowerCase() === w &&
      (m.network ?? "").trim().toLowerCase() === n &&
      (m.cryptoCurrency ?? "").trim().toUpperCase() === c
    );
  });
}

/** Snapshot into invoice payment config (historical copy). */
export function applySavedMethodToBank(method: SavedPaymentMethod): BankPaymentConfig {
  return {
    enabled: true,
    bankName: method.bankName ?? "",
    accountName: method.accountName || method.accountHolderName || "",
    accountNumber: method.accountNumber ?? "",
    iban: method.iban ?? "",
    swift: method.swiftBic ?? "",
    currency: method.bankCurrency ?? "",
    instructions: method.paymentReference ?? "",
  };
}

export function applySavedMethodToCrypto(method: SavedPaymentMethod): CryptoPaymentConfig {
  return {
    enabled: true,
    currency: method.cryptoCurrency || "USDT",
    network: method.network || "TRON TRC20",
    walletAddress: method.walletAddress || "",
  };
}

export function bankConfigLooksSavable(bank: BankPaymentConfig): boolean {
  return Boolean(normalizeIban(bank.iban) || (bank.accountNumber ?? "").trim());
}

export function cryptoConfigLooksSavable(crypto: CryptoPaymentConfig): boolean {
  return Boolean(normalizeWallet(crypto.walletAddress));
}

export function paymentMethodsFromSaved(
  base: PaymentMethodsConfig,
  bank?: SavedPaymentMethod | null,
  crypto?: SavedPaymentMethod | null,
): PaymentMethodsConfig {
  const next: PaymentMethodsConfig = {
    ...base,
    bank: bank ? applySavedMethodToBank(bank) : { ...base.bank },
    crypto: crypto ? applySavedMethodToCrypto(crypto) : { ...base.crypto },
  };
  if (bank) next.bank.enabled = true;
  if (crypto) next.crypto.enabled = true;
  return next;
}
