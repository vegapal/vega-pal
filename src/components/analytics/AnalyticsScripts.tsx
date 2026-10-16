import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

export function AnalyticsScripts() {
  return (
    <>
      <GoogleTagManager />
      <GoogleAnalytics />
      {/* Session replay stays disabled until consent and private-route isolation exist. */}
    </>
  );
}
