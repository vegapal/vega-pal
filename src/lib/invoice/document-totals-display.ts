import type { Invoice } from "@/lib/vegapal-store";
import { computeFinancialTotals } from "@/lib/invoice/financial-totals";

export type DocumentTotalsView = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  discountLabel: string | null;
  taxLabel: string | null;
};

export function documentTotalsView(inv: Invoice): DocumentTotalsView {
  const financial = computeFinancialTotals({
    items: inv.items,
    discountType: inv.discountType,
    taxType: inv.taxType,
    discountAmount: inv.discount,
    taxAmount: inv.tax,
    discountRate: inv.discountRate,
    taxRate: inv.taxRate,
  });

  let discountLabel: string | null = null;
  if (inv.displayOptions.showDiscount && financial.discountAmount > 0) {
    discountLabel =
      inv.discountType === "percentage" && inv.discountRate != null
        ? `Discount ${inv.discountRate}%`
        : "Discount";
  }

  let taxLabel: string | null = null;
  if (inv.displayOptions.showTax && financial.taxAmount > 0) {
    taxLabel =
      inv.taxType === "percentage" && inv.taxRate != null
        ? `Tax ${inv.taxRate}%`
        : "Tax";
  }

  return {
    subtotal: financial.subtotal,
    discountAmount: financial.discountAmount,
    taxAmount: financial.taxAmount,
    total: financial.total,
    discountLabel,
    taxLabel,
  };
}
