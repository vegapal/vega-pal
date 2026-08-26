import { cn } from "@/lib/utils";
import {
  resolveBrandLogoSrc,
  type LogoSize,
  type LogoVariant,
} from "@/lib/brand";

/** Balanced heights — desktop stays elegant; mobile never overflows header bars. */
const LOGO_HEIGHT: Record<LogoSize, string> = {
  sm: "h-6",
  default: "h-7",
  lg: "h-8",
  auth: "h-9",
  hero: "h-7 sm:h-8 lg:h-9",
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
  /** Standalone V mark for compact / mobile placements. */
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
  const heightClass = markOnly ? MARK_BOX[size] : LOGO_HEIGHT[size];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-start max-w-full overflow-visible",
        markOnly ? "shrink-0" : "min-w-0",
        className,
      )}
    >
      <img
        src={src}
        alt="VegaPal"
        className={cn(
          "block w-auto max-w-full max-h-full object-contain object-left select-none",
          heightClass,
          markOnly && "aspect-square",
        )}
        draggable={false}
        decoding="async"
      />
    </span>
  );
}
