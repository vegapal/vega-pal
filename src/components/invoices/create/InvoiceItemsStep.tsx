import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceItem } from "@/lib/vegapal-store";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { InvoiceWizardState } from "./wizard-state";

function fmtAmount(n: number, currency: string) {
  const maxDecimals = currency === "BTC" || currency === "ETH" ? 8 : 2;
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  })} ${currency}`;
}

type Props = {
  state: InvoiceWizardState;
  onChange: (patch: Partial<InvoiceWizardState>) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

export function InvoiceItemsStep({ state, onChange, headingRef }: Props) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    const items = state.items.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      next.total = (Number(next.quantity) || 0) * (Number(next.unitPrice) || 0);
      return next;
    });
    onChange({ items });
  };

  const addItem = () =>
    onChange({
      items: [...state.items, { description: "", quantity: 1, unitPrice: 0, total: 0 }],
    });

  const duplicateItem = (idx: number) => {
    const copy = { ...state.items[idx] };
    const items = [...state.items.slice(0, idx + 1), copy, ...state.items.slice(idx + 1)];
    onChange({ items });
  };

  const removeItem = (idx: number) => {
    if (state.items.length === 1) return;
    onChange({ items: state.items.filter((_, i) => i !== idx) });
  };

  const { subtotal, total } = useMemo(() => {
    const sub = state.items.reduce(
      (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
      0,
    );
    return { subtotal: sub, total: Math.max(0, sub - state.discount + state.tax) };
  }, [state.items, state.discount, state.tax]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none"
        >
          {t("wizard.items.heading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("wizard.items.subheading")}</p>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_120px_120px_72px] gap-3 text-xs uppercase tracking-wider text-muted-foreground px-1">
          <span>{tc("labels.description")}</span>
          <span className="text-right">{tc("labels.qty")}</span>
          <span className="text-right">{tc("labels.unitPrice")}</span>
          <span className="text-right">{tc("labels.total")}</span>
          <span />
        </div>
        {state.items.map((it, idx) => (
          <div key={idx} className="min-w-0">
            <div className="md:hidden rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tc("labels.description")}</Label>
                <Input
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder={t("create.fields.itemDescriptionPlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{tc("labels.qty")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="text-right tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{tc("labels.unitPrice")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.unitPrice}
                    onChange={(e) =>
                      updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="text-right tabular-nums"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{tc("labels.total")}</p>
                  <p className="font-medium tabular-nums text-sm">
                    {fmtAmount(it.total, state.invoiceCurrency)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => duplicateItem(idx)}
                    aria-label={t("wizard.items.duplicate")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(idx)}
                    disabled={state.items.length === 1}
                    aria-label={t("create.fields.removeItem")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_120px_120px_72px] gap-3 items-center">
              <Input
                value={it.description}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
                placeholder={t("create.fields.itemDescriptionPlaceholder")}
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                className="text-right tabular-nums"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={it.unitPrice}
                onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                className="text-right tabular-nums"
              />
              <div className="text-right font-medium tabular-nums text-sm truncate">
                {fmtAmount(it.total, state.invoiceCurrency)}
              </div>
              <div className="flex justify-end gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => duplicateItem(idx)}
                  aria-label={t("wizard.items.duplicate")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(idx)}
                  disabled={state.items.length === 1}
                  aria-label={t("create.fields.removeItem")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4" /> {tc("buttons.addLineItem")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-border pt-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wizard-discount">
            {t("create.fields.discountLabel", { currency: state.invoiceCurrency })}
          </Label>
          <Input
            id="wizard-discount"
            type="number"
            min="0"
            step="0.01"
            value={state.discount || ""}
            onChange={(e) => onChange({ discount: parseFloat(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-tax">
            {t("create.fields.taxLabel", { currency: state.invoiceCurrency })}
          </Label>
          <Input
            id="wizard-tax"
            type="number"
            min="0"
            step="0.01"
            value={state.tax || ""}
            onChange={(e) => onChange({ tax: parseFloat(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{tc("labels.subtotal")}</span>
          <span className="tabular-nums font-medium">{fmtAmount(subtotal, state.invoiceCurrency)}</span>
        </div>
        {state.discount > 0 ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{tc("labels.discount")}</span>
            <span className="tabular-nums">
              − {fmtAmount(state.discount, state.invoiceCurrency)}
            </span>
          </div>
        ) : null}
        {state.tax > 0 ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{tc("labels.tax")}</span>
            <span className="tabular-nums">{fmtAmount(state.tax, state.invoiceCurrency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 pt-2 border-t border-border text-base font-bold">
          <span>{tc("labels.total")}</span>
          <span className="tabular-nums">{fmtAmount(total, state.invoiceCurrency)}</span>
        </div>
      </div>
    </div>
  );
}
