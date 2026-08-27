import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  getProCheckoutPrice,
  getProSubscriptionMonths,
  type PublicBillingPeriod,
} from "@/lib/billing/public-pricing";
import {
  getUsdtSubscriptionDeposit,
  isUsdtSubscriptionNetworkId,
  type UsdtSubscriptionNetworkId,
} from "@/lib/billing/usdt-subscription-deposits";
import {
  activateSubscription,
  getEffectiveSubscriptionForUser,
  renewOrExtendSubscription,
} from "@/lib/subscriptions/subscription.service.server";

type AdminClient = SupabaseClient<Database>;

export type SubscriptionPaymentRequestStatus = "pending_review" | "approved" | "rejected";

export type SubscriptionPaymentRequestRow = {
  id: string;
  userId: string;
  userEmail: string | null;
  plan: "pro";
  billingPeriod: PublicBillingPeriod;
  amountUsdt: number;
  months: 1 | 6;
  networkId: UsdtSubscriptionNetworkId;
  networkLabel: string;
  destinationAddress: string;
  txHash: string;
  notes: string | null;
  status: SubscriptionPaymentRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  subscriptionId: string | null;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(
  row: Record<string, unknown>,
  extras?: {
    userEmail?: string | null;
    subscriptionStartsAt?: string | null;
    subscriptionEndsAt?: string | null;
  },
): SubscriptionPaymentRequestRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userEmail: extras?.userEmail ?? null,
    plan: "pro",
    billingPeriod: row.billing_period === "semiannual" ? "semiannual" : "monthly",
    amountUsdt: Number(row.amount_usdt),
    months: Number(row.months) === 6 ? 6 : 1,
    networkId: row.network_id as UsdtSubscriptionNetworkId,
    networkLabel: String(row.network_label),
    destinationAddress: String(row.destination_address),
    txHash: String(row.tx_hash),
    notes: row.notes ? String(row.notes) : null,
    status: row.status as SubscriptionPaymentRequestStatus,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
    subscriptionStartsAt: extras?.subscriptionStartsAt ?? null,
    subscriptionEndsAt: extras?.subscriptionEndsAt ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function normalizeTxHash(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export async function createSubscriptionPaymentRequest(
  supabaseAdmin: AdminClient,
  input: {
    userId: string;
    billingPeriod: PublicBillingPeriod;
    networkId: UsdtSubscriptionNetworkId;
    txHash: string;
    notes?: string;
  },
): Promise<SubscriptionPaymentRequestRow> {
  if (input.billingPeriod !== "monthly" && input.billingPeriod !== "semiannual") {
    throw new Error("Invalid billing period.");
  }
  if (!isUsdtSubscriptionNetworkId(input.networkId)) {
    throw new Error("Unsupported USDT network.");
  }

  const txHash = normalizeTxHash(input.txHash);
  if (txHash.length < 8 || txHash.length > 200) {
    throw new Error("Enter a valid transaction hash / TxID.");
  }
  if (/private\s*key|seed|mnemonic|recovery/i.test(txHash)) {
    throw new Error("Never paste a private key or recovery phrase.");
  }

  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 1000) {
    throw new Error("Notes are too long.");
  }
  if (notes && /private\s*key|seed phrase|mnemonic|recovery phrase/i.test(notes)) {
    throw new Error("Never share your private key or recovery phrase.");
  }

  const deposit = getUsdtSubscriptionDeposit(input.networkId);
  const amountUsdt = getProCheckoutPrice(input.billingPeriod);
  const months = getProSubscriptionMonths(input.billingPeriod);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("subscription_payment_requests")
    .insert({
      user_id: input.userId,
      plan: "pro",
      billing_period: input.billingPeriod,
      amount_usdt: amountUsdt,
      months,
      network_id: deposit.id,
      network_label: deposit.label,
      destination_address: deposit.address,
      tx_hash: txHash,
      notes,
      status: "pending_review",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function listSubscriptionPaymentRequests(
  supabaseAdmin: AdminClient,
  filter: { status?: SubscriptionPaymentRequestStatus | "all" } = {},
): Promise<SubscriptionPaymentRequestRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabaseAdmin as any)
    .from("subscription_payment_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const emailByUser = new Map<string, string | null>();
  const subDates = new Map<string, { startsAt: string | null; endsAt: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      emailByUser.set(profile.id, profile.email ?? null);
    }
  }

  const subscriptionIds = [
    ...new Set(
      rows
        .map((r) => (r.subscription_id ? String(r.subscription_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (subscriptionIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs } = await (supabaseAdmin as any)
      .from("subscriptions")
      .select("id, starts_at, ends_at")
      .in("id", subscriptionIds);
    for (const sub of (subs ?? []) as Array<{
      id: string;
      starts_at: string | null;
      ends_at: string | null;
    }>) {
      subDates.set(sub.id, { startsAt: sub.starts_at, endsAt: sub.ends_at });
    }
  }

  return rows.map((row) => {
    const subId = row.subscription_id ? String(row.subscription_id) : null;
    const dates = subId ? subDates.get(subId) : undefined;
    return mapRow(row, {
      userEmail: emailByUser.get(String(row.user_id)) ?? null,
      subscriptionStartsAt: dates?.startsAt ?? null,
      subscriptionEndsAt: dates?.endsAt ?? null,
    });
  });
}

export async function approveSubscriptionPaymentRequest(
  supabaseAdmin: AdminClient,
  input: { requestId: string; adminUserId: string },
): Promise<SubscriptionPaymentRequestRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: loadError } = await (supabaseAdmin as any)
    .from("subscription_payment_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!existing) throw new Error("Payment request not found.");

  const current = mapRow(existing as Record<string, unknown>);

  if (current.status === "approved") {
    return current;
  }
  if (current.status === "rejected") {
    throw new Error("This payment request was already rejected.");
  }

  const nowIso = new Date().toISOString();

  // Claim first so concurrent approvals cannot activate twice.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claimed, error: claimError } = await (supabaseAdmin as any)
    .from("subscription_payment_requests")
    .update({
      status: "approved",
      reviewed_by: input.adminUserId,
      reviewed_at: nowIso,
      rejection_reason: null,
      updated_at: nowIso,
    })
    .eq("id", current.id)
    .eq("status", "pending_review")
    .select("*")
    .maybeSingle();

  if (claimError) throw claimError;

  if (!claimed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: again } = await (supabaseAdmin as any)
      .from("subscription_payment_requests")
      .select("*")
      .eq("id", current.id)
      .maybeSingle();
    if (again) {
      const mapped = mapRow(again as Record<string, unknown>);
      if (mapped.status === "approved") return mapped;
    }
    throw new Error("Could not finalize payment approval.");
  }

  try {
    const effective = await getEffectiveSubscriptionForUser(supabaseAdmin, current.userId);
    const entitled =
      effective.effectivePlan === "pro" || effective.effectivePlan === "business";

    let subscriptionId: string;
    if (entitled) {
      const result = await renewOrExtendSubscription(supabaseAdmin, {
        userId: current.userId,
        months: current.months,
        activatedBy: input.adminUserId,
        notes: `USDT payment request ${current.id}; tx ${current.txHash}`,
        fromCurrentExpiry: true,
      });
      subscriptionId = result.subscription.id;
    } else {
      const result = await activateSubscription(supabaseAdmin, {
        userId: current.userId,
        plan: "pro",
        months: current.months,
        source: "crypto",
        paymentReference: current.txHash,
        notes: `USDT ${current.networkLabel}; request ${current.id}`,
        activatedBy: input.adminUserId,
      });
      subscriptionId = result.subscription.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from("subscription_payment_requests")
      .update({
        subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    try {
      const { recordAffiliateCommissionForApproval } = await import(
        "@/lib/growth/affiliate-commission.server"
      );
      await recordAffiliateCommissionForApproval(supabaseAdmin, {
        referredUserId: current.userId,
        paymentRequestId: current.id,
        grossRevenueUsd: Number(current.amountUsdt ?? 0),
      });
    } catch {
      /* commission accounting must not roll back Pro activation */
    }

    const subId = String((updated as Record<string, unknown>).subscription_id ?? subscriptionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabaseAdmin as any)
      .from("subscriptions")
      .select("starts_at, ends_at")
      .eq("id", subId)
      .maybeSingle();

    return mapRow(updated as Record<string, unknown>, {
      userEmail: current.userEmail,
      subscriptionStartsAt: sub?.starts_at ?? null,
      subscriptionEndsAt: sub?.ends_at ?? null,
    });
  } catch (err) {
    // Roll back claim so another admin can retry after a failed activation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("subscription_payment_requests")
      .update({
        status: "pending_review",
        reviewed_by: null,
        reviewed_at: null,
        subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .eq("status", "approved")
      .is("subscription_id", null);
    throw err;
  }
}

export async function rejectSubscriptionPaymentRequest(
  supabaseAdmin: AdminClient,
  input: { requestId: string; adminUserId: string; reason?: string },
): Promise<SubscriptionPaymentRequestRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: loadError } = await (supabaseAdmin as any)
    .from("subscription_payment_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!existing) throw new Error("Payment request not found.");

  const current = mapRow(existing as Record<string, unknown>);
  if (current.status === "rejected") return current;
  if (current.status === "approved") {
    throw new Error("Approved payments cannot be rejected.");
  }

  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (supabaseAdmin as any)
    .from("subscription_payment_requests")
    .update({
      status: "rejected",
      reviewed_by: input.adminUserId,
      reviewed_at: nowIso,
      rejection_reason: input.reason?.trim() || null,
      updated_at: nowIso,
    })
    .eq("id", current.id)
    .eq("status", "pending_review")
    .select("*")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: again } = await (supabaseAdmin as any)
      .from("subscription_payment_requests")
      .select("*")
      .eq("id", current.id)
      .maybeSingle();
    if (again) return mapRow(again as Record<string, unknown>);
    throw new Error("Could not reject payment request.");
  }

  return mapRow(updated as Record<string, unknown>);
}
