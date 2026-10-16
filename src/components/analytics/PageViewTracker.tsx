import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/analytics/events";

export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    trackPageView(pathname, document.title);
  }, [pathname]);

  return null;
}
