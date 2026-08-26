import { cn } from "@/lib/utils";
import {
  resolveBrandLogoSrc,
  type LogoSize,
  type LogoVariant,
} from "@/lib/brand";

const LOGO_HEIGHT: Record<LogoSize, string> = {
  sm: "h-7",
  default: "h-8",
  lg: "h-10",
  auth: "h-11",
  hero: "h-12 sm:h-14",
};

const ICON_BOX: Record<LogoSize, string> = {
  sm: "h-7 w-7",
  default: "h-8 w-8",
  lg: "h-10 w-10",
  auth: "h-11 w-11",
  hero: "h-12 w-12 sm:h-14 sm:w-14",
};

export function Logo({
  light = false,
  size = "default",
  markOnly = false,
  className = "",
}: {
  light?: boolean;
  size?: LogoSize;
  /** Compact mark for sidebars / mobile. */
  markOnly?: boolean;
  className?: string;
}) {
  const variant: LogoVariant = markOnly ? "icon" : light ? "white" : "primary";
  const src = resolveBrandLogoSrc(variant);
  const heightClass = markOnly ? ICON_BOX[size] : LOGO_HEIGHT[size];

  return (
    <img
      src={src}
      alt="VegaPal"
      className={cn(
        "inline-block w-auto max-w-full object-contain object-left select-none",
        heightClass,
        !markOnly && "aspect-[280/64]",
        markOnly && "aspect-square",
        className,
      )}
      draggable={false}
      decoding="async"
    />
  );
}
