import type { UsageInfo } from "../types";
import { languageLocale, type Language } from "./language";

export function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined || !Number.isFinite(tokens)) return "--";
  const abs = Math.abs(tokens);
  if (abs >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return `${tokens}`;
}

export function formatNumber(value: number | null | undefined, language: Language): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat(languageLocale(language)).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `${Math.round(value)}%`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "--";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatWindowDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 24 * 60) return `${Math.ceil(minutes / 60)}h`;
  return `${Math.ceil(minutes / (24 * 60))}d`;
}

export function formatResetAt(resetAt: number | null | undefined): string | null {
  if (!resetAt) return null;
  const diff = resetAt - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "now";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86_400) {
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  }
  return `${Math.floor(diff / 86_400)}d ${Math.floor((diff % 86_400) / 3600)}h`;
}

export function formatExactResetTime(
  resetAt: number | null | undefined,
  language: Language,
  dateMode: "compact" | "full" = "compact"
): string | null {
  if (!resetAt) return null;
  const date = new Date(resetAt * 1000);
  const locale = languageLocale(language);
  if (dateMode === "full") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getPreferredUsageWindow(
  usage: UsageInfo | undefined
): { labelKind: "session" | "weekly"; usedPercent: number | null; resetsAt: number | null; windowMinutes: number | null } | null {
  if (!usage || usage.error) return null;
  if (
    usage.secondary_used_percent !== null &&
    usage.secondary_used_percent !== undefined
  ) {
    return {
      labelKind: "weekly",
      usedPercent: usage.secondary_used_percent,
      resetsAt: usage.secondary_resets_at ?? null,
      windowMinutes: usage.secondary_window_minutes ?? null,
    };
  }
  if (
    usage.primary_used_percent !== null &&
    usage.primary_used_percent !== undefined
  ) {
    return {
      labelKind: "session",
      usedPercent: usage.primary_used_percent,
      resetsAt: usage.primary_resets_at ?? null,
      windowMinutes: usage.primary_window_minutes ?? null,
    };
  }
  return null;
}