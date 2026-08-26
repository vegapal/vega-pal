import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { PUBLIC_NAV_LINKS } from "@/lib/landing-nav";
import { ArrowRight, Menu } from "lucide-react";

const LanguageSwitcher = lazy(() =>
  import("@/components/LanguageSwitcher").then((m) => ({ default: m.LanguageSwitcher })),
);

const landingNavLinkClass = "hover:text-on-dark transition-colors";

export function LandingHeader({ className = "absolute top-0 inset-x-0 z-20" }: { className?: string }) {
  const { t: tc } = useTranslation("common");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      root.style.scrollBehavior = previous;
    };
  }, []);

  return (
    <header className={className}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:pl-10 lg:pr-6 h-14 sm:h-16 lg:h-[4.25rem] flex items-center justify-between gap-3 overflow-visible">
        <Link
          to="/"
          className="shrink-0 inline-flex items-center max-w-[8.25rem] sm:max-w-[14rem] overflow-visible py-1"
        >
          <Logo light size="hero" />
        </Link>
        <nav
          className="hidden md:flex items-center gap-5 lg:gap-7 text-sm text-on-dark-secondary"
          aria-label="Main navigation"
        >
          {PUBLIC_NAV_LINKS.map((link) =>
            "to" in link ? (
              <Link key={link.to} to={link.to} className={landingNavLinkClass}>
                {tc(`nav.${link.labelKey}`)}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className={landingNavLinkClass}>
                {tc(`nav.${link.labelKey}`)}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <Suspense fallback={<span className="h-9 w-16" aria-hidden />}>
              <LanguageSwitcher variant="landing" />
            </Suspense>
            <Button asChild variant="ghostLight" size="sm">
              <Link to="/login" preload="intent">
                {tc("nav.login")}
              </Link>
            </Button>
            <Button asChild variant="hero" size="sm" className="whitespace-nowrap">
              <Link to="/register" preload="intent">
                {tc("nav.register")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex md:hidden items-center gap-1">
            <Suspense fallback={<span className="h-9 w-9" aria-hidden />}>
              <LanguageSwitcher variant="landing" compact />
            </Suspense>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-dark-secondary transition-colors hover:text-on-dark hover:bg-white/5"
                  aria-label={tc("nav.openMenu")}
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="border-white/10 bg-[#071827] text-on-dark w-[min(100vw-2rem,20rem)] flex flex-col"
              >
                <nav className="mt-10 flex flex-col gap-5 text-base text-on-dark-secondary">
                  {PUBLIC_NAV_LINKS.map((link) =>
                    "to" in link ? (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={landingNavLinkClass}
                        onClick={() => setMobileOpen(false)}
                      >
                        {tc(`nav.${link.labelKey}`)}
                      </Link>
                    ) : (
                      <a
                        key={link.href}
                        href={link.href}
                        className={landingNavLinkClass}
                        onClick={() => setMobileOpen(false)}
                      >
                        {tc(`nav.${link.labelKey}`)}
                      </a>
                    ),
                  )}
                </nav>
                <div className="mt-auto pt-8 border-t border-white/10 flex flex-col gap-3">
                  <Button asChild variant="ghostLight" className="w-full" onClick={() => setMobileOpen(false)}>
                    <Link to="/login">{tc("nav.login")}</Link>
                  </Button>
                  <Button asChild variant="hero" className="w-full" onClick={() => setMobileOpen(false)}>
                    <Link to="/register">
                      {tc("nav.register")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
