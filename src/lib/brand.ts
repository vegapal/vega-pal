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

export const BRAND_ASSETS = {
  logoPrimarySvg: "/brand/logo-primary.svg",
  logoPrimaryPng: "/brand/logo-primary.png",
  logoWhiteSvg: "/brand/logo-white.svg",
  logoWhitePng: "/brand/logo-white.png",
  iconSvg: "/brand/icon.svg",
  iconPng: "/brand/icon.png",
  appleTouchIcon: "/apple-touch-icon.png",
  faviconIco: "/favicon.ico",
  faviconSvg: "/favicon.svg",
} as const;

export type LogoVariant = "primary" | "white" | "icon";
export type LogoSize = "sm" | "default" | "lg" | "auth" | "hero";

export function resolveBrandLogoSrc(variant: LogoVariant): string {
  if (variant === "white") return BRAND_ASSETS.logoWhiteSvg;
  if (variant === "icon") return BRAND_ASSETS.iconSvg;
  return BRAND_ASSETS.logoPrimarySvg;
}
