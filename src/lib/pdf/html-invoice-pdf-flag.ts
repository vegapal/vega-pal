export function isHtmlInvoicePdfEnabled(): boolean {
  const env =
    typeof process !== "undefined" && process.env?.HTML_INVOICE_PDF_ENABLED === "true";
  const vite =
    typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_HTML_INVOICE_PDF_ENABLED ===
      "true";
  return Boolean(env || vite);
}
