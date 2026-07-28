import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";

export function AnalyticsScripts() {
  return (
    <>
      <GoogleTagManager />
      <GoogleAnalytics />
      <MicrosoftClarity />
    </>
  );
}
