import type { UserPlan } from "@/lib/admin/plans";
import { FREE_PLAN_MONTHLY_INVOICE_LIMIT } from "@/lib/admin/plans";

export type InvoicePlanUsage = {
  plan: UserPlan;
  invoicesThisMonth: number;
  monthlyLimit: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  daysRemaining?: number | null;
  isExpiringSoon?: boolean;
  cancelAtPeriodEnd?: boolean;
};

export const FREE_PLAN_LIMIT_MESSAGE =
  "You have reached the Free plan limit of 3 documents this month. Upgrade to Pro to create unlimited invoices.";

export function isFreePlanLimitError(err: unknown): boolean {
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err ?? "");
  return (
    message.includes("FREE_PLAN_INVOICE_LIMIT") ||
    message.includes("Free plan limit of 3 documents") ||
    message.includes("Free plan document limit for this month")
  );
}

export function formatInvoicePlanUsageLabel(usage: InvoicePlanUsage): string {
  if (usage.monthlyLimit === null) {
    return "Unlimited invoices";
  }
  return `${usage.invoicesThisMonth}/${usage.monthlyLimit} invoices used this month`;
}

export function isAtFreePlanInvoiceLimit(usage: InvoicePlanUsage): boolean {
  return (
    usage.plan === "free" &&
    usage.monthlyLimit !== null &&
    usage.invoicesThisMonth >= usage.monthlyLimit
  );
}

export function isNearFreePlanInvoiceLimit(usage: InvoicePlanUsage): boolean {
  return (
    usage.plan === "free" &&
    usage.monthlyLimit !== null &&
    usage.invoicesThisMonth >= usage.monthlyLimit - 1 &&
    usage.invoicesThisMonth < usage.monthlyLimit
  );
}

export { FREE_PLAN_MONTHLY_INVOICE_LIMIT };
