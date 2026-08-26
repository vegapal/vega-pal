import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  maskIban,
  maskWallet,
  type SavedPaymentMethod,
} from "@/lib/payment-methods/types";
import { Building2, Coins, Star, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  method: SavedPaymentMethod;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  compact?: boolean;
};

export function SavedPaymentMethodCard({
  method,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  compact,
}: Props) {
  const { t } = useTranslation("settings");
  const isBank = method.type === "bank";

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-xl border p-4 transition",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {isBank ? <Building2 className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-sm truncate">{method.label || t("paymentMethods.untitled")}</p>
            {method.isDefault ? (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {t("paymentMethods.default")}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isBank ? t("paymentMethods.bankTransfer") : method.cryptoCurrency || "Crypto"}
          </p>
          {isBank ? (
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {method.bankName ? <p>{method.bankName}</p> : null}
              {method.bankCurrency ? <p>{method.bankCurrency}</p> : null}
              <p className="font-mono text-foreground/80">{maskIban(method.iban || method.accountNumber)}</p>
            </div>
          ) : (
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {method.network ? <p>{method.network}</p> : null}
              <p className="font-mono text-foreground/80">{maskWallet(method.walletAddress)}</p>
            </div>
          )}
        </div>
      </div>

      <div className={cn("mt-3 flex flex-wrap gap-2", compact && "mt-2")}>
        {onSelect ? (
          <Button type="button" size="sm" variant={selected ? "default" : "outline"} onClick={onSelect}>
            {selected ? t("paymentMethods.selected") : t("paymentMethods.select")}
          </Button>
        ) : null}
        {onSetDefault && !method.isDefault ? (
          <Button type="button" size="sm" variant="ghost" onClick={onSetDefault} aria-label={t("paymentMethods.setDefault")}>
            <Star className="h-3.5 w-3.5" /> {t("paymentMethods.setDefault")}
          </Button>
        ) : null}
        {onEdit ? (
          <Button type="button" size="sm" variant="ghost" onClick={onEdit} aria-label={t("paymentMethods.edit")}>
            <Pencil className="h-3.5 w-3.5" /> {t("paymentMethods.edit")}
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label={t("paymentMethods.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("paymentMethods.delete")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
