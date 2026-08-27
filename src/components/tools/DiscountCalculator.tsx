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

const MODES = [
  { value: "percent", label: "Percentage" },
  { value: "fixed", label: "Fixed amount" },
] as const;

type Mode = (typeof MODES)[number]["value"];

export function DiscountCalculator() {
  const { onInteract, onResult } = useToolAnalytics("discount-calculator");
  const [amount, setAmount] = useState("1000");
  const [mode, setMode] = useState<Mode>("percent");
  const [percent, setPercent] = useState("10");
  const [fixed, setFixed] = useState("100");

  const result = useMemo(() => {
    const gross = parseNumber(amount);
    if (!Number.isFinite(gross) || gross < 0) return null;

    let discount: number;
    if (mode === "percent") {
      const rate = parseNumber(percent);
      if (!Number.isFinite(rate) || rate < 0) return null;
      discount = (gross * rate) / 100;
    } else {
      const flat = parseNumber(fixed);
      if (!Number.isFinite(flat) || flat < 0) return null;
      discount = flat;
    }

    const capped = Math.min(discount, gross);
    const net = gross - capped;
    const effectiveRate = gross > 0 ? (capped / gross) * 100 : 0;
    return { gross, discount: capped, net, effectiveRate, exceeded: discount > gross };
  }, [amount, mode, percent, fixed]);

  onResult(result !== null, mode);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ToolField label="Amount before discount" htmlFor="discount-amount">
          <ToolNumberInput
            id="discount-amount"
            value={amount}
            min={0}
            step="any"
            onValueChange={(next) => {
              onInteract();
              setAmount(next);
            }}
          />
        </ToolField>

        <ToolChoiceGroup
          legend="Discount type"
          options={MODES}
          value={mode}
          onChange={(next) => {
            onInteract();
            setMode(next);
          }}
        />

        {mode === "percent" ? (
          <ToolField label="Discount rate" htmlFor="discount-percent">
            <ToolNumberInput
              id="discount-percent"
              value={percent}
              min={0}
              step="any"
              suffix="%"
              onValueChange={(next) => {
                onInteract();
                setPercent(next);
              }}
            />
          </ToolField>
        ) : (
          <ToolField label="Discount amount" htmlFor="discount-fixed">
            <ToolNumberInput
              id="discount-fixed"
              value={fixed}
              min={0}
              step="any"
              onValueChange={(next) => {
                onInteract();
                setFixed(next);
              }}
            />
          </ToolField>
        )}
      </div>

      <ToolResultPanel>
        <ToolResult
          label="Amount before discount"
          value={result ? formatMoney(result.gross) : "—"}
        />
        <ToolResult label="Discount" value={result ? `− ${formatMoney(result.discount)}` : "—"} />
        <ToolResult
          label="Amount after discount"
          value={result ? formatMoney(result.net) : "—"}
          emphasis
        />
        <ToolResult
          label="Effective discount rate"
          value={result ? `${formatMoney(result.effectiveRate)}%` : "—"}
        />
        {result?.exceeded ? (
          <p className="pt-1 text-sm text-slate">
            The fixed discount is larger than the amount, so it has been capped at the full amount.
          </p>
        ) : null}
      </ToolResultPanel>
    </div>
  );
}
