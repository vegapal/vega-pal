import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { captureGrowthParamsFromUrl } from "@/lib/growth/attribution-client";
import { claimPendingReferralAttribution } from "@/lib/growth/referral-client";
import { useSession } from "@/lib/vegapal-store";

/** Capture ?ref= / UTM on every navigation; claim referral after auth. */
export function GrowthAttributionCapture() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const { user, loading } = useSession();

  useEffect(() => {
    captureGrowthParamsFromUrl(searchStr || "", pathname);
  }, [pathname, searchStr]);

  useEffect(() => {
    if (loading || !user) return;
    void claimPendingReferralAttribution();
  }, [loading, user?.id]);

  return null;
}
