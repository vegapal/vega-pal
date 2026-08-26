import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { formatAppError } from "@/lib/auth/errors";
import {
  approveAdminSubscriptionPayment,
  fetchAdminSubscriptionPayments,
  rejectAdminSubscriptionPayment,
  type SubscriptionPaymentRequestDto,
} from "@/lib/billing/billing-client";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

export const Route = createFileRoute("/admin/payments")({
  beforeLoad: () => ensureNamespacesLoaded(["admin"]),
  component: AdminPaymentsPage,
});

type StatusFilter = "pending_review" | "approved" | "rejected" | "all";

function statusLabel(status: SubscriptionPaymentRequestDto["status"]) {
  if (status === "pending_review") return "Pending Review";
  if (status === "approved") return "Approved";
  return "Rejected";
}

function AdminPaymentsPage() {
  const [status, setStatus] = useState<StatusFilter>("pending_review");
  const [requests, setRequests] = useState<SubscriptionPaymentRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminSubscriptionPayments(status);
      setRequests(rows);
    } catch (err) {
      setError(formatAppError(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await approveAdminSubscriptionPayment(id);
      await load();
    } catch (err) {
      setError(formatAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Rejection reason (optional)") ?? undefined;
    setBusyId(id);
    setError(null);
    try {
      await rejectAdminSubscriptionPayment(id, reason || undefined);
      await load();
    } catch (err) {
      setError(formatAppError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl min-w-0 p-4 sm:p-6 lg:p-10">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Admin</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Subscription payments
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review manual USDT Pro payment requests. Approval activates Pro; rejection does not.
          Blockchain verification is not automatic.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["pending_review", "Pending Review"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "default" : "outline"}
            onClick={() => setStatus(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error ? <FormError message={error} /> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading payment requests…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">No payment requests in this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {row.userEmail ?? row.userId}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pro · {row.months === 6 ? "6 months" : "1 month"} · {row.amountUsdt} USDT ·{" "}
                    {statusLabel(row.status)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Network
                  </dt>
                  <dd className="mt-0.5 font-medium">{row.networkLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Destination
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">{row.destinationAddress}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Transaction hash
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">{row.txHash}</dd>
                </div>
                {row.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Notes
                    </dt>
                    <dd className="mt-0.5">{row.notes}</dd>
                  </div>
                ) : null}
                {row.status === "approved" ? (
                  <>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Start
                      </dt>
                      <dd className="mt-0.5">
                        {row.subscriptionStartsAt
                          ? new Date(row.subscriptionStartsAt).toLocaleString()
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        End
                      </dt>
                      <dd className="mt-0.5">
                        {row.subscriptionEndsAt
                          ? new Date(row.subscriptionEndsAt).toLocaleString()
                          : "—"}
                      </dd>
                    </div>
                  </>
                ) : null}
                {row.status === "rejected" && row.rejectionReason ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rejection reason
                    </dt>
                    <dd className="mt-0.5">{row.rejectionReason}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/users/$userId" params={{ userId: row.userId }}>
                    View user
                  </Link>
                </Button>
                {row.status === "pending_review" ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => void approve(row.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => void reject(row.id)}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
