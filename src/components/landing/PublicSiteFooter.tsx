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

/** Kept short on purpose: one entry per public cluster, not a link farm. */
const SITE_LINKS = [
  { href: "/invoice-generator", label: "Invoice generator" },
  { href: "/crypto-invoice", label: "Crypto invoicing" },
  { href: "/tools", label: "Free tools" },
  { href: "/learn", label: "Learn" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

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
            <a
              href={VEGAPAL_SUPPORT_EMAIL_HREF}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
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
            <a
              href="/#contact"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Contact Form
            </a>
          </nav>
          <p className="text-sm text-muted-foreground">{copyrightLine}</p>
        </div>
        <nav
          className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm"
          aria-label="Site"
        >
          {SITE_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground text-center lg:text-left max-w-4xl leading-relaxed">
          {VEGAPAL_SUPPORT_TRUST}
        </p>
      </div>
    </footer>
  );
}
