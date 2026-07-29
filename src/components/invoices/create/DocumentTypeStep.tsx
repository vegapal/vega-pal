import type { DocumentType } from "@/lib/vegapal-store";
import { cn } from "@/lib/utils";
import { FileText, Receipt, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InvoiceWizardState } from "./wizard-state";

const TYPES: {
  value: DocumentType;
  icon: typeof FileText;
  titleKey: string;
  descKey: string;
}[] = [
  {
    value: "tax_invoice",
    icon: Receipt,
    titleKey: "wizard.documentTypes.taxInvoice.title",
    descKey: "wizard.documentTypes.taxInvoice.description",
  },
  {
    value: "proforma_invoice",
    icon: FileText,
    titleKey: "wizard.documentTypes.proforma.title",
    descKey: "wizard.documentTypes.proforma.description",
  },
  {
    value: "quotation",
    icon: ScrollText,
    titleKey: "wizard.documentTypes.quotation.title",
    descKey: "wizard.documentTypes.quotation.description",
  },
];

type Props = {
  state: InvoiceWizardState;
  onChange: (patch: Partial<InvoiceWizardState>) => void;
  onSelectType?: (documentType: DocumentType) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

export function DocumentTypeStep({ state, onChange, onSelectType, headingRef }: Props) {
  const { t } = useTranslation("invoices");

  const selectType = (documentType: DocumentType) => {
    onChange({ documentType });
    onSelectType?.(documentType);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none"
        >
          {t("wizard.documentType.heading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("wizard.documentType.subheading")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TYPES.map(({ value, icon: Icon, titleKey, descKey }) => {
          const selected = state.documentType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => selectType(value)}
              className={cn(
                "rounded-2xl border p-5 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm",
              )}
              aria-pressed={selected}
            >
              <span
                className={cn(
                  "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
                  selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="font-semibold text-sm">{t(titleKey)}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
