import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { formatInvoiceAmountWithCurrency } from "@/lib/invoice-display";
import type { Invoice } from "@/lib/vegapal-store";
import { useTranslation } from "react-i18next";

type Props = {
  quotation: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: () => void;
};

export function ConvertQuotationDialog({
  quotation,
  open,
  onOpenChange,
  loading,
  onConfirm,
}: Props) {
  const { t } = useTranslation("invoices");
  const showClient = quotation.displayOptions.showClientInfo !== false;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("conversion.dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>{t("conversion.dialogDescription")}</p>
              <dl className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-foreground">
                <div className="flex justify-between gap-3">
                  <dt>{t("conversion.summaryQuotationNumber")}</dt>
                  <dd className="font-mono text-sm font-medium">{quotation.number}</dd>
                </div>
                {showClient && quotation.clientName.trim() ? (
                  <div className="flex justify-between gap-3">
                    <dt>{t("conversion.summaryClient")}</dt>
                    <dd className="text-right font-medium truncate max-w-[12rem]">
                      {quotation.clientName}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt>{t("conversion.summaryTotal")}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatInvoiceAmountWithCurrency(quotation.total, quotation.invoiceCurrency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 text-xs">
                  <dt>{t("conversion.summaryNewStatus")}</dt>
                  <dd>{t("conversion.summaryDraftUnpaid")}</dd>
                </div>
              </dl>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <AlertDialogCancel disabled={loading}>{t("conversion.cancel")}</AlertDialogCancel>
          <LoadingButton
            type="button"
            variant="hero"
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {t("conversion.confirm")}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
