import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Eye, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/lib/vegapal-store";
import {
  downloadInvoicePdf as downloadFile,
  shareInvoicePdf as shareFile,
  viewInvoicePdf as viewFile,
} from "@/lib/pdf/download-invoice-pdf";
import { canShare, isMobileViewport } from "@/lib/pdf/pdf-filename";
import { logUserActivity } from "@/lib/activity/log-user-activity";
import { cn } from "@/lib/utils";

type Props = {
  invoice: Invoice;
  publicUrl?: string;
  className?: string;
  /** Compact row for detail headers */
  size?: "default" | "sm";
};

export function InvoicePdfActions({ invoice, publicUrl, className, size = "default" }: Props) {
  const { t } = useTranslation("common");
  const [busy, setBusy] = useState<"download" | "share" | "view" | null>(null);

  const mobile = useMemo(() => isMobileViewport(), []);
  const shareAvailable = useMemo(() => canShare(), []);

  const run = async (action: "download" | "share" | "view") => {
    if (busy) return;
    setBusy(action);
    try {
      if (action === "download") {
        await downloadFile(invoice);
        void logUserActivity("pdf_downloaded", {
          description: `Downloaded PDF ${invoice.number}`,
          metadata: { invoice_id: invoice.id, invoice_type: invoice.documentType },
        });
        toast.success(t("pdf.downloaded"));
      } else if (action === "view") {
        await viewFile(invoice);
      } else {
        const result = await shareFile(invoice, { publicUrl });
        if (result.ok) {
          void logUserActivity("pdf_shared", {
            description: `Shared PDF ${invoice.number}`,
            metadata: { invoice_id: invoice.id, invoice_type: invoice.documentType },
          });
          if (result.method === "download") toast.message(t("pdf.shareFallbackDownload"));
          else toast.success(t("pdf.shared"));
        } else if (!result.cancelled) {
          toast.error(result.message || t("pdf.generateFailed"));
        }
      }
    } catch {
      toast.error(t("pdf.generateFailed"));
    } finally {
      setBusy(null);
    }
  };

  const btnClass = size === "sm" ? "h-9" : undefined;
  const preparing = busy !== null;

  const shareBtn = shareAvailable ? (
    <Button
      type="button"
      variant={mobile ? "hero" : "outline"}
      className={btnClass}
      disabled={preparing}
      aria-label={t("pdf.share")}
      onClick={() => void run("share")}
    >
      {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      {busy === "share" ? t("pdf.preparing") : t("pdf.share")}
    </Button>
  ) : null;

  const downloadBtn = (
    <Button
      type="button"
      variant={mobile ? "outline" : "hero"}
      className={btnClass}
      disabled={preparing}
      aria-label={t("pdf.download")}
      onClick={() => void run("download")}
    >
      {busy === "download" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {busy === "download" ? t("pdf.preparing") : t("pdf.download")}
    </Button>
  );

  const viewBtn = !mobile ? (
    <Button
      type="button"
      variant="outline"
      className={btnClass}
      disabled={preparing}
      aria-label={t("pdf.view")}
      onClick={() => void run("view")}
    >
      {busy === "view" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      {busy === "view" ? t("pdf.preparing") : t("pdf.view")}
    </Button>
  ) : null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label={t("pdf.actionsLabel")}>
      {mobile ? (
        <>
          {shareBtn}
          {downloadBtn}
        </>
      ) : (
        <>
          {downloadBtn}
          {viewBtn}
          {shareBtn}
        </>
      )}
    </div>
  );
}
