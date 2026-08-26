import type { Invoice } from "@/lib/vegapal-store";

/** Build a filesystem-safe PDF filename: VegaPal-{number}-{Client}.pdf */
export function buildInvoicePdfFilename(inv: Invoice): string {
  const numberPart = sanitizeFilenamePart(inv.number || "invoice") || "invoice";
  const clientRaw =
    inv.displayOptions?.showClientInfo === false
      ? ""
      : inv.clientCompany?.trim() || inv.clientName?.trim() || "";
  const clientPart = sanitizeFilenamePart(clientRaw).slice(0, 48);
  return clientPart
    ? `VegaPal-${numberPart}-${clientPart}.pdf`
    : `VegaPal-${numberPart}.pdf`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return true;
  try {
    const probe = new File(["x"], "probe.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function openBlobInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    // Popup blocked — fall back to download-like navigation
    window.location.assign(url);
  }
  // Revoke later so the tab can load the blob
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
