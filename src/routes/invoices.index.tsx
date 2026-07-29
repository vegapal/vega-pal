import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import {
  useInvoices,
  type DocumentType,
  type Invoice,
  type PaymentStatus,
} from "@/lib/vegapal-store";
import { canShowPaymentStatus } from "@/lib/invoice/document-model";
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
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
  PaymentStatusBadge,
} from "@/components/invoice/DocumentBadges";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

type DocFilter = "all" | DocumentType;
type PayFilter = "all" | PaymentStatus;

const TABLE_GRID =
  "md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_7rem_9rem_6.5rem_minmax(5.5rem,1fr)_2.5rem] md:items-center md:gap-3";

export const Route = createFileRoute("/invoices/")({
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

function InvoicesPage() {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const { data: all, loading } = useInvoices();
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [q, setQ] = useState("");
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");

  const filtered = useMemo(() => {
    return all.filter((i) => {
      if (docFilter !== "all" && i.documentType !== docFilter) return false;
      if (payFilter !== "all" && i.paymentStatus !== payFilter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        i.title.toLowerCase().includes(s) ||
        i.number.toLowerCase().includes(s) ||
        i.clientName.toLowerCase().includes(s) ||
        i.clientEmail.toLowerCase().includes(s)
      );
    });
  }, [all, docFilter, payFilter, q]);

  const handleExport = async () => {
    const toExport = filterInvoicesByIssueDateRange(filtered, exportFromDate, exportToDate);
    if (!(await exportInvoicesToExcel(toExport))) {
      window.alert(tc("alerts.noInvoicesToExport"));
    }
  };

  const typeFilters: { key: DocFilter; label: string }[] = [
    { key: "all", label: t("list.filters.all") },
    { key: "tax_invoice", label: t("list.filters.invoices") },
    { key: "quotation", label: t("list.filters.quotations") },
    { key: "proforma_invoice", label: t("list.filters.proformas") },
  ];

  const payFilters: { key: PayFilter; label: string }[] = [
    { key: "all", label: t("list.filters.allPayment") },
    { key: "unpaid", label: t("list.filters.unpaid") },
    { key: "partially_paid", label: t("list.filters.partiallyPaid") },
    { key: "paid", label: t("list.filters.paid") },
    { key: "overdue", label: t("list.filters.overdue") },
    { key: "refunded", label: t("list.filters.refunded") },
  ];

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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/60 p-1">
              {typeFilters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDocFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    docFilter === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/60 p-1">
              {payFilters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPayFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    payFilter === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
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
              <span className="text-left">{t("detail.updateStatus")}</span>
              <span className="text-center">{t("detail.paymentStatus")}</span>
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
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <DocumentTypeBadge type={inv.documentType} />
          </div>
          <p className="font-medium truncate">{inv.title}</p>
          <p className="text-xs text-muted-foreground font-mono">{inv.number}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm truncate">{inv.clientName}</p>
          <p className="text-xs text-muted-foreground truncate">{inv.clientEmail}</p>
        </div>
        <p className="text-sm text-muted-foreground">{date}</p>
        <DocumentStatusBadge status={inv.documentStatus} />
        <div className="flex justify-center">
          {canShowPaymentStatus(inv.documentType) ? (
            <PaymentStatusBadge status={inv.paymentStatus} documentType={inv.documentType} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
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
            <div className="flex flex-wrap gap-2 mb-1">
              <DocumentTypeBadge type={inv.documentType} />
              <DocumentStatusBadge status={inv.documentStatus} />
            </div>
            <p className="font-medium leading-snug">{inv.title}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{inv.number}</p>
          </div>
          {canShowPaymentStatus(inv.documentType) ? (
            <PaymentStatusBadge status={inv.paymentStatus} documentType={inv.documentType} />
          ) : null}
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
