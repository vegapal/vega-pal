/** Only called after a confirmed, enabled user successfully receives a session. */
export async function recordSuccessfulServerLogin(userId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signal = AbortSignal.timeout(1_500);
    await Promise.allSettled([
      supabaseAdmin
        .from("user_activity_logs" as never)
        .insert({
          user_id: userId,
          action: "login",
          description: "Signed in",
        } as never)
        .abortSignal(signal),
      // New service-only event store cannot be forged through the client activity RPC.
      supabaseAdmin
        .rpc("record_site_login" as never, { p_user_id: userId } as never)
        .abortSignal(signal),
    ]);
  } catch {
    // Metrics must never prevent a successful login, including before migration.
    console.warn("[monitoring] login recording unavailable");
  }
}
