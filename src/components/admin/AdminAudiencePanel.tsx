import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check, RefreshCw, Users, Eye, UserPlus, LogIn, UserCheck } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import type { MonitoringSummary } from "@/lib/monitoring/monitoring-types";

async function monitoringRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Authentication required");
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error(`Monitoring request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function AdminAudiencePanel() {
  const { t, i18n } = useTranslation("admin");
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [readError, setReadError] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const readRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (request.current || readRequest.current) return;
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    try {
      const result = await monitoringRequest<MonitoringSummary>("/api/admin/monitoring", {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setSummary(result);
        setLoadError(false);
      }
    } catch {
      if (!controller.signal.aborted) setLoadError(true);
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(onVisible, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      request.current?.abort();
      request.current = null;
      readRequest.current?.abort();
      readRequest.current = null;
    };
  }, [refresh]);

  const markRead = async (id: string) => {
    if (readRequest.current) return;
    request.current?.abort();
    request.current = null;
    setRefreshing(false);
    const controller = new AbortController();
    readRequest.current = controller;
    setReadingId(id);
    setReadError(false);
    try {
      await monitoringRequest("/api/admin/monitoring/read", {
        method: "POST",
        body: JSON.stringify({ id }),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setSummary((current) => {
          if (!current) return current;
          const wasUnread = current.notifications.some((item) => item.id === id && !item.readAt);
          return {
            ...current,
            unreadCount: Math.max(0, current.unreadCount - (wasUnread ? 1 : 0)),
            notifications: current.notifications.map((item) =>
              item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
            ),
          };
        });
      }
    } catch {
      if (!controller.signal.aborted) setReadError(true);
    } finally {
      if (readRequest.current === controller) readRequest.current = null;
      if (!controller.signal.aborted) setReadingId(null);
      // The bounded inbox prioritizes unread rows. Fetch the next oldest
      // unread notification after acknowledging one of the visible rows.
      if (!controller.signal.aborted) void refresh();
    }
  };

  const dateLabel = (value: string, withTime = false) =>
    new Intl.DateTimeFormat(i18n.language, {
      month: "short",
      day: "numeric",
      ...(withTime ? ({ hour: "numeric", minute: "2-digit" } as const) : { timeZone: "UTC" }),
    }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
  const numberLabel = (value: number) => value.toLocaleString(i18n.language);
  const metrics = summary
    ? [
        { key: "uniqueVisitors", value: summary.uniqueVisitors, icon: Users },
        { key: "visits", value: summary.visits, icon: Eye },
        { key: "newAccounts", value: summary.newAccounts, icon: UserPlus },
        { key: "signedInUsers", value: summary.signedInUsers, icon: UserCheck },
        { key: "logins", value: summary.logins, icon: LogIn },
      ]
    : [];

  return (
    <section aria-labelledby="audience-title" className="mb-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="audience-title" className="text-xl font-semibold">
            {t("audience.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("audience.subtitle")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden />
          {t("audience.refresh")}
        </Button>
      </div>

      {loadError && <FormError message={t("audience.loadError")} />}
      {!summary && !loadError && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("audience.loading")}
        </p>
      )}
      {summary && !summary.available && (
        <div role="status" className="rounded-xl border border-warning/40 bg-warning/5 p-5">
          <p className="font-medium">{t("audience.notConfiguredTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("audience.notConfiguredBody")}</p>
        </div>
      )}

      {summary?.available && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map(({ key, value, icon: Icon }) => (
              <div key={key} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <p className="mt-3 text-sm text-muted-foreground">{t(`audience.metrics.${key}`)}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{numberLabel(value)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("audience.measurementNote")}{" "}
            {t("audience.period", { date: dateLabel(summary.since) })}
          </p>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="font-semibold">{t("audience.dailyTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("audience.utcNote")}</p>
            <div
              className="mt-4 h-64 w-full min-w-0"
              dir="ltr"
              role="img"
              aria-label={t("audience.chartLabel")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.daily} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => dateLabel(value)}
                    minTickGap={32}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} width={40} tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(value) => dateLabel(String(value))}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    name={t("audience.metrics.uniqueVisitors")}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    name={t("audience.metrics.visits")}
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="newAccounts"
                    name={t("audience.metrics.newAccounts")}
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="logins"
                    name={t("audience.metrics.logins")}
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-primary">
                {t("audience.viewDailyData")}
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <caption className="sr-only">{t("audience.chartLabel")}</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="p-2 text-start">
                        {t("audience.date")}
                      </th>
                      {["uniqueVisitors", "visits", "newAccounts", "logins"].map((key) => (
                        <th key={key} scope="col" className="p-2 text-end">
                          {t(`audience.metrics.${key}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.daily.map((day) => (
                      <tr key={day.date} className="border-b border-border/50">
                        <th scope="row" className="p-2 text-start font-normal whitespace-nowrap">
                          {dateLabel(day.date)}
                        </th>
                        {[day.visitors, day.visits, day.newAccounts, day.logins].map(
                          (count, index) => (
                            <td key={index} className="p-2 text-end tabular-nums">
                              {numberLabel(count)}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="font-semibold">{t("audience.notificationsTitle")}</h3>
              <span
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                aria-live="polite"
              >
                {t("audience.unread", { count: summary.unreadCount })}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("audience.notificationsNote")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.delivery.configured
                ? t("audience.deliveryConfigured")
                : t("audience.deliveryPending")}
            </p>
            {readError && (
              <div className="mt-3">
                <FormError message={t("audience.readError")} />
              </div>
            )}
            {summary.notifications.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                {t("audience.emptyNotifications")}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {summary.notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        {!notification.readAt && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-primary"
                            aria-label={t("audience.unreadNotification")}
                          />
                        )}
                        <span className="break-words">
                          {notification.name || t("audience.newAccount")}
                        </span>
                      </p>
                      <p className="mt-1 break-all text-sm text-muted-foreground" dir="ltr">
                        {notification.email}
                      </p>
                      <time
                        dateTime={notification.createdAt}
                        className="mt-1 block text-xs text-muted-foreground"
                      >
                        {dateLabel(notification.createdAt, true)}
                      </time>
                    </div>
                    {!notification.readAt ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={readingId !== null}
                        onClick={() => void markRead(notification.id)}
                      >
                        <Check aria-hidden />{" "}
                        {readingId === notification.id
                          ? t("audience.saving")
                          : t("audience.markRead")}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("audience.read")}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
