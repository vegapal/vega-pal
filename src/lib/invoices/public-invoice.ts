/**
 * Public pay-page invoice fetch — explicit column allowlist (no select("*")).
 * Omits owner/internal fields such as user_id and document link IDs.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  mapDatabaseInvoiceRow,
  type Invoice,
  type InvoiceRow,
  type ItemRow,
} from "@/lib/vegapal-store";

/** Columns required to render /pay/:id — excludes user_id and internal link IDs. */
export const PUBLIC_INVOICE_SELECT = [
  "id",
  "number",
  "client_name",
  "client_email",
  "client_company",
  "title",
  "description",
  "status",
  "document_type",
  "document_status",
  "payment_status",
  "issue_date",
  "due_date",
  "subtotal",
  "discount",
  "tax",
  "discount_type",
  "tax_type",
  "discount_rate",
  "tax_rate",
  "total",
  "wallet_address",
  "network",
  "seller_name",
  "seller_business",
  "seller_email",
  "seller_address",
  "seller_logo_url",
  "brand_color",
  "invoice_currency",
  "po_number",
  "reference_number",
  "project_code",
  "terms_and_conditions",
  "display_options",
  "payment_methods",
].join(", ");

export const PUBLIC_INVOICE_ITEM_SELECT =
  "invoice_id, position, description, quantity, unit_price, total";

export async function fetchPublicInvoice(id: string): Promise<Invoice | null> {
  const [{ data: inv, error: invError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("invoices").select(PUBLIC_INVOICE_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("invoice_items")
      .select(PUBLIC_INVOICE_ITEM_SELECT)
      .eq("invoice_id", id)
      .order("position", { ascending: true }),
  ]);

  if (invError || itemsError || !inv) return null;

  const row = inv as unknown as InvoiceRow;
  // Public rows omit created_at; rowToInvoice tolerates missing optional fields.
  return mapDatabaseInvoiceRow(row, (items ?? []) as ItemRow[]);
}

/** Fields that must never appear on anon public pay responses. */
export const PUBLIC_INVOICE_FORBIDDEN_KEYS = [
  "user_id",
  "source_document_id",
  "converted_document_id",
] as const;

export function assertPublicInvoiceShape(row: Record<string, unknown>): void {
  for (const key of PUBLIC_INVOICE_FORBIDDEN_KEYS) {
    if (key in row && row[key] != null) {
      throw new Error(`Public invoice response must not include ${key}`);
    }
  }
}

export function usePublicInvoice(id: string | undefined) {
  const [data, setData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const inv = await fetchPublicInvoice(id);
    setData(inv);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
