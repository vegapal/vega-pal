/** Central VegaPal brand asset paths and palette helpers. */

export const BRAND = {
  bankingNavy: "#082D4F",
  deepNav: "#06243F",
  ocean: "#0D4F7C",
  midnight: "#06243F",
  deepNavy: "#082D4F",
  blue: "#1677E8",
  blueHover: "#1268CF",
  blueActive: "#105BB5",
  electric: "#2F9BFF",
  cyan: "#19CFF3",
  canvas: "#F1F5F9",
  softSection: "#E9F0F7",
  mist: "#E9F0F7",
  ice: "#F1F5F9",
  border: "#D7E1EB",
  ink: "#071B2F",
  slate: "#526477",
  onDark: "#FFFFFF",
  onDarkSecondary: "#D8E5F0",
  onDarkMuted: "#A8BDD0",
  white: "#FFFFFF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  gradient: "linear-gradient(135deg, #06243F 0%, #082D4F 55%, #0D4F7C 100%)",
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
