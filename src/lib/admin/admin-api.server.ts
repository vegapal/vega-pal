import type { TablesUpdate, Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPlan } from "@/lib/admin/plans";
import { normalizeUserPlan } from "@/lib/admin/plans";
import { requireAdminFromRequest } from "@/lib/admin/admin-auth.server";
import { getRequestMeta, writeAdminAuditLog } from "@/lib/admin/admin-audit.server";

type ProfileRow = {
  id: string;
  email: string | null;
  name: string;
  business: string | null;
  plan: UserPlan;
  role: string;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
};

type InvoiceRow = {
  id: string;
  user_id: string;
  number: string;
  title: string;
  client_name: string;
  status: string;
  total: number;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  action: string;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AdminUsersQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  plan?: UserPlan;
  status?: "active" | "disabled";
  filter?:
    | "expired"
    | "expiring_soon"
    | "email_unconfirmed"
    | "";
  sort?: "newest" | "oldest" | "last_active" | "most_invoices" | "subscription_expiry";
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function friendlyError(message?: string): string {
  if (!message) return "Could not complete this action. Please try again.";
  if (message.includes("Cannot change")) return "Profile updates are restricted.";
  if (message.includes("duplicate") || message.includes("violates"))
    return "Could not complete this action. Please try again.";
  return message;
}

function startOfUtcMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function startOfNextUtcMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

function startOfUtcToday() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function startOfUtcNextMonth() {
  return startOfNextUtcMonth();
}

async function countInvoicesThisMonth(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
) {
  const { count, error } = await supabaseAdmin
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfUtcMonth())
    .lt("created_at", startOfNextUtcMonth());
  if (error) throw error;
  return count ?? 0;
}

async function getAuthInfoForUserIds(userIds: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const map = new Map<
    string,
    {
      last_sign_in_at: string | null;
      email: string | null;
      email_confirmed_at: string | null;
    }
  >();

  await Promise.all(
    userIds.map(async (id) => {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
      if (!error && data.user) {
        map.set(id, {
          last_sign_in_at: data.user.last_sign_in_at ?? null,
          email: data.user.email ?? null,
          email_confirmed_at: data.user.email_confirmed_at ?? null,
        });
      }
    }),
  );

  return map;
}

async function getStats() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const todayStart = startOfUtcToday();
  const monthStart = startOfUtcMonth();
  const nextMonthStart = startOfUtcNextMonth();
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weekStartIso = weekStart.toISOString();
  const nowIso = new Date().toISOString();
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString();
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString();

  const [
    { data: profiles, error: profilesError },
    { data: invoices, error: invoicesError },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, plan, is_disabled, created_at"),
    supabaseAdmin.from("invoices").select("id, status, created_at, document_status, payment_status, invoice_currency, total"),
  ]);

  if (profilesError) throw profilesError;
  if (invoicesError) throw invoicesError;

  const profileRows = profiles ?? [];
  const invoiceRows = invoices ?? [];

  let activePaid = 0;
  let expiring7 = 0;
  let expiring30 = 0;
  let expiredSubs = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs } = await (supabaseAdmin as any)
      .from("subscriptions")
      .select("status, ends_at");
    for (const s of subs ?? []) {
      if (s.status === "active" && s.ends_at > nowIso) {
        activePaid += 1;
        if (s.ends_at <= in7) expiring7 += 1;
        if (s.ends_at <= in30) expiring30 += 1;
      }
      if (s.status === "expired" || (s.status === "active" && s.ends_at <= nowIso)) {
        expiredSubs += 1;
      }
    }
  } catch {
    /* table may not exist until migration */
  }

  const volumeByCurrency: Record<string, number> = {};
  for (const inv of invoiceRows) {
    const currency = (inv as { invoice_currency?: string }).invoice_currency || "—";
    const total = Number((inv as { total?: number }).total) || 0;
    volumeByCurrency[currency] = (volumeByCurrency[currency] ?? 0) + total;
  }

  const overdue = invoiceRows.filter((i) => {
    const payment = (i as { payment_status?: string }).payment_status;
    const doc = (i as { document_status?: string }).document_status;
    return payment === "overdue" || i.status === "overdue" || doc === "overdue";
  }).length;

  return {
    totalUsers: profileRows.length,
    newUsersToday: profileRows.filter((p) => p.created_at >= todayStart).length,
    newUsersThisWeek: profileRows.filter((p) => p.created_at >= weekStartIso).length,
    newUsersThisMonth: profileRows.filter((p) => p.created_at >= monthStart).length,
    activeUsers: profileRows.filter((p) => !p.is_disabled).length,
    freeUsers: profileRows.filter((p) => p.plan === "free").length,
    proUsers: profileRows.filter((p) => p.plan === "pro").length,
    businessUsers: profileRows.filter((p) => p.plan === "business").length,
    disabledUsers: profileRows.filter((p) => p.is_disabled).length,
    emailUnconfirmedUsers: 0,
    activePaidSubscriptions: activePaid,
    expiringIn7Days: expiring7,
    expiringIn30Days: expiring30,
    expiredSubscriptions: expiredSubs,
    totalInvoices: invoiceRows.length,
    invoicesToday: invoiceRows.filter((i) => i.created_at >= todayStart).length,
    invoicesThisMonth: invoiceRows.filter(
      (i) => i.created_at >= monthStart && i.created_at < nextMonthStart,
    ).length,
    paidInvoices: invoiceRows.filter((i) => i.status === "paid" || (i as { payment_status?: string }).payment_status === "paid").length,
    pendingInvoices: invoiceRows.filter((i) => i.status === "pending" || (i as { payment_status?: string }).payment_status === "pending").length,
    overdueInvoices: overdue,
    volumeByCurrency,
  };
}

async function getUsersList(query: AdminUsersQuery) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let profileQuery = supabaseAdmin
    .from("profiles")
    .select("id, email, name, business, plan, role, is_disabled, created_at, updated_at", {
      count: "exact",
    });

  if (query.plan) profileQuery = profileQuery.eq("plan", query.plan);
  if (query.status === "disabled") profileQuery = profileQuery.eq("is_disabled", true);
  if (query.status === "active") profileQuery = profileQuery.eq("is_disabled", false);

  const search = query.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    profileQuery = profileQuery.or(
      `name.ilike.%${escaped}%,email.ilike.%${escaped}%,business.ilike.%${escaped}%`,
    );
  }

  const { data: profiles, error: profilesError, count } = await profileQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (profilesError) throw profilesError;

  const profileRows = (profiles ?? []) as ProfileRow[];
  const userIds = profileRows.map((p) => p.id);

  const [{ data: invoices, error: invoicesError }, authMap, subsResult] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("invoices").select("user_id, status, created_at").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    getAuthInfoForUserIds(userIds),
    userIds.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabaseAdmin as any)
          .from("subscriptions")
          .select("user_id, plan, status, ends_at, cancel_at_period_end")
          .in("user_id", userIds)
          .eq("status", "active")
          .order("ends_at", { ascending: false })
          .then((r: { data: unknown; error: unknown }) => r)
          .catch(() => ({ data: [], error: true }))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (invoicesError) throw invoicesError;

  const now = Date.now();
  const monthStart = startOfUtcMonth();
  const monthEnd = startOfNextUtcMonth();
  const in7 = now + 7 * 24 * 60 * 60 * 1000;

  const invoiceCounts = new Map<
    string,
    { total: number; paid: number; pending: number; thisMonth: number }
  >();
  for (const inv of invoices ?? []) {
    const current = invoiceCounts.get(inv.user_id) ?? {
      total: 0,
      paid: 0,
      pending: 0,
      thisMonth: 0,
    };
    current.total += 1;
    if (inv.status === "paid") current.paid += 1;
    if (inv.status === "pending") current.pending += 1;
    if (inv.created_at >= monthStart && inv.created_at < monthEnd) current.thisMonth += 1;
    invoiceCounts.set(inv.user_id, current);
  }

  const subByUser = new Map<
    string,
    { status: string; endsAt: string | null; plan: string; cancelAtPeriodEnd: boolean }
  >();
  for (const row of (Array.isArray(subsResult?.data) ? subsResult.data : []) as {
    user_id: string;
    plan: string;
    status: string;
    ends_at: string;
    cancel_at_period_end: boolean;
  }[]) {
    if (subByUser.has(row.user_id)) continue;
    const endsMs = new Date(row.ends_at).getTime();
    const entitled = row.status === "active" && endsMs > now;
    subByUser.set(row.user_id, {
      plan: row.plan,
      status: entitled ? "active" : "expired",
      endsAt: row.ends_at,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    });
  }

  let users = profileRows.map((profile) => {
    const counts = invoiceCounts.get(profile.id) ?? {
      total: 0,
      paid: 0,
      pending: 0,
      thisMonth: 0,
    };
    const auth = authMap.get(profile.id);
    const sub = subByUser.get(profile.id);
    const endsMs = sub?.endsAt ? new Date(sub.endsAt).getTime() : null;
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email ?? auth?.email ?? "",
      business: profile.business,
      plan: profile.plan,
      role: profile.role,
      isDisabled: profile.is_disabled,
      joinedAt: profile.created_at,
      lastSignInAt: auth?.last_sign_in_at ?? null,
      lastActiveAt: profile.updated_at ?? auth?.last_sign_in_at ?? null,
      emailConfirmed: Boolean(auth?.email_confirmed_at),
      invoiceCount: counts.total,
      invoiceCountThisMonth: counts.thisMonth,
      paidInvoiceCount: counts.paid,
      pendingInvoiceCount: counts.pending,
      status: profile.is_disabled ? ("disabled" as const) : ("active" as const),
      subscriptionStatus: sub?.status ?? (profile.plan === "free" ? "none" : "none"),
      subscriptionEndsAt: sub?.endsAt ?? null,
      isExpiringSoon: Boolean(endsMs && endsMs > now && endsMs <= in7),
    };
  });

  if (query.filter === "expired") {
    users = users.filter((u) => u.subscriptionStatus === "expired");
  } else if (query.filter === "expiring_soon") {
    users = users.filter((u) => u.isExpiringSoon);
  } else if (query.filter === "email_unconfirmed") {
    users = users.filter((u) => !u.emailConfirmed);
  }

  const sort = query.sort ?? "newest";
  users = [...users].sort((a, b) => {
    if (sort === "oldest") return a.joinedAt.localeCompare(b.joinedAt);
    if (sort === "last_active") {
      return (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "");
    }
    if (sort === "most_invoices") return b.invoiceCount - a.invoiceCount;
    if (sort === "subscription_expiry") {
      return (a.subscriptionEndsAt ?? "9999").localeCompare(b.subscriptionEndsAt ?? "9999");
    }
    return b.joinedAt.localeCompare(a.joinedAt);
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

async function getAuditLogsForUser(
  userId: string,
  limit = 50,
): Promise<{
  logs: {
    id: string;
    adminUserId: string;
    targetUserId: string;
    action: string;
    oldValue: unknown;
    newValue: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }[];
  unavailable: boolean;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admin_audit_logs")
    .select("id, admin_user_id, target_user_id, action, old_value, new_value, ip_address, user_agent, created_at")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin-api] audit logs fetch failed");
    return { logs: [], unavailable: true };
  }

  return {
    logs: (data as AuditLogRow[]).map(mapAuditLogRow),
    unavailable: false,
  };
}

function mapAuditLogRow(row: AuditLogRow) {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    targetUserId: row.target_user_id,
    action: row.action,
    oldValue: row.old_value,
    newValue: row.new_value,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

async function getUserDetail(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, email, name, business, company_address, website, contact_email, plan, role, is_disabled, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return null;

  const [
    authMap,
    auditResult,
    recentInvoicesResult,
    allInvoicesResult,
    invoiceCountThisMonth,
    subscription,
    activity,
  ] = await Promise.all([
      getAuthInfoForUserIds([userId]),
      getAuditLogsForUser(userId),
      supabaseAdmin
        .from("invoices")
        .select("id, user_id, number, title, client_name, status, total, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin.from("invoices").select("status").eq("user_id", userId),
      countInvoicesThisMonth(supabaseAdmin, userId).catch(() => 0),
      import("@/lib/subscriptions/subscription.service.server")
        .then((m) => m.getEffectiveSubscriptionForUser(supabaseAdmin, userId))
        .catch(() => null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any)
        .from("user_activity_logs")
        .select("id, action, description, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)
        .then((r: { data: unknown; error: unknown }) => r)
        .catch(() => ({ data: [], error: true })),
    ]);

  if (recentInvoicesResult.error) {
    console.error("[admin-api] recent invoices fetch failed");
  }
  if (allInvoicesResult.error) {
    console.error("[admin-api] invoice stats fetch failed");
  }

  const invoiceRows = allInvoicesResult.error ? [] : (allInvoicesResult.data ?? []);
  const auth = authMap.get(userId);
  const plan = subscription?.effectivePlan ?? normalizeUserPlan(profile.plan);
  const activityRows = Array.isArray(activity?.data) ? activity.data : [];

  return {
    id: profile.id,
    name: profile.name ?? "",
    email: profile.email ?? auth?.email ?? "",
    business: profile.business ?? null,
    companyAddress: profile.company_address ?? null,
    website: profile.website ?? null,
    contactEmail: profile.contact_email ?? null,
    plan,
    role: profile.role ?? "user",
    isDisabled: Boolean(profile.is_disabled),
    joinedAt: profile.created_at,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    lastSignInAt: auth?.last_sign_in_at ?? null,
    invoiceCount: invoiceRows.length,
    invoiceCountThisMonth,
    paidInvoiceCount: invoiceRows.filter((i) => i.status === "paid").length,
    pendingInvoiceCount: invoiceRows.filter((i) => i.status === "pending").length,
    recentInvoices: recentInvoicesResult.error
      ? []
      : (recentInvoicesResult.data ?? []).map((inv) => ({
          id: inv.id,
          number: inv.number ?? "",
          title: inv.title ?? "",
          clientName: inv.client_name ?? "",
          status: inv.status ?? "draft",
          total: Number(inv.total) || 0,
          createdAt: inv.created_at ?? "",
        })),
    recentInvoicesUnavailable: !!recentInvoicesResult.error,
    auditLogs: auditResult.logs,
    auditLogsUnavailable: auditResult.unavailable,
    status: profile.is_disabled ? ("disabled" as const) : ("active" as const),
    subscription: subscription
      ? {
          effectivePlan: subscription.effectivePlan,
          profilePlan: subscription.profilePlan,
          status: subscription.status,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt,
          daysRemaining: subscription.daysRemaining,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          isExpired: subscription.isExpired,
          isExpiringSoon: subscription.isExpiringSoon,
        }
      : null,
    recentActivity: activityRows.map((row: {
      id: string;
      action: string;
      description: string | null;
      created_at: string;
    }) => ({
      id: row.id,
      action: row.action,
      description: row.description,
      createdAt: row.created_at,
    })),
  };
}

async function countAdminProfiles() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw error;
  return count ?? 0;
}

async function deleteUser(targetUserId: string, adminUserId: string, request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (targetUserId === adminUserId) {
    throw new Error("You cannot delete your own account.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, name, business, plan, role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return null;

  if (profile.role === "admin") {
    const adminCount = await countAdminProfiles();
    if (adminCount <= 1) {
      throw new Error("Cannot delete the last admin account.");
    }
  }

  const meta = getRequestMeta(request);
  await writeAdminAuditLog(supabaseAdmin, {
    adminUserId,
    targetUserId,
    action: "user_deleted",
    oldValue: {
      email: profile.email,
      name: profile.name,
      business: profile.business,
      plan: profile.plan,
      role: profile.role,
    },
    newValue: null,
    ...meta,
  });

  const { data: invoiceRows, error: invoiceListError } = await supabaseAdmin
    .from("invoices")
    .select("id")
    .eq("user_id", targetUserId);

  if (invoiceListError) throw invoiceListError;

  const invoiceIds = (invoiceRows ?? []).map((row) => row.id);
  if (invoiceIds.length > 0) {
    const { error: itemsError } = await supabaseAdmin
      .from("invoice_items")
      .delete()
      .in("invoice_id", invoiceIds);
    if (itemsError) throw itemsError;

    const { error: invoicesError } = await supabaseAdmin
      .from("invoices")
      .delete()
      .eq("user_id", targetUserId);
    if (invoicesError) throw invoicesError;
  }

  const { error: auditByAdminError } = await supabaseAdmin
    .from("admin_audit_logs")
    .delete()
    .eq("admin_user_id", targetUserId);
  if (auditByAdminError) throw auditByAdminError;

  const { error: auditByTargetError } = await supabaseAdmin
    .from("admin_audit_logs")
    .delete()
    .eq("target_user_id", targetUserId);
  if (auditByTargetError) throw auditByTargetError;

  const { error: profileDeleteError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", targetUserId);
  if (profileDeleteError) throw profileDeleteError;

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (authDeleteError) throw authDeleteError;

  return {
    id: targetUserId,
    email: profile.email ?? "",
  };
}

async function syncAuthBan(userId: string, isDisabled: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: isDisabled ? "876000h" : "none",
  });
  if (error) {
    console.error("[admin-api] auth ban failed");
  }
}

async function patchUser(
  userId: string,
  body: { plan?: UserPlan; isDisabled?: boolean },
  adminUserId: string,
  request: Request,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (body.plan === undefined && body.isDisabled === undefined) {
    throw new Error("No updates provided");
  }

  const { data: before, error: beforeError } = await supabaseAdmin
    .from("profiles")
    .select("plan, is_disabled")
    .eq("id", userId)
    .maybeSingle();

  if (beforeError) throw beforeError;
  if (!before) return null;

  const updates: TablesUpdate<"profiles"> = { updated_at: new Date().toISOString() };
  if (body.isDisabled !== undefined) updates.is_disabled = body.isDisabled;

  // Plan changes go through the subscription service (authoritative lifecycle).
  if (body.plan !== undefined && before.plan !== body.plan) {
    const {
      activateSubscription,
      moveUserToFree,
    } = await import("@/lib/subscriptions/subscription.service.server");

    if (body.plan === "free") {
      await moveUserToFree(supabaseAdmin, userId);
    } else {
      await activateSubscription(supabaseAdmin, {
        userId,
        plan: body.plan,
        months: 1,
        activatedBy: adminUserId,
        source: "admin_manual",
        notes: "Activated via admin plan change",
      });
    }

    await writeAdminAuditLog(supabaseAdmin, {
      adminUserId,
      targetUserId: userId,
      action: "plan_changed",
      oldValue: { plan: before.plan },
      newValue: { plan: body.plan, months: body.plan === "free" ? null : 1 },
      ...getRequestMeta(request),
    });
  }

  if (body.isDisabled !== undefined) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id, plan, is_disabled")
      .maybeSingle();

    if (error) throw new Error(friendlyError(error.message));
    if (!data) return null;

    if (before.is_disabled !== body.isDisabled) {
      await syncAuthBan(userId, body.isDisabled);
      await writeAdminAuditLog(supabaseAdmin, {
        adminUserId,
        targetUserId: userId,
        action: body.isDisabled ? "user_disabled" : "user_enabled",
        oldValue: { is_disabled: before.is_disabled },
        newValue: { is_disabled: body.isDisabled },
        ...getRequestMeta(request),
      });
    }

    return {
      id: data.id,
      plan: normalizeUserPlan(data.plan),
      isDisabled: data.is_disabled,
      status: data.is_disabled ? "disabled" : "active",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, plan, is_disabled")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error.message));
  if (!data) return null;

  return {
    id: data.id,
    plan: normalizeUserPlan(data.plan),
    isDisabled: data.is_disabled,
    status: data.is_disabled ? "disabled" : "active",
  };
}

function parseUsersQuery(url: URL): AdminUsersQuery {
  const plan = url.searchParams.get("plan");
  const status = url.searchParams.get("status");
  const filter = url.searchParams.get("filter");
  const sort = url.searchParams.get("sort");
  return {
    page: Number(url.searchParams.get("page") ?? "1"),
    pageSize: Number(url.searchParams.get("pageSize") ?? "20"),
    search: url.searchParams.get("search") ?? undefined,
    plan: plan && ["free", "pro", "business"].includes(plan) ? (plan as UserPlan) : undefined,
    status: status === "active" || status === "disabled" ? status : undefined,
    filter:
      filter === "expired" || filter === "expiring_soon" || filter === "email_unconfirmed"
        ? filter
        : undefined,
    sort:
      sort === "newest" ||
      sort === "oldest" ||
      sort === "last_active" ||
      sort === "most_invoices" ||
      sort === "subscription_expiry"
        ? sort
        : undefined,
  };
}

export async function handleAdminApiRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/admin/me") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      try {
        await requireAdminFromRequest(request);
        return json({ isAdmin: true });
      } catch (response) {
        if (response instanceof Response) {
          if (response.status === 403) return json({ isAdmin: false }, 200);
          return response;
        }
        throw response;
      }
    }

    const admin = await requireAdminFromRequest(request);

    if (path === "/api/admin/stats" && request.method === "GET") {
      return json(await getStats());
    }

    if (path === "/api/admin/users" && request.method === "GET") {
      return json(await getUsersList(parseUsersQuery(url)));
    }

    const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userMatch) {
      const userId = decodeURIComponent(userMatch[1]);

      if (request.method === "GET") {
        try {
          const detail = await getUserDetail(userId);
          if (!detail) return json({ error: "User not found" }, 404);
          return json(detail);
        } catch (err) {
          console.error("[admin-api] get user detail failed", err);
          return json({ error: "Could not load this user. Please refresh and try again." }, 500);
        }
      }

      if (request.method === "DELETE") {
        try {
          const deleted = await deleteUser(userId, admin.userId, request);
          if (!deleted) return json({ error: "User not found" }, 404);
          return json({ ok: true, id: deleted.id, email: deleted.email });
        } catch (err) {
          const message =
            err instanceof Error ? friendlyError(err.message) : "Could not delete this user.";
          const status = message.includes("cannot delete") || message.includes("Cannot delete")
            ? 400
            : 500;
          return json({ error: message }, status);
        }
      }

      if (request.method === "PATCH") {
        const rawBody = (await request.json()) as Record<string, unknown>;
        const allowedKeys = new Set(["plan", "isDisabled"]);
        const extraKeys = Object.keys(rawBody).filter((k) => !allowedKeys.has(k));
        if (extraKeys.length > 0) {
          return json({ error: "Invalid request fields." }, 400);
        }

        const body = rawBody as { plan?: UserPlan; isDisabled?: boolean };
        if (body.plan !== undefined && !["free", "pro", "business"].includes(body.plan)) {
          return json({ error: "Invalid plan. Choose Free, Pro, or Business." }, 400);
        }
        if (body.isDisabled !== undefined && typeof body.isDisabled !== "boolean") {
          return json({ error: "Invalid account status." }, 400);
        }
        if (body.plan === undefined && body.isDisabled === undefined) {
          return json({ error: "No updates provided." }, 400);
        }
        try {
          const updated = await patchUser(userId, body, admin.userId, request);
          if (!updated) return json({ error: "User not found" }, 404);
          return json(updated);
        } catch (err) {
          const message = err instanceof Error ? friendlyError(err.message) : "Failed to update user";
          return json({ error: message }, 400);
        }
      }

      return json({ error: "Method not allowed" }, 405);
    }

    const subMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/subscription$/);
    if (subMatch && request.method === "POST") {
      const userId = decodeURIComponent(subMatch[1]);
      const body = (await request.json()) as {
        action?: string;
        plan?: UserPlan;
        months?: number;
        customEndsAt?: string;
        paymentReference?: string;
        notes?: string;
      };

      const action = body.action;
      const allowed = new Set([
        "activate",
        "renew",
        "extend",
        "cancel_at_period_end",
        "cancel_immediately",
        "move_to_free",
      ]);
      if (!action || !allowed.has(action)) {
        return json({ error: "Invalid subscription action." }, 400);
      }

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const svc = await import("@/lib/subscriptions/subscription.service.server");
        const meta = getRequestMeta(request);
        let result: unknown;

        if (action === "activate") {
          if (body.plan !== "pro" && body.plan !== "business") {
            return json({ error: "Choose Pro or Business to activate." }, 400);
          }
          const months = ([1, 3, 6, 12] as const).includes(body.months as 1 | 3 | 6 | 12)
            ? (body.months as 1 | 3 | 6 | 12)
            : 1;
          result = await svc.activateSubscription(supabaseAdmin, {
            userId,
            plan: body.plan,
            months,
            customEndsAt: body.customEndsAt,
            paymentReference: body.paymentReference,
            notes: body.notes,
            activatedBy: admin.userId,
          });
          await writeAdminAuditLog(supabaseAdmin, {
            adminUserId: admin.userId,
            targetUserId: userId,
            action: "subscription_activated",
            oldValue: null,
            newValue: { plan: body.plan, months, customEndsAt: body.customEndsAt ?? null },
            ...meta,
          });
        } else if (action === "renew" || action === "extend") {
          const months = ([1, 3, 6, 12] as const).includes(body.months as 1 | 3 | 6 | 12)
            ? (body.months as 1 | 3 | 6 | 12)
            : 1;
          result = await svc.renewOrExtendSubscription(supabaseAdmin, {
            userId,
            months,
            customEndsAt: body.customEndsAt,
            activatedBy: admin.userId,
            notes: body.notes,
            fromCurrentExpiry: true,
          });
          await writeAdminAuditLog(supabaseAdmin, {
            adminUserId: admin.userId,
            targetUserId: userId,
            action: action === "renew" ? "subscription_renewed" : "subscription_extended",
            oldValue: null,
            newValue: { months, customEndsAt: body.customEndsAt ?? null },
            ...meta,
          });
        } else if (action === "cancel_at_period_end") {
          result = await svc.cancelSubscriptionAtPeriodEnd(supabaseAdmin, userId);
          await writeAdminAuditLog(supabaseAdmin, {
            adminUserId: admin.userId,
            targetUserId: userId,
            action: "subscription_cancel_at_period_end",
            oldValue: null,
            newValue: { cancel_at_period_end: true },
            ...meta,
          });
        } else if (action === "cancel_immediately") {
          result = await svc.cancelSubscriptionImmediately(supabaseAdmin, userId);
          await writeAdminAuditLog(supabaseAdmin, {
            adminUserId: admin.userId,
            targetUserId: userId,
            action: "subscription_canceled_immediately",
            oldValue: null,
            newValue: { plan: "free" },
            ...meta,
          });
        } else {
          result = await svc.moveUserToFree(supabaseAdmin, userId);
          await writeAdminAuditLog(supabaseAdmin, {
            adminUserId: admin.userId,
            targetUserId: userId,
            action: "subscription_moved_to_free",
            oldValue: null,
            newValue: { plan: "free" },
            ...meta,
          });
        }

        return json({ ok: true, result });
      } catch (err) {
        const message =
          err instanceof Error ? friendlyError(err.message) : "Could not update subscription.";
        return json({ error: message }, 400);
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[admin-api] unexpected error");
    return json({ error: "Internal server error" }, 500);
  }
}
