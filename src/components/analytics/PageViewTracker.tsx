import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/analytics/events";

export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const path = `${pathname}${search}`;
    if (lastTracked.current === path) return;
    lastTracked.current = path;
    trackPageView(path, document.title);
  }, [pathname, search]);

  return null;
}
