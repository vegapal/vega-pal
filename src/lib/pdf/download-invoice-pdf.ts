import type { Invoice } from "@/lib/vegapal-store";
import { supabase } from "@/integrations/supabase/client";
import { isHtmlInvoicePdfEnabled } from "@/lib/pdf/html-invoice-pdf-flag";

export async function downloadInvoicePdf(inv: Invoice): Promise<void> {
  if (!isHtmlInvoicePdfEnabled()) {
    const { generateInvoicePDF } = await import("@/lib/invoice-pdf");
    await generateInvoicePDF(inv);
    return;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You must be signed in to download this PDF.");
  }

  const response = await fetch("/api/invoices/pdf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoiceId: inv.id }),
  });

  if (!response.ok) {
    let message = "Could not generate PDF.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${inv.number}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
