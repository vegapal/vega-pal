import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logUserActivity } from "@/lib/activity/log-user-activity";
import {
  findDuplicateBank,
  findDuplicateCrypto,
  rowToSavedPaymentMethod,
  savedMethodToInsert,
  type PaymentMethodRow,
  type SavedPaymentMethod,
  type SavedPaymentMethodInput,
} from "@/lib/payment-methods/types";

function pm() {
  return supabase.from("payment_methods");
}

export async function listSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await pm()
    .select("*")
    .eq("user_id", userData.user.id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data as PaymentMethodRow[] | null) ?? []).map(rowToSavedPaymentMethod);
}

export async function createSavedPaymentMethod(
  input: SavedPaymentMethodInput,
): Promise<SavedPaymentMethod> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const existing = await listSavedPaymentMethods();
  if (input.type === "bank") {
    const dup = findDuplicateBank(existing, input.iban, input.accountNumber);
    if (dup) return dup;
  } else {
    const dup = findDuplicateCrypto(
      existing,
      input.walletAddress,
      input.network,
      input.cryptoCurrency,
    );
    if (dup) return dup;
  }

  if (input.isDefault) {
    await clearDefaultForType(userData.user.id, input.type);
  }

  const payload = savedMethodToInsert(input, userData.user.id);
  const { data, error } = await pm().insert(payload).select("*").single();
  if (error) throw error;
  const created = rowToSavedPaymentMethod(data as PaymentMethodRow);
  void logUserActivity("payment_method_created", {
    userId: userData.user.id,
    description: `Saved ${created.type} payment method`,
    metadata: { payment_method_id: created.id, type: created.type },
  });
  return created;
}

export async function updateSavedPaymentMethod(
  id: string,
  input: Partial<SavedPaymentMethodInput> & { isDefault?: boolean },
): Promise<SavedPaymentMethod> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  if (input.isDefault) {
    const type = input.type ?? (await getType(id));
    if (type) await clearDefaultForType(userData.user.id, type);
  }

  const patch: Database["public"]["Tables"]["payment_methods"]["Update"] = {};
  if (input.label !== undefined) patch.label = input.label.trim();
  if (input.isDefault !== undefined) patch.is_default = input.isDefault;
  if (input.bankName !== undefined) patch.bank_name = input.bankName?.trim() || null;
  if (input.accountHolderName !== undefined)
    patch.account_holder_name = input.accountHolderName?.trim() || null;
  if (input.accountName !== undefined) patch.account_name = input.accountName?.trim() || null;
  if (input.iban !== undefined) patch.iban = input.iban?.trim() || null;
  if (input.accountNumber !== undefined) patch.account_number = input.accountNumber?.trim() || null;
  if (input.swiftBic !== undefined) patch.swift_bic = input.swiftBic?.trim() || null;
  if (input.bankCurrency !== undefined) patch.bank_currency = input.bankCurrency?.trim() || null;
  if (input.paymentReference !== undefined)
    patch.payment_reference = input.paymentReference?.trim() || null;
  if (input.cryptoCurrency !== undefined)
    patch.crypto_currency = input.cryptoCurrency?.trim() || null;
  if (input.network !== undefined) patch.network = input.network?.trim() || null;
  if (input.walletAddress !== undefined)
    patch.wallet_address = input.walletAddress?.trim() || null;

  const { data, error } = await pm()
    .update(patch)
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select("*")
    .single();

  if (error) throw error;
  return rowToSavedPaymentMethod(data as PaymentMethodRow);
}

export async function deleteSavedPaymentMethod(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const { error } = await pm().delete().eq("id", id).eq("user_id", userData.user.id);
  if (error) throw error;
  void logUserActivity("payment_method_deleted", {
    userId: userData.user.id,
    description: "Deleted payment method",
    metadata: { payment_method_id: id },
  });
}

export async function setDefaultSavedPaymentMethod(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const type = await getType(id);
  if (!type) throw new Error("Payment method not found.");
  await clearDefaultForType(userData.user.id, type);

  const { error } = await pm()
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userData.user.id);
  if (error) throw error;
}

export async function touchSavedPaymentMethodUsed(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await pm()
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userData.user.id);
}

async function getType(id: string): Promise<"bank" | "crypto" | null> {
  const { data } = await pm().select("type").eq("id", id).maybeSingle();
  const type = (data as { type?: string } | null)?.type;
  if (type === "bank" || type === "crypto") return type;
  return null;
}

async function clearDefaultForType(userId: string, type: "bank" | "crypto"): Promise<void> {
  await pm()
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("type", type)
    .eq("is_default", true);
}
