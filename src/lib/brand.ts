/** Central VegaPal brand asset paths and palette helpers. */

export const BRAND = {
  midnight: "#061426",
  deepNavy: "#0B203A",
  blue: "#1677E8",
  electric: "#2F9BFF",
  cyan: "#30D5F3",
  ice: "#F4F8FC",
  border: "#DFE7F0",
  ink: "#081426",
  slate: "#5E6B7C",
  white: "#FFFFFF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  gradient: "linear-gradient(135deg, #1677E8 0%, #2F9BFF 55%, #30D5F3 100%)",
} as const;

/** Official raster brand pack — do not invent SVG replacements. */
export const BRAND_ASSETS = {
  logoPrimary: "/brand/logo-primary.png",
  logoWhite: "/brand/logo-white.png",
  markPrimary: "/brand/mark-primary.png",
  markWhite: "/brand/mark-white.png",
  appIconMaster: "/brand/app-icon-master.png",
  faviconIco: "/favicon.ico",
  faviconPng: "/favicon.png",
  appleTouchIcon: "/apple-touch-icon.png",
  icon192: "/brand/icon-192.png",
  icon512: "/brand/icon-512.png",
  maskable192: "/brand/maskable-192.png",
  maskable512: "/brand/maskable-512.png",
  socialAvatar: "/brand/social-avatar-512.png",
  ogBrand: "/brand/og-brand.jpg",
} as const;

export type LogoVariant = "primary" | "white" | "mark" | "markWhite";
export type LogoSize = "sm" | "default" | "lg" | "auth" | "hero";

export function resolveBrandLogoSrc(variant: LogoVariant): string {
  switch (variant) {
    case "white":
      return BRAND_ASSETS.logoWhite;
    case "mark":
      return BRAND_ASSETS.markPrimary;
    case "markWhite":
      return BRAND_ASSETS.markWhite;
    case "primary":
    default:
      return BRAND_ASSETS.logoPrimary;
  }
}
