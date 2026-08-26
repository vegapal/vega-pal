import type { UserPlan } from "@/lib/admin/plans";
import { normalizeUserPlan } from "@/lib/admin/plans";

export type SubscriptionStatus = "active" | "expired" | "canceled" | "pending";
export type SubscriptionSource = "admin_manual" | "crypto" | "stripe" | "other";
export type PaidPlan = Exclude<UserPlan, "free">;

export type SubscriptionDurationMonths = 1 | 3 | 6 | 12;

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: PaidPlan;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  activated_by: string | null;
  source: SubscriptionSource;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EffectiveSubscription = {
  effectivePlan: UserPlan;
  profilePlan: UserPlan;
  subscription: SubscriptionRow | null;
  status: SubscriptionStatus | "none";
  startsAt: string | null;
  endsAt: string | null;
  daysRemaining: number | null;
  cancelAtPeriodEnd: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
};

/** Add calendar months preserving day-of-month when possible (26 Aug → 26 Sep). */
export function addCalendarMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  // If month overflowed (e.g. Jan 31 + 1 → Mar 3), clamp to last day of target month.
  if (result.getUTCDate() < day) {
    result.setUTCDate(0);
  }
  return result;
}

export function daysRemainingUntil(endsAt: string | Date, now = new Date()): number {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function describeRemaining(days: number | null): "expired" | "expires_today" | "days" | "none" {
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days === 0) return "expires_today";
  return "days";
}

export function isSubscriptionEntitled(row: SubscriptionRow | null | undefined, now = new Date()): boolean {
  if (!row) return false;
  if (row.status !== "active") return false;
  return new Date(row.ends_at).getTime() > now.getTime();
}

export function mapSubscriptionRow(row: Record<string, unknown>): SubscriptionRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    plan: normalizeUserPlan(row.plan) === "free" ? "pro" : (normalizeUserPlan(row.plan) as PaidPlan),
    status: (row.status as SubscriptionStatus) ?? "expired",
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    canceled_at: row.canceled_at ? String(row.canceled_at) : null,
    activated_by: row.activated_by ? String(row.activated_by) : null,
    source: (row.source as SubscriptionSource) ?? "admin_manual",
    payment_reference: row.payment_reference ? String(row.payment_reference) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function buildEffectiveSubscription(
  profilePlan: UserPlan,
  subscription: SubscriptionRow | null,
  now = new Date(),
): EffectiveSubscription {
  const entitled = isSubscriptionEntitled(subscription, now);
  const effectivePlan: UserPlan = entitled && subscription ? subscription.plan : "free";
  const endsAt = subscription?.ends_at ?? null;
  const remaining = endsAt ? daysRemainingUntil(endsAt, now) : null;

  return {
    effectivePlan,
    profilePlan: normalizeUserPlan(profilePlan),
    subscription,
    status: !subscription
      ? "none"
      : entitled
        ? subscription.status
        : subscription.status === "canceled"
          ? "canceled"
          : "expired",
    startsAt: subscription?.starts_at ?? null,
    endsAt,
    daysRemaining: entitled ? remaining : remaining !== null && remaining < 0 ? remaining : null,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    isExpired: Boolean(subscription && !entitled),
    isExpiringSoon: Boolean(entitled && remaining !== null && remaining >= 0 && remaining <= 7),
  };
}
