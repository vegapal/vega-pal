import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

export function FirstPartyVisitTracker() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    void import("@/lib/analytics/first-party-visits")
      .then(({ recordFirstPartyVisit }) => recordFirstPartyVisit(pathname))
      .catch(() => {
        /* Analytics must not block navigation. */
      });
  }, [pathname]);

  return null;
}
