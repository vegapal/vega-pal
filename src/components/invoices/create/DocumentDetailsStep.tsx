import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CRYPTO_CURRENCY_OPTIONS,
  FIAT_CURRENCY_OPTIONS,
  type InvoiceCurrency,
} from "@/lib/invoice-constants";
import { useTranslation } from "react-i18next";
import { OptionalFieldsPicker } from "./OptionalFieldsPicker";
import type { InvoiceWizardState } from "./wizard-state";

type Props = {
  state: InvoiceWizardState;
  onChange: (patch: Partial<InvoiceWizardState>) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

function dateLabels(documentType: InvoiceWizardState["documentType"]) {
  if (documentType === "quotation") {
    return { issue: "wizard.details.quoteDate", due: "wizard.details.validUntil" };
  }
  if (documentType === "proforma_invoice") {
    return { issue: "wizard.details.issueDate", due: "wizard.details.deliveryDate" };
  }
  return { issue: "create.fields.issueDate", due: "wizard.details.dueDate" };
}

export function DocumentDetailsStep({ state, onChange, headingRef }: Props) {
  const { t } = useTranslation("invoices");
  const labels = dateLabels(state.documentType);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none"
        >
          {t("wizard.details.heading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("wizard.details.subheading")}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="wizard-title">{t("create.fields.invoiceTitle")}</Label>
          <Input
            id="wizard-title"
            required
            value={state.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t("create.fields.invoiceTitlePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-currency">{t("create.fields.invoiceCurrency")}</Label>
          <Select
            value={state.invoiceCurrency}
            onValueChange={(v) => onChange({ invoiceCurrency: v as InvoiceCurrency })}
          >
            <SelectTrigger id="wizard-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("create.fields.fiatCurrencies")}</SelectLabel>
                {FIAT_CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>{t("create.fields.cryptoCurrencies")}</SelectLabel>
                {CRYPTO_CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden md:block" aria-hidden />
        <div className="space-y-2">
          <Label htmlFor="wizard-issue-date">{t(labels.issue)}</Label>
          <Input
            id="wizard-issue-date"
            type="date"
            required
            value={state.issueDate}
            onChange={(e) => onChange({ issueDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-due-date">{t(labels.due)}</Label>
          <Input
            id="wizard-due-date"
            type="date"
            required
            value={state.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
          />
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <OptionalFieldsPicker state={state} onChange={onChange} />
      </div>
    </div>
  );
}
