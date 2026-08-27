import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  ToolChoiceGroup,
  ToolCopyButton,
  ToolField,
  ToolNumberInput,
  ToolResultPanel,
  parseNumber,
  useToolAnalytics,
} from "@/components/tools/tool-ui";

const YEAR_OPTIONS = [
  { value: "none", label: "No year" },
  { value: "full", label: "Full year (2026)" },
  { value: "short", label: "Short year (26)" },
] as const;

type YearOption = (typeof YEAR_OPTIONS)[number]["value"];

const SEPARATORS = [
  { value: "-", label: "Hyphen" },
  { value: "/", label: "Slash" },
  { value: "", label: "None" },
] as const;

type Separator = (typeof SEPARATORS)[number]["value"];

const PREVIEW_COUNT = 6;

function sanitisePrefix(raw: string): string {
  return raw
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
}

export function InvoiceNumberGenerator() {
  const { onInteract, onResult } = useToolAnalytics("invoice-number-generator");
  const [prefix, setPrefix] = useState("INV");
  const [yearMode, setYearMode] = useState<YearOption>("full");
  const [separator, setSeparator] = useState<Separator>("-");
  const [padding, setPadding] = useState("4");
  const [start, setStart] = useState("1");

  const numbers = useMemo(() => {
    const pad = parseNumber(padding);
    const first = parseNumber(start);
    if (!Number.isFinite(pad) || pad < 1 || pad > 10) return [];
    if (!Number.isFinite(first) || first < 0) return [];

    const cleanPrefix = sanitisePrefix(prefix);
    const year = new Date().getFullYear();
    const yearPart =
      yearMode === "full" ? String(year) : yearMode === "short" ? String(year).slice(-2) : "";

    const parts = [cleanPrefix, yearPart].filter(Boolean);

    return Array.from({ length: PREVIEW_COUNT }, (_, index) => {
      const sequence = String(Math.floor(first) + index).padStart(Math.floor(pad), "0");
      return [...parts, sequence].join(separator);
    });
  }, [prefix, yearMode, separator, padding, start]);

  onResult(numbers.length > 0, yearMode);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ToolField
          label="Prefix"
          htmlFor="number-prefix"
          hint="Letters and digits only, up to 8 characters."
        >
          <Input
            id="number-prefix"
            value={prefix}
            maxLength={12}
            onChange={(event) => {
              onInteract();
              setPrefix(event.target.value);
            }}
          />
        </ToolField>

        <ToolField label="Starting sequence" htmlFor="number-start">
          <ToolNumberInput
            id="number-start"
            value={start}
            min={0}
            step={1}
            onValueChange={(next) => {
              onInteract();
              setStart(next);
            }}
          />
        </ToolField>

        <ToolField
          label="Digits to pad to"
          htmlFor="number-padding"
          hint="Four digits keeps documents sorting correctly up to 9,999."
        >
          <ToolNumberInput
            id="number-padding"
            value={padding}
            min={1}
            step={1}
            onValueChange={(next) => {
              onInteract();
              setPadding(next);
            }}
          />
        </ToolField>

        <ToolChoiceGroup
          legend="Include the year"
          options={YEAR_OPTIONS}
          value={yearMode}
          onChange={(next) => {
            onInteract();
            setYearMode(next);
          }}
        />

        <div className="sm:col-span-2">
          <ToolChoiceGroup
            legend="Separator"
            options={SEPARATORS}
            value={separator}
            onChange={(next) => {
              onInteract();
              setSeparator(next);
            }}
          />
        </div>
      </div>

      <ToolResultPanel>
        {numbers.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-ink">Next {PREVIEW_COUNT} numbers</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {numbers.map((number) => (
                <li
                  key={number}
                  className="rounded-xl bg-soft-section px-4 py-2.5 font-mono text-sm text-ink"
                >
                  {number}
                </li>
              ))}
            </ul>
            <div className="pt-3">
              <ToolCopyButton text={numbers.join("\n")} label="Copy all" />
            </div>
            <p className="pt-2 text-xs text-slate">
              Preview only. Nothing is saved and no number in your VegaPal account changes.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate">
            Enter a padding between 1 and 10 and a starting sequence of zero or more.
          </p>
        )}
      </ToolResultPanel>
    </div>
  );
}
