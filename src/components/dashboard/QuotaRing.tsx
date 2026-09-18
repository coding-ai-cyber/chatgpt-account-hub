import { useMemo } from "react";
import type { UsageInfo } from "../../types";
import { getPrimaryQuotaWindow } from "../../lib/accountDashboard";
import { useLanguage, type Translate } from "../../lib/i18n";
import {
  formatExactResetTime,
  formatPercent,
  formatResetAt,
} from "../../lib/format";

interface QuotaRingProps {
  usage?: UsageInfo;
  loading?: boolean;
}

function tone(remaining: number | null): "good" | "warning" | "danger" | "empty" {
  if (remaining === null) return "empty";
  if (remaining <= 10) return "danger";
  if (remaining <= 30) return "warning";
  return "good";
}

function describeReset(windowKind: "session" | "weekly", usage: UsageInfo, t: Translate): string {
  const resetAt =
    windowKind === "weekly"
      ? usage.secondary_resets_at
      : usage.primary_resets_at;
  const short = formatResetAt(resetAt);
  if (!short) return "";
  return short === "now" ? t("resetsNow") : t("resetsIn", { reset: short });
}

export function QuotaRing({ usage, loading = false }: QuotaRingProps) {
  const { language, t } = useLanguage();
  const window = useMemo(() => getPrimaryQuotaWindow(usage), [usage]);
  const remaining = window?.remainingPercent ?? null;
  const currentTone = tone(remaining);
  const ringPercent = remaining === null ? 0 : Math.min(100, remaining);
  const exactReset =
    window && window.resetsAt
      ? formatExactResetTime(window.resetsAt, language, "full")
      : null;
  const labelKey =
    window?.kind === "weekly" ? t("sevenDayQuota") : t("fiveHourQuota");
  const resetText = window ? describeReset(window.kind, usage!, t) : "";

  return (
    <div className="quota-overview flex min-w-0 items-center gap-4">
      <div
        className={`quota-ring-wrap shrink-0 ${currentTone === "warning" ? "is-warning" : ""} ${
          currentTone === "danger" ? "is-danger" : ""
        } ${currentTone === "empty" ? "is-empty" : ""}`}
        style={{ "--ring-progress": `${ringPercent}%` } as React.CSSProperties}
        aria-label={`${labelKey}: ${remaining === null ? t("quotaUnavailable") : t("percentLeft", { count: remaining.toFixed(0) })}`}
      >
        <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full text-center">
          {loading && !usage ? (
            <span className="text-xs app-text-muted">{t("loading")}</span>
          ) : remaining === null ? (
            <>
              <span className="text-xl font-bold app-text-secondary">--</span>
              <span className="mt-0.5 max-w-[84px] text-[11px] leading-tight app-text-muted">
                {t("quotaUnavailable")}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold app-text-primary">
                {remaining.toFixed(0)}%
              </span>
              <span className="text-[11px] app-text-muted">{t("remainingPercent")}</span>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold app-text-primary">{labelKey}</div>
        <p className="mt-1 text-xs text-app-secondary">
          {window && window.usedPercent !== null
            ? `${t("usedPercent")} ${formatPercent(window.usedPercent)}`
            : t("noRateLimitData")}
          {resetText && ` · ${resetText}`}
        </p>
        {exactReset && (
          <p className="mt-2 text-xs app-text-muted">{t("resetsAtExact", { date: exactReset })}</p>
        )}
      </div>
    </div>
  );
}
