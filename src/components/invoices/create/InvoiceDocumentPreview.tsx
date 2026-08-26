import { useMemo } from "react";
import type { User } from "@/lib/vegapal-store";
import { cn } from "@/lib/utils";
import type { InvoiceWizardState } from "./wizard-state";
import { InvoiceDocumentPreviewFrame } from "@/components/invoice-document/InvoiceDocumentPreviewFrame";
import { mapWizardToDocumentModel } from "@/lib/invoice/invoice-document-wizard.mapper";

type Props = {
  state: InvoiceWizardState;
  user: User | null;
  className?: string;
  maxWidthPx?: number;
};

/** Live wizard preview — same DOM/CSS as HTML PDF export. */
export function InvoiceDocumentPreview({ state, user, className, maxWidthPx = 560 }: Props) {
  const model = useMemo(() => mapWizardToDocumentModel(state, user), [state, user]);

  return (
    <div className={cn("flex justify-center w-full min-w-0 overflow-x-hidden", className)}>
      <InvoiceDocumentPreviewFrame model={model} maxWidthPx={maxWidthPx} />
    </div>
  );
}
