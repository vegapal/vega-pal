export const PUBLIC_NAV_LINKS = [
  { href: "/invoice-generator", labelKey: "invoiceGenerator" },
  { href: "/#features", labelKey: "features" },
  { href: "/#converter", labelKey: "converter" },
  { href: "/#pricing", labelKey: "pricing" },
  { to: "/learn", labelKey: "learn" },
  { href: "/#contact", labelKey: "contact" },
] as const;

export type PublicNavLink = (typeof PUBLIC_NAV_LINKS)[number];
