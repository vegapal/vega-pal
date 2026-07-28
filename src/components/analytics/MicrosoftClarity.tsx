import { useEffect } from "react";
import { MICROSOFT_CLARITY_ID, hasMicrosoftClarity } from "@/lib/analytics/config";

const CLARITY_SCRIPT_ATTR = "data-vegapal-clarity";

export function MicrosoftClarity() {
  useEffect(() => {
    if (!hasMicrosoftClarity || !MICROSOFT_CLARITY_ID) return;
    if (document.querySelector(`script[${CLARITY_SCRIPT_ATTR}]`)) return;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute(CLARITY_SCRIPT_ATTR, "true");
    script.textContent = `(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(MICROSOFT_CLARITY_ID)});`;
    document.head.appendChild(script);
  }, []);

  return null;
}
