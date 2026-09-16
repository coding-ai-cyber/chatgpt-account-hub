import { useMemo, useState } from "react";
import type { AccountWithUsage } from "../types";
import { useLanguage, type Translate, type TranslationKey } from "../lib/i18n";
import { languageLocale } from "../lib/language";
import { AccountCard } from "../components/AccountCard";
import { UsageBar } from "../components/UsageBar";
import { Icon, type IconName } from "../components/layout/Icon";

export type OtherAccountsSort =
  | "deadline_asc"
  | "deadline_desc"
  | "remaining_desc"
  | "remaining_asc"
  | "subscription_asc"
  | "subscription_desc";

export type AccountViewMode = "grid" | "list";

interface OtherAccountsPageProps {
  accounts: AccountWithUsage[];
  visibleOtherAccounts: AccountWithUsage[];
  otherAccounts: AccountWithUsage[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchEnabled: boolean;
  sort: OtherAccountsSort;
  onSortChange: (value: OtherAccountsSort) => void;
  view: AccountViewMode;
  onViewChange: (value: AccountViewMode) => void;
  masked: Set<string>;
  switchingId: string | null;
  processRunning: boolean;
  warmingUpId: string | null;
  warmingAll: boolean;
  autoWarmupEnabled: (accountId: string) => boolean;
  autoWarmupManagedByAll: boolean;
  autoWarmupLabel: (accountId: string) => string;
  autoWarmupRunning: (accountId: string) => boolean;
  onSwitch: (accountId: string) => void;
  onOpenInBrowser: (accountId: string) => void;
  onRefresh: (accountId: string) => Promise<unknown>;
  onWarmup: (accountId: string, name: string) => Promise<void>;
  onRename: (accountId: string, name: string) => Promise<void>;
  onRemove: (accountId: string) => void;
  onToggleMask: (accountId: string) => void;
  onToggleAutoWarmup: (accountId: string) => void;
  onViewStats: (accountId: string) => void;
}

type SortLabelKey =
  | "resetEarliestToLatest"
  | "resetLatestToEarliest"
  | "remainingHighestToLowest"
  | "remainingLowestToHighest"
  | "expiryEarliestToLatest"
  | "expiryLatestToEarliest";

const SORT_OPTIONS: { value: OtherAccountsSort; labelKey: SortLabelKey }[] = [
  { value: "deadline_asc", labelKey: "resetEarliestToLatest" },
  { value: "deadline_desc", labelKey: "resetLatestToEarliest" },
  { value: "remaining_desc", labelKey: "remainingHighestToLowest" },
  { value: "remaining_asc", labelKey: "remainingLowestToHighest" },
  { value: "subscription_asc", labelKey: "expiryEarliestToLatest" },
  { value: "subscription_desc", labelKey: "expiryLatestToEarliest" },
];

function PlanBadge({ account }: { account: AccountWithUsage }) {
  const { t } = useLanguage();
  const plan = account.plan_type
    ? account.plan_type.charAt(0).toUpperCase() + account.plan_type.slice(1)
    : account.auth_mode === "api_key"
      ? t("apiKey")
      : t("unknown");
  return <span className="app-chip">{plan}</span>;
}

function subscriptionLabel(account: AccountWithUsage, locale: string, t: Translate): string {
  if (!account.subscription_expires_at) return t("expiryUnavailable");
  const date = new Date(account.subscription_expires_at);
  if (Number.isNaN(date.getTime())) return t("expiryUnavailable");
  const formatted = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date);
  return date.getTime() <= Date.now() ? t("expiredOn", { date: formatted }) : t("untilDate", { date: formatted });
}

export function OtherAccountsPage({
  accounts,
  visibleOtherAccounts,
  otherAccounts,
  searchQuery,
  onSearchChange,
  searchEnabled,
  sort,
  onSortChange,
  view,
  onViewChange,
  masked,
  switchingId,
  processRunning,
  warmingUpId,
  warmingAll,
  autoWarmupEnabled,
  autoWarmupManagedByAll,
  autoWarmupLabel,
  autoWarmupRunning,
  onSwitch,
  onOpenInBrowser,
  onRefresh,
  onWarmup,
  onRename,
  onRemove,
  onToggleMask,
  onToggleAutoWarmup,
  onViewStats,
}: OtherAccountsPageProps) {
  const { language, t } = useLanguage();
  const locale = languageLocale(language);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const selected = accounts.find((account) => account.id === selectedId);

  const actionsFor = (accountId: string): { labelKey: TranslationKey; icon: IconName; onClick: () => void }[] => {
    const account = accounts.find((item) => item.id === accountId);
    return [
      { labelKey: "openInBrowserAction", icon: "external", onClick: () => onOpenInBrowser(accountId) },
      { labelKey: "refreshAccount", icon: "refresh", onClick: () => void onRefresh(accountId) },
      { labelKey: "warmingUpAccount", icon: "lightning", onClick: account ? () => onWarmup(accountId, account.name) : () => {} },
      { labelKey: "viewFullStats", icon: "chart", onClick: () => { setSelectedId(null); onViewStats(accountId); } },
    ];
  };

  const selectedActions = useMemo(() => (selected ? actionsFor(selected.id) : []), [selected]);

  if (accounts.length === 0) {
    return (
      <div className="app-page">
        <div className="app-empty-state">
          <div>
            <Icon name="users" size={30} className="mx-auto app-text-muted" />
            <h2 className="mt-3 text-base font-semibold app-text-primary">{t("otherAccountsEmpty")}</h2>
            <p className="mt-1 text-sm app-text-secondary">{t("addFirstAccount")}</p>
          </div>
        </div>
      </div>
    );
  }

  const showSearch = searchEnabled || searchQuery.length > 0;
  const hasResults = visibleOtherAccounts.length > 0;

  return (
    <div className="app-page space-y-4">
      <section className="app-surface p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center app-text-muted">
              <Icon name="search" size={16} />
            </span>
            <input
              type="search"
              className="app-input pl-9"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("accountSearchPlaceholder")}
              aria-label={t("searchAccounts")}
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center px-2 text-app-secondary hover:opacity-70"
                onClick={() => onSearchChange("")}
                aria-label={t("clearSearchFilters")}
                title={t("clearSearchFilters")}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="other-accounts-sort" className="sr-only">{t("sort")}</label>
            <select
              id="other-accounts-sort"
              className="app-select h-10 w-auto"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as OtherAccountsSort)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border-subtle)]">
              <button
                type="button"
                className={`app-icon-button h-9 w-9 !rounded-none ${view === "grid" ? "app-accent-bg" : ""}`}
                onClick={() => onViewChange("grid")}
                aria-label={t("gridView")}
                title={t("gridView")}
              >
                <Icon name="grid" size={16} />
              </button>
              <button
                type="button"
                className={`app-icon-button h-9 w-9 !rounded-none ${view === "list" ? "app-accent-bg" : ""}`}
                onClick={() => onViewChange("list")}
                aria-label={t("listView")}
                title={t("listView")}
              >
                <Icon name="list" size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="app-chip">
            {searchQuery
              ? t("otherAccountsFilteredCount", { visible: visibleOtherAccounts.length, total: otherAccounts.length })
              : t("otherAccountsCount", { count: otherAccounts.length })}
          </span>
          <span className="text-xs app-text-muted">{t("selectedAccounts", { count: visibleOtherAccounts.length })}</span>
        </div>
      </section>

      {showSearch && !hasResults && (
        <div className="app-empty-state min-h-32">
          <div>
            <Icon name="search" size={28} className="mx-auto app-text-muted" />
            <h2 className="mt-3 text-base font-semibold app-text-primary">{t("noMatchingAccounts")}</h2>
            <p className="mt-1 text-sm app-text-secondary">{t("noResultsClearSearch")}</p>
            <button type="button" className="app-btn mt-4 px-4 py-2 text-sm" onClick={() => onSearchChange("")}>
              {t("clearSearchFilters")}
            </button>
          </div>
        </div>
      )}

      {hasResults && (
        <div className={view === "grid" ? "account-grid" : "account-list"}>
          {visibleOtherAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onSwitch={() => onSwitch(account.id)}
              onOpenInBrowser={() => onOpenInBrowser(account.id)}
              onWarmup={() => onWarmup(account.id, account.name)}
              onDelete={() => setPendingDeleteId(account.id)}
              onRefresh={() => onRefresh(account.id)}
              onRename={(name) => onRename(account.id, name)}
              switching={switchingId === account.id}
              switchDisabled={switchingId !== null}
              codexRunning={processRunning}
              warmingUp={warmingAll || warmingUpId === account.id || autoWarmupRunning(account.id)}
              masked={masked.has(account.id)}
              onToggleMask={() => onToggleMask(account.id)}
              autoWarmupEnabled={autoWarmupEnabled(account.id)}
              autoWarmupManagedByAll={autoWarmupManagedByAll}
              autoWarmupLabel={autoWarmupLabel(account.id)}
              onToggleAutoWarmup={() => onToggleAutoWarmup(account.id)}
              onSelect={() => setSelectedId(account.id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <div className="app-overlay" onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <div className="app-surface-elevated flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] p-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold app-text-primary">{selected.name}</h2>
                <p className="mt-0.5 truncate text-sm app-text-secondary">{selected.email || t("noAccountsConfigured")}</p>
              </div>
              <button type="button" className="app-icon-button h-8 w-8" onClick={() => setSelectedId(null)} aria-label={t("closeDetails")} title={t("closeDetails")}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-2">
                <PlanBadge account={selected} />
                <span className="app-chip">{selected.is_active ? t("statusActive") : t("statusInactive")}</span>
                <span className="app-chip">{subscriptionLabel(selected, locale, t)}</span>
              </div>
              <div className="mt-4">
                <UsageBar usage={selected.usage} loading={selected.usageLoading} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {selectedActions.map((action) => (
                  <button
                    key={action.labelKey}
                    type="button"
                    className="app-btn flex items-center justify-center gap-2 px-3 py-2.5 text-sm"
                    onClick={action.onClick}
                  >
                    <Icon name={action.icon} size={16} />
                    {t(action.labelKey)}
                  </button>
                ))}
                <button
                  type="button"
                  className="app-btn app-btn-soft-danger flex items-center justify-center gap-2 px-3 py-2.5 text-sm"
                  onClick={() => setPendingDeleteId(selected.id)}
                >
                  <Icon name="delete" size={16} />
                  {t("removeAccount")}
                </button>
              </div>
              {!selected.is_active && (
                <button
                  type="button"
                  className="app-btn app-btn-primary mt-3 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium"
                  onClick={() => onSwitch(selected.id)}
                >
                  <Icon name="arrow-right" size={16} />
                  {t("switch")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <div className="app-overlay" onClick={(event) => { if (event.target === event.currentTarget) setPendingDeleteId(null); }}>
          <div className="app-surface-elevated w-full max-w-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl app-btn-soft-danger">
                <Icon name="warning" size={20} />
              </span>
              <h2 className="text-base font-semibold app-text-primary">{t("confirmRemoval")}</h2>
            </div>
            <p className="mt-3 text-sm app-text-secondary">{t("removeAccountWarning")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="app-btn px-4 py-2 text-sm" onClick={() => setPendingDeleteId(null)}>
                {t("keepAccount")}
              </button>
              <button
                type="button"
                className="app-btn app-btn-soft-danger px-4 py-2 text-sm font-medium"
                onClick={() => { onRemove(pendingDeleteId); setPendingDeleteId(null); }}
              >
                {t("removeForGood")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}