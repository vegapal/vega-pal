import type { Database, Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPlan } from "@/lib/admin/plans";
import { normalizeUserPlan } from "@/lib/admin/plans";
import {
  addCalendarMonths,
  buildEffectiveSubscription,
  isSubscriptionEntitled,
  mapSubscriptionRow,
  type EffectiveSubscription,
  type PaidPlan,
  type SubscriptionDurationMonths,
  type SubscriptionRow,
  type SubscriptionSource,
} from "@/lib/subscriptions/types";

type AdminClient = SupabaseClient<Database>;

async function getLatestSubscription(
  supabaseAdmin: AdminClient,
  userId: string,
): Promise<SubscriptionRow | null> {
  // Untyped until generated Database includes subscriptions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSubscriptionRow(data as Record<string, unknown>);
}

async function getActiveEntitledSubscription(
  supabaseAdmin: AdminClient,
  userId: string,
  now = new Date(),
): Promise<SubscriptionRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("ends_at", now.toISOString())
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSubscriptionRow(data as Record<string, unknown>);
}

async function syncProfilePlan(
  supabaseAdmin: AdminClient,
  userId: string,
  plan: UserPlan,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan } as never)
    .eq("id", userId);
  if (error) throw error;
}

export async function getEffectiveSubscriptionForUser(
  supabaseAdmin: AdminClient,
  userId: string,
): Promise<EffectiveSubscription> {
  const [{ data: profile }, active, latest] = await Promise.all([
    supabaseAdmin.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    getActiveEntitledSubscription(supabaseAdmin, userId),
    getLatestSubscription(supabaseAdmin, userId),
  ]);

  const profilePlan = normalizeUserPlan(profile?.plan);
  const subscription = active ?? latest;
  const effective = buildEffectiveSubscription(profilePlan, subscription);

  // Heal stale profiles.plan without waiting for cron.
  if (profilePlan !== effective.effectivePlan) {
    try {
      await syncProfilePlan(supabaseAdmin, userId, effective.effectivePlan);
    } catch (err) {
      console.error("[subscriptions] profile plan sync failed");
    }
  }

  return { ...effective, profilePlan: effective.effectivePlan };
}

export type ActivateSubscriptionInput = {
  userId: string;
  plan: PaidPlan;
  months?: SubscriptionDurationMonths;
  customEndsAt?: string;
  source?: SubscriptionSource;
  paymentReference?: string;
  notes?: string;
  activatedBy: string;
};

export async function activateSubscription(
  supabaseAdmin: AdminClient,
  input: ActivateSubscriptionInput,
): Promise<{ subscription: SubscriptionRow; effective: EffectiveSubscription }> {
  const now = new Date();
  const startsAt = now;
  let endsAt: Date;
  if (input.customEndsAt) {
    endsAt = new Date(input.customEndsAt);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= now.getTime()) {
      throw new Error("Custom expiration must be a future date.");
    }
  } else {
    const months = input.months ?? 1;
    endsAt = addCalendarMonths(startsAt, months);
  }

  // End any currently entitled active rows first (immediate replacement).
  const current = await getActiveEntitledSubscription(supabaseAdmin, input.userId, now);
  if (current) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: now.toISOString(),
        cancel_at_period_end: false,
      })
      .eq("id", current.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("subscriptions")
    .insert({
      user_id: input.userId,
      plan: input.plan,
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      cancel_at_period_end: false,
      activated_by: input.activatedBy,
      source: input.source ?? "admin_manual",
      payment_reference: input.paymentReference?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  const subscription = mapSubscriptionRow(data as Record<string, unknown>);
  await syncProfilePlan(supabaseAdmin, input.userId, input.plan);
  const effective = buildEffectiveSubscription(input.plan, subscription, now);
  return { subscription, effective };
}

export type ExtendSubscriptionInput = {
  userId: string;
  months?: SubscriptionDurationMonths;
  customEndsAt?: string;
  activatedBy: string;
  notes?: string;
  /** When true, always extend from current ends_at if still entitled; else from now. */
  fromCurrentExpiry?: boolean;
};

export async function renewOrExtendSubscription(
  supabaseAdmin: AdminClient,
  input: ExtendSubscriptionInput,
): Promise<{ subscription: SubscriptionRow; effective: EffectiveSubscription }> {
  const now = new Date();
  const current = await getActiveEntitledSubscription(supabaseAdmin, input.userId, now);
  const latest = current ?? (await getLatestSubscription(supabaseAdmin, userIdSafe(input.userId)));

  if (!latest && !current) {
    throw new Error("No subscription to renew. Activate a plan first.");
  }

  const base = current ?? latest!;
  const fromExpiry = input.fromCurrentExpiry !== false;
  const startBase =
    current && fromExpiry && isSubscriptionEntitled(current, now)
      ? new Date(current.ends_at)
      : now;

  let endsAt: Date;
  if (input.customEndsAt) {
    endsAt = new Date(input.customEndsAt);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= now.getTime()) {
      throw new Error("Custom expiration must be a future date.");
    }
  } else {
    endsAt = addCalendarMonths(startBase, input.months ?? 1);
  }

  if (current) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("subscriptions")
      .update({
        ends_at: endsAt.toISOString(),
        status: "active",
        cancel_at_period_end: false,
        canceled_at: null,
        notes: input.notes?.trim() || current.notes,
      })
      .eq("id", current.id)
      .select("*")
      .single();
    if (error) throw error;
    const subscription = mapSubscriptionRow(data as Record<string, unknown>);
    await syncProfilePlan(supabaseAdmin, input.userId, subscription.plan);
    return {
      subscription,
      effective: buildEffectiveSubscription(subscription.plan, subscription, now),
    };
  }

  // Expired — create a new period from now.
  return activateSubscription(supabaseAdmin, {
    userId: input.userId,
    plan: base.plan,
    months: input.months ?? 1,
    customEndsAt: input.customEndsAt,
    activatedBy: input.activatedBy,
    notes: input.notes,
    source: base.source,
  });
}

function userIdSafe(id: string) {
  return id;
}

export async function cancelSubscriptionAtPeriodEnd(
  supabaseAdmin: AdminClient,
  userId: string,
): Promise<{ subscription: SubscriptionRow; effective: EffectiveSubscription }> {
  const current = await getActiveEntitledSubscription(supabaseAdmin, userId);
  if (!current) throw new Error("No active subscription to cancel.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("subscriptions")
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select("*")
    .single();
  if (error) throw error;
  const subscription = mapSubscriptionRow(data as Record<string, unknown>);
  return {
    subscription,
    effective: buildEffectiveSubscription(subscription.plan, subscription),
  };
}

export async function cancelSubscriptionImmediately(
  supabaseAdmin: AdminClient,
  userId: string,
): Promise<{ subscription: SubscriptionRow; effective: EffectiveSubscription }> {
  const current = await getActiveEntitledSubscription(supabaseAdmin, userId);
  if (!current) throw new Error("No active subscription to cancel.");

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: now.toISOString(),
      ends_at: now.toISOString(),
    })
    .eq("id", current.id)
    .select("*")
    .single();
  if (error) throw error;
  const subscription = mapSubscriptionRow(data as Record<string, unknown>);
  await syncProfilePlan(supabaseAdmin, userId, "free");
  return {
    subscription,
    effective: buildEffectiveSubscription("free", subscription, now),
  };
}

export async function moveUserToFree(
  supabaseAdmin: AdminClient,
  userId: string,
): Promise<EffectiveSubscription> {
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any)
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: now.toISOString(),
      ends_at: now.toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active");

  await syncProfilePlan(supabaseAdmin, userId, "free");
  return getEffectiveSubscriptionForUser(supabaseAdmin, userId);
}

export async function expireDueSubscriptions(supabaseAdmin: AdminClient): Promise<number> {
  // Prefer DB function when available.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any).rpc("expire_due_subscriptions");
  if (!error && typeof data === "number") return data;

  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error: listError } = await (supabaseAdmin as any)
    .from("subscriptions")
    .select("id, user_id")
    .eq("status", "active")
    .lte("ends_at", nowIso);

  if (listError) throw listError;
  let count = 0;
  for (const row of rows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", row.id);
    await syncProfilePlan(supabaseAdmin, row.user_id, "free");
    count += 1;
  }
  return count;
}

export type { Json };
