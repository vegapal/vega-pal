import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AdminShell } from "@/components/admin/AdminShell";
import { hasNamespaceResources } from "@/lib/i18n/load-namespace";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — VegaPal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { ready } = useTranslation("admin");
  const { t } = useTranslation("common");
  return (
    <AdminShell>
      {ready && hasNamespaceResources("admin") ? (
        <Outlet />
      ) : ready ? (
        <div role="alert" className="p-6 space-y-3 text-sm">
          <p>{t("errors.pageLoadFailed")}</p>
          <button type="button" onClick={() => window.location.reload()} className="text-primary underline">
            {t("buttons.tryAgain")}
          </button>
        </div>
      ) : (
        <p role="status" className="p-6 text-sm text-muted-foreground">{t("buttons.loading")}</p>
      )}
    </AdminShell>
  );
}
