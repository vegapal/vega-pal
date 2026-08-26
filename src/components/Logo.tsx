import { cn } from "@/lib/utils";
import {
  resolveBrandLogoSrc,
  type LogoSize,
  type LogoVariant,
} from "@/lib/brand";

/**
 * Full logo target widths (height auto via object-contain).
 * Mobile headers: ~118–132px. Desktop stays slightly larger but not oversized.
 */
const LOGO_WIDTH: Record<LogoSize, string> = {
  sm: "w-[7.25rem] sm:w-[7.75rem]", // ~116–124px
  default: "w-[7.75rem] sm:w-[8.25rem]", // ~124–132px
  lg: "w-[8.5rem] sm:w-[9.5rem]",
  auth: "w-[9rem] sm:w-[10rem]",
  hero: "w-[7.5rem] sm:w-[8.5rem] lg:w-[9.5rem]",
};

const MARK_BOX: Record<LogoSize, string> = {
  sm: "h-6 w-6",
  default: "h-7 w-7",
  lg: "h-8 w-8",
  auth: "h-9 w-9",
  hero: "h-7 w-7 sm:h-8 sm:w-8",
};

export function Logo({
  light = false,
  size = "default",
  markOnly = false,
  className = "",
}: {
  light?: boolean;
  size?: LogoSize;
  /** Standalone V mark — only for genuinely compact/icon contexts. */
  markOnly?: boolean;
  className?: string;
}) {
  const variant: LogoVariant = markOnly
    ? light
      ? "markWhite"
      : "mark"
    : light
      ? "white"
      : "primary";
  const src = resolveBrandLogoSrc(variant);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-start overflow-visible",
        markOnly ? "shrink-0" : "min-w-0 max-w-full",
        className,
      )}
    >
      <img
        src={src}
        alt="VegaPal"
        className={cn(
          "block h-auto max-h-none object-contain object-left select-none",
          markOnly ? MARK_BOX[size] : LOGO_WIDTH[size],
          markOnly && "aspect-square",
        )}
        draggable={false}
        decoding="async"
      />
    </span>
  );
}
