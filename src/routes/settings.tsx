import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => ensureNamespacesLoaded(["settings"]),
  head: () => ({
    meta: [{ title: "Settings — VegaPal" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
