import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class InvoiceWizardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      JSON.stringify({
        event: "invoice_wizard_render_error",
        message: error.message,
        componentStack: info.componentStack?.split("\n")[0] ?? null,
      }),
    );
  }

  render() {
    if (this.state.hasError) {
      return <InvoiceWizardFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

function InvoiceWizardFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h2 className="text-lg font-semibold">{t("wizard.error.title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("wizard.error.description")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button type="button" variant="hero" onClick={onRetry}>
          {tc("buttons.tryAgain")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link to="/invoices">{t("create.backToInvoices")}</Link>
        </Button>
      </div>
    </div>
  );
}
