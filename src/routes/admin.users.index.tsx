import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountStatusBadge, PlanBadge } from "@/components/admin/AdminBadges";
import {
  fetchAdminUsers,
  type AdminUserRow,
  type AdminUsersPagination,
  type AdminUsersQuery,
} from "@/lib/admin/admin-client";
import { USER_PLANS, type UserPlan } from "@/lib/admin/plans";
import { formatAppError } from "@/lib/auth/errors";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/users/")({
  beforeLoad: () => ensureNamespacesLoaded(["admin"]),
  validateSearch: (search: Record<string, unknown>) => ({
    deleted: search.deleted === "1" || search.deleted === 1 || search.deleted === true,
  }),
  component: AdminUsersPage,
});

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function AdminUsersPage() {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const { deleted } = Route.useSearch();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pagination, setPagination] = useState<AdminUsersPagination | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<UserPlan | "">("");
  const [statusFilter, setStatusFilter] = useState<"active" | "disabled" | "">("");
  const [extraFilter, setExtraFilter] = useState<
    "expired" | "expiring_soon" | "email_unconfirmed" | ""
  >("");
  const [sort, setSort] = useState<AdminUsersQuery["sort"]>("newest");
  const [page, setPage] = useState(1);

  const loadUsers = useCallback((query: AdminUsersQuery) => {
    setLoading(true);
    setError("");
    fetchAdminUsers(query)
      .then((data) => {
        setUsers(data.users);
        setPagination(data.pagination);
      })
      .catch((err) => setError(formatAppError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadUsers({
      page,
      pageSize: 20,
      search: search || undefined,
      plan: planFilter || undefined,
      status: statusFilter || undefined,
      filter: extraFilter || undefined,
      sort: sort || "newest",
    });
  }, [loadUsers, page, search, planFilter, statusFilter, extraFilter, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, planFilter, statusFilter, extraFilter, sort]);

  useEffect(() => {
    if (!deleted) return;
    const timer = window.setTimeout(() => {
      navigate({ to: "/admin/users", search: { deleted: false }, replace: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [deleted, navigate]);

  const hasFilters = Boolean(search || planFilter || statusFilter || extraFilter);
  const emptyTitle = hasFilters ? t("users.emptySearch") : t("users.empty");

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto min-w-0 space-y-6">
      <div>
        <p className="text-xs font-medium text-primary uppercase tracking-wider">{t("eyebrow")}</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{t("users.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("users.subtitle")}</p>
      </div>

      {deleted ? <FormSuccess message={t("users.deleted")} /> : null}
      <FormError message={error} />

      <div className="flex flex-col gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            value={planFilter || "all"}
            onValueChange={(v) => setPlanFilter(v === "all" ? "" : (v as UserPlan))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("users.filters.plan")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("users.filters.allPlans")}</SelectItem>
              {USER_PLANS.map((plan) => (
                <SelectItem key={plan} value={plan}>
                  {tc(`plan.badges.${plan}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) =>
              setStatusFilter(v === "all" ? "" : (v as "active" | "disabled"))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("users.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("users.filters.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("users.filters.active")}</SelectItem>
              <SelectItem value="disabled">{t("users.filters.disabled")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={extraFilter || "all"}
            onValueChange={(v) =>
              setExtraFilter(
                v === "all" ? "" : (v as "expired" | "expiring_soon" | "email_unconfirmed"),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="More filters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All extra</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring_soon">Expiring soon</SelectItem>
              <SelectItem value="email_unconfirmed">Email unconfirmed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort || "newest"}
            onValueChange={(v) => setSort(v as AdminUsersQuery["sort"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="last_active">Last active</SelectItem>
              <SelectItem value="most_invoices">Most invoices</SelectItem>
              <SelectItem value="subscription_expiry">Subscription expiry</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("users.loading")}</p>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title={emptyTitle}
            description={
              hasFilters
                ? t("users.emptySearchDescription", {
                    defaultValue: "Try changing or clearing your search filters.",
                  })
                : t("users.emptyDescription", {
                    defaultValue: "No users have joined VegaPal yet.",
                  })
            }
          />
        ) : (
          users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{user.name || "—"}</p>
                  <p className="text-sm text-muted-foreground break-all">{user.email || "—"}</p>
                </div>
                <PlanBadge plan={user.plan} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <AccountStatusBadge status={user.status} />
                <span>{user.emailConfirmed === false ? "Email unconfirmed" : "Email OK"}</span>
                <span>
                  Sub: {user.subscriptionStatus ?? "none"}
                  {user.subscriptionEndsAt ? ` · ${formatDate(user.subscriptionEndsAt)}` : ""}
                </span>
                <span>
                  Invoices: {user.invoiceCountThisMonth ?? 0} this mo / {user.invoiceCount} total
                </span>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/admin/users/$userId" params={{ userId: user.id }}>
                  {t("users.view")}
                </Link>
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="hidden lg:block rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.name")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.email")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Confirmed</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.plan")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Sub</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Expiry</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.joined")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.lastSignIn")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">This mo</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.invoices")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.status")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">
                    {t("users.loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6">
                    <EmptyState
                      icon={UserSearch}
                      title={emptyTitle}
                      description={
                        hasFilters
                          ? t("users.emptySearchDescription", {
                              defaultValue: "Try changing or clearing your search filters.",
                            })
                          : t("users.emptyDescription", {
                              defaultValue: "No users have joined VegaPal yet.",
                            })
                      }
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium max-w-[140px] truncate">{user.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground break-all max-w-[180px]">
                      {user.email || "—"}
                    </td>
                    <td className="px-4 py-3">{user.emailConfirmed === false ? "No" : "Yes"}</td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={user.plan} />
                    </td>
                    <td className="px-4 py-3 capitalize">{user.subscriptionStatus ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.isExpiringSoon ? (
                        <span className="text-warning">{formatDate(user.subscriptionEndsAt)}</span>
                      ) : (
                        formatDate(user.subscriptionEndsAt)
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(user.joinedAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.lastSignInAt ? formatDate(user.lastSignInAt) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{user.invoiceCountThisMonth ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums">{user.invoiceCount}</td>
                    <td className="px-4 py-3">
                      <AccountStatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/users/$userId" params={{ userId: user.id }}>
                          {t("users.view")}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t("users.pagination.page", {
                page: pagination.page,
                totalPages: pagination.totalPages,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrevious || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex lg:hidden items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrevious || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
