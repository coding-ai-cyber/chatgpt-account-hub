import { useMemo } from "react";
import type { AccountDailyUsage, AccountWithUsage } from "../types";
import { useLanguage } from "../lib/i18n";
import { languageLocale } from "../lib/language";
import { formatDuration, formatNumber, formatTokens } from "../lib/format";
import { useAccountUsageStats } from "../hooks/useAccountUsageStats";
import { QuotaRing } from "../components/dashboard/QuotaRing";
import { MetricCard } from "../components/dashboard/MetricCard";
import { Icon } from "../components/layout/Icon";

interface CurrentAccountPageProps {
  loading: boolean;
  error: string | null;
  accounts: AccountWithUsage[];
  activeAccount?: AccountWithUsage;
  masked: Set<string>;
  onAddAccount: () => void;
  onImportAccounts: () => void;
  onRetry: () => void;
  onOpenInBrowser: (accountId: string) => void;
  onRefresh: (accountId: string) => Promise<unknown>;
  onWarmup: (accountId: string, name: string) => void;
  onDelete: (accountId: string) => void;
  onToggleMask: (accountId: string) => void;
  onToggleAutoWarmup: (accountId: string) => void;
  onViewFullStats: () => void;
}

function dayKey(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sumDays(daily: AccountDailyUsage[], days: number): number | null {
  if (!daily || daily.length === 0) return null;
  const keys = new Set(Array.from({ length: days }, (_, index) => dayKey(index)));
  return daily.reduce((total, day) => (keys.has(day.date) ? total + day.tokens : total), 0);
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function CurrentAccountPage({
  loading,
  error,
  accounts,
  activeAccount,
  masked,
  onAddAccount,
  onImportAccounts,
  onRetry,
  onOpenInBrowser,
  onRefresh,
  onWarmup,
  onDelete,
  onToggleMask,
  onToggleAutoWarmup,
  onViewFullStats,
}: CurrentAccountPageProps) {
  const { language, t } = useLanguage();
  const locale = languageLocale(language);
  const account = activeAccount;
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } =
    useAccountUsageStats(account?.id, account?.auth_mode === "chat_g_p_t");
  const isMasked = account ? masked.has(account.id) : false;

  const todayTokens = stats ? sumDays(stats.daily, 1) : null;
  const sevenDayTokens = stats ? sumDays(stats.daily, 7) : null;

  const planDisplay = account
    ? account.plan_type
      ? account.plan_type.charAt(0).toUpperCase() + account.plan_type.slice(1)
      : account.auth_mode === "api_key"
        ? t("apiKey")
        : t("unknown")
    : "";

  const metrics = useMemo(() => {
    if (!stats?.available) {
      return [
        { label: t("lifetimeTokens"), value: "—", icon: "history" as const },
        { label: t("todayTokens"), value: "—", icon: "clock" as const },
        { label: t("lastSevenDayTokens"), value: "—", icon: "chart" as const },
        { label: t("currentStreakDays"), value: "—", icon: "sparkles" as const },
        { label: t("longestTaskTime"), value: "—", icon: "lightning" as const },
      ];
    }
    return [
      { label: t("lifetimeTokens"), value: formatTokens(stats.summary.lifetime_tokens), icon: "history" as const },
      { label: t("todayTokens"), value: formatTokens(todayTokens), icon: "clock" as const },
      { label: t("lastSevenDayTokens"), value: formatTokens(sevenDayTokens), icon: "chart" as const },
      {
        label: t("currentStreakDays"),
        value: `${formatNumber(stats.summary.current_streak_days, language)} ${t("days")}`,
        icon: "sparkles" as const,
      },
      {
        label: t("longestTaskTime"),
        value: formatDuration(stats.summary.longest_task_seconds),
        icon: "lightning" as const,
      },
    ];
  }, [language, sevenDayTokens, stats, t, todayTokens]);

  if (loading && accounts.length === 0) {
    return (
      <div className="app-page space-y-4">
        <div className="app-surface space-y-3 p-5">
          <div className="app-skeleton h-6 w-2/5" />
          <div className="app-skeleton h-4 w-3/5" />
          <div className="app-skeleton mt-3 h-24" />
        </div>
        <div className="stats-grid">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="app-skeleton h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="app-page">
        <div className="app-alert app-alert-error">
          <Icon name="warning" size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("failedToLoadAccounts")}</p>
            <p className="mt-1 break-words opacity-80">{error}</p>
            <button type="button" className="app-btn mt-3 px-3 py-2" onClick={onRetry}>
              {t("retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="app-page">
        <div className="app-empty-state">
          <div className="max-w-md">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl app-surface-secondary app-accent">
              <Icon name="account" size={28} />
            </span>
            <h2 className="mt-4 text-lg font-semibold app-text-primary">{t("noAccountsYet")}</h2>
            <p className="mt-1 text-sm app-text-secondary">{t("addFirstAccount")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" className="app-btn app-btn-primary px-4 py-2 text-sm font-medium" onClick={onAddAccount}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="plus" size={16} />
                  {t("addAccount")}
                </span>
              </button>
              <button type="button" className="app-btn px-4 py-2 text-sm font-medium" onClick={onImportAccounts}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="download" size={16} />
                  {t("importAccounts")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page space-y-4">
      <section className="app-surface overflow-hidden p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl app-accent-bg">
              <Icon name="account" size={24} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold app-text-primary">
                  {isMasked ? t("accountHidden") : account.name}
                </h2>
                <span className="app-chip app-chip-success">
                  <span className="app-qr-status-dot" />
                  {t("statusActive")}
                </span>
                <span className="app-chip">{planDisplay}</span>
              </div>
              <p className="mt-1 truncate text-sm app-text-secondary">
                {isMasked ? "••••••••" : account.email || t("noAccountsConfigured")}
              </p>
              <p className="mt-2 text-xs app-text-muted">
                {t("activeSince", { date: formatDate(account.created_at, locale) })}
                {account.subscription_expires_at ? ` · ${t("subscriptionStatus")} ${formatDate(account.subscription_expires_at, locale)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="app-btn px-3 py-2 text-sm" onClick={() => onOpenInBrowser(account.id)}>
              <span className="inline-flex items-center gap-2">
                <Icon name="external" size={16} />
                {t("openInBrowserAction")}
              </span>
            </button>
            <button type="button" className="app-btn px-3 py-2 text-sm" onClick={() => void onRefresh(account.id)}>
              <span className="inline-flex items-center gap-2">
                <Icon name="refresh" size={16} />
                {t("refreshAccount")}
              </span>
            </button>
            <button type="button" className="app-btn app-btn-soft-warning px-3 py-2 text-sm" onClick={() => onWarmup(account.id, account.name)}>
              <span className="inline-flex items-center gap-2">
                <Icon name="lightning" size={16} />
                {t("warmup")}
              </span>
            </button>
            <button
              type="button"
              className="app-icon-button"
              onClick={() => onToggleMask(account.id)}
              aria-label={isMasked ? t("showInfo") : t("hideInfo")}
              title={isMasked ? t("showInfo") : t("hideInfo")}
            >
              <Icon name={isMasked ? "eye-off" : "eye"} size={18} />
            </button>
            <button type="button" className="app-icon-button" onClick={() => onToggleAutoWarmup(account.id)} aria-label={t("autoWarmupLabel")} title={t("autoWarmupLabel")}>
              <Icon name="clock" size={18} />
            </button>
            <button type="button" className="app-icon-button app-btn-soft-danger" onClick={() => onDelete(account.id)} aria-label={t("removeAccount")} title={t("removeAccount")}>
              <Icon name="delete" size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <QuotaRing usage={account.usage} loading={account.usageLoading} />
        <div className="app-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="app-section-label">{t("recentActivity")}</h3>
            {stats?.available && (
              <button type="button" className="app-btn px-2.5 py-1.5 text-xs" onClick={() => void refreshStats()}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="refresh" size={14} />
                  {t("refresh")}
                </span>
              </button>
            )}
          </div>
          {statsLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="app-skeleton h-12" />
              ))}
            </div>
          ) : stats?.available ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg app-surface-secondary px-3 py-2 text-sm">
                <span className="app-text-secondary">{t("fastMode")}</span>
                <span className="font-medium app-text-primary">
                  {stats.activity.fast_mode_percent === null ? "—" : `${Math.round(stats.activity.fast_mode_percent)}%`}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg app-surface-secondary px-3 py-2 text-sm">
                <span className="app-text-secondary">{t("totalThreads")}</span>
                <span className="font-medium app-text-primary">{formatNumber(stats.activity.total_threads, language)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg app-surface-secondary px-3 py-2 text-sm">
                <span className="app-text-secondary">{t("peakDay")}</span>
                <span className="font-medium app-text-primary">{formatTokens(stats.summary.peak_daily_tokens)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg app-surface-secondary px-3 py-2 text-sm">
                <span className="app-text-secondary">{t("last7DaysTitle")}</span>
                <span className="font-medium app-text-primary">{formatTokens(sevenDayTokens)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm app-text-muted">
              {statsError || t("activityUnavailable")}
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="app-section-label">{t("usageSummary")}</h3>
          <button type="button" className="app-btn px-3 py-1.5 text-xs font-medium" onClick={onViewFullStats}>
            <span className="inline-flex items-center gap-1.5">
              {t("viewFullStats")}
              <Icon name="arrow-right" size={14} />
            </span>
          </button>
        </div>
        <div className="stats-grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} label={metric.label} value={metric.value} icon={metric.icon} sub={stats?.available ? t("reported") : undefined} />
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-xs app-text-muted">
          {t("statsLastUpdated", { date: stats?.stats_as_of ? formatDate(stats.stats_as_of, locale) : t("never") })}
        </p>
        <button type="button" className="app-btn app-btn-primary px-4 py-2 text-sm font-medium" onClick={onViewFullStats}>
          <span className="inline-flex items-center gap-2">
            <Icon name="chart" size={16} />
            {t("viewFullStats")}
          </span>
        </button>
      </section>
    </div>
  );
}