import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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
import {
  convertAmount,
  formatRatesUpdatedAt,
  getExchangeRates,
  type ExchangeRates,
} from "@/lib/exchange-rates";

const DIRECTIONS = [
  { value: "usdt-aed", label: "USDT → AED" },
  { value: "aed-usdt", label: "AED → USDT" },
] as const;

type Direction = (typeof DIRECTIONS)[number]["value"];

export function UsdtAedConverter() {
  const { onInteract, onResult } = useToolAnalytics("usdt-aed-converter");
  const [amount, setAmount] = useState("1000");
  const [direction, setDirection] = useState<Direction>("usdt-aed");
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    const data = await getExchangeRates(force);
    setRates(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const available = Boolean(rates?.fiatAvailable && rates?.cryptoAvailable);

  const from = direction === "usdt-aed" ? "USDT" : "AED";
  const to = direction === "usdt-aed" ? "AED" : "USDT";

  const converted = useMemo(() => {
    if (!rates || !available) return NaN;
    const value = parseNumber(amount);
    if (!Number.isFinite(value) || value < 0) return NaN;
    return convertAmount(value, from, to, rates);
  }, [rates, available, amount, from, to]);

  const unitRate = useMemo(() => {
    if (!rates || !available) return NaN;
    return convertAmount(1, from, to, rates);
  }, [rates, available, from, to]);

  onResult(Number.isFinite(converted), direction);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ToolField label={`Amount in ${from}`} htmlFor="converter-amount">
          <ToolNumberInput
            id="converter-amount"
            value={amount}
            min={0}
            step="any"
            suffix={from}
            onValueChange={(next) => {
              onInteract();
              setAmount(next);
            }}
          />
        </ToolField>

        <ToolChoiceGroup
          legend="Direction"
          options={DIRECTIONS}
          value={direction}
          onChange={(next) => {
            onInteract();
            setDirection(next);
          }}
        />
      </div>

      <ToolResultPanel>
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-slate">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            Loading reference rates…
          </p>
        ) : !available ? (
          <p className="text-sm text-slate">
            Reference rates are unavailable right now. Try again shortly, or use the live converter
            on the VegaPal homepage.
          </p>
        ) : (
          <>
            <ToolResult
              label={`Value in ${to}`}
              value={`${formatMoney(converted, to === "USDT" ? 4 : 2)} ${to}`}
              emphasis
            />
            <ToolResult
              label={`Reference rate — 1 ${from}`}
              value={`${formatMoney(unitRate, to === "USDT" ? 4 : 2)} ${to}`}
            />
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate">
              <span>
                Reference only, not a quote
                {rates?.updatedAt ? ` • updated ${formatRatesUpdatedAt(rates.updatedAt)}` : ""}
              </span>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh reference rates"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate transition-colors hover:bg-muted disabled:opacity-40"
              >
                <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              </button>
            </div>
          </>
        )}
      </ToolResultPanel>
    </div>
  );
}
