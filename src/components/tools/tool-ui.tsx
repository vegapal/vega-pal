import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trackToolCompleted, trackToolStarted } from "@/lib/analytics/events";
import type { ToolSlug } from "@/lib/seo/tools-registry";

/**
 * Fires tool_started once per mount on first interaction, and tool_completed
 * once per mount when the tool first produces a usable result. No input values
 * are ever sent — only the tool slug and a coarse outcome label.
 */
export function useToolAnalytics(slug: ToolSlug) {
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  const onInteract = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackToolStarted(slug);
  }, [slug]);

  const onResult = useCallback(
    (hasResult: boolean, outcome?: string) => {
      if (!hasResult || completedRef.current) return;
      completedRef.current = true;
      trackToolCompleted(slug, outcome);
    },
    [slug],
  );

  return { onInteract, onResult };
}

export function ToolField({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export function ToolNumberInput({
  id,
  value,
  onValueChange,
  placeholder,
  min,
  step,
  suffix,
}: {
  id: string;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  min?: number;
  step?: number | "any";
  suffix?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className={suffix ? "pr-14" : undefined}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function ToolChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-11 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-slate hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ToolResult({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 rounded-xl px-4 py-3",
        emphasis ? "bg-primary/10" : "bg-soft-section",
      )}
    >
      <span className="text-sm font-medium text-slate">{label}</span>
      <span
        className={cn(
          "tabular-nums font-semibold text-right",
          emphasis ? "text-lg sm:text-xl text-primary" : "text-base text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function ToolResultPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 space-y-2 border-t border-border pt-6" aria-live="polite">
      {children}
    </div>
  );
}

export function ToolCopyButton({
  text,
  label = "Copy",
  disabled = false,
}: {
  text: string;
  label?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the text is on screen and selectable */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={disabled || !text}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-muted disabled:opacity-50"
    >
      {copied ? (
        <Check className="h-4 w-4 text-primary" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

export function parseNumber(value: string): number {
  if (value.trim() === "") return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function formatMoney(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
