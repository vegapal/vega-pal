import type { Invoice } from "@/lib/vegapal-store";
import { supabase } from "@/integrations/supabase/client";
import { isHtmlInvoicePdfEnabled } from "@/lib/pdf/html-invoice-pdf-flag";
import { buildInvoicePdfFilename } from "@/lib/pdf/pdf-filename";

export type InvoicePdfFile = {
  blob: Blob;
  file: File;
  filename: string;
};

/** Single source for Download / Share / View — same bytes for all actions. */
export async function createInvoicePdfFile(inv: Invoice): Promise<InvoicePdfFile> {
  const filename = buildInvoicePdfFilename(inv);
  let blob: Blob;

  if (isHtmlInvoicePdfEnabled()) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      // Guests / pay page: fall back to client jsPDF so share still works.
      blob = await createJsPdfBlob(inv);
    } else {
      const response = await fetch("/api/invoices/pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoiceId: inv.id }),
      });
      if (!response.ok) {
        // Prefer authenticated HTML PDF; if it fails for guests' invoice ids, try jsPDF.
        try {
          blob = await createJsPdfBlob(inv);
        } catch {
          let message = "Could not generate PDF.";
          try {
            const body = (await response.json()) as { error?: string };
            if (body.error) message = body.error;
          } catch {
            /* ignore */
          }
          throw new Error(message);
        }
      } else {
        blob = await response.blob();
      }
    }
  } else {
    blob = await createJsPdfBlob(inv);
  }

  const file = new File([blob], filename, { type: "application/pdf" });
  return { blob, file, filename };
}

async function createJsPdfBlob(inv: Invoice): Promise<Blob> {
  const { buildInvoicePdfDocument } = await import("@/lib/invoice-pdf");
  const { doc } = await buildInvoicePdfDocument(inv);
  return doc.output("blob");
}
