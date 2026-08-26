import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { InvoicePlanUsageIndicator } from "@/components/plan/InvoicePlanUsageIndicator";
import { useInvoices, type Invoice, type InvoiceStatus } from "@/lib/vegapal-store";
import { formatInvoiceAmountWithCurrency } from "@/lib/invoice-display";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton, StatCardsSkeleton } from "@/components/ui/list-skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Plus,
  Activity,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => ensureNamespacesLoaded(["dashboard"]),
  head: () => ({
    meta: [{ title: "Dashboard — VegaPal" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

type InvoiceStatusFilter = Extract<InvoiceStatus, "paid" | "pending" | "overdue">;

function invoiceCurrencyCode(inv: Invoice) {
  const code = inv.invoiceCurrency?.trim();
  return code || "USDT";
}

function safeInvoiceTotal(inv: Invoice) {
  const total = Number(inv.total);
  return Number.isFinite(total) ? total : 0;
}

function formatInvoiceTotal(inv: Invoice) {
  return formatInvoiceAmountWithCurrency(safeInvoiceTotal(inv), invoiceCurrencyCode(inv));
}

function paidVolumeByCurrency(paid: Invoice[]) {
  const totals = new Map<string, number>();
  for (const inv of paid) {
    const currency = invoiceCurrencyCode(inv);
    totals.set(currency, (totals.get(currency) ?? 0) + safeInvoiceTotal(inv));
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function VolumeValue({ paid }: { paid: Invoice[] }) {
  const grouped = paidVolumeByCurrency(paid);

  if (grouped.length === 0) {
    return <p className="mt-1 text-2xl font-bold tracking-tight text-muted-foreground">—</p>;
  }

  if (grouped.length === 1) {
    const [currency, total] = grouped[0];
    return (
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {formatInvoiceAmountWithCurrency(total, currency)}
      </p>
    );
  }

  return (
    <div className="mt-1 space-y-0.5">
      {grouped.map(([currency, total]) => (
        <p key={currency} className="text-sm font-semibold tabular-nums tracking-tight">
          {formatInvoiceAmountWithCurrency(total, currency)}
        </p>
      ))}
    </div>
  );
}

type StatCard = {
  label: string;
  icon: LucideIcon;
  accent: string;
  statusFilter?: InvoiceStatusFilter;
  value?: string;
  renderValue?: () => ReactNode;
};

const STAT_CARD_CLASS = "rounded-2xl border border-border bg-card p-5 sm:p-6 text-left w-full shadow-soft";
const CLICKABLE_STAT_CARD_CLASS = `${STAT_CARD_CLASS} cursor-pointer transition-colors hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40`;

function StatCardBody({
  icon: Icon,
  label,
  accent,
  value,
  renderValue,
}: {
  icon: LucideIcon;
  label: string;
  accent: string;
  value?: string;
  renderValue?: () => ReactNode;
}) {
  return (
    <>
      <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      {renderValue ? (
        renderValue()
      ) : (
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      )}
    </>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");
  const { data: all, loading } = useInvoices();
  const paid = useMemo(() => all.filter((i) => i.status === "paid"), [all]);
  const pending = useMemo(() => all.filter((i) => i.status === "pending"), [all]);
  const overdue = useMemo(() => all.filter((i) => i.status === "overdue"), [all]);

  const goToInvoices = (statusFilter?: InvoiceStatusFilter) => {
    if (statusFilter) {
      navigate({ to: "/invoices", search: { status: statusFilter } });
      return;
    }
    navigate({ to: "/invoices" });
  };

  const stats: StatCard[] = [
    {
      label: t("stats.totalInvoices"),
      value: all.length.toString(),
      icon: FileText,
      accent: "bg-navy/5 text-navy dark:bg-navy/30 dark:text-foreground",
    },
    {
      label: t("stats.paidInvoices"),
      value: paid.length.toString(),
      icon: CheckCircle2,
      accent: "bg-success/10 text-success",
      statusFilter: "paid",
    },
    {
      label: t("stats.pendingInvoices"),
      value: pending.length.toString(),
      icon: Clock,
      accent: "bg-warning/15 text-warning",
      statusFilter: "pending",
    },
    {
      label: t("stats.overdue"),
      value: overdue.length.toString(),
      icon: AlertTriangle,
      accent: "bg-destructive/10 text-destructive",
      statusFilter: "overdue",
    },
    {
      label: t("stats.totalVolume"),
      icon: TrendingUp,
      accent: "bg-primary/10 text-primary",
      renderValue: () => <VolumeValue paid={paid} />,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-primary uppercase tracking-wider">
            {t("overview")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">{t("welcomeBack")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
          <InvoicePlanUsageIndicator className="mt-3" showUpgradeWhenLimited />
        </div>
        <Button asChild variant="hero">
          <Link to="/invoices/new">
            <Plus className="h-4 w-4" /> {tc("buttons.newInvoice")}
          </Link>
        </Button>
      </div>

      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {stats.map((s) => {
            const body = (
              <StatCardBody
                icon={s.icon}
                label={s.label}
                accent={s.accent}
                value={s.value}
                renderValue={s.renderValue}
              />
            );

            if (s.statusFilter !== undefined || s.label === t("stats.totalInvoices")) {
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => goToInvoices(s.statusFilter)}
                  className={CLICKABLE_STAT_CARD_CLASS}
                >
                  {body}
                </button>
              );
            }

            return (
              <div key={s.label} className={STAT_CARD_CLASS}>
                {body}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-semibold">{t("recentInvoices")}</h2>
            {all.length > 0 && (
              <Link to="/invoices" className="text-sm text-primary hover:underline">
                {tc("buttons.viewAll")}
              </Link>
            )}
          </div>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : all.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                <Button asChild variant="hero">
                  <Link to="/invoices/new">{tc("buttons.createInvoice")}</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {all.slice(0, 6).map((inv) => (
                <Row key={inv.id} inv={inv} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">{t("recentActivity")}</h2>
          </div>
          {loading ? (
            <div className="px-6 py-8">
              <ListSkeleton rows={3} />
            </div>
          ) : all.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground text-center">
              {tc("empty.noActivity")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {all.slice(0, 8).map((inv) => (
                <li key={inv.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{inv.number}</span>
                      <span className="text-muted-foreground"> · {inv.clientName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ inv }: { inv: Invoice }) {
  return (
    <Link
      to="/invoices/$id"
      params={{ id: inv.id }}
      className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1.2fr_auto_auto] items-center gap-4 px-6 py-4 hover:bg-muted/40 transition"
    >
      <div className="min-w-0">
        <p className="font-medium truncate">{inv.title}</p>
        <p className="text-xs text-muted-foreground font-mono">{inv.number}</p>
      </div>
      <div className="hidden sm:block min-w-0">
        <p className="text-sm truncate">{inv.clientName}</p>
        <p className="text-xs text-muted-foreground truncate">{inv.clientEmail}</p>
      </div>
      <StatusBadge status={inv.status} />
      <div className="flex items-center gap-3">
        <span className="font-semibold tabular-nums whitespace-nowrap">
          {formatInvoiceTotal(inv)}
        </span>
      </div>
    </Link>
  );
}
