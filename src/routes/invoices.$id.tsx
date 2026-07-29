import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { trackInvoicePaid, trackQuotationConvertedToInvoice } from "@/lib/analytics/events";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import {
  useInvoice,
  invoices,
  notifyInvoices,
  QuotationConversionError,
  type DocumentStatus,
  type PaymentStatus,
} from "@/lib/vegapal-store";
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
  PaymentStatusBadge,
} from "@/components/invoice/DocumentBadges";
import { canShowPaymentStatus } from "@/lib/invoice/document-model";
import {
  formatInvoiceAmount,
  formatInvoiceAmountWithCurrency,
  showReferenceField,
} from "@/lib/invoice-display";
import { clientIdentityLines } from "@/lib/invoice/document-identity";
import { dueDateFieldLabel } from "@/lib/invoice/document-labels";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Calendar,
  Hash,
  Download,
  Pencil,
  Files,
  XCircle,
  User,
  FileInput,
} from "lucide-react";
import { ConvertQuotationDialog } from "@/components/invoices/ConvertQuotationDialog";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { toast } from "sonner";

async function downloadInvoicePdf(inv: import("@/lib/vegapal-store").Invoice) {
  const { generateInvoicePDF } = await import("@/lib/invoice-pdf");
  await generateInvoicePDF(inv);
}

const PaymentMethodCards = lazy(() =>
  import("@/components/invoice/PaymentMethodCards").then((m) => ({
    default: m.PaymentMethodCards,
  })),
);

export const Route = createFileRoute("/invoices/$id")({
  beforeLoad: () => ensureNamespacesLoaded(["invoices"]),
  head: () => ({
    meta: [
      { title: "Invoice — VegaPal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AppShell>
      <InvoiceDetails />
    </AppShell>
  ),
});

function InvoiceDetails() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/invoices/$id" });
  const { data: inv, loading, refresh } = useInvoice(id);
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const [copied, setCopied] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const convertGuard = useSubmitGuard();

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">{t("create.loading")}</div>
    );
  }
  if (!inv) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">{tc("empty.invoiceNotFound")}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/invoices">{tc("buttons.back")}</Link>
        </Button>
      </div>
    );
  }

  const { displayOptions: d } = inv;
  const currency = inv.invoiceCurrency;

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/pay/${inv.id}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const duplicate = async () => {
    const nxt = await invoices.duplicate(inv.id);
    notifyInvoices();
    if (nxt) navigate({ to: "/invoices/$id", params: { id: nxt.id } });
  };

  const cancel = async () => {
    if (confirm(tc("alerts.cancelInvoiceConfirm"))) {
      await invoices.cancel(inv.id);
      notifyInvoices();
      refresh();
    }
  };

  const setDocumentStatus = async (next: DocumentStatus) => {
    await invoices.setDocumentStatus(inv.id, next);
    notifyInvoices();
    refresh();
  };

  const setPaymentStatus = async (next: PaymentStatus) => {
    if (!canShowPaymentStatus(inv.documentType)) return;
    const previous = inv.paymentStatus;
    await invoices.setPaymentStatus(inv.id, next);
    if (next === "paid" && previous !== "paid") {
      trackInvoicePaid(inv.id, inv.total, inv.invoiceCurrency);
    }
    notifyInvoices();
    refresh();
  };

  const hasReferences =
    showReferenceField(d, "showPoNumber", inv.poNumber) ||
    showReferenceField(d, "showReferenceNumber", inv.referenceNumber) ||
    showReferenceField(d, "showProjectCode", inv.projectCode);

  const canConvertQuotation =
    inv.documentType === "quotation" &&
    inv.documentStatus !== "cancelled" &&
    !inv.convertedDocumentId;

  const quotationConverted =
    inv.documentType === "quotation" && !!inv.convertedDocumentId;

  const runConvertQuotation = async () => {
    if (!convertGuard.begin()) return;
    setConverting(true);
    try {
      const result = await invoices.convertQuotationToInvoice(inv.id);
      trackQuotationConvertedToInvoice("draft");
      notifyInvoices();
      setConvertOpen(false);
      if (result.alreadyExisted) {
        toast.info(t("conversion.toastAlreadyConverted", { number: result.invoiceNumber }));
      } else {
        toast.success(t("conversion.toastCreated", { number: result.invoiceNumber }));
      }
      navigate({ to: "/invoices/$id", params: { id: result.invoiceId } });
    } catch (err) {
      if (err instanceof QuotationConversionError && err.code === "free_plan_invoice_limit") {
        toast.error(tc("plan.limitReached"));
      } else {
        toast.error(t("conversion.errorGeneric"));
      }
    } finally {
      setConverting(false);
      convertGuard.end();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto min-w-0">
      <Link
        to="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> {t("detail.backToInvoices")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <DocumentTypeBadge type={inv.documentType} />
            <DocumentStatusBadge status={inv.documentStatus} />
            {canShowPaymentStatus(inv.documentType) ? (
              <PaymentStatusBadge status={inv.paymentStatus} documentType={inv.documentType} />
            ) : null}
            {d.showStatus ? <StatusBadge status={inv.status} /> : null}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">{inv.title}</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">{inv.number}</p>
          {quotationConverted && inv.convertedDocumentId ? (
            <p className="text-sm text-muted-foreground mt-2">
              {t("conversion.convertedStatus")}{" "}
              <Link
                to="/invoices/$id"
                params={{ id: inv.convertedDocumentId }}
                className="text-primary font-medium hover:underline"
              >
                {inv.convertedDocumentNumber ?? t("conversion.viewInvoice")}
              </Link>
            </p>
          ) : null}
          {inv.documentType === "tax_invoice" && inv.sourceDocumentId ? (
            <p className="text-sm text-muted-foreground mt-2">
              {t("conversion.createdFrom")}{" "}
              <Link
                to="/invoices/$id"
                params={{ id: inv.sourceDocumentId }}
                className="text-primary font-medium hover:underline"
              >
                {inv.sourceDocumentNumber ?? t("conversion.viewQuotation")}
              </Link>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground mt-1">
            {t("detail.invoiceCurrencyLabel")}{" "}
            <span className="font-medium text-foreground">{currency}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConvertQuotation ? (
            <Button variant="hero" type="button" onClick={() => setConvertOpen(true)}>
              <FileInput className="h-4 w-4" /> {t("conversion.action")}
            </Button>
          ) : null}
          {quotationConverted && inv.convertedDocumentId ? (
            <>
              <Button variant="hero" asChild>
                <Link to="/invoices/$id" params={{ id: inv.convertedDocumentId }}>
                  {t("conversion.viewInvoiceNumber", {
                    number: inv.convertedDocumentNumber ?? "",
                  })}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/invoices/new" search={{ edit: inv.convertedDocumentId }}>
                  <Pencil className="h-4 w-4" /> {t("conversion.editDraftInvoice")}
                </Link>
              </Button>
            </>
          ) : null}
          <Button variant="outline" onClick={() => downloadInvoicePdf(inv)}>
            <Download className="h-4 w-4" /> {tc("buttons.pdf")}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/invoices/new" search={{ edit: inv.id }}>
              <Pencil className="h-4 w-4" /> {tc("buttons.edit")}
            </Link>
          </Button>
          <Button variant="outline" onClick={duplicate}>
            <Files className="h-4 w-4" /> {tc("buttons.duplicate")}
          </Button>
          {inv.status !== "cancelled" && (
            <Button variant="outline" onClick={cancel}>
              <XCircle className="h-4 w-4" /> {t("detail.cancel")}
            </Button>
          )}
          <Button variant="outline" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4" /> {tc("buttons.copied")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> {tc("buttons.copyLink")}
              </>
            )}
          </Button>
          <Button asChild variant="hero">
            <a href={`/pay/${inv.id}`} target="_blank" rel="noreferrer">
              {tc("buttons.viewPublicPage")} <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <div className="rounded-2xl border border-border bg-card p-8">
          {d.showSellerInfo && (
            <div className="flex items-start gap-4 pb-6 border-b border-border">
              {inv.sellerLogoUrl ? (
                <img
                  src={inv.sellerLogoUrl}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0"
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: inv.brandColor || "#16C784" }}
                >
                  {(inv.sellerBusiness || inv.sellerName).charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{tc("labels.from")}</p>
                <p className="font-semibold">{inv.sellerBusiness || inv.sellerName}</p>
                <p className="text-sm text-muted-foreground">{inv.sellerEmail}</p>
                {inv.sellerAddress && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">
                    {inv.sellerAddress}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-start py-6 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{tc("labels.totalDue")}</p>
              <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums">
                {formatInvoiceAmount(inv.total, currency)}
                <span className="text-xl text-muted-foreground font-medium ml-2">{currency}</span>
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{tc("labels.issued")}</p>
              <p className="mt-1 font-medium">{inv.issueDate}</p>
            </div>
          </div>

          {hasReferences && (
            <div className="py-4 border-b border-border flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {showReferenceField(d, "showPoNumber", inv.poNumber) && (
                <span>
                  <span className="text-muted-foreground">{tc("labels.po")}: </span>
                  <span className="font-medium">{inv.poNumber}</span>
                </span>
              )}
              {showReferenceField(d, "showReferenceNumber", inv.referenceNumber) && (
                <span>
                  <span className="text-muted-foreground">{tc("labels.reference")}: </span>
                  <span className="font-medium">{inv.referenceNumber}</span>
                </span>
              )}
              {showReferenceField(d, "showProjectCode", inv.projectCode) && (
                <span>
                  <span className="text-muted-foreground">{tc("labels.project")}: </span>
                  <span className="font-medium">{inv.projectCode}</span>
                </span>
              )}
            </div>
          )}

          {(d.showClientInfo || d.showDueDate) && (
            <div
              className={`grid gap-6 py-6 border-b border-border ${
                d.showClientInfo && d.showDueDate
                  ? "sm:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {d.showClientInfo && (() => {
                const lines = clientIdentityLines(inv);
                return (
                  <Detail
                    icon={Mail}
                    label={tc("labels.billedTo")}
                    value={lines[0]?.text ?? inv.clientName}
                    sub={
                      lines.length > 1
                        ? lines
                            .slice(1)
                            .map((l) => l.text)
                            .join(" · ")
                        : undefined
                    }
                  />
                );
              })()}
              {d.showDueDate && (
                <Detail
                  icon={Calendar}
                  label={dueDateFieldLabel(inv.documentType)}
                  value={inv.dueDate}
                />
              )}
            </div>
          )}

          <div className="py-6 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              {tc("labels.lineItems")}
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_60px_100px_100px] gap-3 text-xs text-muted-foreground">
                <span>{tc("labels.description")}</span>
                <span className="text-right">{tc("labels.qty")}</span>
                <span className="text-right">{tc("labels.unit")}</span>
                <span className="text-right">{tc("labels.total")}</span>
              </div>
              {inv.items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_60px_100px_100px] gap-3 text-sm py-2 border-t border-border"
                >
                  <span>{it.description}</span>
                  <span className="text-right tabular-nums">{it.quantity}</span>
                  <span className="text-right tabular-nums">
                    {formatInvoiceAmount(it.unitPrice, currency)}
                  </span>
                  <span className="text-right tabular-nums font-medium">
                    {formatInvoiceAmount(it.total, currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <TotalRow
                label={tc("labels.subtotal")}
                value={formatInvoiceAmountWithCurrency(inv.subtotal, currency)}
              />
              {d.showDiscount && inv.discount > 0 && (
                <TotalRow
                  label={tc("labels.discount")}
                  value={`- ${formatInvoiceAmountWithCurrency(inv.discount, currency)}`}
                />
              )}
              {d.showTax && inv.tax > 0 && (
                <TotalRow
                  label={tc("labels.tax")}
                  value={formatInvoiceAmountWithCurrency(inv.tax, currency)}
                />
              )}
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span>{tc("labels.totalDue")}</span>
                <span className="tabular-nums">
                  {formatInvoiceAmountWithCurrency(inv.total, currency)}
                </span>
              </div>
            </div>
          </div>

          {d.showNotes && inv.description && (
            <div className="pt-6 border-b border-border pb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{tc("labels.notes")}</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {inv.description}
              </p>
            </div>
          )}

          {d.showTerms && inv.termsAndConditions && (
            <div className="pt-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {tc("labels.termsAndConditions")}
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {inv.termsAndConditions}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {t("detail.updateStatus")}
            </h3>
            <div className="space-y-2">
              {(
                inv.documentType === "quotation"
                  ? (["draft", "issued", "accepted", "rejected", "expired", "cancelled"] as const)
                  : (["draft", "issued", "cancelled", "expired"] as const)
              ).map((s) => (
                <StatusButton
                  key={s}
                  label={t(`documentStatus.${s}`)}
                  active={inv.documentStatus === s}
                  onClick={() => setDocumentStatus(s)}
                />
              ))}
            </div>
          </div>

          {canShowPaymentStatus(inv.documentType) && inv.documentStatus !== "cancelled" ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">{t("detail.paymentStatus")}</h3>
              <div className="space-y-2">
                {(["unpaid", "partially_paid", "paid", "overdue", "refunded"] as const).map((s) => (
                  <StatusButton
                    key={s}
                    label={t(`paymentStatus.${s}`)}
                    active={inv.paymentStatus === s}
                    onClick={() => setPaymentStatus(s)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {d.showPaymentInstructions && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {tc("labels.paymentMethods")}
              </p>
              <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
                <PaymentMethodCards inv={inv} />
              </Suspense>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-navy text-navy-foreground p-6">
            <h3 className="font-semibold mb-1">{t("detail.shareTitle")}</h3>
            <p className="text-sm text-navy-foreground/60">{t("detail.shareDescription")}</p>
            <div className="mt-4 rounded-lg bg-white/5 border border-white/10 p-3 text-xs font-mono break-all">
              {publicUrl}
            </div>
            <Button onClick={copyLink} variant="hero" size="sm" className="mt-3 w-full">
              {copied ? tc("buttons.copiedExclaim") : tc("buttons.copyPaymentLink")}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-1">
              {tc("labels.hash")} <Hash className="inline h-4 w-4 text-muted-foreground" />
            </h3>
            <p className="text-xs text-muted-foreground font-mono break-all mt-2">{inv.id}</p>
          </div>
        </div>
      </div>

      {canConvertQuotation || convertOpen ? (
        <ConvertQuotationDialog
          quotation={inv}
          open={convertOpen}
          onOpenChange={setConvertOpen}
          loading={converting}
          onConfirm={() => void runConvertQuotation()}
        />
      ) : null}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground gap-3">
      <span>{label}</span>
      <span className="tabular-nums text-foreground text-right">{value}</span>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-medium truncate">{value}</p>
        {sub && <p className="text-sm text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function StatusButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition ${
        active
          ? "border-primary bg-primary/10 text-foreground font-medium"
          : "border-border hover:bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}
