import { supabase } from "@/integrations/supabase/client";

export type UserActivityAction =
  | "account_registered"
  | "email_confirmed"
  | "login"
  | "logout"
  | "invoice_created"
  | "invoice_updated"
  | "invoice_duplicated"
  | "invoice_canceled"
  | "pdf_downloaded"
  | "pdf_shared"
  | "payment_page_viewed"
  | "payment_method_created"
  | "payment_method_deleted";

/** Fire-and-forget activity log. Never throws to callers. */
export async function logUserActivity(
  action: UserActivityAction | string,
  options?: {
    userId?: string;
    description?: string;
    metadata?: Record<string, string | number | boolean | null | undefined>;
  },
): Promise<void> {
  try {
    let userId = options?.userId;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    }
    if (!userId) return;

    const metadata: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(options?.metadata ?? {})) {
      if (v === undefined) continue;
      metadata[k] = v;
    }

    // Prefer RPC (SECURITY DEFINER).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("log_user_activity", {
      p_user_id: userId,
      p_action: action,
      p_description: options?.description ?? null,
      p_metadata: metadata,
    });

    if (error) {
      // Fallback insert may fail under RLS — that's OK.
      console.warn("[activity] log failed");
    }
  } catch {
    /* never block product flows */
  }
}
