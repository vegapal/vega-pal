import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/growth")({
  beforeLoad: () => ensureNamespacesLoaded(["admin"]),
  head: () => ({
    meta: [{ title: "Growth — VegaPal Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminGrowthPage,
});

type Summary = {
  newUsers: number;
  activatedUsers: number;
  activationRatePercent: number;
  referralSignups: number;
  referralActivations: number;
  proCustomers: number;
  affiliateRevenueUsd: number;
  affiliateCommissionsUsd: number;
  note?: string;
};

async function growthFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json as T;
}

function AdminGrowthPage() {
  const { t } = useTranslation("admin");
  const [range, setRange] = useState<"today" | "7d" | "30d">("30d");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [top, setTop] = useState<Array<{ code: string; invited: number; activated: number }>>([]);
  const [affiliates, setAffiliates] = useState<Array<Record<string, unknown>>>([]);
  const [commissions, setCommissions] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rate, setRate] = useState("0.30");

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = range === "today" ? "1d" : range;
      const [s, tref, aff, com] = await Promise.all([
        growthFetch<Summary>(`/api/admin/growth/summary?range=${q}`),
        growthFetch<{ items: typeof top }>(`/api/admin/growth/top-referrers?range=${q}`),
        growthFetch<{ items: typeof affiliates }>("/api/admin/growth/affiliates"),
        growthFetch<{ items: typeof commissions }>("/api/admin/growth/commissions"),
      ]);
      setSummary(s);
      setTop(tref.items ?? []);
      setAffiliates(aff.items ?? []);
      setCommissions(com.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("growth.unavailable"));
      setSummary(null);
    }
  }, [range, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const createAffiliate = async () => {
    try {
      await growthFetch("/api/admin/growth/affiliates", {
        method: "POST",
        body: JSON.stringify({
          name,
          code,
          commissionRate: Number(rate),
        }),
      });
      setName("");
      setCode("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("growth.title")}</h1>
        <div className="flex gap-2">
          {(["today", "7d", "30d"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {r === "today" ? t("growth.rangeToday") : r === "7d" ? t("growth.range7d") : t("growth.range30d")}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">{error}</p>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("growth.newUsers")} value={summary.newUsers} />
          <Metric label={t("growth.activatedUsers")} value={summary.activatedUsers} />
          <Metric label={t("growth.activationRate")} value={`${summary.activationRatePercent}%`} />
          <Metric label={t("growth.referralSignups")} value={summary.referralSignups} />
          <Metric label={t("growth.referralActivations")} value={summary.referralActivations} />
          <Metric label={t("growth.proCustomers")} value={summary.proCustomers} />
          <Metric label={t("growth.affiliateRevenue")} value={`$${summary.affiliateRevenueUsd}`} />
          <Metric label={t("growth.affiliateCommissions")} value={`$${summary.affiliateCommissionsUsd}`} />
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{t("growth.visitorNote")}</p>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">{t("growth.topReferrers")}</h2>
        <ul className="space-y-2 text-sm">
          {top.length === 0 ? <li className="text-muted-foreground">—</li> : null}
          {top.map((row) => (
            <li key={row.code} className="flex justify-between gap-3 tabular-nums" dir="ltr">
              <span className="font-mono">{row.code}</span>
              <span>
                {row.invited} / {row.activated}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-semibold">{t("growth.affiliates")}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>{t("growth.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("growth.code")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} dir="ltr" />
          </div>
          <div>
            <Label>{t("growth.commissionRate")}</Label>
            <Input value={rate} onChange={(e) => setRate(e.target.value)} dir="ltr" />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={() => void createAffiliate()}>
              {t("growth.createAffiliate")}
            </Button>
          </div>
        </div>
        <ul className="text-sm space-y-2">
          {affiliates.map((a) => (
            <li key={String(a.id)} className="flex justify-between gap-2" dir="ltr">
              <span>
                {String(a.name)} · <span className="font-mono">{String(a.code)}</span>
              </span>
              <span>{Math.round(Number(a.commission_rate) * 100)}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">{t("growth.commissions")}</h2>
        <ul className="text-sm space-y-2">
          {commissions.map((c) => (
            <li key={String(c.id)} className="flex flex-wrap items-center justify-between gap-2">
              <span dir="ltr">
                ${Number(c.commission_amount_usd)} · {String(c.status)}
              </span>
              {c.status === "earned" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void growthFetch(`/api/admin/growth/commissions/${c.id}/paid`, {
                      method: "POST",
                    }).then(load)
                  }
                >
                  {t("growth.markPaid")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm">
        <Link to="/admin" className="hover:underline">
          ← Admin
        </Link>
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
