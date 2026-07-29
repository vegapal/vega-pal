import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WIZARD_STEP_LABELS, type WizardStep } from "./wizard-state";

const STEPS: WizardStep[] = [1, 2, 3, 4, 5, 6];

type Props = {
  currentStep: WizardStep;
  maxReachableStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  className?: string;
};

export function InvoiceWizardProgress({
  currentStep,
  maxReachableStep,
  onStepClick,
  className,
}: Props) {
  const { t } = useTranslation("invoices");

  return (
    <nav
      aria-label={t("wizard.progressLabel")}
      className={cn("overflow-x-auto -mx-1 px-1", className)}
    >
      <ol className="flex min-w-max items-center gap-1 sm:gap-2 lg:min-w-0 lg:w-full">
        {STEPS.map((step, idx) => {
          const done = step < currentStep;
          const active = step === currentStep;
          const reachable = step <= maxReachableStep;
          const label = t(WIZARD_STEP_LABELS[step]);

          return (
            <li key={step} className="flex items-center gap-1 sm:gap-2 shrink-0 lg:shrink lg:flex-1">
              <button
                type="button"
                disabled={!reachable || active}
                onClick={() => reachable && !active && onStepClick(step)}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition",
                  reachable && !active && "hover:bg-muted/60 cursor-pointer",
                  !reachable && "cursor-not-allowed opacity-50",
                  active && "bg-primary/10",
                )}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && !done && "border-primary text-primary",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-sm font-medium whitespace-nowrap",
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
              {idx < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "hidden sm:block h-px w-4 lg:w-auto lg:flex-1 lg:min-w-[1rem]",
                    step < currentStep ? "bg-primary/40" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground lg:hidden tabular-nums">
        {t("wizard.stepCounter", { current: currentStep, total: STEPS.length })}
      </p>
    </nav>
  );
}
