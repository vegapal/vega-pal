import { supabase } from "@/integrations/supabase/client";
import {
  clearStoredReferralCode,
  readStoredLandingPath,
  readStoredReferralCode,
  readStoredUtm,
} from "@/lib/growth/attribution-client";

export type ReferralStats = {
  ok: boolean;
  code: string;
  linkPath: string;
  invited: number;
  activated: number;
  bonusDocuments: number;
};

/** Claim pending referral after auth. Never trusts referrer ID from client. */
export async function claimPendingReferralAttribution(): Promise<boolean> {
  const code = readStoredReferralCode();
  if (!code) return false;

  const utm = readStoredUtm();
  const landing = readStoredLandingPath();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("claim_referral_attribution", {
      p_code: code,
      p_source: utm?.source ?? null,
      p_medium: utm?.medium ?? null,
      p_campaign: utm?.campaign ?? null,
      p_term: utm?.term ?? null,
      p_content: utm?.content ?? null,
      p_landing_path: landing,
    });
    if (error) return false;
    const result = data as { ok?: boolean; attributed?: boolean; already?: boolean };
    if (result?.ok) {
      clearStoredReferralCode();
      return Boolean(result.attributed || result.already);
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchMyReferralStats(): Promise<ReferralStats | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_my_referral_stats");
    if (error || !data?.ok) return null;
    return {
      ok: true,
      code: String(data.code),
      linkPath: String(data.link_path ?? `/?ref=${data.code}`),
      invited: Number(data.invited ?? 0),
      activated: Number(data.activated ?? 0),
      bonusDocuments: Number(data.bonus_documents ?? 0),
    };
  } catch {
    return null;
  }
}
