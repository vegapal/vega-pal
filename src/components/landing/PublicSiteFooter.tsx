import { Logo } from "@/components/Logo";
import {
  VEGAPAL_SUPPORT_EMAIL,
  VEGAPAL_SUPPORT_EMAIL_HREF,
  VEGAPAL_SUPPORT_TELEGRAM_HANDLE,
  VEGAPAL_SUPPORT_TELEGRAM_HREF,
  VEGAPAL_SUPPORT_TRUST,
} from "@/lib/support-contact";

type PublicSiteFooterProps = {
  copyright?: string;
};

export function PublicSiteFooter({ copyright }: PublicSiteFooterProps) {
  const year = new Date().getFullYear();
  const copyrightLine = copyright ?? `© ${year} VegaPal. Secure Payments & Trusted Deals.`;

  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 text-center lg:text-left">
          <Logo size="lg" />
          <nav
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm"
            aria-label="Support contact"
          >
            <a href={VEGAPAL_SUPPORT_EMAIL_HREF} className="text-muted-foreground hover:text-primary transition-colors">
              {VEGAPAL_SUPPORT_EMAIL}
            </a>
            <a
              href={VEGAPAL_SUPPORT_TELEGRAM_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {VEGAPAL_SUPPORT_TELEGRAM_HANDLE}
            </a>
            <a href="/#contact" className="text-muted-foreground hover:text-primary transition-colors">
              Contact Form
            </a>
          </nav>
          <p className="text-sm text-muted-foreground">{copyrightLine}</p>
        </div>
        <p className="text-xs text-muted-foreground text-center lg:text-left max-w-4xl leading-relaxed">
          {VEGAPAL_SUPPORT_TRUST}
        </p>
      </div>
    </footer>
  );
}
