import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InvoiceWizard } from "@/components/invoices/create/InvoiceWizard";
import { InvoiceWizardErrorBoundary } from "@/components/invoices/create/InvoiceWizardErrorBoundary";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

export const Route = createFileRoute("/invoices/new")({
  beforeLoad: () => ensureNamespacesLoaded(["invoices", "settings"]),
  head: () => ({
    meta: [
      { title: "Create invoice — VegaPal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewInvoiceRoute,
});

function NewInvoiceRoute() {
  const editId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("edit") ?? undefined
      : undefined;

  return (
    <AppShell>
      <InvoiceWizardErrorBoundary>
        <InvoiceWizard editId={editId} />
      </InvoiceWizardErrorBoundary>
    </AppShell>
  );
}
