import { supabase } from "@/integrations/supabase/client";
import type { UserPlan } from "@/lib/admin/plans";
import { normalizeUserPlan } from "@/lib/admin/plans";

export type AdminStats = {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek?: number;
  newUsersThisMonth: number;
  activeUsers?: number;
  freeUsers: number;
  proUsers: number;
  businessUsers: number;
  disabledUsers: number;
  emailUnconfirmedUsers?: number;
  activePaidSubscriptions?: number;
  expiringIn7Days?: number;
  expiringIn30Days?: number;
  expiredSubscriptions?: number;
  totalInvoices: number;
  invoicesToday?: number;
  invoicesThisMonth: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices?: number;
  volumeByCurrency?: Record<string, number>;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  business: string | null;
  plan: UserPlan;
  role: string;
  isDisabled: boolean;
  joinedAt: string;
  lastSignInAt: string | null;
  lastActiveAt?: string | null;
  emailConfirmed?: boolean;
  invoiceCount: number;
  invoiceCountThisMonth?: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
  status: "active" | "disabled";
  subscriptionStatus?: string;
  subscriptionEndsAt?: string | null;
  isExpiringSoon?: boolean;
};

export type AdminAuditLogEntry = {
  id: string;
  adminUserId: string;
  targetUserId: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AdminUserDetail = AdminUserRow & {
  companyAddress: string | null;
  website: string | null;
  contactEmail: string | null;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  invoiceCountThisMonth: number;
  recentInvoices: {
    id: string;
    number: string;
    title: string;
    clientName: string;
    status: string;
    total: number;
    createdAt: string;
  }[];
  auditLogs: AdminAuditLogEntry[];
  auditLogsUnavailable?: boolean;
  recentInvoicesUnavailable?: boolean;
  subscription?: {
    effectivePlan: UserPlan;
    profilePlan: UserPlan;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    daysRemaining: number | null;
    cancelAtPeriodEnd: boolean;
    isExpired: boolean;
    isExpiringSoon: boolean;
  } | null;
  recentActivity?: {
    id: string;
    action: string;
    description: string | null;
    createdAt: string;
  }[];
};

export type AdminUsersPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type AdminUsersQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  plan?: UserPlan | "";
  status?: "active" | "disabled" | "";
  filter?: "expired" | "expiring_soon" | "email_unconfirmed" | "";
  sort?: "newest" | "oldest" | "last_active" | "most_invoices" | "subscription_expiry";
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  pagination: AdminUsersPagination;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

function normalizeAdminUserDetail(raw: AdminUserDetail): AdminUserDetail {
  const plan = normalizeUserPlan(raw.plan);
  const status: "active" | "disabled" = raw.isDisabled || raw.status === "disabled" ? "disabled" : "active";

  return {
    ...raw,
    plan,
    status,
    name: raw.name ?? "",
    email: raw.email ?? "",
    business: raw.business ?? null,
    isDisabled: Boolean(raw.isDisabled),
    invoiceCount: Number(raw.invoiceCount) || 0,
    invoiceCountThisMonth: Number(raw.invoiceCountThisMonth) || 0,
    paidInvoiceCount: Number(raw.paidInvoiceCount) || 0,
    pendingInvoiceCount: Number(raw.pendingInvoiceCount) || 0,
    recentInvoices: Array.isArray(raw.recentInvoices)
      ? raw.recentInvoices.map((inv) => ({
          id: inv.id ?? "",
          number: inv.number ?? "",
          title: inv.title ?? "",
          clientName: inv.clientName ?? "",
          status: inv.status ?? "draft",
          total: Number(inv.total) || 0,
          createdAt: inv.createdAt ?? "",
        }))
      : [],
    auditLogs: Array.isArray(raw.auditLogs)
      ? raw.auditLogs.map((entry) => ({
          id: entry.id ?? "",
          adminUserId: entry.adminUserId ?? "",
          targetUserId: entry.targetUserId ?? "",
          action: entry.action ?? "unknown",
          oldValue: entry.oldValue ?? null,
          newValue: entry.newValue ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          createdAt: entry.createdAt ?? "",
        }))
      : [],
    auditLogsUnavailable: Boolean(raw.auditLogsUnavailable),
    recentInvoicesUnavailable: Boolean(raw.recentInvoicesUnavailable),
  };
}

export async function fetchAdminMe(): Promise<{ isAdmin: boolean }> {
  return adminFetch("/api/admin/me");
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return adminFetch("/api/admin/stats");
}

export async function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.plan) params.set("plan", query.plan);
  if (query.status) params.set("status", query.status);
  if (query.filter) params.set("filter", query.filter);
  if (query.sort) params.set("sort", query.sort);
  const qs = params.toString();
  return adminFetch(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminUser(userId: string): Promise<AdminUserDetail> {
  const data = await adminFetch<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`);
  return normalizeAdminUserDetail(data);
}

export async function updateAdminUser(
  userId: string,
  patch: { plan?: UserPlan; isDisabled?: boolean },
): Promise<{ id: string; plan: UserPlan; isDisabled: boolean; status: string }> {
  return adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteAdminUser(
  userId: string,
): Promise<{ ok: true; id: string; email: string }> {
  return adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export type AdminSubscriptionAction =
  | "activate"
  | "renew"
  | "extend"
  | "cancel_at_period_end"
  | "cancel_immediately"
  | "move_to_free";

export async function postAdminSubscription(
  userId: string,
  body: {
    action: AdminSubscriptionAction;
    plan?: UserPlan;
    months?: number;
    customEndsAt?: string;
    paymentReference?: string;
    notes?: string;
  },
): Promise<{ ok: true; result: unknown }> {
  return adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/subscription`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
