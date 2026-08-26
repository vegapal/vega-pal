import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackMarketingCta } from "@/lib/analytics/events";
import { useSession } from "@/lib/vegapal-store";

type SessionAwareCtaProps = {
  primaryLabel: string;
  secondaryLabel?: string;
  /** In-page hash (e.g. "#how-it-works") or internal path (e.g. "/pricing"). */
  secondaryHref?: string;
  /** Analytics event name fired on primary click. */
  eventName?: string;
  className?: string;
};

/**
 * Marketing CTA pair that respects auth state: signed-out visitors go to
 * registration, signed-in users go straight to the document editor.
 * Styled for the dark hero surfaces used by marketing pages.
 */
export function SessionAwareCta({
  primaryLabel,
  secondaryLabel,
  secondaryHref,
  eventName,
  className,
}: SessionAwareCtaProps) {
  const { user, loading } = useSession();
  const isAuthenticated = Boolean(user);

  const wrapperClass = cn(
    "flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3",
    className,
  );

  if (loading) {
    return (
      <div className={wrapperClass} aria-hidden>
        <div className="h-11 w-full sm:w-52 rounded-lg bg-white/10" />
        {secondaryLabel ? <div className="h-11 w-full sm:w-40 rounded-lg bg-white/10" /> : null}
      </div>
    );
  }

  const onPrimaryClick = () => {
    if (eventName) trackMarketingCta(eventName, { cta: primaryLabel });
  };

  const isHash = Boolean(secondaryHref?.startsWith("#"));
  const isInternalPath = Boolean(secondaryHref?.startsWith("/"));

  return (
    <div className={wrapperClass}>
      <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
        <Link
          to={isAuthenticated ? "/invoices/new" : "/register"}
          preload="intent"
          onClick={onPrimaryClick}
        >
          {primaryLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>

      {secondaryLabel && secondaryHref ? (
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          {isHash ? (
            <a href={secondaryHref}>{secondaryLabel}</a>
          ) : isInternalPath ? (
            <Link to={secondaryHref as LinkProps["to"]} preload="intent">
              {secondaryLabel}
            </Link>
          ) : (
            <a href={secondaryHref} rel="noopener noreferrer">
              {secondaryLabel}
            </a>
          )}
        </Button>
      ) : null}

      {isAuthenticated ? (
        <Button asChild variant="ghostLight" size="lg" className="w-full sm:w-auto">
          <Link to="/dashboard" preload="intent">
            Go to dashboard
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
