import type { AccountWithUsage } from "../../types";
import {
  getQuotaWindows,
  type DashboardQuotaWindow,
} from "../../lib/accountDashboard";
import { formatExactResetTime, formatResetAt } from "../../lib/format";
import { useLanguage } from "../../lib/i18n";
import { languageLocale } from "../../lib/language";
import { Icon } from "../layout/Icon";
import { QuotaRing } from "./QuotaRing";

export interface CurrentAccountHeroProps {
  account: AccountWithUsage;
  masked: boolean;
  onOpenInBrowser: () => void;
  onRefresh: () => void;
  onWarmup: () => void;
  onToggleMask: () => void;
  onToggleAutoWarmup: () => void;
  onDelete: () => void;
}

function formatAccountDate(value: string | null, locale: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function QuotaLimitRow({
  kind,
  window,
}: {
  kind: "session" | "weekly";
  window: DashboardQuotaWindow | null;
}) {
  const { language, t } = useLanguage();
  const label = kind === "weekly" ? t("sevenDayQuota") : t("fiveHourQuota");
  if (!window) {
    return (
      <div className="quota-limit-row">
        <div className="quota-limit-label">
          <span>{label}</span>
          <span>{t("quotaUnavailable")}</span>
        </div>
        <div className="app-progress-track" />
      </div>
    );
  }

  const relative = formatResetAt(window.resetsAt);
  const exact = formatExactResetTime(window.resetsAt, language, "full");
  const tone =
    window.remainingPercent <= 10
      ? "app-progress-bar-danger"
      : window.remainingPercent <= 30
        ? "app-progress-bar-warning"
        : "";

  return (
    <div className="quota-limit-row">
      <div className="quota-limit-label">
        <span>{label}</span>
        <span>
          {t("percentLeft", { count: Math.round(window.remainingPercent) })}
          {relative ? ` · ${t("resetsIn", { reset: relative })}` : ""}
        </span>
      </div>
      <div className="app-progress-track">
        <div
          className={`app-progress-bar ${tone}`}
          style={{ width: `${window.remainingPercent}%` }}
        />
      </div>
      {exact && (
        <div className="quota-limit-reset">
          {t("resetsAtExact", { date: exact })}
        </div>
      )}
    </div>
  );
}

export function CurrentAccountHero(props: CurrentAccountHeroProps) {
  const { account, masked } = props;
  const { language, t } = useLanguage();
  const windows = getQuotaWindows(account.usage);
  const locale = languageLocale(language);
  const plan = account.plan_type
    ? account.plan_type.charAt(0).toUpperCase() + account.plan_type.slice(1)
    : account.auth_mode === "api_key"
      ? t("apiKey")
      : t("unknown");
  const created = formatAccountDate(account.created_at, locale);
  const subscription = formatAccountDate(account.subscription_expires_at, locale);

  return (
    <section className="current-account-hero app-surface overflow-hidden">
      <div className="current-account-hero-header">
        <span className="current-account-avatar">
          <Icon name="account" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="long-text text-lg font-semibold app-text-primary">
              {masked ? t("accountHidden") : account.name}
            </h2>
            <span className="app-chip app-chip-success">
              <span className="app-qr-status-dot" />
              {t("statusActive")}
            </span>
            <span className="app-chip">{plan}</span>
          </div>
          <p className="long-text mt-1 text-sm app-text-secondary">
            {masked ? "••••••••" : account.email || t("noAccountsConfigured")}
          </p>
          <p className="mt-1.5 text-xs app-text-secondary">
            {t("activeSince", { date: created })}
            {account.subscription_expires_at
              ? ` · ${t("subscriptionStatus")} ${subscription}`
              : ""}
          </p>
        </div>
        <div className="current-account-actions">
          <button
            type="button"
            className="app-btn px-3 py-2 text-sm"
            onClick={props.onOpenInBrowser}
          >
            <Icon name="external" size={16} />
            {t("openInBrowserAction")}
          </button>
          <button
            type="button"
            className="app-btn px-3 py-2 text-sm"
            onClick={props.onRefresh}
          >
            <Icon name="refresh" size={16} />
            {t("refreshAccount")}
          </button>
          <button
            type="button"
            className="app-btn app-btn-soft-warning px-3 py-2 text-sm"
            onClick={props.onWarmup}
          >
            <Icon name="lightning" size={16} />
            {t("warmup")}
          </button>
          <details className="relative">
            <summary
              className="app-icon-button list-none cursor-pointer"
              role="button"
              aria-label={t("moreAccountActions")}
              title={t("moreAccountActions")}
            >
              <Icon name="more" size={18} />
            </summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-56 app-surface-elevated p-1.5">
              <button
                type="button"
                className="app-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                onClick={props.onToggleMask}
              >
                <Icon name={masked ? "eye-off" : "eye"} size={16} />
                {masked ? t("showInfo") : t("hideInfo")}
              </button>
              <button
                type="button"
                className="app-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                onClick={props.onToggleAutoWarmup}
              >
                <Icon name="clock" size={16} />
                {t("autoWarmupLabel")}
              </button>
              <button
                type="button"
                className="app-menu-item app-text-danger flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                aria-label={t("removeAccount")}
                onClick={props.onDelete}
              >
                <Icon name="delete" size={16} />
                {t("removeAccount")}
              </button>
            </div>
          </details>
        </div>
      </div>
      <div className="current-account-hero-body">
        <QuotaRing usage={account.usage} loading={account.usageLoading} />
        <div className="quota-limits">
          <QuotaLimitRow kind="session" window={windows.session} />
          <QuotaLimitRow kind="weekly" window={windows.weekly} />
        </div>
      </div>
    </section>
  );
}
