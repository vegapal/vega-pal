import type {
  BankPaymentConfig,
  CashPaymentConfig,
  CryptoPaymentConfig,
  PaymentMethodType,
  PaymentMethodsConfig,
} from "@/lib/invoice-constants";

export function buildPaymentMethodsForSave(
  method: PaymentMethodType,
  crypto: CryptoPaymentConfig,
  bank: BankPaymentConfig,
  cash: CashPaymentConfig,
): PaymentMethodsConfig {
  if (method === "crypto") {
    return {
      method: "crypto",
      crypto: { ...crypto, enabled: true },
      bank: { ...bank, enabled: false },
      cash: { ...cash, enabled: false },
    };
  }
  if (method === "bank_transfer") {
    return {
      method: "bank_transfer",
      crypto: { ...crypto, enabled: false },
      bank: { ...bank, enabled: true },
      cash: { ...cash, enabled: false },
    };
  }
  if (method === "cash") {
    return {
      method: "cash",
      crypto: { ...crypto, enabled: false },
      bank: { ...bank, enabled: false },
      cash: { ...cash, enabled: true },
    };
  }
  return {
    method: "multiple",
    crypto: { ...crypto, enabled: crypto.enabled },
    bank: { ...bank, enabled: bank.enabled },
    cash: { ...cash, enabled: cash.enabled },
  };
}

export function showCryptoFields(method: PaymentMethodType, crypto: CryptoPaymentConfig) {
  return method === "crypto" || (method === "multiple" && crypto.enabled);
}

export function showBankFields(method: PaymentMethodType, bank: BankPaymentConfig) {
  return method === "bank_transfer" || (method === "multiple" && bank.enabled);
}

export function showCashFields(method: PaymentMethodType, cash: CashPaymentConfig) {
  return method === "cash" || (method === "multiple" && cash.enabled);
}
