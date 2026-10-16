export const I18N_NAMESPACES = [
  "common",
  "landing",
  "auth",
  "dashboard",
  "invoices",
  "settings",
  "admin",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const BOOTSTRAP_NAMESPACES: I18nNamespace[] = ["common", "landing"];
