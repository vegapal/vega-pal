import { useMemo, useState } from "react";
import {
  ToolChoiceGroup,
  ToolCopyButton,
  ToolField,
  ToolNumberInput,
  ToolResultPanel,
  formatMoney,
  parseNumber,
  useToolAnalytics,
} from "@/components/tools/tool-ui";

const TERM_OPTIONS = [
  { value: "0", label: "Due on issue" },
  { value: "7", label: "Net 7" },
  { value: "14", label: "Net 14" },
  { value: "30", label: "Net 30" },
  { value: "custom", label: "Custom" },
] as const;

type TermOption = (typeof TERM_OPTIONS)[number]["value"];

const TOGGLES = [
  { value: "on", label: "Include" },
  { value: "off", label: "Leave out" },
] as const;

type Toggle = (typeof TOGGLES)[number]["value"];

export function PaymentTermsGenerator() {
  const { onInteract, onResult } = useToolAnalytics("payment-terms-generator");
  const [term, setTerm] = useState<TermOption>("14");
  const [customDays, setCustomDays] = useState("21");
  const [deposit, setDeposit] = useState<Toggle>("off");
  const [depositPercent, setDepositPercent] = useState("50");
  const [reference, setReference] = useState<Toggle>("on");
  const [lateFee, setLateFee] = useState<Toggle>("off");
  const [lateFeeRate, setLateFeeRate] = useState("1.5");

  const wording = useMemo(() => {
    const lines: string[] = [];

    if (term === "0") {
      lines.push("Payment is due on the issue date of this invoice.");
    } else {
      const days = term === "custom" ? parseNumber(customDays) : Number(term);
      if (!Number.isFinite(days) || days < 0) return "";
      lines.push(
        `Payment is due within ${Math.floor(days)} calendar days of the invoice date, by the due date shown above.`,
      );
    }

    if (deposit === "on") {
      const percent = parseNumber(depositPercent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return "";
      lines.push(
        `A deposit of ${formatMoney(percent, percent % 1 === 0 ? 0 : 1)}% of the total is payable before work begins. The balance falls due on the terms above.`,
      );
    }

    if (reference === "on") {
      lines.push(
        "Please quote the invoice number shown above as the payment reference so the payment can be matched on arrival.",
      );
    }

    if (lateFee === "on") {
      const rate = parseNumber(lateFeeRate);
      if (!Number.isFinite(rate) || rate <= 0) return "";
      lines.push(
        `Amounts unpaid after the due date may attract a late-payment charge of ${formatMoney(rate, rate % 1 === 0 ? 0 : 1)}% per month on the outstanding balance.`,
      );
    }

    lines.push(
      "Bank transfer and crypto payment details are shown on this document and on the linked payment page. Funds are received directly by us; please retain your transfer reference or transaction hash.",
    );

    return lines.join("\n\n");
  }, [term, customDays, deposit, depositPercent, reference, lateFee, lateFeeRate]);

  onResult(wording !== "", term);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ToolChoiceGroup
            legend="Payment term"
            options={TERM_OPTIONS}
            value={term}
            onChange={(next) => {
              onInteract();
              setTerm(next);
            }}
          />
        </div>

        {term === "custom" ? (
          <ToolField label="Custom term" htmlFor="terms-custom-days">
            <ToolNumberInput
              id="terms-custom-days"
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

        <ToolChoiceGroup
          legend="Deposit before work starts"
          options={TOGGLES}
          value={deposit}
          onChange={(next) => {
            onInteract();
            setDeposit(next);
          }}
        />

        {deposit === "on" ? (
          <ToolField label="Deposit percentage" htmlFor="terms-deposit">
            <ToolNumberInput
              id="terms-deposit"
              value={depositPercent}
              min={1}
              step="any"
              suffix="%"
              onValueChange={(next) => {
                onInteract();
                setDepositPercent(next);
              }}
            />
          </ToolField>
        ) : null}

        <ToolChoiceGroup
          legend="Ask for the invoice number as reference"
          options={TOGGLES}
          value={reference}
          onChange={(next) => {
            onInteract();
            setReference(next);
          }}
        />

        <ToolChoiceGroup
          legend="Late-payment charge"
          options={TOGGLES}
          value={lateFee}
          onChange={(next) => {
            onInteract();
            setLateFee(next);
          }}
        />

        {lateFee === "on" ? (
          <ToolField
            label="Monthly late-payment rate"
            htmlFor="terms-late-rate"
            hint="Keep it proportionate. Enforceability varies by jurisdiction."
          >
            <ToolNumberInput
              id="terms-late-rate"
              value={lateFeeRate}
              min={0}
              step="any"
              suffix="%/mo"
              onValueChange={(next) => {
                onInteract();
                setLateFeeRate(next);
              }}
            />
          </ToolField>
        ) : null}
      </div>

      <ToolResultPanel>
        {wording ? (
          <>
            <p className="text-sm font-semibold text-ink">Terms wording</p>
            <div className="mt-2 space-y-3 rounded-xl bg-soft-section p-4">
              {wording.split("\n\n").map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-ink">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="pt-3">
              <ToolCopyButton text={wording} label="Copy terms" />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate">
            Check the numeric fields — terms, deposit percentage and late-payment rate all need to
            be positive values.
          </p>
        )}
      </ToolResultPanel>
    </div>
  );
}
