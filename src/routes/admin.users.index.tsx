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
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(
    (query: AdminUsersQuery) => {
      setLoading(true);
      setError("");
      fetchAdminUsers(query)
        .then((data) => {
          setUsers(data.users);
          setPagination(data.pagination);
        })
        .catch((err) => setError(formatAppError(err)))
        .finally(() => setLoading(false));
    },
    [],
  );

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
    });
  }, [loadUsers, page, search, planFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, planFilter, statusFilter]);

  useEffect(() => {
    if (!deleted) return;
    const timer = window.setTimeout(() => {
      navigate({ to: "/admin/users", search: { deleted: false }, replace: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [deleted, navigate]);

  const hasFilters = Boolean(search || planFilter || statusFilter);
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select
          value={planFilter || "all"}
          onValueChange={(v) => setPlanFilter(v === "all" ? "" : (v as UserPlan))}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
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
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={t("users.filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("users.filters.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("users.filters.active")}</SelectItem>
            <SelectItem value="disabled">{t("users.filters.disabled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.name")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.email")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.plan")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.joined")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.lastSignIn")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.invoices")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.status")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("users.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {t("users.loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6">
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
                    <td className="px-4 py-3 text-muted-foreground break-all max-w-[200px]">{user.email || "—"}</td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={user.plan} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(user.joinedAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.lastSignInAt ? formatDate(user.lastSignInAt) : "—"}
                    </td>
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
                size="sm"
                variant="outline"
                disabled={!pagination.hasPrevious || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("users.pagination.previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("users.pagination.next")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}
