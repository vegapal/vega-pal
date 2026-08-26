import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { LayoutDashboard, Users, LogOut, CircleAlert } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ConfirmEmailPending } from "@/components/auth/ConfirmEmailPending";
import { auth, useSession } from "@/lib/vegapal-store";
import { fetchAdminMe } from "@/lib/admin/admin-client";

type AdminGate = "loading" | "denied" | "allowed";

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading, pendingEmailConfirmation, authEmail } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [gate, setGate] = useState<AdminGate>("loading");

  useEffect(() => {
    if (loading) return;
    if (pendingEmailConfirmation) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    let cancelled = false;
    fetchAdminMe()
      .then((result) => {
        if (cancelled) return;
        setGate(result.isAdmin ? "allowed" : "denied");
      })
      .catch(() => {
        if (cancelled) return;
        navigate({ to: "/login" });
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user, pendingEmailConfirmation, navigate]);

  if (loading || gate === "loading") {
    return (
      <div className="min-h-screen bg-ice flex items-center justify-center text-sm text-muted-foreground">
        Loading admin…
      </div>
    );
  }

  if (pendingEmailConfirmation) {
    return <ConfirmEmailPending email={authEmail} />;
  }

  if (gate === "denied") {
    return (
      <div className="min-h-screen bg-ice flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto h-12 w-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <CircleAlert className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have permission to view the VegaPal admin area.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const nav = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users", icon: Users, exact: false },
  ];

  const isActive = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <div className="px-5 py-5">
          <Link to="/admin" className="inline-flex">
            <Logo size="default" />
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">Admin</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                {...(item.to === "/admin/users" ? { search: { deleted: false } } : {})}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-slate hover:bg-soft-section hover:text-ink"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            type="button"
            onClick={() => auth.signOut().then(() => navigate({ to: "/login" }))}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-3 overflow-visible min-h-14">
          <Link to="/admin" className="inline-flex items-center gap-2 overflow-visible">
            <Logo size="sm" />
            <span className="font-semibold text-sm text-ink">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant={pathname.startsWith("/admin/users") ? "secondary" : "ghost"}>
              <Link to="/admin/users" search={{ deleted: false }}>
                Users
              </Link>
            </Button>
            <Button asChild size="sm" variant={pathname === "/admin" ? "secondary" : "ghost"}>
              <Link to="/admin">Overview</Link>
            </Button>
          </div>
        </header>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
