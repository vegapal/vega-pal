import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Gift, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { fetchMyReferralStats, type ReferralStats } from "@/lib/growth/referral-client";
import { buildReferralLink } from "@/lib/growth/attribution-client";
import { trackSimpleGrowthEvent } from "@/lib/analytics/events";
import { SITE_ORIGIN } from "@/lib/seo/site";

export const Route = createFileRoute("/settings/invite")({
  beforeLoad: () => ensureNamespacesLoaded(["settings", "common"]),
  head: () => ({
    meta: [{ title: "Invite & Earn — VegaPal" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: InviteEarnPage,
});

function InviteEarnPage() {
  const { t } = useTranslation("settings");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMyReferralStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const link = stats?.code
    ? buildReferralLink(stats.code)
    : `${SITE_ORIGIN}/`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      trackSimpleGrowthEvent("referral_link_copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [link]);

  const share = useCallback(async () => {
    trackSimpleGrowthEvent("referral_share_clicked");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "VegaPal",
          text: t("invite.shareText"),
          url: link,
        });
      } catch {
        /* cancelled */
      }
    } else {
      await copyLink();
    }
  }, [link, copyLink, t]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/settings" className="hover:underline">
            {t("invite.backToSettings")}
          </Link>
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Gift className="h-6 w-6 text-primary" aria-hidden />
          {t("invite.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("invite.description")}</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("invite.yourLink")}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code
            className="min-w-0 flex-1 break-all rounded-xl bg-muted px-3 py-2 text-sm"
            dir="ltr"
          >
            {loading ? "…" : link}
          </code>
          <div className="flex gap-2 shrink-0">
            <Button type="button" onClick={() => void copyLink()} disabled={!stats}>
              {copied ? <Check className="h-4 w-4 me-2" /> : <Copy className="h-4 w-4 me-2" />}
              {copied ? t("invite.copied") : t("invite.copyLink")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void share()} disabled={!stats}>
              <Share2 className="h-4 w-4 me-2" />
              {t("invite.share")}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("invite.privacyNote")}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t("invite.stats.invited")} value={stats?.invited ?? 0} loading={loading} />
        <StatCard
          label={t("invite.stats.activated")}
          value={stats?.activated ?? 0}
          loading={loading}
        />
        <StatCard
          label={t("invite.stats.bonusDocs")}
          value={stats?.bonusDocuments ?? 0}
          loading={loading}
        />
      </section>

      <p className="text-sm text-muted-foreground">{t("invite.rules")}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "—" : value}</p>
    </div>
  );
}
