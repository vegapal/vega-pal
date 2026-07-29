import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DocumentType } from "@/lib/vegapal-store";
import type { WizardStep } from "./wizard-state";

type Props = {
  step: WizardStep;
  documentType: DocumentType;
  saving: boolean;
  atInvoiceLimit: boolean;
  editId?: string;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft: () => void;
  onCreate: () => void;
  variant?: "inline" | "sticky";
};

function createLabelKey(documentType: DocumentType): string {
  if (documentType === "quotation") return "wizard.actions.createQuotation";
  if (documentType === "proforma_invoice") return "wizard.actions.createProforma";
  return "wizard.actions.createInvoice";
}

export function WizardFooter({
  step,
  documentType,
  saving,
  atInvoiceLimit,
  editId,
  onBack,
  onContinue,
  onSaveDraft,
  onCreate,
  variant = "inline",
}: Props) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");

  const shellClass =
    variant === "sticky"
      ? "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:hidden"
      : "flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:items-center sm:justify-end";

  const inner = (
    <div
      className={
        variant === "sticky"
          ? "mx-auto flex max-w-6xl items-center justify-end gap-2"
          : "flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end"
      }
    >
      {step > 1 ? (
        <Button type="button" variant="outline" onClick={onBack} disabled={saving} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {tc("buttons.back")}
        </Button>
      ) : (
        <Button type="button" variant="outline" asChild disabled={saving} className="gap-1.5">
          <Link to="/invoices">{tc("buttons.cancel")}</Link>
        </Button>
      )}

      {step === 6 ? (
        <>
          <LoadingButton
            type="button"
            variant="outline"
            loading={saving}
            disabled={saving || atInvoiceLimit}
            onClick={onSaveDraft}
          >
            {t("wizard.actions.saveDraft")}
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="hero"
            loading={saving}
            disabled={saving || atInvoiceLimit}
            onClick={onCreate}
            className="gap-1.5"
          >
            {editId ? tc("buttons.save") : t(createLabelKey(documentType))}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </LoadingButton>
        </>
      ) : step === 1 ? null : (
        <Button type="button" variant="hero" onClick={onContinue} disabled={saving} className="gap-1.5">
          {t("wizard.actions.continue")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  );

  if (variant === "sticky") {
    return <footer className={shellClass}>{inner}</footer>;
  }

  return <div className={shellClass}>{inner}</div>;
}
