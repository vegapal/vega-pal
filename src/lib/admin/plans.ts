export type UserPlan = "free" | "pro" | "business";

export const USER_PLANS: UserPlan[] = ["free", "pro", "business"];

export const FREE_PLAN_MONTHLY_INVOICE_LIMIT = 5;

export type PlanLimits = {
  label: string;
  maxUsers: number | "unlimited";
  maxInvoicesPerMonth: number | "unlimited";
  features: string[];
};

export function normalizeUserPlan(value: unknown): UserPlan {
  return USER_PLANS.includes(value as UserPlan) ? (value as UserPlan) : "free";
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  free: {
    label: "Free",
    maxUsers: 1,
    maxInvoicesPerMonth: FREE_PLAN_MONTHLY_INVOICE_LIMIT,
    features: ["1 user", "5 invoices per month", "All core features"],
  },
  pro: {
    label: "Pro",
    maxUsers: 2,
    maxInvoicesPerMonth: "unlimited",
    features: ["Up to 2 users", "Unlimited invoices", "Priority support"],
  },
  business: {
    label: "Business",
    maxUsers: 4,
    maxInvoicesPerMonth: "unlimited",
    features: [
      "Up to 4 users",
      "Unlimited invoices",
      "Team-ready seat limit",
      "Priority support",
    ],
  },
};
