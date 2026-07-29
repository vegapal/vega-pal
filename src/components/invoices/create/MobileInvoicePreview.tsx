import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { User } from "@/lib/vegapal-store";
import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InvoiceDocumentPreview } from "./InvoiceDocumentPreview";
import type { InvoiceWizardState } from "./wizard-state";

type Props = {
  state: InvoiceWizardState;
  user: User | null;
};

export function MobileInvoicePreview({ state, user }: Props) {
  const { t } = useTranslation("invoices");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="lg:hidden w-full rounded-xl">
          <Eye className="h-4 w-4 mr-2" aria-hidden />
          {t("wizard.preview.openMobile")}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>{t("create.preview.livePreview")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 pb-6">
          <InvoiceDocumentPreview state={state} user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
