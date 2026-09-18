import type { AccountWithUsage } from "../types";
import { useLanguage } from "../lib/i18n";
import { AccountUsageStats } from "../components/AccountUsageStats";
import { QuotaRing } from "../components/dashboard/QuotaRing";
import { Icon } from "../components/layout/Icon";
import { getAccountIdentity } from "../lib/appState";

interface UsageStatsPageProps {
  accounts: AccountWithUsage[];
  selectedAccountId: string | null;
  onSelectedAccountChange: (accountId: string) => void;
  masked: Set<string>;
}

export function UsageStatsPage({
  accounts,
  selectedAccountId,
  onSelectedAccountChange,
  masked,
}: UsageStatsPageProps) {
  const { t } = useLanguage();
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedIdentity = selectedAccount
    ? getAccountIdentity(selectedAccount, masked.has(selectedAccount.id), t("accountHidden"))
    : null;

  if (accounts.length === 0) {
    return (
      <div className="app-page">
        <div className="app-empty-state">
          <div>
            <Icon name="chart" size={30} className="mx-auto app-text-muted" />
            <h2 className="mt-3 text-base font-semibold app-text-primary">{t("noAccountsConfigured")}</h2>
            <p className="mt-1 text-sm app-text-secondary">{t("addFirstAccount")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page space-y-4">
      <section className="app-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl app-accent-bg">
            <Icon name="chart" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold app-text-primary">{t("statsViewerTitle")}</h2>
            <p className="mt-0.5 text-xs app-text-secondary">{t("statsViewerDescription")}</p>
          </div>
        </div>
        <label htmlFor="stats-account" className="sr-only">{t("statsAccountRequired")}</label>
        <select
          id="stats-account"
          className="app-select mt-3"
          value={selectedAccount?.id ?? ""}
          onChange={(event) => {
            const next = event.target.value;
            if (next) onSelectedAccountChange(next);
          }}
        >
          {!selectedAccount && <option value="">{t("statsAccountRequired")}</option>}
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {getAccountIdentity(account, masked.has(account.id), t("accountHidden")).name}
              {account.is_active ? ` · ${t("active")}` : ""}
            </option>
          ))}
        </select>
      </section>

      {!selectedAccount ? (
        <div className="app-empty-state min-h-32">
          <div>
            <Icon name="info" size={28} className="mx-auto app-text-muted" />
            <p className="mt-2 text-sm app-text-secondary">{t("statsAccountRequired")}</p>
          </div>
        </div>
      ) : (
        <>
          <section className="app-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold app-text-primary">
                  {t("viewingStatsFor", { name: selectedIdentity?.name ?? "" })}
                </h3>
                <p className="mt-0.5 text-xs app-text-muted">
                  {selectedIdentity?.email || selectedAccount.plan_type || selectedAccount.auth_mode}
                </p>
              </div>
              <span className={`app-chip ${selectedAccount.is_active ? "app-chip-success" : ""}`}>
                {selectedAccount.is_active && <Icon name="check" size={14} />}
                {selectedAccount.is_active ? t("statusActive") : t("statusInactive")}
              </span>
            </div>
            <div className="mt-4">
              <QuotaRing usage={selectedAccount.usage} loading={selectedAccount.usageLoading} />
            </div>
          </section>

          <section className="app-surface p-4">
            <AccountUsageStats
              accountId={selectedAccount.id}
              enabled={selectedAccount.auth_mode === "chat_g_p_t"}
              open
              usage={selectedAccount.usage}
              usageLoading={selectedAccount.usageLoading}
            />
          </section>
        </>
      )}
    </div>
  );
}
