import type { AccountDailyUsage, UsageInfo } from "../types";
import { parseDateOnly } from "./format.ts";

export type DashboardQuotaKind = "session" | "weekly";

export interface DashboardQuotaWindow {
  kind: DashboardQuotaKind;
  usedPercent: number;
  remainingPercent: number;
  windowMinutes: number | null;
  resetsAt: number | null;
}

export type UsageAdviceKey =
  | "usageAdviceHealthy"
  | "usageAdviceWatchReset"
  | "usageAdviceRefresh";

function quotaWindow(
  kind: DashboardQuotaKind,
  usedPercent: number | null | undefined,
  windowMinutes: number | null | undefined,
  resetsAt: number | null | undefined,
): DashboardQuotaWindow | null {
  if (usedPercent === null || usedPercent === undefined || !Number.isFinite(usedPercent)) {
    return null;
  }
  const used = Math.min(100, Math.max(0, usedPercent));
  return {
    kind,
    usedPercent: used,
    remainingPercent: 100 - used,
    windowMinutes: windowMinutes ?? null,
    resetsAt: resetsAt ?? null,
  };
}

export function getQuotaWindows(usage: UsageInfo | undefined): {
  session: DashboardQuotaWindow | null;
  weekly: DashboardQuotaWindow | null;
} {
  if (!usage || usage.error) return { session: null, weekly: null };
  return {
    session: quotaWindow(
      "session",
      usage.primary_used_percent,
      usage.primary_window_minutes,
      usage.primary_resets_at,
    ),
    weekly: quotaWindow(
      "weekly",
      usage.secondary_used_percent,
      usage.secondary_window_minutes,
      usage.secondary_resets_at,
    ),
  };
}

export function getPrimaryQuotaWindow(
  usage: UsageInfo | undefined,
): DashboardQuotaWindow | null {
  const windows = getQuotaWindows(usage);
  return windows.weekly ?? windows.session;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sumRecentTokens(
  daily: AccountDailyUsage[],
  days: number,
  now = new Date(),
): number | null {
  if (daily.length === 0 || days <= 0) return null;
  const keys = new Set<string>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    keys.add(localDateKey(date));
  }
  return daily.reduce(
    (total, entry) => total + (keys.has(entry.date) && Number.isFinite(entry.tokens) ? entry.tokens : 0),
    0,
  );
}

export function getPeakUsageDay(daily: AccountDailyUsage[]): AccountDailyUsage | null {
  return daily.reduce<AccountDailyUsage | null>((peak, entry) => {
    if (!parseDateOnly(entry.date) || !Number.isFinite(entry.tokens) || entry.tokens < 0) return peak;
    if (!peak || entry.tokens > peak.tokens) return entry;
    if (entry.tokens === peak.tokens && entry.date > peak.date) return entry;
    return peak;
  }, null);
}

export function getUsageAdviceKey(usage: UsageInfo | undefined): UsageAdviceKey {
  const windows = getQuotaWindows(usage);
  const available = [windows.session, windows.weekly].filter(
    (window): window is DashboardQuotaWindow => window !== null,
  );
  if (available.length === 0) return "usageAdviceRefresh";
  return available.some((window) => window.remainingPercent <= 30)
    ? "usageAdviceWatchReset"
    : "usageAdviceHealthy";
}
