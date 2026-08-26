import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileText, History, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/StatusBadge";
import { AccountStatusBadge, PlanBadge } from "@/components/admin/AdminBadges";
import { AdminSubscriptionPanel } from "@/components/admin/AdminSubscriptionPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  fetchAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminAuditLogEntry,
  type AdminUserDetail,
} from "@/lib/admin/admin-client";
import { PLAN_LIMITS, USER_PLANS, normalizeUserPlan, type UserPlan } from "@/lib/admin/plans";
import { formatAppError } from "@/lib/auth/errors";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/vegapal-store";

export const Route = createFileRoute("/admin/users/$userId")({
  beforeLoad: async () => {
    await ensureNamespacesLoaded(["admin"]);
  },
  component: AdminUserDetailPage,
  errorComponent: AdminUserDetailRouteError,
});

function AdminUserDetailRouteError() {
  const { t } = useTranslation("admin");
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <FormError
        message={t("userDetail.loadError", {
          defaultValue: "Could not load this user. Please try again.",
        })}
      />
      <Button asChild variant="outline" className="mt-4">
        <Link to="/admin/users" search={{ deleted: false }}>
          {t("userDetail.back", { defaultValue: "Back to users" })}
        </Link>
      </Button>
    </div>
  );
}

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { user: sessionUser } = useSession();
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<UserPlan | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchAdminUser(userId)
      .then(setUser)
      .catch((err) => setError(formatAppError(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function changePlan(plan: UserPlan) {
    if (user?.plan === plan) return;
    setSavingPlan(plan);
    setSuccess("");
    setError("");
    try {
      await updateAdminUser(userId, { plan });
      setSuccess(t("userDetail.successPlan", { plan: tc(`plan.badges.${plan}`) }));
      load();
    } catch (err) {
      setError(formatAppError(err));
    } finally {
      setSavingPlan(null);
    }
  }

  async function setDisabled(isDisabled: boolean) {
    setSavingStatus(true);
    setSuccess("");
    setError("");
    try {
      await updateAdminUser(userId, { isDisabled });
      setSuccess(isDisabled ? t("userDetail.successDisabled") : t("userDetail.successEnabled"));
      load();
    } catch (err) {
      setError(formatAppError(err));
    } finally {
      setSavingStatus(false);
    }
  }

  async function deleteUser() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setSuccess("");
    setError("");
    try {
      await deleteAdminUser(userId);
      setDeleteDialogOpen(false);
      navigate({ to: "/admin/users", search: { deleted: true } });
    } catch (err) {
      setError(formatAppError(err));
    } finally {
      setDeleting(false);
    }
  }

  const isSelf = sessionUser?.id === userId;

  if (loading && !user) {
    return <div className="p-6 text-sm text-muted-foreground">{t("userDetail.loading")}</div>;
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <FormError message={error || t("userDetail.notFound")} />
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/users" search={{ deleted: false }}>{t("userDetail.back", { defaultValue: "Back to users" })}</Link>
        </Button>
      </div>
    );
  }

  const userPlan = normalizeUserPlan(user.plan);
  const planInfo = PLAN_LIMITS[userPlan];
  const recentInvoices = user.recentInvoices ?? [];
  const auditLogs = user.auditLogs ?? [];
  const invoiceLimitLabel =
    planInfo.maxInvoicesPerMonth === "unlimited"
      ? t("userDetail.planSummaryUnlimited")
      : t("userDetail.planSummaryLimited", { count: planInfo.maxInvoicesPerMonth });

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto min-w-0 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/admin/users" search={{ deleted: false }}>
            <ArrowLeft className="h-4 w-4" />
            {t("userDetail.back", { defaultValue: "Back to users" })}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-primary uppercase tracking-wider w-full sm:w-auto">
            {t("userDetail.eyebrow")}
          </p>
          <PlanBadge plan={userPlan} />
          <AccountStatusBadge status={user.status === "disabled" ? "disabled" : "active"} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2 break-words">
          {user.name || user.email}
        </h1>
        <p className="text-muted-foreground mt-1 break-all">{user.email}</p>
      </div>

      {success ? <FormSuccess message={success} /> : null}
      <FormError message={error} />

      <AdminSubscriptionPanel
        userId={userId}
        detail={user}
        onDone={load}
        onError={setError}
        onSuccess={setSuccess}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
          <h2 className="font-semibold">{t("userDetail.profile")}</h2>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <DetailItem label={t("userDetail.fields.name")} value={user.name || "—"} />
            <DetailItem label={t("userDetail.fields.email")} value={user.email || "—"} />
            <DetailItem label={t("userDetail.fields.business")} value={user.business || "—"} />
            <DetailItem label={t("userDetail.fields.plan")} value={tc(`plan.badges.${userPlan}`)} />
            <DetailItem label={t("userDetail.fields.joined")} value={formatDateTime(user.joinedAt)} />
            <DetailItem
              label={t("userDetail.fields.lastSignIn")}
              value={user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "—"}
            />
            <DetailItem label={t("userDetail.fields.invoicesThisMonth")} value={String(user.invoiceCountThisMonth)} />
            <DetailItem label={t("userDetail.fields.totalInvoices")} value={String(user.invoiceCount)} />
            <DetailItem label={t("userDetail.fields.paid")} value={String(user.paidInvoiceCount)} />
            <DetailItem label={t("userDetail.fields.pending")} value={String(user.pendingInvoiceCount)} />
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-5">
          <h2 className="font-semibold">{t("userDetail.planManagement")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("userDetail.planSummary", {
              users: planInfo.maxUsers,
              invoices: invoiceLimitLabel,
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            {USER_PLANS.map((planOption) => (
              <LoadingButton
                key={planOption}
                size="sm"
                variant={userPlan === planOption ? "default" : "outline"}
                disabled={userPlan === planOption || savingPlan !== null || savingStatus}
                loading={savingPlan === planOption}
                onClick={() => changePlan(planOption)}
              >
                {t("userDetail.setPlan", { plan: tc(`plan.badges.${planOption}`) })}
              </LoadingButton>
            ))}
          </div>

          <div className="border-t border-border pt-5 space-y-3">
            <h3 className="font-medium text-sm">{t("userDetail.accountStatus")}</h3>
            {user.isDisabled ? (
              <LoadingButton
                size="sm"
                variant="outline"
                loading={savingStatus}
                disabled={savingPlan !== null}
                onClick={() => setDisabled(false)}
              >
                {t("userDetail.enableUser")}
              </LoadingButton>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <LoadingButton
                    size="sm"
                    variant="destructive"
                    loading={savingStatus}
                    disabled={savingPlan !== null}
                  >
                    {t("userDetail.disableUser")}
                  </LoadingButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("userDetail.disableTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("userDetail.disableDescription", { email: user.email })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("userDetail.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setDisabled(true)}>
                      {t("userDetail.disableUser")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="px-5 sm:px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{t("userDetail.recentInvoices")}</h2>
        </div>
        {user.recentInvoicesUnavailable ? (
          <div className="px-5 sm:px-6 py-8">
            <EmptyState
              icon={AlertCircle}
              title={t("userDetail.invoicesUnavailable")}
              description={t("userDetail.invoicesUnavailableDescription", {
                defaultValue: "Invoice data could not be loaded for this user.",
              })}
            />
          </div>
        ) : recentInvoices.length === 0 ? (
          <div className="px-5 sm:px-6 py-8">
            <EmptyState
              icon={FileText}
              title={t("userDetail.noInvoices")}
              description={t("userDetail.noInvoicesDescription", {
                defaultValue: "This user has not created any invoices yet.",
              })}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.invoiceColumns.number")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.invoiceColumns.title")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.invoiceColumns.client")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.invoiceColumns.status")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.invoiceColumns.total")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.invoiceColumns.created")}</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{invoice.number}</td>
                    <td className="px-4 py-3">{invoice.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{invoice.clientName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          invoice.status as "paid" | "pending" | "overdue" | "draft" | "cancelled"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums">{(Number(invoice.total) || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(invoice.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="px-5 sm:px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Recent activity</h2>
        </div>
        {(user.recentActivity ?? []).length === 0 ? (
          <p className="px-5 sm:px-6 py-6 text-sm text-muted-foreground">No recent activity recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(user.recentActivity ?? []).map((item) => (
              <li key={item.id} className="px-5 sm:px-6 py-3 text-sm">
                <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                <p className="font-medium mt-0.5">{item.description || item.action}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="px-5 sm:px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{t("userDetail.auditLog")}</h2>
        </div>
        {user.auditLogsUnavailable ? (
          <div className="px-5 sm:px-6 py-8">
            <EmptyState
              icon={AlertCircle}
              title={t("userDetail.auditUnavailable")}
              description={t("userDetail.auditUnavailableDescription", {
                defaultValue: "Audit history could not be loaded.",
              })}
            />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="px-5 sm:px-6 py-8">
            <EmptyState
              icon={History}
              title={t("userDetail.noAuditLogs")}
              description={t("userDetail.noAuditLogsDescription", {
                defaultValue: "No administrative actions have been recorded for this user.",
              })}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.auditColumns.action")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.auditColumns.details")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("userDetail.auditColumns.when")}</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((entry) => (
                  <AuditLogRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-destructive">{t("userDetail.dangerZone.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("userDetail.dangerZone.description")}</p>
        </div>
        {isSelf ? (
          <p className="text-sm text-muted-foreground">{t("userDetail.dangerZone.cannotDeleteSelf")}</p>
        ) : (
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setDeleteConfirm("");
            }}
          >
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || savingPlan !== null || savingStatus}
              onClick={() => setDeleteDialogOpen(true)}
            >
              {t("userDetail.dangerZone.deleteUser")}
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("userDetail.dangerZone.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("userDetail.dangerZone.deleteDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <label htmlFor="delete-confirm" className="text-sm font-medium">
                  {t("userDetail.dangerZone.typeDelete")}
                </label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("userDetail.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    void deleteUser();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("userDetail.dangerZone.deleteUser")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </section>
    </div>
  );
}

function AuditLogRow({ entry }: { entry: AdminAuditLogEntry }) {
  const { t } = useTranslation("admin");
  const actionKey = `userDetail.auditActions.${entry.action}` as const;
  const actionLabel = t(actionKey, { defaultValue: entry.action });
  const details = formatAuditDetails(entry);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{actionLabel}</td>
      <td className="px-4 py-3 text-muted-foreground break-words">{details}</td>
      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
    </tr>
  );
}

function formatAuditDetails(entry: AdminAuditLogEntry) {
  const oldVal = entry.oldValue as Record<string, unknown> | null;
  const newVal = entry.newValue as Record<string, unknown> | null;
  if (entry.action === "plan_changed") {
    return `${String(oldVal?.plan ?? "—")} → ${String(newVal?.plan ?? "—")}`;
  }
  if (entry.action === "user_disabled" || entry.action === "user_enabled") {
    return String(newVal?.is_disabled ?? "");
  }
  if (entry.action === "user_deleted") {
    return String(oldVal?.email ?? oldVal?.name ?? "—");
  }
  return JSON.stringify(newVal ?? {});
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium break-words">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
