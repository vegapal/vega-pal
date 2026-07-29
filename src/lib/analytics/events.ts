import {
  GOOGLE_ADS_ID,
  GOOGLE_ADS_INVOICE_CREATED_LABEL,
  GOOGLE_ADS_INVOICE_PAID_LABEL,
  GOOGLE_ADS_SIGNUP_LABEL,
  GOOGLE_ADS_SUBSCRIPTION_LABEL,
  GOOGLE_ANALYTICS_ID,
  hasGoogleAnalytics,
  hasGoogleTagManager,
} from "@/lib/analytics/config";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function pushDataLayer(payload: Record<string, unknown>): void {
  if (!isBrowser()) return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  } catch {
    /* ignore */
  }
}

function gtagEvent(eventName: string, params?: Record<string, string | number | boolean | undefined>): void {
  if (!isBrowser() || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", eventName, params);
  } catch {
    /* ignore */
  }
}

function adsConversion(
  label: string | undefined,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (!GOOGLE_ADS_ID || !label) return;
  gtagEvent("conversion", {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    ...params,
  });
  pushDataLayer({
    event: "ads_conversion",
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    ...params,
  });
}

function analyticsEnabled(): boolean {
  return hasGoogleAnalytics || hasGoogleTagManager;
}

export function trackPageView(path: string, title?: string): void {
  if (!isBrowser() || !analyticsEnabled()) return;
  try {
    const pageTitle = title ?? document.title;
    pushDataLayer({
      event: "page_view",
      page_path: path,
      page_title: pageTitle,
    });
    if (hasGoogleAnalytics && GOOGLE_ANALYTICS_ID) {
      gtagEvent("page_view", {
        page_path: path,
        page_title: pageTitle,
        send_to: GOOGLE_ANALYTICS_ID,
      });
    }
  } catch {
    /* ignore */
  }
}

export function trackSignUp(method = "email"): void {
  if (!isBrowser() || !analyticsEnabled()) return;
  try {
    pushDataLayer({ event: "sign_up", method });
    gtagEvent("sign_up", { method });
    adsConversion(GOOGLE_ADS_SIGNUP_LABEL);
  } catch {
    /* ignore */
  }
}

export function trackLogin(method = "email"): void {
  if (!isBrowser() || !analyticsEnabled()) return;
  try {
    pushDataLayer({ event: "login", method });
    gtagEvent("login", { method });
  } catch {
    /* ignore */
  }
}

export function trackInvoiceCreated(
  invoiceId?: string,
  currency?: string,
  documentType?: "quotation" | "proforma_invoice" | "tax_invoice",
): void {
  if (!isBrowser() || !analyticsEnabled()) return;
  try {
    const params: Record<string, string> = {};
    if (invoiceId) params.invoice_id = invoiceId;
    if (currency) params.currency = currency;
    if (documentType) params.document_type = documentType;
    pushDataLayer({ event: "invoice_created", ...params });
    gtagEvent("invoice_created", params);
    adsConversion(GOOGLE_ADS_INVOICE_CREATED_LABEL, params);
  } catch {
    /* ignore */
  }
}

export function trackInvoicePaid(
  invoiceId?: string,
  value?: number,
  currency?: string,
): void {
  if (!isBrowser() || !analyticsEnabled()) return;
  try {
    const params: Record<string, string | number> = {};
    if (invoiceId) params.transaction_id = invoiceId;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      params.value = value;
    }
    if (currency) params.currency = currency;
    pushDataLayer({ event: "purchase", ...params });
    gtagEvent("purchase", params);
    adsConversion(GOOGLE_ADS_INVOICE_PAID_LABEL, params);
  } catch {
    /* ignore */
  }
}

export function trackSubscriptionStarted(
  plan: string,
  value?: number,
  currency?: string,
): void {
  if (!isBrowser() || !analyticsEnabled()) return;
  try {
    const params: Record<string, string | number> = { plan };
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      params.value = value;
    }
    if (currency) params.currency = currency;
    pushDataLayer({ event: "subscription_started", ...params });
    gtagEvent("subscription_started", params);
    adsConversion(GOOGLE_ADS_SUBSCRIPTION_LABEL, params);
  } catch {
    /* ignore */
  }
}
