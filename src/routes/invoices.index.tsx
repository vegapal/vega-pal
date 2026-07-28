import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { useInvoices, type Invoice, type InvoiceStatus } from "@/lib/vegapal-store";
import { formatInvoiceAmountWithCurrency } from "@/lib/invoice-display";
import {
  exportInvoicesToExcel,
  filterInvoicesByIssueDateRange,
  formatInvoiceListDate,
} from "@/lib/invoice-export";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, Download, FileText, Plus, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

const STATUS_SEARCH_VALUES = [
  "paid",
  "pending",
  "overdue",
  "draft",
  "cancelled",
] as const satisfies readonly InvoiceStatus[];

type InvoicesSearch = {
  status?: (typeof STATUS_SEARCH_VALUES)[number];
};

const TABLE_GRID =
  "md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_7.5rem_6.5rem_minmax(5.5rem,1fr)_2.5rem] md:items-center md:gap-4";

export const Route = createFileRoute("/invoices/")({
  validateSearch: (search: Record<string, unknown>): InvoicesSearch => {
    if (!search || typeof search !== "object") return {};
    const status = search.status;
    if (
      typeof status === "string" &&
      (STATUS_SEARCH_VALUES as readonly string[]).includes(status)
    ) {
      return { status: status as InvoicesSearch["status"] };
    }
    return {};
  },
  beforeLoad: () => ensureNamespacesLoaded(["invoices"]),
  head: () => ({
    meta: [{ title: "Invoices — VegaPal" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AppShell>
      <InvoicesPage />
    </AppShell>
  ),
});

type Filter = "all" | InvoiceStatus;

function InvoicesPage() {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const { data: all, loading } = useInvoices();
  const { status: statusFromUrl } = Route.useSearch();
  const navigate = useNavigate({ from: "/invoices/" });
  const filter: Filter = statusFromUrl ?? "all";
  const [q, setQ] = useState("");
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");

  const setFilter = (key: Filter) => {
    navigate({
      search: key === "all" ? {} : { status: key },
    });
  };

  const filtered = useMemo(() => {
    return all.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        i.title.toLowerCase().includes(s) ||
        i.number.toLowerCase().includes(s) ||
        i.clientName.toLowerCase().includes(s) ||
        i.clientEmail.toLowerCase().includes(s)
      );
    });
  }, [all, filter, q]);

  const counts = {
    all: all.length,
    pending: all.filter((i) => i.status === "pending").length,
    paid: all.filter((i) => i.status === "paid").length,
    overdue: all.filter((i) => i.status === "overdue").length,
    cancelled: all.filter((i) => i.status === "cancelled").length,
  };

  const handleExport = async () => {
    const toExport = filterInvoicesByIssueDateRange(filtered, exportFromDate, exportToDate);
    if (!(await exportInvoicesToExcel(toExport))) {
      window.alert(tc("alerts.noInvoicesToExport"));
    }
  };

  const filterButtons = [
    ["all", t("list.filters.all"), counts.all],
    ["pending", t("list.filters.pending"), counts.pending],
    ["paid", t("list.filters.paid"), counts.paid],
    ["overdue", t("list.filters.overdue"), counts.overdue],
    ["cancelled", t("list.filters.cancelled"), counts.cancelled],
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("list.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("list.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={handleExport} disabled={loading}>
            <Download className="h-4 w-4" />
            {tc("buttons.exportExcel")}
          </Button>
          <Button asChild variant="hero">
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" /> {tc("buttons.newInvoice")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col gap-4 px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/60 p-1">
              {filterButtons.map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as Filter)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label} <span className="ml-1 text-muted-foreground">{count}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full min-w-0 sm:max-w-sm sm:ml-auto">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="export-from-date" className="text-xs text-muted-foreground">
                {tc("labels.fromDate")}
              </Label>
              <Input
                id="export-from-date"
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
                className="w-[11.5rem]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-to-date" className="text-xs text-muted-foreground">
                {tc("labels.toDate")}
              </Label>
              <Input
                id="export-to-date"
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
                className="w-[11.5rem]"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <ListSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("list.empty.title")}
            description={
              all.length === 0 ? t("list.empty.noInvoices") : t("list.empty.tryDifferent")
            }
            action={
              all.length === 0 ? (
                <Button asChild variant="hero">
                  <Link to="/invoices/new">{tc("buttons.createInvoice")}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border">
            <div
              className={`hidden ${TABLE_GRID} px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-muted/30`}
            >
              <span className="text-left">{tc("labels.invoice")}</span>
              <span className="text-left">{tc("labels.client")}</span>
              <span className="text-left">{tc("labels.date")}</span>
              <span className="text-center">{tc("labels.status")}</span>
              <span className="text-right">{tc("labels.amount")}</span>
              <span className="sr-only">{tc("labels.action")}</span>
            </div>
            {filtered.map((inv) => (
              <Row key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ inv }: { inv: Invoice }) {
  const { t: tc } = useTranslation("common");
  const currency = inv.invoiceCurrency?.trim() || "USDT";
  const total = Number(inv.total);
  const amount = Number.isFinite(total)
    ? formatInvoiceAmountWithCurrency(total, currency)
    : formatInvoiceAmountWithCurrency(0, currency);
  const date = formatInvoiceListDate(inv.issueDate);

  return (
    <>
      <Link
        to="/invoices/$id"
        params={{ id: inv.id }}
        className={`hidden md:grid ${TABLE_GRID} px-6 py-4 hover:bg-muted/40 transition`}
      >
        <div className="min-w-0">
          <p className="font-medium truncate">{inv.title}</p>
          <p className="text-xs text-muted-foreground font-mono">{inv.number}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm truncate">{inv.clientName}</p>
          <p className="text-xs text-muted-foreground truncate">{inv.clientEmail}</p>
        </div>
        <p className="text-sm text-muted-foreground">{date}</p>
        <div className="flex justify-center">
          <StatusBadge status={inv.status} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="font-semibold tabular-nums whitespace-nowrap">{amount}</span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="sr-only">{tc("labels.action")}</span>
      </Link>

      <Link
        to="/invoices/$id"
        params={{ id: inv.id }}
        className="md:hidden block px-4 py-4 hover:bg-muted/40 transition active:bg-muted/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{inv.title}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{inv.number}</p>
          </div>
          <StatusBadge status={inv.status} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground truncate">{inv.clientName}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{date}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-semibold tabular-nums text-sm">{amount}</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </Link>
    </>
  );
}
