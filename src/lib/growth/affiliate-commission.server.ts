import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminClient = SupabaseClient<Database>;

/**
 * Record affiliate commission once per approved subscription payment.
 * Idempotent via UNIQUE(subscription_payment_request_id).
 */
export async function recordAffiliateCommissionForApproval(
  supabaseAdmin: AdminClient,
  input: {
    referredUserId: string;
    paymentRequestId: string;
    grossRevenueUsd: number;
  },
): Promise<{ created: boolean }> {
  if (!Number.isFinite(input.grossRevenueUsd) || input.grossRevenueUsd < 0) {
    return { created: false };
  }

  // Resolve attribution code: referral row first, then first-touch attribution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  let code: string | null = null;
  const { data: referral } = await admin
    .from("referrals")
    .select("referral_code")
    .eq("referred_user_id", input.referredUserId)
    .maybeSingle();
  if (referral?.referral_code) code = String(referral.referral_code);

  if (!code) {
    const { data: attr } = await admin
      .from("user_attribution")
      .select("first_referral_code")
      .eq("user_id", input.referredUserId)
      .maybeSingle();
    if (attr?.first_referral_code) code = String(attr.first_referral_code);
  }

  if (!code) return { created: false };

  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, commission_rate, status")
    .eq("code", code.toUpperCase())
    .eq("status", "active")
    .maybeSingle();

  if (!affiliate?.id) return { created: false };

  const rate = Number(affiliate.commission_rate);
  if (!Number.isFinite(rate) || rate < 0) return { created: false };

  const commission = Math.round(input.grossRevenueUsd * rate * 100) / 100;

  const { error } = await admin.from("affiliate_commissions").insert({
    affiliate_id: affiliate.id,
    referred_user_id: input.referredUserId,
    subscription_payment_request_id: input.paymentRequestId,
    gross_revenue_usd: input.grossRevenueUsd,
    commission_rate: rate,
    commission_amount_usd: commission,
    status: "earned",
  });

  if (error) {
    // Unique violation = already credited
    if (String(error.code) === "23505" || /duplicate|unique/i.test(String(error.message))) {
      return { created: false };
    }
    console.error("[growth] affiliate commission insert failed");
    return { created: false };
  }

  return { created: true };
}
