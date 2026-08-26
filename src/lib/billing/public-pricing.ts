/**
 * Public marketing / checkout pricing (truthful launch offers).
 * Business remains an internal/admin plan only — not sold on the marketing page.
 */

export type PublicBillingPeriod = "monthly" | "semiannual";

export const FREE_PLAN_MONTHLY_DOCUMENT_LIMIT = 3;

export const PRO_MONTHLY_PRICE_USD = 29;
export const PRO_SEMIANNUAL_PRICE_USD = 59;
export const PRO_SEMIANNUAL_MONTHS = 6;

/** Real cost of paying monthly for the same duration (6 × $29). */
export const PRO_SEMIANNUAL_MONTHLY_EQUIVALENT_TOTAL_USD =
  PRO_MONTHLY_PRICE_USD * PRO_SEMIANNUAL_MONTHS; // 174

export const PRO_SEMIANNUAL_SAVINGS_USD =
  PRO_SEMIANNUAL_MONTHLY_EQUIVALENT_TOTAL_USD - PRO_SEMIANNUAL_PRICE_USD; // 115

/** 59 / 6 ≈ 9.833… → display as $9.83/month */
export const PRO_SEMIANNUAL_PER_MONTH_USD = Number(
  (PRO_SEMIANNUAL_PRICE_USD / PRO_SEMIANNUAL_MONTHS).toFixed(2),
); // 9.83

/** (115 / 174) ≈ 66% */
export const PRO_SEMIANNUAL_SAVE_PERCENT = Math.round(
  (PRO_SEMIANNUAL_SAVINGS_USD / PRO_SEMIANNUAL_MONTHLY_EQUIVALENT_TOTAL_USD) * 100,
);

export function getProCheckoutPrice(period: PublicBillingPeriod): number {
  return period === "semiannual" ? PRO_SEMIANNUAL_PRICE_USD : PRO_MONTHLY_PRICE_USD;
}

export function getProSubscriptionMonths(period: PublicBillingPeriod): 1 | 6 {
  return period === "semiannual" ? 6 : 1;
}
