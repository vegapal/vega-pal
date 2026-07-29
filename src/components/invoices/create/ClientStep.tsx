import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InvoiceWizardState } from "./wizard-state";

type Props = {
  state: InvoiceWizardState;
  onChange: (patch: Partial<InvoiceWizardState>) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

export function ClientStep({ state, onChange, headingRef }: Props) {
  const { t } = useTranslation("invoices");

  const syncCompanyFromName = (name: string) => {
    onChange({ clientName: name, clientCompany: name });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none"
        >
          {t("wizard.client.heading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("wizard.client.subheading")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wizard-client-name">{t("wizard.client.nameLabel")}</Label>
        <Input
          id="wizard-client-name"
          required
          value={state.clientName}
          onChange={(e) => syncCompanyFromName(e.target.value)}
          placeholder={t("wizard.client.namePlaceholder")}
          autoComplete="organization"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wizard-client-email">{t("create.fields.clientEmail")}</Label>
          <Input
            id="wizard-client-email"
            type="email"
            value={state.clientEmail}
            onChange={(e) => onChange({ clientEmail: e.target.value })}
            placeholder={t("wizard.client.emailOptionalPlaceholder")}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{t("wizard.client.showOnDocument")}</p>
          <p className="text-xs text-muted-foreground">{t("wizard.client.showOnDocumentHint")}</p>
        </div>
        <Switch
          checked={state.showClientOnDocument}
          onCheckedChange={(showClientOnDocument) => onChange({ showClientOnDocument })}
          aria-label={t("wizard.client.showOnDocument")}
        />
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => onChange({ showExtraClient: !state.showExtraClient })}
          className="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition"
          aria-expanded={state.showExtraClient}
        >
          {t("wizard.client.extraFieldsToggle")}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              state.showExtraClient && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {state.showExtraClient ? (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <Label htmlFor="wizard-client-phone">{t("wizard.client.phone")}</Label>
              <Input
                id="wizard-client-phone"
                type="tel"
                value={state.clientPhone}
                onChange={(e) => onChange({ clientPhone: e.target.value })}
                placeholder={t("wizard.client.phonePlaceholder")}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-client-tax">{t("wizard.client.taxId")}</Label>
              <Input
                id="wizard-client-tax"
                value={state.clientTaxId}
                onChange={(e) => onChange({ clientTaxId: e.target.value })}
                placeholder={t("wizard.client.taxIdPlaceholder")}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="wizard-client-address">{t("wizard.client.address")}</Label>
              <Input
                id="wizard-client-address"
                value={state.clientAddress}
                onChange={(e) => onChange({ clientAddress: e.target.value })}
                placeholder={t("wizard.client.addressPlaceholder")}
                autoComplete="street-address"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
