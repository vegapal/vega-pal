import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageLoading } from "@/components/ui/page-loading";
import { ConfirmEmailPending } from "@/components/auth/ConfirmEmailPending";
import { useSession } from "@/lib/vegapal-store";
import {
  LayoutDashboard,
  FilePlus2,
  Settings,
  FileText,
  UserCog,
  User,
  Wallet,
} from "lucide-react";
import { Logo } from "./Logo";
import { MobileProfileSheet, ProfileSidebarMenu } from "@/components/ProfileAccountMenu";
import { useIsAdmin } from "@/hooks/use-is-admin";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading, pendingEmailConfirmation, authEmail } = useSession();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation("common");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && !pendingEmailConfirmation) navigate({ to: "/login" });
  }, [loading, user, pendingEmailConfirmation, navigate]);

  if (loading) return <PageLoading message={t("buttons.loading")} />;
  if (pendingEmailConfirmation) return <ConfirmEmailPending email={authEmail} />;
  if (!user) return null;

  type NavItem = {
    to: "/dashboard" | "/invoices" | "/invoices/new" | "/settings" | "/settings/payment-methods" | "/admin";
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
  };

  const desktopNav: NavItem[] = [
    { to: "/dashboard", label: t("nav.overview"), icon: LayoutDashboard, exact: true },
    { to: "/invoices", label: t("nav.documents"), icon: FileText, exact: true },
    { to: "/invoices/new", label: t("nav.createDocument"), icon: FilePlus2 },
    {
      to: "/settings/payment-methods",
      label: t("nav.paymentMethods"),
      icon: Wallet,
      exact: true,
    },
    { to: "/settings", label: t("nav.settings"), icon: Settings, exact: true },
    ...(isAdmin
      ? [{ to: "/admin" as const, label: t("nav.adminPanel"), icon: UserCog, exact: false }]
      : []),
  ];

  const mobileNav: NavItem[] = [
    { to: "/dashboard", label: t("nav.overview"), icon: LayoutDashboard, exact: true },
    { to: "/invoices", label: t("nav.documents"), icon: FileText, exact: true },
    { to: "/invoices/new", label: t("nav.createDocument"), icon: FilePlus2 },
    { to: "/settings", label: t("nav.settings"), icon: Settings, exact: false },
  ];

  const isActive = (n: NavItem) =>
    n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(`${n.to}/`);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${
      active
        ? "bg-primary/10 text-primary"
        : "text-slate hover:bg-soft-section hover:text-ink"
    }`;

  return (
    <div className="min-h-screen bg-canvas">
      <aside
        className="hidden lg:flex fixed inset-y-0 start-0 z-30 w-64 flex-col border-e border-border bg-card h-[100dvh] max-h-[100dvh] overflow-hidden"
        aria-label={t("nav.sidebar")}
      >
        <div className="shrink-0 px-5 py-5">
          <Link to="/dashboard" className="inline-flex">
            <Logo size="default" />
          </Link>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 space-y-0.5">
          {desktopNav.map((n) => {
            const active = isActive(n);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                <n.icon className={cnIcon(active)} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-border p-2">
          <ProfileSidebarMenu user={user} />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col min-w-0 lg:ps-64">
        <header className="lg:hidden h-14 border-b border-border bg-card/95 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-30 overflow-visible">
          <Link to="/dashboard" className="inline-flex items-center overflow-visible py-1">
            <Logo markOnly size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link
                to="/admin"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={t("nav.adminPanel")}
              >
                <UserCog className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={t("profileMenu.openMenu")}
              onClick={() => setMobileProfileOpen(true)}
            >
              <User className="h-4 w-4" />
            </button>
          </div>
        </header>
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur flex pb-[env(safe-area-inset-bottom,0px)]"
          aria-label="App navigation"
        >
          {mobileNav.map((n) => {
            const active = isActive(n);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-2 min-h-[3.5rem] text-[10px] font-medium leading-tight ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-4 w-4 shrink-0" />
                <span className="max-w-[4.5rem] truncate text-center">{n.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileProfileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-2 min-h-[3.5rem] text-[10px] font-medium leading-tight text-muted-foreground"
            aria-label={t("profileMenu.openMenu")}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="max-w-[4.5rem] truncate text-center">{t("nav.account")}</span>
          </button>
        </nav>
        <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>

      <MobileProfileSheet user={user} open={mobileProfileOpen} onOpenChange={setMobileProfileOpen} />
    </div>
  );
}

function cnIcon(active: boolean) {
  return `h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`;
}
