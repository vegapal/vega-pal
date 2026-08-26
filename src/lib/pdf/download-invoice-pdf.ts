import type { Invoice } from "@/lib/vegapal-store";
import { createInvoicePdfFile } from "@/lib/pdf/create-invoice-pdf-file";
import {
  canShare,
  canShareFiles,
  openBlobInNewTab,
  triggerBlobDownload,
} from "@/lib/pdf/pdf-filename";
import { logUserActivity } from "@/lib/activity/log-user-activity";
import { trackPdfDownloaded } from "@/lib/analytics/events";

export async function downloadInvoicePdf(inv: Invoice): Promise<void> {
  const { blob, filename } = await createInvoicePdfFile(inv);
  triggerBlobDownload(blob, filename);
  trackPdfDownloaded();
  void logUserActivity("pdf_downloaded", {
    description: `Downloaded PDF ${inv.number}`,
    metadata: { invoice_id: inv.id, invoice_type: inv.documentType },
  });
}

export async function viewInvoicePdf(inv: Invoice): Promise<void> {
  const { blob } = await createInvoicePdfFile(inv);
  openBlobInNewTab(blob);
}

export type ShareInvoicePdfResult =
  | { ok: true; method: "files" | "link" | "download" }
  | { ok: false; cancelled?: boolean; message: string };

export async function shareInvoicePdf(
  inv: Invoice,
  options?: { publicUrl?: string },
): Promise<ShareInvoicePdfResult> {
  try {
    const { file, filename, blob } = await createInvoicePdfFile(inv);

    if (canShareFiles()) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: inv.title?.trim() || inv.number,
        });
        void logUserActivity("pdf_shared", {
          description: `Shared PDF ${inv.number}`,
          metadata: { invoice_id: inv.id, method: "files" },
        });
        return { ok: true, method: "files" };
      } catch (err) {
        if (isAbortError(err)) return { ok: false, cancelled: true, message: "Share cancelled." };
        // Fall through to link / download
      }
    }

    if (canShare() && options?.publicUrl) {
      try {
        await navigator.share({
          title: filename,
          text: inv.title?.trim() || inv.number,
          url: options.publicUrl,
        });
        void logUserActivity("pdf_shared", {
          description: `Shared PDF ${inv.number}`,
          metadata: { invoice_id: inv.id, method: "link" },
        });
        return { ok: true, method: "link" };
      } catch (err) {
        if (isAbortError(err)) return { ok: false, cancelled: true, message: "Share cancelled." };
      }
    }

    triggerBlobDownload(blob, filename);
    void logUserActivity("pdf_shared", {
      description: `Shared PDF ${inv.number}`,
      metadata: { invoice_id: inv.id, method: "download" },
    });
    return { ok: true, method: "download" };
  } catch {
    return { ok: false, message: "We couldn't generate your PDF. Please try again." };
  }
}

function isAbortError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
}
