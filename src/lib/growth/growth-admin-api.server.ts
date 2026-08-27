import { requireAdminFromRequest } from "@/lib/admin/admin-auth.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function handleGrowthAdminApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!path.startsWith("/api/admin/growth")) {
    return json({ error: "Not found" }, 404);
  }

  await requireAdminFromRequest(request);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const range = url.searchParams.get("range") ?? "30d";
  const days = range === "1d" || range === "today" ? 1 : range === "7d" ? 7 : 30;
  const since = daysAgoIso(days);

  if (path === "/api/admin/growth/summary" && request.method === "GET") {
    try {
      const [
        { count: newUsers },
        { count: activated },
        { count: referralSignups },
        { count: referralActivated },
        { data: commissions },
        { count: approvedPayments },
      ] = await Promise.all([
        admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since),
        admin
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .in("status", ["qualified", "rewarded"])
          .gte("qualified_at", since),
        admin
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .gte("attributed_at", since),
        admin
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .in("status", ["qualified", "rewarded"])
          .gte("qualified_at", since),
        admin
          .from("affiliate_commissions")
          .select("commission_amount_usd, gross_revenue_usd, status")
          .gte("earned_at", since),
        admin
          .from("subscription_payment_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .gte("reviewed_at", since),
      ]);

      // Activated users (first document) approximate: users with ≥1 invoice created in range
      // Prefer referral-qualified count separately; native activation = invoices distinct users
      const { data: invoiceRows } = await admin
        .from("invoices")
        .select("user_id, created_at")
        .gte("created_at", since)
        .limit(5000);

      const activatedUsers = new Set(
        (invoiceRows ?? []).map((r: { user_id: string }) => r.user_id),
      ).size;

      const commissionRows = (commissions ?? []) as Array<{
        commission_amount_usd: number;
        gross_revenue_usd: number;
        status: string;
      }>;
      const commissionEarned = commissionRows
        .filter((c) => c.status === "earned" || c.status === "paid")
        .reduce((s, c) => s + Number(c.commission_amount_usd || 0), 0);
      const revenueAttributed = commissionRows.reduce(
        (s, c) => s + Number(c.gross_revenue_usd || 0),
        0,
      );

      const signups = newUsers ?? 0;
      const activationRate =
        signups > 0 ? Math.round((activatedUsers / signups) * 1000) / 10 : 0;

      return json({
        range: days === 1 ? "today" : days === 7 ? "7d" : "30d",
        since,
        newUsers: signups,
        activatedUsers,
        activationRatePercent: activationRate,
        referralSignups: referralSignups ?? 0,
        referralActivations: referralActivated ?? activated ?? 0,
        proCustomers: approvedPayments ?? 0,
        affiliateRevenueUsd: revenueAttributed,
        affiliateCommissionsUsd: commissionEarned,
        note: "Visitor counts are not available server-side from analytics; use GA4 for anonymous traffic.",
      });
    } catch (err) {
      console.error("[admin-growth] summary failed", err);
      return json({ error: "Growth tables may not be migrated yet." }, 503);
    }
  }

  if (path === "/api/admin/growth/top-referrers" && request.method === "GET") {
    try {
      const { data } = await admin
        .from("referrals")
        .select("referral_code, status, referrer_user_id")
        .gte("attributed_at", since)
        .limit(2000);

      const map = new Map<string, { code: string; invited: number; activated: number }>();
      for (const row of data ?? []) {
        const code = String(row.referral_code);
        const cur = map.get(code) ?? { code, invited: 0, activated: 0 };
        cur.invited += 1;
        if (row.status === "qualified" || row.status === "rewarded") cur.activated += 1;
        map.set(code, cur);
      }
      const top = [...map.values()].sort((a, b) => b.activated - a.activated).slice(0, 20);
      return json({ items: top });
    } catch {
      return json({ error: "Growth tables may not be migrated yet." }, 503);
    }
  }

  if (path === "/api/admin/growth/affiliates" && request.method === "GET") {
    try {
      const { data, error } = await admin
        .from("affiliates")
        .select("id, name, code, status, commission_rate, notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ items: data ?? [] });
    } catch {
      return json({ error: "Growth tables may not be migrated yet." }, 503);
    }
  }

  if (path === "/api/admin/growth/affiliates" && request.method === "POST") {
    try {
      const body = (await request.json()) as {
        name?: string;
        code?: string;
        commissionRate?: number;
        notes?: string;
      };
      const name = body.name?.trim();
      const code = body.code?.trim().toUpperCase();
      const rate =
        typeof body.commissionRate === "number" ? body.commissionRate : 0.3;
      if (!name || !code || !/^[A-Z0-9]{4,24}$/.test(code)) {
        return json({ error: "Invalid affiliate name or code." }, 400);
      }
      if (rate < 0 || rate > 1) return json({ error: "Invalid commission rate." }, 400);

      const { data, error } = await admin
        .from("affiliates")
        .insert({
          name,
          code,
          commission_rate: rate,
          notes: body.notes?.trim() || null,
          status: "active",
        })
        .select("*")
        .single();
      if (error) {
        if (String(error.code) === "23505") {
          return json({ error: "Affiliate code already exists." }, 409);
        }
        throw error;
      }
      return json({ item: data });
    } catch {
      return json({ error: "Could not create affiliate." }, 500);
    }
  }

  if (path === "/api/admin/growth/commissions" && request.method === "GET") {
    try {
      const { data, error } = await admin
        .from("affiliate_commissions")
        .select(
          "id, affiliate_id, referred_user_id, subscription_payment_request_id, gross_revenue_usd, commission_rate, commission_amount_usd, status, earned_at, paid_at",
        )
        .order("earned_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ items: data ?? [] });
    } catch {
      return json({ error: "Growth tables may not be migrated yet." }, 503);
    }
  }

  const markPaid = path.match(/^\/api\/admin\/growth\/commissions\/([^/]+)\/paid$/);
  if (markPaid && request.method === "POST") {
    const id = decodeURIComponent(markPaid[1]);
    try {
      const { data, error } = await admin
        .from("affiliate_commissions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "earned")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Commission not found or not earned." }, 404);
      return json({ item: data });
    } catch {
      return json({ error: "Could not mark commission paid." }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}
