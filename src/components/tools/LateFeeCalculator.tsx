import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
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

const RATE_BASIS = [
  { value: "monthly", label: "Per month" },
  { value: "daily", label: "Per day" },
] as const;

type RateBasis = (typeof RATE_BASIS)[number]["value"];

const PERIOD_MODE = [
  { value: "days", label: "Enter days overdue" },
  { value: "date", label: "Use the due date" },
] as const;

type PeriodMode = (typeof PERIOD_MODE)[number]["value"];

const DAYS_PER_MONTH = 30;

export function LateFeeCalculator() {
  const { onInteract, onResult } = useToolAnalytics("late-fee-calculator");
  const [amount, setAmount] = useState("5000");
  const [basis, setBasis] = useState<RateBasis>("monthly");
  const [rate, setRate] = useState("1.5");
  const [mode, setMode] = useState<PeriodMode>("days");
  const [daysInput, setDaysInput] = useState("30");
  const [dueDate, setDueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const daysOverdue = useMemo(() => {
    if (mode === "days") {
      const days = parseNumber(daysInput);
      return Number.isFinite(days) && days >= 0 ? Math.floor(days) : NaN;
    }
    const parsed = parseISO(dueDate);
    if (!isValid(parsed)) return NaN;
    const diff = differenceInCalendarDays(new Date(), parsed);
    return diff > 0 ? diff : 0;
  }, [mode, daysInput, dueDate]);

  const result = useMemo(() => {
    const principal = parseNumber(amount);
    const percent = parseNumber(rate);
    if (!Number.isFinite(principal) || principal < 0) return null;
    if (!Number.isFinite(percent) || percent < 0) return null;
    if (!Number.isFinite(daysOverdue)) return null;

    const dailyRate = basis === "daily" ? percent / 100 : percent / 100 / DAYS_PER_MONTH;
    const charge = principal * dailyRate * daysOverdue;
    return {
      principal,
      charge,
      total: principal + charge,
      dailyRate,
      effectivePercent: principal > 0 ? (charge / principal) * 100 : 0,
    };
  }, [amount, rate, basis, daysOverdue]);

  onResult(result !== null, basis);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ToolField label="Overdue amount" htmlFor="late-amount">
          <ToolNumberInput
            id="late-amount"
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
          label="Late-payment rate"
          htmlFor="late-rate"
          hint="Use the rate stated in your invoice terms."
        >
          <ToolNumberInput
            id="late-rate"
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

        <ToolChoiceGroup
          legend="Rate basis"
          options={RATE_BASIS}
          value={basis}
          onChange={(next) => {
            onInteract();
            setBasis(next);
          }}
        />

        <ToolChoiceGroup
          legend="How late is it?"
          options={PERIOD_MODE}
          value={mode}
          onChange={(next) => {
            onInteract();
            setMode(next);
          }}
        />

        {mode === "days" ? (
          <ToolField label="Days overdue" htmlFor="late-days">
            <ToolNumberInput
              id="late-days"
              value={daysInput}
              min={0}
              step={1}
              suffix="days"
              onValueChange={(next) => {
                onInteract();
                setDaysInput(next);
              }}
            />
          </ToolField>
        ) : (
          <ToolField label="Original due date" htmlFor="late-due-date">
            <Input
              id="late-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => {
                onInteract();
                setDueDate(event.target.value);
              }}
            />
          </ToolField>
        )}
      </div>

      <ToolResultPanel>
        <ToolResult
          label="Days overdue"
          value={Number.isFinite(daysOverdue) ? `${daysOverdue}` : "—"}
        />
        <ToolResult
          label="Late-payment charge"
          value={result ? formatMoney(result.charge) : "—"}
          emphasis
        />
        <ToolResult
          label="Charge as % of the overdue amount"
          value={result ? `${formatMoney(result.effectivePercent)}%` : "—"}
        />
        <ToolResult
          label="Total including charge"
          value={result ? formatMoney(result.total) : "—"}
        />
        <p className="pt-1 text-xs text-slate">
          Simple interest on the overdue amount. A monthly rate is treated as {DAYS_PER_MONTH} days
          for the daily conversion; if your terms specify compounding, this figure is conservative.
        </p>
      </ToolResultPanel>
    </div>
  );
}
