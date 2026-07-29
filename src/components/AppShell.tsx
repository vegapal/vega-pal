import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageLoading } from "@/components/ui/page-loading";
import { ConfirmEmailPending } from "@/components/auth/ConfirmEmailPending";
import { auth, useSession } from "@/lib/vegapal-store";
import {
  LayoutDashboard,
  FilePlus2,
  Settings,
  LogOut,
  FileText,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/lib/theme";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function planLabel(plan: string, t: (k: string) => string) {
  if (plan === "pro") return t("plans.pro");
  if (plan === "business") return t("plans.business");
  return t("plans.free");
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading, pendingEmailConfirmation, authEmail } = useSession();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation("common");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user && !pendingEmailConfirmation) navigate({ to: "/login" });
  }, [loading, user, pendingEmailConfirmation, navigate]);

  if (loading) return <PageLoading message={t("buttons.loading")} />;
  if (pendingEmailConfirmation) return <ConfirmEmailPending email={authEmail} />;
  if (!user) return null;

  const nav = [
    { to: "/dashboard", label: t("nav.overview"), icon: LayoutDashboard, exact: true },
    { to: "/invoices", label: t("nav.invoices"), icon: FileText, exact: true },
    { to: "/invoices/new", label: t("nav.createInvoice"), icon: FilePlus2 },
    { to: "/settings", label: t("nav.settings"), icon: Settings },
    ...(isAdmin
      ? [{ to: "/admin", label: t("nav.adminPanel"), icon: ShieldCheck, exact: false } as const]
      : []),
  ];

  const isActive = (n: (typeof nav)[number]) =>
    n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/");

  const displayName = user.name?.trim() || user.email?.trim() || t("nav.account");
  const initial = (displayName.charAt(0) || "?").toUpperCase();
  const userPlan = user.plan ?? "free";

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-background sticky top-0 h-screen">
        <div className="p-6">
          <Link to="/dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const active = isActive(n);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <n.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-10 w-10 rounded-full bg-navy text-navy-foreground flex items-center justify-center text-sm font-semibold shrink-0"
              aria-hidden
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug break-words">{displayName}</p>
              <p className="text-xs text-muted-foreground">{planLabel(userPlan, t)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1"
                  aria-label={t("nav.accountMenu")}
                >
                  {t("nav.account")}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/settings">{t("nav.settings")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    await auth.signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-16 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-30">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link
                to="/admin"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={t("nav.adminPanel")}
              >
                <ShieldCheck className="h-4 w-4" />
              </Link>
            ) : null}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur flex pb-[env(safe-area-inset-bottom,0px)]"
          aria-label="App navigation"
        >
          {nav.map((n) => {
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
        </nav>
        <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
