import { useMemo, useState } from "react";
import {
  ToolChoiceGroup,
  ToolField,
  ToolNumberInput,
  ToolResult,
  ToolResultPanel,
  formatMoney,
  parseNumber,
  useToolAnalytics,
} from "@/components/tools/tool-ui";

const BASIS = [
  { value: "exclusive", label: "Amount excludes tax" },
  { value: "inclusive", label: "Amount includes tax" },
] as const;

type Basis = (typeof BASIS)[number]["value"];

const RATE_PRESETS = ["5", "10", "15", "20"];

export function VatCalculator() {
  const { onInteract, onResult } = useToolAnalytics("vat-calculator");
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("5");
  const [basis, setBasis] = useState<Basis>("exclusive");

  const result = useMemo(() => {
    const value = parseNumber(amount);
    const percent = parseNumber(rate);
    if (!Number.isFinite(value) || value < 0) return null;
    if (!Number.isFinite(percent) || percent < 0) return null;

    if (basis === "exclusive") {
      const tax = (value * percent) / 100;
      return { net: value, tax, gross: value + tax };
    }

    const net = value / (1 + percent / 100);
    return { net, tax: value - net, gross: value };
  }, [amount, rate, basis]);

  onResult(result !== null, basis);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ToolField label="Amount" htmlFor="vat-amount">
          <ToolNumberInput
            id="vat-amount"
            value={amount}
            min={0}
            step="any"
            onValueChange={(next) => {
              onInteract();
              setAmount(next);
            }}
          />
        </ToolField>

        <ToolField
          label="Tax rate"
          htmlFor="vat-rate"
          hint="Any rate. This tool does not know your jurisdiction."
        >
          <ToolNumberInput
            id="vat-rate"
            value={rate}
            min={0}
            step="any"
            suffix="%"
            onValueChange={(next) => {
              onInteract();
              setRate(next);
            }}
          />
        </ToolField>

        <div className="sm:col-span-2">
          <ToolChoiceGroup
            legend="Is tax already in the amount?"
            options={BASIS}
            value={basis}
            onChange={(next) => {
              onInteract();
              setBasis(next);
            }}
          />
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate">
            Common rates
          </span>
          {RATE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onInteract();
                setRate(preset);
              }}
              className="min-h-9 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-slate transition-colors hover:bg-muted"
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>

      <ToolResultPanel>
        <ToolResult label="Net (excluding tax)" value={result ? formatMoney(result.net) : "—"} />
        <ToolResult
          label={`Tax at ${Number.isFinite(parseNumber(rate)) ? formatMoney(parseNumber(rate)) : "—"}%`}
          value={result ? formatMoney(result.tax) : "—"}
        />
        <ToolResult
          label="Gross (including tax)"
          value={result ? formatMoney(result.gross) : "—"}
          emphasis
        />
      </ToolResultPanel>
    </div>
  );
}
