import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  FileText,
  CheckCircle2,
  Clock,
  Crown,
  Building2,
  Sparkles,
  UserX,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchAdminStats, type AdminStats } from "@/lib/admin/admin-client";
import { formatAppError } from "@/lib/auth/errors";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { FormError } from "@/components/ui/form-error";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => ensureNamespacesLoaded(["admin"]),
  component: AdminDashboardPage,
});

const STAT_CARD_CLASS = "rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft";

function AdminDashboardPage() {
  const { t } = useTranslation("admin");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((err) => setError(formatAppError(err)));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto min-w-0">
      <div className="mb-8">
        <p className="text-xs font-medium text-primary uppercase tracking-wider">{t("eyebrow")}</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {error ? (
        <FormError message={error} />
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">{t("dashboard.loading")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          <StatCard label={t("dashboard.stats.totalUsers")} value={stats.totalUsers} icon={Users} accent="bg-primary/10 text-primary" />
          <StatCard label={t("dashboard.stats.newUsersToday")} value={stats.newUsersToday} icon={UserPlus} accent="bg-navy/5 text-navy dark:text-foreground" />
          <StatCard label={t("dashboard.stats.newUsersThisWeek", { defaultValue: "New users this week" })} value={stats.newUsersThisWeek ?? 0} icon={CalendarDays} accent="bg-navy/5 text-navy dark:text-foreground" />
          <StatCard label={t("dashboard.stats.newUsersThisMonth")} value={stats.newUsersThisMonth} icon={CalendarDays} accent="bg-navy/5 text-navy dark:text-foreground" />
          <StatCard label={t("dashboard.stats.activeUsers", { defaultValue: "Active users" })} value={stats.activeUsers ?? 0} icon={Users} accent="bg-success/10 text-success" />
          <StatCard label={t("dashboard.stats.freeUsers")} value={stats.freeUsers} icon={Sparkles} accent="bg-muted text-foreground" />
          <StatCard label={t("dashboard.stats.proUsers")} value={stats.proUsers} icon={Crown} accent="bg-warning/15 text-warning" />
          <StatCard label={t("dashboard.stats.businessUsers")} value={stats.businessUsers} icon={Building2} accent="bg-success/10 text-success" />
          <StatCard label={t("dashboard.stats.disabledUsers")} value={stats.disabledUsers} icon={UserX} accent="bg-destructive/10 text-destructive" />
          <StatCard label={t("dashboard.stats.activePaid", { defaultValue: "Active paid subscriptions" })} value={stats.activePaidSubscriptions ?? 0} icon={Crown} accent="bg-warning/15 text-warning" />
          <StatCard label={t("dashboard.stats.expiring7", { defaultValue: "Expiring in 7 days" })} value={stats.expiringIn7Days ?? 0} icon={Clock} accent="bg-warning/15 text-warning" />
          <StatCard label={t("dashboard.stats.expiring30", { defaultValue: "Expiring in 30 days" })} value={stats.expiringIn30Days ?? 0} icon={Clock} accent="bg-warning/15 text-warning" />
          <StatCard label={t("dashboard.stats.expiredSubs", { defaultValue: "Expired subscriptions" })} value={stats.expiredSubscriptions ?? 0} icon={UserX} accent="bg-destructive/10 text-destructive" />
          <StatCard label={t("dashboard.stats.totalInvoices")} value={stats.totalInvoices} icon={FileText} accent="bg-navy/5 text-navy dark:text-foreground" />
          <StatCard label={t("dashboard.stats.invoicesToday", { defaultValue: "Invoices today" })} value={stats.invoicesToday ?? 0} icon={FileText} accent="bg-primary/10 text-primary" />
          <StatCard label={t("dashboard.stats.invoicesThisMonth")} value={stats.invoicesThisMonth} icon={FileText} accent="bg-primary/10 text-primary" />
          <StatCard label={t("dashboard.stats.paidInvoices")} value={stats.paidInvoices} icon={CheckCircle2} accent="bg-success/10 text-success" />
          <StatCard label={t("dashboard.stats.pendingInvoices")} value={stats.pendingInvoices} icon={Clock} accent="bg-warning/15 text-warning" />
          <StatCard label={t("dashboard.stats.overdueInvoices", { defaultValue: "Overdue invoices" })} value={stats.overdueInvoices ?? 0} icon={AlertTriangle} accent="bg-destructive/10 text-destructive" />
        </div>
      )}
      {stats?.volumeByCurrency && Object.keys(stats.volumeByCurrency).length > 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-semibold text-base">Invoiced volume by currency</h2>
          <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {Object.entries(stats.volumeByCurrency).map(([currency, total]) => (
              <li key={currency} className="flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
                <span className="font-medium">{currency}</span>
                <span className="tabular-nums">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <div className={STAT_CARD_CLASS}>
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
