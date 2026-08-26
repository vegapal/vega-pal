import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import {
  type CurrencyCode,
  type ExchangeRates,
  SUPPORTED_CURRENCIES,
  convertAmount,
  conversionNeedsCrypto,
  formatConvertedAmount,
  getExchangeRates,
} from "@/lib/exchange-rates";

const CRYPTO_ICON_SRC: Partial<Record<CurrencyCode, string>> = {
  USDT: "/assets/currencies/usdt.svg",
  USDC: "/assets/currencies/usdc.svg",
  BTC: "/assets/currencies/btc.svg",
  ETH: "/assets/currencies/eth.svg",
};

const FIAT_FLAG: Partial<Record<CurrencyCode, string>> = {
  USD: "🇺🇸",
  AED: "🇦🇪",
  EUR: "🇪🇺",
  SAR: "🇸🇦",
  CNY: "🇨🇳",
  RUB: "🇷🇺",
  INR: "🇮🇳",
};

function CurrencyIcon({ code, compact = false }: { code: CurrencyCode; compact?: boolean }) {
  const box = compact ? "h-6 w-6" : "h-7 w-7";
  const src = CRYPTO_ICON_SRC[code];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={28}
        height={28}
        className={cn(box, "shrink-0 rounded-full object-contain")}
        decoding="async"
        aria-hidden
      />
    );
  }
  return (
    <span
      className={cn(box, "inline-flex shrink-0 items-center justify-center text-[1.1rem] leading-none")}
      aria-hidden
    >
      {FIAT_FLAG[code] ?? "💱"}
    </span>
  );
}

const amountFieldClass =
  "w-full min-w-0 max-w-full rounded-[20px] bg-slate-50/80 px-4 sm:px-5 py-3.5 sm:py-4 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight tabular-nums text-foreground shadow-[0_2px_16px_rgba(15,23,42,0.06)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:shadow-[0_4px_24px_rgba(15,23,42,0.08)] placeholder:text-muted-foreground/40";

function formatUpdatedAgo(updatedAt: Date, now: number, t: TFunction): string {
  const sec = Math.max(0, Math.floor((now - updatedAt.getTime()) / 1000));
  if (sec < 8) return t("time.justNow");
  if (sec < 60) return t("time.secAgo", { count: sec });
  const min = Math.floor(sec / 60);
  if (min === 1) return t("time.oneMinAgo");
  return t("time.minAgo", { count: min });
}

function CurrencyPicker({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
}) {
  const { t } = useTranslation("landing");
  const [open, setOpen] = useState(false);
  const selectedName = t(`converter.currencies.${value}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 sm:gap-3 rounded-[18px] sm:rounded-[20px] bg-slate-50/80 px-3.5 sm:px-4 py-2.5 sm:py-3.5 text-left shadow-[0_2px_16px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_4px_24px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-primary/15"
        >
          <CurrencyIcon code={value} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm sm:text-base font-semibold text-foreground">{value}</span>
            <span className="block truncate text-xs sm:text-sm text-muted-foreground">{selectedName}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(100vw-2rem,var(--radix-popover-trigger-width))] rounded-[18px] border border-border/50 bg-white p-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.14)]"
      >
        <div className="max-h-56 sm:max-h-72 overflow-y-auto overscroll-contain">
          {SUPPORTED_CURRENCIES.map((code) => {
            const isSelected = code === value;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  onChange(code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-200",
                  isSelected ? "bg-primary/10" : "hover:bg-slate-50 active:bg-slate-100",
                )}
              >
                <CurrencyIcon code={code} compact />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight text-foreground">{code}</span>
                  <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                    {t(`converter.currencies.${code}`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function LiveCurrencyConverter() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState<CurrencyCode>("USDT");
  const [to, setTo] = useState<CurrencyCode>("AED");
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [swapSpin, setSwapSpin] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const loadRates = useCallback(async (force = false) => {
    const data = await getExchangeRates(force);
    setRates(data);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadRates()
      .catch(() => {
        if (!cancelled) setRates((prev) => prev);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadRates]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      loadRates(true).catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(refresh);
  }, [loadRates]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRates(true);
      setNow(Date.now());
    } finally {
      setRefreshing(false);
    }
  }, [loadRates]);

  const needsCrypto = conversionNeedsCrypto(from, to);
  const fiatUnavailable = !loading && rates !== null && !rates.fiatAvailable;
  const cryptoUnavailable = !loading && rates !== null && needsCrypto && !rates.cryptoAvailable;
  const ratesUnavailable = fiatUnavailable || cryptoUnavailable;

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [amount]);

  const converted = useMemo(() => {
    if (!rates || ratesUnavailable) return NaN;
    return convertAmount(numericAmount, from, to, rates);
  }, [rates, ratesUnavailable, numericAmount, from, to]);

  const convertedDisplay = useMemo(() => {
    if (loading) return "";
    if (ratesUnavailable) return "—";
    return formatConvertedAmount(converted, to);
  }, [loading, ratesUnavailable, converted, to]);

  const unitRate = useMemo(() => {
    if (!rates || ratesUnavailable) return NaN;
    return convertAmount(1, from, to, rates);
  }, [rates, ratesUnavailable, from, to]);

  const unitRateDisplay = useMemo(() => {
    if (!Number.isFinite(unitRate)) return null;
    return formatConvertedAmount(unitRate, to);
  }, [unitRate, to]);

  const handleSwap = () => {
    setSwapSpin(true);
    window.setTimeout(() => setSwapSpin(false), 320);

    const nextAmount =
      Number.isFinite(converted) && !ratesUnavailable ? String(converted) : amount;

    setFrom(to);
    setTo(from);
    setAmount(nextAmount);
  };

  return (
    <div
      id="converter"
      className="relative py-14 lg:py-20 scroll-mt-28"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 sm:mb-10 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-ink">
            {t("converter.title")}
          </h2>
          <p className="mt-2 text-sm lg:text-base text-slate">
            {t("converter.subtitle")}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-border p-4 sm:p-6 lg:p-10 shadow-elevated min-w-0 overflow-hidden">
          <div className="flex flex-col gap-8 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start md:gap-5 lg:gap-8">
            <div className="space-y-4">
              <p className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
                {t("converter.from")}
              </p>
              <input
                id="converter-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={amountFieldClass}
                placeholder={t("converter.enterAmount")}
              />
              <CurrencyPicker value={from} onChange={setFrom} />
            </div>

            <div className="flex justify-center md:pt-16">
              <button
                type="button"
                onClick={handleSwap}
                aria-label={t("converter.swapCurrencies")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-foreground shadow-[0_4px_20px_rgba(15,23,42,0.1)] transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_28px_rgba(15,23,42,0.14)] focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-95"
              >
                <ArrowLeftRight
                  className={cn(
                    "h-5 w-5 transition-transform duration-300 md:rotate-0 rotate-90",
                    swapSpin && "rotate-180 md:rotate-180",
                  )}
                />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
                {t("converter.to")}
              </p>
              <output
                htmlFor="converter-amount"
                className={cn(
                  amountFieldClass,
                  "block text-muted-foreground transition-all duration-300",
                  !ratesUnavailable && !loading && "text-foreground",
                )}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2 text-lg text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    {tc("buttons.loading")}
                  </span>
                ) : (
                  <span
                    key={`${from}-${to}-${convertedDisplay}`}
                    className="animate-in fade-in duration-300"
                  >
                    {convertedDisplay}
                  </span>
                )}
              </output>
              <CurrencyPicker value={to} onChange={setTo} />
            </div>
          </div>

          <div className="mt-10 space-y-3 text-center">
            {fiatUnavailable ? (
              <p className="text-sm text-muted-foreground">{t("converter.fiatUnavailable")}</p>
            ) : cryptoUnavailable ? (
              <p className="text-sm text-muted-foreground">{t("converter.cryptoUnavailable")}</p>
            ) : unitRateDisplay ? (
              <p
                className={cn(
                  "text-sm font-medium text-foreground transition-opacity duration-300",
                  refreshing && "opacity-60",
                )}
              >
                {t("converter.rateLine", { from, amount: unitRateDisplay, to })}
              </p>
            ) : null}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>
                {tc("time.liveRates")}
                {rates?.fiatAvailable && rates.updatedAt
                  ? ` • ${tc("time.updatedAgo", { time: formatUpdatedAgo(rates.updatedAt, now, tc) })}`
                  : ""}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                aria-label={tc("time.liveRates")}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground disabled:opacity-40"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
