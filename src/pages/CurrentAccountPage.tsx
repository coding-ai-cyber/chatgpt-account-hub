import type { AccountWithUsage } from "../types";
import { useLanguage } from "../lib/i18n";
import { useAccountUsageStats } from "../hooks/useAccountUsageStats";
import { CurrentAccountDashboard } from "../components/dashboard/CurrentAccountDashboard";
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
  warmingUpId: string | null;
  warmingAll: boolean;
  autoWarmupRunning: (accountId: string) => boolean;
  autoWarmupEnabled: (accountId: string) => boolean;
  autoWarmupManagedByAll: boolean;
  autoWarmupLabel: (accountId: string) => string;
  deleteConfirmationId: string | null;
  onDelete: (accountId: string, confirmed: boolean) => void;
  onRename: (accountId: string, name: string) => Promise<void>;
  onToggleMask: (accountId: string) => void;
  onToggleAutoWarmup: (accountId: string) => void;
  onViewFullStats: () => void;
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
  warmingUpId,
  warmingAll,
  autoWarmupRunning,
  autoWarmupEnabled,
  autoWarmupManagedByAll,
  autoWarmupLabel,
  deleteConfirmationId,
  onDelete,
  onRename,
  onToggleMask,
  onToggleAutoWarmup,
  onViewFullStats,
}: CurrentAccountPageProps) {
  const { t } = useLanguage();
  const account = activeAccount;
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } =
    useAccountUsageStats(account?.id, account?.auth_mode === "chat_g_p_t");
  const isMasked = account ? masked.has(account.id) : false;

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
    <CurrentAccountDashboard
      account={account}
      masked={isMasked}
      stats={stats}
      statsLoading={statsLoading}
      statsError={statsError}
      onOpenInBrowser={() => onOpenInBrowser(account.id)}
      onRefresh={() => {
        void onRefresh(account.id);
      }}
      onWarmup={() => onWarmup(account.id, account.name)}
      warmingUp={warmingAll || warmingUpId === account.id || autoWarmupRunning(account.id)}
      onRename={(name) => onRename(account.id, name)}
      onToggleMask={() => onToggleMask(account.id)}
      onToggleAutoWarmup={() => onToggleAutoWarmup(account.id)}
      autoWarmupEnabled={autoWarmupEnabled(account.id)}
      autoWarmupManagedByAll={autoWarmupManagedByAll}
      autoWarmupLabel={autoWarmupLabel(account.id)}
      deleteConfirmationPending={deleteConfirmationId === account.id}
      onDelete={(confirmed) => onDelete(account.id, confirmed)}
      onRefreshStats={() => {
        void refreshStats();
      }}
      onViewFullStats={onViewFullStats}
    />
  );
}
