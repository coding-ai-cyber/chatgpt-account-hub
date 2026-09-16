import { useMemo } from "react";
import type { AccountUsageStats, AccountWithUsage } from "../../types";
import { formatDateOnly, formatNumber, formatTokens } from "../../lib/format";
import {
  getPeakUsageDay,
  getUsageAdviceKey,
  sumRecentTokens,
} from "../../lib/accountDashboard";
import { useLanguage } from "../../lib/i18n";
import {
  CurrentAccountHero,
  type CurrentAccountHeroProps,
} from "./CurrentAccountHero";
import { MetricCard } from "./MetricCard";
import { Icon } from "../layout/Icon";

export interface CurrentAccountDashboardProps
  extends Omit<CurrentAccountHeroProps, "account"> {
  account: AccountWithUsage;
  stats: AccountUsageStats | null;
  statsLoading: boolean;
  statsError: string | null;
  onRefreshStats: () => void;
  onViewFullStats: () => void;
}

export function CurrentAccountDashboard(props: CurrentAccountDashboardProps) {
  const { language, t } = useLanguage();
  const {
    account,
    masked,
    stats,
    statsLoading,
    statsError,
    onOpenInBrowser,
    onRefresh,
    onWarmup,
    onToggleMask,
    onToggleAutoWarmup,
    onDelete,
    onRefreshStats,
    onViewFullStats,
  } = props;
  const todayTokens = stats ? sumRecentTokens(stats.daily, 1) : null;
  const sevenDayTokens = stats ? sumRecentTokens(stats.daily, 7) : null;
  const peak = stats ? getPeakUsageDay(stats.daily) : null;
  const metrics = useMemo(
    () => [
      {
        label: t("lifetimeTokens"),
        value: stats?.available
          ? formatTokens(stats.summary.lifetime_tokens)
          : "--",
        icon: "history" as const,
      },
      {
        label: t("todayTokens"),
        value: stats?.available ? formatTokens(todayTokens) : "--",
        icon: "clock" as const,
      },
      {
        label: t("lastSevenDayTokens"),
        value: stats?.available ? formatTokens(sevenDayTokens) : "--",
        icon: "chart" as const,
      },
      {
        label: t("currentStreakDays"),
        value:
          stats?.available && stats.summary.current_streak_days !== null
            ? `${formatNumber(stats.summary.current_streak_days, language)} ${t("days")}`
            : "--",
        icon: "sparkles" as const,
      },
    ],
    [language, sevenDayTokens, stats, t, todayTokens],
  );

  return (
    <div className="current-account-dashboard app-page">
      <CurrentAccountHero
        account={account}
        masked={masked}
        onOpenInBrowser={onOpenInBrowser}
        onRefresh={onRefresh}
        onWarmup={onWarmup}
        onToggleMask={onToggleMask}
        onToggleAutoWarmup={onToggleAutoWarmup}
        onDelete={onDelete}
      />
      <section
        className="current-account-summary"
        aria-label={t("usageSummary")}
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>
      <section className="current-account-lower-grid">
        <div className="app-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="app-section-label">{t("recentActivity")}</h3>
            <button
              type="button"
              className="app-btn px-2.5 py-1.5 text-xs"
              onClick={onRefreshStats}
            >
              <Icon name="refresh" size={14} />
              {t("refresh")}
            </button>
          </div>
          {statsLoading ? (
            <div className="app-skeleton mt-3 h-16" />
          ) : stats?.available ? (
            <div className="recent-activity-grid mt-3">
              <div>
                <span>{t("fastMode")}</span>
                <strong>
                  {stats.activity.fast_mode_percent === null
                    ? "--"
                    : `${Math.round(stats.activity.fast_mode_percent)}%`}
                </strong>
              </div>
              <div>
                <span>{t("totalThreads")}</span>
                <strong>
                  {formatNumber(stats.activity.total_threads, language)}
                </strong>
              </div>
              <div>
                <span>{t("peakDate")}</span>
                <strong>{formatDateOnly(peak?.date, language)}</strong>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm app-text-secondary">
              {statsError || t("activityUnavailable")}
            </p>
          )}
          <button
            type="button"
            className="app-btn mt-3 px-3 py-1.5 text-xs"
            onClick={onViewFullStats}
          >
            {t("viewFullStats")}
            <Icon name="arrow-right" size={14} />
          </button>
        </div>
        <div className="app-surface p-4">
          <h3 className="app-section-label">{t("usageAdviceTitle")}</h3>
          <div className="usage-advice mt-3">
            <span className="usage-advice-icon">
              <Icon name="sparkles" size={18} />
            </span>
            <p>{t(getUsageAdviceKey(account.usage))}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
