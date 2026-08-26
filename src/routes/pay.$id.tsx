import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { usePublicInvoice } from "@/lib/invoices/public-invoice";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import {
  formatInvoiceAmount,
  formatInvoiceAmountWithCurrency,
  showReferenceField,
} from "@/lib/invoice-display";
import { clientIdentityLines, sellerIdentityLines } from "@/lib/invoice/document-identity";
import { dueDateFieldLabel } from "@/lib/invoice/document-labels";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { StatusPill } from "@/components/StatusBadge";
import { InvoicePdfActions } from "@/components/invoice/InvoicePdfActions";
import { Check, Ban } from "lucide-react";

import type { Invoice } from "@/lib/vegapal-store";

const PaymentMethodCards = lazy(() =>
  import("@/components/invoice/PaymentMethodCards").then((m) => ({
    default: m.PaymentMethodCards,
  })),
);

export const Route = createFileRoute("/pay/$id")({
  beforeLoad: () => ensureNamespacesLoaded(["invoices", "common"]),
  head: () => ({
    meta: [
      { title: "Pay invoice — VegaPal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicInvoice,
});

function PublicInvoice() {
  const { id } = useParams({ from: "/pay/$id" });
  const { data: inv, loading } = usePublicInvoice(id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading invoice…</p>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invoice not found</h1>
          <p className="text-muted-foreground mt-2">The link may be invalid or expired.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back to VegaPal</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { displayOptions: d } = inv;
  const currency = inv.invoiceCurrency;
  const paid = inv.paymentStatus === "paid" || inv.status === "paid";
  const cancelled = inv.documentStatus === "cancelled" || inv.status === "cancelled";
  const payable = !cancelled && !paid;

  const hasReferences =
    showReferenceField(d, "showPoNumber", inv.poNumber) ||
    showReferenceField(d, "showReferenceNumber", inv.referenceNumber) ||
    showReferenceField(d, "showProjectCode", inv.projectCode);

  const metaCols =
    1 + (d.showDueDate ? 1 : 0);

  return (
    <div className="min-h-screen bg-ice overflow-x-hidden">
      <header className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 min-w-0">
          {d.showVegapalLogo ? (
            <Link to="/" className="inline-flex">
              <Logo size="default" />
            </Link>
          ) : (
            <span className="text-sm font-semibold text-foreground">Invoice payment</span>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            Secure payment page
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 lg:py-16 min-w-0">
        {d.showSellerInfo && (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-start gap-4">
            {inv.sellerLogoUrl ? (
              <img
                src={inv.sellerLogoUrl}
                alt=""
                className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                style={{ background: inv.brandColor || "#1677E8" }}
              >
                {(inv.sellerBusiness || inv.sellerName).charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {sellerIdentityLines(inv).map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "font-semibold truncate"
                      : "text-sm text-muted-foreground truncate"
                  }
                >
                  {line.text}
                </p>
              ))}
            </div>
            <div className="w-full sm:w-auto sm:ml-auto shrink-0">
              <InvoicePdfActions
                invoice={inv}
                publicUrl={typeof window !== "undefined" ? window.location.href : undefined}
                size="sm"
                className="justify-end"
              />
            </div>
          </div>
        )}

        {!d.showSellerInfo && (
          <div className="flex justify-end mb-6">
            <InvoicePdfActions
              invoice={inv}
              publicUrl={typeof window !== "undefined" ? window.location.href : undefined}
              size="sm"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10">
          <div>
            <p className="text-sm font-mono text-muted-foreground">{inv.number}</p>
            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance">
              {inv.title}
            </h1>

            {d.showClientInfo && (
              <div className="mt-3 text-sm">
                <p className="text-muted-foreground">Billed to</p>
                {clientIdentityLines(inv).map((line, i) => (
                  <p
                    key={i}
                    className={i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            )}

            {hasReferences && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {showReferenceField(d, "showPoNumber", inv.poNumber) && (
                  <span>
                    <span className="text-muted-foreground">PO: </span>
                    <span className="font-medium">{inv.poNumber}</span>
                  </span>
                )}
                {showReferenceField(d, "showReferenceNumber", inv.referenceNumber) && (
                  <span>
                    <span className="text-muted-foreground">Reference: </span>
                    <span className="font-medium">{inv.referenceNumber}</span>
                  </span>
                )}
                {showReferenceField(d, "showProjectCode", inv.projectCode) && (
                  <span>
                    <span className="text-muted-foreground">Project: </span>
                    <span className="font-medium">{inv.projectCode}</span>
                  </span>
                )}
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 min-w-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total due
                  </p>
                  <p className="mt-1 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight tabular-nums break-all">
                    {formatInvoiceAmount(inv.total, currency)}
                    <span className="text-base sm:text-xl text-muted-foreground font-medium ml-1 sm:ml-2">
                      {currency}
                    </span>
                  </p>
                </div>
                {d.showStatus && <StatusPill status={inv.status} />}
              </div>

              {(d.showDueDate || inv.issueDate) && (
                <div
                  className={`mt-6 pt-6 border-t border-border grid gap-4 text-sm ${
                    metaCols === 2 ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Issued
                    </p>
                    <p className="mt-1 font-medium">{inv.issueDate}</p>
                  </div>
                  {d.showDueDate && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {dueDateFieldLabel(inv.documentType)}
                      </p>
                      <p className="mt-1 font-medium">{inv.dueDate}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  Items
                </p>
                <div className="space-y-2">
                  {inv.items.map((it, i) => (
                    <div key={i} className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {it.description}{" "}
                        <span className="text-foreground/60">× {it.quantity}</span>
                      </span>
                      <span className="tabular-nums font-medium shrink-0">
                        {formatInvoiceAmountWithCurrency(it.total, currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
                  <TotalLine
                    label="Subtotal"
                    value={formatInvoiceAmountWithCurrency(inv.subtotal, currency)}
                  />
                  {d.showDiscount && inv.discount > 0 && (
                    <TotalLine
                      label="Discount"
                      value={`- ${formatInvoiceAmountWithCurrency(inv.discount, currency)}`}
                    />
                  )}
                  {d.showTax && inv.tax > 0 && (
                    <TotalLine
                      label="Tax"
                      value={formatInvoiceAmountWithCurrency(inv.tax, currency)}
                    />
                  )}
                  <div className="flex justify-between pt-2 border-t border-border font-semibold text-foreground gap-3">
                    <span>Total due</span>
                    <span className="tabular-nums text-right">
                      {formatInvoiceAmountWithCurrency(inv.total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {d.showNotes && inv.description && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                    {inv.description}
                  </p>
                </div>
              )}

              {d.showTerms && inv.termsAndConditions && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Terms & conditions
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                    {inv.termsAndConditions}
                  </p>
                </div>
              )}
            </div>

            {payable && d.showPaymentInstructions && (
              <div className="mt-4 text-xs text-muted-foreground">
                Use the payment options on the right to complete this invoice.
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-6 self-start space-y-4">
            {cancelled ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="rounded-xl bg-muted border border-border p-5 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center">
                    <Ban className="h-6 w-6" />
                  </div>
                  <p className="mt-3 font-semibold">Invoice cancelled</p>
                  <p className="text-sm text-muted-foreground">
                    This invoice is no longer payable.
                  </p>
                </div>
              </div>
            ) : paid ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="rounded-xl bg-success/10 border border-success/30 p-5 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-success text-success-foreground flex items-center justify-center">
                    <Check className="h-6 w-6" />
                  </div>
                  <p className="mt-3 font-semibold">Payment received</p>
                  <p className="text-sm text-muted-foreground">
                    This invoice has been marked as paid.
                  </p>
                </div>
              </div>
            ) : (
              d.showPaymentInstructions && (
                <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
                  <PaymentMethodCards inv={inv} />
                </Suspense>
              )
            )}

            {d.showVegapalLogo && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                <Logo markOnly size="sm" className="!h-5 !w-5 opacity-90" />
                <span>
                  Powered by{" "}
                  <Link to="/" className="font-semibold text-foreground hover:underline">
                    VegaPal
                  </Link>
                </span>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground gap-3">
      <span>{label}</span>
      <span className="tabular-nums text-foreground text-right">{value}</span>
    </div>
  );
}
