import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  ToolChoiceGroup,
  ToolCopyButton,
  ToolField,
  ToolResultPanel,
  useToolAnalytics,
} from "@/components/tools/tool-ui";

const NETWORKS = [
  { value: "trc20", label: "TRON (TRC20)" },
  { value: "erc20", label: "Ethereum (ERC20)" },
  { value: "bep20", label: "BNB Smart Chain (BEP20)" },
  { value: "other", label: "Other / none" },
] as const;

type Network = (typeof NETWORKS)[number]["value"];

const NETWORK_LABELS: Record<Network, string> = {
  trc20: "TRON (TRC20)",
  erc20: "Ethereum (ERC20)",
  bep20: "BNB Smart Chain (BEP20)",
  other: "",
};

const MAX_ADDRESS_LENGTH = 120;

/**
 * Refuses input that looks like secret material rather than a receiving
 * address. Deliberately conservative: a false positive only costs a warning.
 */
function looksLikeSecret(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  if (words.length >= 6 && words.every((word) => /^[a-z]{3,}$/i.test(word))) return true;
  if (/^(0x)?[0-9a-f]{64}$/i.test(trimmed)) return true;
  if (/priv|secret|mnemonic|seed[\s-]?phrase|recovery/i.test(trimmed)) return true;
  return false;
}

export function CryptoPaymentQrGenerator() {
  const { onInteract, onResult } = useToolAnalytics("crypto-payment-qr-generator");
  const [address, setAddress] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [network, setNetwork] = useState<Network>("trc20");
  const [amount, setAmount] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const trimmedAddress = address.trim();
  const secretWarning = looksLikeSecret(address);
  const tooLong = trimmedAddress.length > MAX_ADDRESS_LENGTH;
  const canRender = trimmedAddress.length >= 8 && !secretWarning && !tooLong;

  useEffect(() => {
    if (!canRender) {
      setDataUrl(null);
      setError(null);
      return;
    }

    const requestId = ++requestRef.current;
    let cancelled = false;

    // Imported lazily so the QR library stays out of the initial bundle and
    // never runs during server rendering.
    import("qrcode")
      .then((mod) =>
        mod.toDataURL(trimmedAddress, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
          color: { dark: "#0b1b2b", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (cancelled || requestRef.current !== requestId) return;
        setDataUrl(url);
        setError(null);
      })
      .catch(() => {
        if (cancelled || requestRef.current !== requestId) return;
        setDataUrl(null);
        setError("Could not render a QR code from that text. Check the address and try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [canRender, trimmedAddress]);

  onResult(dataUrl !== null, network);

  const caption = useMemo(() => {
    const networkLabel = NETWORK_LABELS[network];
    const assetLabel = asset.trim();
    const head = [assetLabel, networkLabel ? `on ${networkLabel}` : ""].filter(Boolean).join(" ");
    const amountLine = amount.trim() ? `Amount due: ${amount.trim()} ${assetLabel}`.trim() : "";
    return [head, trimmedAddress, amountLine].filter(Boolean).join("\n");
  }, [asset, network, amount, trimmedAddress]);

  return (
    <div>
      <div className="flex gap-3 rounded-2xl border border-rose-300/70 bg-rose-50 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
        <p className="text-sm leading-relaxed text-rose-900">
          Public receiving addresses only. Never type a private key, seed phrase or recovery words
          into this or any web page. The QR code is drawn in your browser and nothing is sent
          anywhere.
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ToolField
          label="Public receiving address"
          htmlFor="qr-address"
          className="sm:col-span-2"
          hint="Paste it from your wallet. This tool cannot check that the address is valid or that it matches the network."
        >
          <Input
            id="qr-address"
            value={address}
            spellCheck={false}
            autoComplete="off"
            placeholder="e.g. a TRON address beginning with T"
            onChange={(event) => {
              onInteract();
              setAddress(event.target.value);
            }}
            className="font-mono text-sm"
          />
        </ToolField>

        <ToolField label="Asset label" htmlFor="qr-asset">
          <Input
            id="qr-asset"
            value={asset}
            maxLength={12}
            onChange={(event) => {
              onInteract();
              setAsset(event.target.value);
            }}
          />
        </ToolField>

        <ToolField
          label="Amount (optional)"
          htmlFor="qr-amount"
          hint="Printed in the caption, not encoded in the code."
        >
          <Input
            id="qr-amount"
            value={amount}
            inputMode="decimal"
            maxLength={20}
            placeholder="e.g. 2400.00"
            onChange={(event) => {
              onInteract();
              setAmount(event.target.value);
            }}
          />
        </ToolField>

        <div className="sm:col-span-2">
          <ToolChoiceGroup
            legend="Network label"
            options={NETWORKS}
            value={network}
            onChange={(next) => {
              onInteract();
              setNetwork(next);
            }}
          />
        </div>
      </div>

      <ToolResultPanel>
        {secretWarning ? (
          <p className="text-sm font-semibold text-rose-700">
            That looks like secret material rather than a receiving address. Nothing has been
            encoded. Clear the field and paste a public address only.
          </p>
        ) : tooLong ? (
          <p className="text-sm text-slate">
            That is longer than any receiving address. Check what you pasted.
          </p>
        ) : error ? (
          <p className="text-sm text-slate">{error}</p>
        ) : dataUrl ? (
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <img
              src={dataUrl}
              alt="QR code for the receiving address entered above"
              width={220}
              height={220}
              className="rounded-xl border border-border bg-white p-2"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="rounded-xl bg-soft-section p-4">
                {caption.split("\n").map((line) => (
                  <p key={line} className="break-all font-mono text-xs leading-relaxed text-ink">
                    {line}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <ToolCopyButton text={trimmedAddress} label="Copy address" />
                <ToolCopyButton text={caption} label="Copy caption" />
                <a
                  href={dataUrl}
                  download="crypto-payment-qr.png"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-muted"
                >
                  Download PNG
                </a>
              </div>
              <p className="text-xs text-slate">
                The code carries the address only. Always print the asset and network as text
                alongside it — a scanning wallet cannot tell which chain you meant.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate">
            Paste a public receiving address to generate the QR code.
          </p>
        )}
      </ToolResultPanel>
    </div>
  );
}
