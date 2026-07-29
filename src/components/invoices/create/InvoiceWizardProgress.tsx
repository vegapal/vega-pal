import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WizardStep } from "./wizard-state";

const STEPS: WizardStep[] = [1, 2, 3, 4, 5, 6];

const STEP_KEYS: Record<WizardStep, string> = {
  1: "wizard.steps.documentType",
  2: "wizard.steps.client",
  3: "wizard.steps.details",
  4: "wizard.steps.items",
  5: "wizard.steps.payment",
  6: "wizard.steps.review",
};

type Props = {
  currentStep: WizardStep;
  className?: string;
};

export function InvoiceWizardProgress({ currentStep, className }: Props) {
  const { t } = useTranslation("invoices");

  return (
    <>
      <nav
        aria-label={t("wizard.progressLabel")}
        className={cn("hidden lg:block", className)}
      >
        <ol className="flex items-center gap-2">
          {STEPS.map((step, idx) => {
            const done = step < currentStep;
            const active = step === currentStep;
            return (
              <li key={step} className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex min-w-0 flex-col items-center gap-1.5 flex-1">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && !done && "border-primary bg-primary/10 text-primary",
                      !done && !active && "border-border bg-muted/40 text-muted-foreground",
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden /> : step}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-center text-[11px] font-medium leading-tight",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t(STEP_KEYS[step])}
                  </span>
                </div>
                {idx < STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "mb-5 h-px flex-1 max-w-[2rem]",
                      step < currentStep ? "bg-primary" : "bg-border",
                    )}
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className={cn("lg:hidden space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{t(STEP_KEYS[currentStep])}</span>
          <span className="text-muted-foreground tabular-nums">
            {t("wizard.stepCounter", { current: currentStep, total: STEPS.length })}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={t("wizard.progressLabel")}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}
