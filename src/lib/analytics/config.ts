export const GOOGLE_SITE_VERIFICATION =
  import.meta.env.VITE_GOOGLE_SITE_VERIFICATION?.trim() || "";

export const GOOGLE_TAG_MANAGER_ID =
  import.meta.env.VITE_GOOGLE_TAG_MANAGER_ID?.trim() || "";

export const GOOGLE_ANALYTICS_ID =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim() || "";

export const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID?.trim() || "";

export const GOOGLE_ADS_SIGNUP_LABEL =
  import.meta.env.VITE_GOOGLE_ADS_SIGNUP_LABEL?.trim() || "";

export const GOOGLE_ADS_INVOICE_CREATED_LABEL =
  import.meta.env.VITE_GOOGLE_ADS_INVOICE_CREATED_LABEL?.trim() || "";

export const GOOGLE_ADS_SUBSCRIPTION_LABEL =
  import.meta.env.VITE_GOOGLE_ADS_SUBSCRIPTION_LABEL?.trim() || "";

export const GOOGLE_ADS_INVOICE_PAID_LABEL =
  import.meta.env.VITE_GOOGLE_ADS_INVOICE_PAID_LABEL?.trim() || "";

export const MICROSOFT_CLARITY_ID =
  import.meta.env.VITE_MICROSOFT_CLARITY_ID?.trim() || "";

export const hasGoogleTagManager = Boolean(GOOGLE_TAG_MANAGER_ID);
export const hasGoogleAnalytics = Boolean(GOOGLE_ANALYTICS_ID);
export const hasGoogleAds = Boolean(GOOGLE_ADS_ID);
export const hasMicrosoftClarity = Boolean(MICROSOFT_CLARITY_ID);
