import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function logUserActivityServer(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  action: string,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("user_activity_logs").insert({
      user_id: userId,
      action: action.slice(0, 80),
      description: description?.slice(0, 280) ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    console.error("[activity] server log failed");
  }
}
