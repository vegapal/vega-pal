import { supabase } from "@/integrations/supabase/client";
import type { PublicBillingPeriod } from "@/lib/billing/public-pricing";
import type { UsdtSubscriptionNetworkId } from "@/lib/billing/usdt-subscription-deposits";

export type SubscriptionPaymentRequestDto = {
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
  status: "pending_review" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  subscriptionId: string | null;
  subscriptionStartsAt?: string | null;
  subscriptionEndsAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in to continue.");

  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function submitSubscriptionPaymentRequest(input: {
  billingPeriod: PublicBillingPeriod;
  networkId: UsdtSubscriptionNetworkId;
  txHash: string;
  notes?: string;
}): Promise<SubscriptionPaymentRequestDto> {
  const result = await authedFetch<{ request: SubscriptionPaymentRequestDto }>(
    "/api/billing/subscription-payments",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return result.request;
}

export async function fetchAdminSubscriptionPayments(
  status: "pending_review" | "approved" | "rejected" | "all" = "pending_review",
): Promise<SubscriptionPaymentRequestDto[]> {
  const result = await authedFetch<{ requests: SubscriptionPaymentRequestDto[] }>(
    `/api/admin/subscription-payments?status=${encodeURIComponent(status)}`,
  );
  return result.requests;
}

export async function approveAdminSubscriptionPayment(
  requestId: string,
): Promise<SubscriptionPaymentRequestDto> {
  const result = await authedFetch<{ request: SubscriptionPaymentRequestDto }>(
    `/api/admin/subscription-payments/${encodeURIComponent(requestId)}/approve`,
    { method: "POST", body: "{}" },
  );
  return result.request;
}

export async function rejectAdminSubscriptionPayment(
  requestId: string,
  reason?: string,
): Promise<SubscriptionPaymentRequestDto> {
  const result = await authedFetch<{ request: SubscriptionPaymentRequestDto }>(
    `/api/admin/subscription-payments/${encodeURIComponent(requestId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
  return result.request;
}
