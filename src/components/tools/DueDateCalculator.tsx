import { useMemo, useState } from "react";
import { addDays, format, isValid, lastDayOfMonth, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  ToolChoiceGroup,
  ToolCopyButton,
  ToolField,
  ToolNumberInput,
  ToolResult,
  ToolResultPanel,
  parseNumber,
  useToolAnalytics,
} from "@/components/tools/tool-ui";

const TERM_OPTIONS = [
  { value: "7", label: "Net 7" },
  { value: "15", label: "Net 15" },
  { value: "30", label: "Net 30" },
  { value: "45", label: "Net 45" },
  { value: "60", label: "Net 60" },
  { value: "custom", label: "Custom" },
] as const;

type TermOption = (typeof TERM_OPTIONS)[number]["value"];

const MONTH_END_OPTIONS = [
  { value: "exact", label: "Exact day count" },
  { value: "eom", label: "End of that month" },
] as const;

type MonthEndOption = (typeof MONTH_END_OPTIONS)[number]["value"];

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function DueDateCalculator() {
  const { onInteract, onResult } = useToolAnalytics("due-date-calculator");
  const [invoiceDate, setInvoiceDate] = useState(todayIso);
  const [term, setTerm] = useState<TermOption>("30");
  const [customDays, setCustomDays] = useState("21");
  const [rule, setRule] = useState<MonthEndOption>("exact");

  const days = term === "custom" ? parseNumber(customDays) : Number(term);

  const result = useMemo(() => {
    const parsed = parseISO(invoiceDate);
    if (!isValid(parsed) || !Number.isFinite(days) || days < 0) return null;
    const counted = addDays(parsed, Math.floor(days));
    const dueDate = rule === "eom" ? lastDayOfMonth(counted) : counted;
    const totalDays = Math.round((dueDate.getTime() - parsed.getTime()) / 86_400_000);
    return { dueDate, totalDays };
  }, [invoiceDate, days, rule]);

  onResult(result !== null, term);

  const dueLong = result ? format(result.dueDate, "EEEE, d MMMM yyyy") : "—";
  const dueIso = result ? format(result.dueDate, "yyyy-MM-dd") : "";

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ToolField label="Invoice date" htmlFor="invoice-date">
          <Input
            id="invoice-date"
            type="date"
            value={invoiceDate}
            onChange={(event) => {
              onInteract();
              setInvoiceDate(event.target.value);
            }}
          />
        </ToolField>

        <div onFocusCapture={onInteract}>
          <ToolChoiceGroup
            legend="Payment terms"
            options={TERM_OPTIONS}
            value={term}
            onChange={(next) => {
              onInteract();
              setTerm(next);
            }}
          />
        </div>

        {term === "custom" ? (
          <ToolField
            label="Custom term"
            htmlFor="custom-days"
            hint="Calendar days from the invoice date."
          >
            <ToolNumberInput
              id="custom-days"
              value={customDays}
              min={0}
              step={1}
              suffix="days"
              onValueChange={(next) => {
                onInteract();
                setCustomDays(next);
              }}
            />
          </ToolField>
        ) : null}

        <div className="sm:col-span-2">
          <ToolChoiceGroup
            legend="Counting rule"
            options={MONTH_END_OPTIONS}
            value={rule}
            onChange={(next) => {
              onInteract();
              setRule(next);
            }}
          />
        </div>
      </div>

      <ToolResultPanel>
        <ToolResult label="Payment due" value={dueLong} emphasis />
        <ToolResult label="Days from invoice date" value={result ? `${result.totalDays}` : "—"} />
        {dueIso ? (
          <div className="pt-2">
            <ToolCopyButton text={dueIso} label={`Copy ${dueIso}`} />
          </div>
        ) : (
          <p className="pt-1 text-sm text-slate">
            Enter a valid invoice date and term to see the due date.
          </p>
        )}
      </ToolResultPanel>
    </div>
  );
}
