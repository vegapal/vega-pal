import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

export type AuditAction =
  | "plan_changed"
  | "user_disabled"
  | "user_enabled"
  | "user_deleted"
  | "subscription_activated"
  | "subscription_renewed"
  | "subscription_extended"
  | "subscription_cancel_at_period_end"
  | "subscription_canceled_immediately"
  | "subscription_moved_to_free"
  | "subscription_payment_approved"
  | "subscription_payment_rejected";

export async function writeAdminAuditLog(
  supabaseAdmin: SupabaseClient<Database>,
  params: {
    adminUserId: string;
    targetUserId: string;
    action: AuditAction;
    oldValue: Json;
    newValue: Json;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
    admin_user_id: params.adminUserId,
    target_user_id: params.targetUserId,
    action: params.action,
    old_value: params.oldValue,
    new_value: params.newValue,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  });
  if (error) {
    console.error("[admin-audit] failed to write log");
  }
}

export function getRequestMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}
