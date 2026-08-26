import { requireUserFromRequest } from "@/lib/auth/require-user.server";
import { requireAdminFromRequest } from "@/lib/admin/admin-auth.server";
import { getRequestMeta, writeAdminAuditLog } from "@/lib/admin/admin-audit.server";
import {
  checkServerRateLimit,
  clientIpFromRequest,
} from "@/lib/auth/server-rate-limit.server";
import type { PublicBillingPeriod } from "@/lib/billing/public-pricing";
import {
  isUsdtSubscriptionNetworkId,
  type UsdtSubscriptionNetworkId,
} from "@/lib/billing/usdt-subscription-deposits";
import {
  approveSubscriptionPaymentRequest,
  createSubscriptionPaymentRequest,
  listSubscriptionPaymentRequests,
  rejectSubscriptionPaymentRequest,
  type SubscriptionPaymentRequestStatus,
} from "@/lib/billing/subscription-payment-requests.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isBillingPeriod(value: unknown): value is PublicBillingPeriod {
  return value === "monthly" || value === "semiannual";
}

export async function handleBillingApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === "/api/billing/subscription-payments" && request.method === "POST") {
      const ip = clientIpFromRequest(request);
      const rate = checkServerRateLimit(`billing-pay:${ip}`, 10, 15 * 60_000);
      if (!rate.allowed) {
        return json(
          { error: `Too many attempts. Try again in ${rate.retryAfterSec} seconds.` },
          429,
        );
      }

      const user = await requireUserFromRequest(request);
      const body = (await request.json()) as {
        billingPeriod?: unknown;
        networkId?: unknown;
        txHash?: unknown;
        notes?: unknown;
      };

      if (!isBillingPeriod(body.billingPeriod)) {
        return json({ error: "Choose a valid billing period." }, 400);
      }
      if (!isUsdtSubscriptionNetworkId(body.networkId)) {
        return json({ error: "Choose a supported USDT network." }, 400);
      }
      if (typeof body.txHash !== "string" || !body.txHash.trim()) {
        return json({ error: "Transaction hash is required." }, 400);
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const row = await createSubscriptionPaymentRequest(supabaseAdmin, {
        userId: user.userId,
        billingPeriod: body.billingPeriod,
        networkId: body.networkId as UsdtSubscriptionNetworkId,
        txHash: body.txHash,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      });

      return json({ request: row }, 201);
    }

    if (path === "/api/admin/subscription-payments" && request.method === "GET") {
      await requireAdminFromRequest(request);
      const statusParam = url.searchParams.get("status") ?? "pending_review";
      const status =
        statusParam === "all" ||
        statusParam === "pending_review" ||
        statusParam === "approved" ||
        statusParam === "rejected"
          ? (statusParam as SubscriptionPaymentRequestStatus | "all")
          : "pending_review";

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const requests = await listSubscriptionPaymentRequests(supabaseAdmin, { status });
      return json({ requests });
    }

    const reviewMatch = path.match(
      /^\/api\/admin\/subscription-payments\/([^/]+)\/(approve|reject)$/,
    );
    if (reviewMatch && request.method === "POST") {
      const admin = await requireAdminFromRequest(request);
      const requestId = decodeURIComponent(reviewMatch[1]);
      const action = reviewMatch[2] as "approve" | "reject";
      const body = (await request.json().catch(() => ({}))) as { reason?: string };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const meta = getRequestMeta(request);

      if (action === "approve") {
        const row = await approveSubscriptionPaymentRequest(supabaseAdmin, {
          requestId,
          adminUserId: admin.userId,
        });
        await writeAdminAuditLog(supabaseAdmin, {
          adminUserId: admin.userId,
          targetUserId: row.userId,
          action: "subscription_payment_approved",
          oldValue: null,
          newValue: {
            requestId: row.id,
            billingPeriod: row.billingPeriod,
            amountUsdt: row.amountUsdt,
            months: row.months,
            networkId: row.networkId,
            txHash: row.txHash,
            subscriptionId: row.subscriptionId,
          },
          ...meta,
        });
        return json({ request: row });
      }

      const row = await rejectSubscriptionPaymentRequest(supabaseAdmin, {
        requestId,
        adminUserId: admin.userId,
        reason: body.reason,
      });
      await writeAdminAuditLog(supabaseAdmin, {
        adminUserId: admin.userId,
        targetUserId: row.userId,
        action: "subscription_payment_rejected",
        oldValue: null,
        newValue: {
          requestId: row.id,
          reason: row.rejectionReason,
          txHash: row.txHash,
        },
        ...meta,
      });
      return json({ request: row });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Request failed.";
    console.error("[billing-api]", message);
    return json({ error: message }, 400);
  }
}
