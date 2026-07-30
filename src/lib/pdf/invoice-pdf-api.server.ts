import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseServerEnv } from "@/lib/auth/supabase-env.server";
import { isHtmlInvoicePdfEnabled } from "@/lib/pdf/html-invoice-pdf-flag";
import { renderInvoicePdfBufferFromInvoice } from "@/lib/pdf/render-invoice-html";
import { mapDatabaseInvoiceRow, type InvoiceRow, type ItemRow } from "@/lib/vegapal-store";

function createUserClient(accessToken: string) {
  const { url, publishableKey } = requireSupabaseServerEnv();
  return createClient<Database>(url, publishableKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUserId(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const supabase = createUserClient(token);
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return data.claims.sub;
}

export async function handleInvoicePdfApiRequest(request: Request): Promise<Response> {
  if (!isHtmlInvoicePdfEnabled()) {
    return new Response(JSON.stringify({ error: "HTML invoice PDF is not enabled" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }

  let body: { invoiceId?: string };
  try {
    body = (await request.json()) as { invoiceId?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const invoiceId = body.invoiceId?.trim();
  if (!invoiceId) {
    return new Response(JSON.stringify({ error: "invoiceId is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const authHeader = request.headers.get("authorization")!;
  const token = authHeader.slice("Bearer ".length).trim();
  const supabase = createUserClient(token);

  const { data: row, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[invoice-pdf-api] fetch failed", error.code);
    return new Response(JSON.stringify({ error: "Could not load invoice" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if (!row) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId);

  if (itemsError) {
    console.error("[invoice-pdf-api] items fetch failed", itemsError.code);
    return new Response(JSON.stringify({ error: "Could not load invoice" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const inv = mapDatabaseInvoiceRow(row as InvoiceRow, (items ?? []) as ItemRow[]);
  const pdfBytes = await renderInvoicePdfBufferFromInvoice(inv);

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${inv.number}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
