import type { InvoiceItem } from "@/lib/vegapal-store";

export type AmountMode = "fixed" | "percentage";

export type FinancialInput = {
  items: Pick<InvoiceItem, "quantity" | "unitPrice">[];
  discountType: AmountMode;
  taxType: AmountMode;
  /** Stored discount column: fixed amount or legacy amount */
  discountAmount: number;
  /** Stored tax column: fixed amount or legacy amount */
  taxAmount: number;
  /** Percentage 0–100 when discountType is percentage */
  discountRate?: number;
  /** Percentage 0–100 when taxType is percentage */
  taxRate?: number;
};

export type FinancialTotals = {
  subtotal: number;
  discountAmount: number;
  taxableBase: number;
  taxAmount: number;
  total: number;
};

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function itemsSubtotal(items: FinancialInput["items"]): number {
  const sub = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );
  return roundMoney(sub);
}

export function computeFinancialTotals(input: FinancialInput): FinancialTotals {
  const subtotal = itemsSubtotal(input.items);

  let discountAmount = 0;
  if (input.discountType === "percentage") {
    const rate = clampPercent(input.discountRate ?? 0);
    discountAmount = roundMoney(subtotal * (rate / 100));
  } else {
    discountAmount = roundMoney(Math.max(0, input.discountAmount));
  }

  const taxableBase = roundMoney(Math.max(0, subtotal - discountAmount));

  let taxAmount = 0;
  if (input.taxType === "percentage") {
    const rate = clampPercent(input.taxRate ?? 0);
    taxAmount = roundMoney(taxableBase * (rate / 100));
  } else {
    taxAmount = roundMoney(Math.max(0, input.taxAmount));
  }

  const total = roundMoney(Math.max(0, taxableBase + taxAmount));

  return { subtotal, discountAmount, taxableBase, taxAmount, total };
}

export function wizardPercentToStoredAmounts(state: {
  items: InvoiceItem[];
  discountEnabled: boolean;
  taxEnabled: boolean;
  discountPercent: number;
  taxPercent: number;
}): {
  discountType: AmountMode;
  taxType: AmountMode;
  discountRate: number;
  taxRate: number;
  discount: number;
  tax: number;
} {
  const totals = computeFinancialTotals({
    items: state.items,
    discountType: "percentage",
    taxType: "percentage",
    discountAmount: 0,
    taxAmount: 0,
    discountRate: state.discountEnabled ? clampPercent(state.discountPercent) : 0,
    taxRate: state.taxEnabled ? clampPercent(state.taxPercent) : 0,
  });

  return {
    discountType: "percentage",
    taxType: "percentage",
    discountRate: state.discountEnabled ? clampPercent(state.discountPercent) : 0,
    taxRate: state.taxEnabled ? clampPercent(state.taxPercent) : 0,
    discount: state.discountEnabled ? totals.discountAmount : 0,
    tax: state.taxEnabled ? totals.taxAmount : 0,
  };
}
