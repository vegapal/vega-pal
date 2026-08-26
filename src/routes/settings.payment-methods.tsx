import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { PaymentMethodsManager } from "@/components/payment-methods/PaymentMethodsManager";

export const Route = createFileRoute("/settings/payment-methods")({
  head: () => ({
    meta: [
      { title: "Payment Methods — VegaPal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentMethodsPage,
});

function PaymentMethodsPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl mx-auto min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-10">
      <Link
        to="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("title")}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{t("sections.paymentMethods.title")}</h1>
      <p className="text-muted-foreground mt-1">{t("sections.paymentMethods.desc")}</p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8">
        <PaymentMethodsManager />
      </div>
    </div>
  );
}
