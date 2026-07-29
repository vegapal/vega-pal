import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InvoiceWizardState, OptionalFieldKey } from "./wizard-state";

const FIELD_META: {
  key: OptionalFieldKey;
  labelKey: string;
  placeholderKey: string;
  multiline?: boolean;
}[] = [
  { key: "poNumber", labelKey: "create.fields.poNumber", placeholderKey: "create.fields.optionalPlaceholder" },
  {
    key: "referenceNumber",
    labelKey: "create.fields.referenceNumber",
    placeholderKey: "create.fields.optionalPlaceholder",
  },
  {
    key: "projectCode",
    labelKey: "create.fields.projectCode",
    placeholderKey: "create.fields.optionalPlaceholder",
  },
  { key: "notes", labelKey: "create.fields.notes", placeholderKey: "create.fields.notesPlaceholder", multiline: true },
  {
    key: "terms",
    labelKey: "wizard.optional.termsLabel",
    placeholderKey: "create.fields.termsPlaceholder",
    multiline: true,
  },
];

type Props = {
  state: InvoiceWizardState;
  onChange: (patch: Partial<InvoiceWizardState>) => void;
};

export function OptionalFieldsPicker({ state, onChange }: Props) {
  const { t } = useTranslation("invoices");

  const addField = (key: OptionalFieldKey) => {
    if (state.activeOptionalFields.includes(key)) return;
    onChange({ activeOptionalFields: [...state.activeOptionalFields, key] });
  };

  const removeField = (key: OptionalFieldKey) => {
    onChange({
      activeOptionalFields: state.activeOptionalFields.filter((k) => k !== key),
      ...(key === "poNumber" ? { poNumber: "" } : {}),
      ...(key === "referenceNumber" ? { referenceNumber: "" } : {}),
      ...(key === "projectCode" ? { projectCode: "" } : {}),
      ...(key === "notes" ? { notes: "" } : {}),
      ...(key === "terms" ? { terms: "" } : {}),
    });
  };

  const valueFor = (key: OptionalFieldKey): string => {
    switch (key) {
      case "poNumber":
        return state.poNumber;
      case "referenceNumber":
        return state.referenceNumber;
      case "projectCode":
        return state.projectCode;
      case "notes":
        return state.notes;
      case "terms":
        return state.terms;
    }
  };

  const setValue = (key: OptionalFieldKey, value: string) => {
    switch (key) {
      case "poNumber":
        onChange({ poNumber: value });
        break;
      case "referenceNumber":
        onChange({ referenceNumber: value });
        break;
      case "projectCode":
        onChange({ projectCode: value });
        break;
      case "notes":
        onChange({ notes: value });
        break;
      case "terms":
        onChange({ terms: value });
        break;
    }
  };

  const available = FIELD_META.filter((f) => !state.activeOptionalFields.includes(f.key));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{t("wizard.optional.heading")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t("wizard.optional.subheading")}</p>
      </div>

      {state.activeOptionalFields.length > 0 ? (
        <div className="space-y-4">
          {FIELD_META.filter((f) => state.activeOptionalFields.includes(f.key)).map((field) => (
            <div key={field.key} className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-2">
                <Label htmlFor={`opt-${field.key}`}>{t(field.labelKey)}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeField(field.key)}
                  aria-label={t("wizard.optional.removeField", { field: t(field.labelKey) })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {field.multiline ? (
                <Textarea
                  id={`opt-${field.key}`}
                  rows={3}
                  value={valueFor(field.key)}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={t(field.placeholderKey)}
                />
              ) : (
                <Input
                  id={`opt-${field.key}`}
                  value={valueFor(field.key)}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={t(field.placeholderKey)}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {available.map((field) => (
            <Button
              key={field.key}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => addField(field.key)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden />
              {t("wizard.optional.addField", { field: t(field.labelKey) })}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("wizard.optional.allAdded")}</p>
      )}
    </div>
  );
}
