import type { CodexProcessInfo } from "../../types";
import { useLanguage } from "../../lib/i18n";
import { useDismissibleDetails } from "../../hooks/useDismissibleDetails";
import { Icon, type IconName } from "./Icon";

export interface ToolbarAction {
  label: string;
  icon: IconName;
  onSelect: () => void;
  disabled?: boolean;
}

interface TopToolbarProps {
  title: string;
  description: string;
  processInfo: CodexProcessInfo | null;
  allMasked: boolean;
  refreshing: boolean;
  warmingAll: boolean;
  accountsCount: number;
  onToggleMaskAll: () => void;
  onRefresh: () => void;
  onWarmupAll: () => void;
  onAddAccount: () => void;
  onCloseCodex?: () => void;
  closingCodex?: boolean;
  actions: ToolbarAction[];
  onOpenNavigation?: () => void;
}

export function TopToolbar({
  title,
  description,
  processInfo,
  allMasked,
  refreshing,
  warmingAll,
  accountsCount,
  onToggleMaskAll,
  onRefresh,
  onWarmupAll,
  onAddAccount,
  onCloseCodex,
  closingCodex = false,
  actions,
  onOpenNavigation,
}: TopToolbarProps) {
  const { t } = useLanguage();
  const hasRunningProcesses = Boolean(processInfo && processInfo.count > 0);
  const moreMenu = useDismissibleDetails();

  return (
    <header className="app-toolbar app-toolbar-bg">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenNavigation && (
          <button
            type="button"
            className="app-icon-button lg:hidden"
            onClick={onOpenNavigation}
            aria-label={t("openNavigation")}
            title={t("openNavigation")}
          >
            <Icon name="menu" size={18} />
          </button>
        )}
        <div className="app-toolbar-title min-w-0">
          <h1 className="truncate text-base font-semibold app-text-primary">{title}</h1>
          <p className="app-toolbar-description truncate text-xs app-text-muted">{description}</p>
        </div>
      </div>

      <div className="app-toolbar-actions">
        <span
          className={`app-toolbar-status app-chip ${hasRunningProcesses ? "app-chip-warning" : "app-chip-success"}`}
          title={
            hasRunningProcesses
              ? t("codexProcessesRunning", { count: processInfo?.count ?? 0 })
              : t("codexProcessesRunning", { count: 0 })
          }
        >
          <span className="app-qr-status-dot" style={{ background: hasRunningProcesses ? "var(--warning)" : "var(--success)" }} />
          <span className="app-toolbar-status-label">
            {hasRunningProcesses
              ? t("codexProcessesRunning", { count: processInfo?.count ?? 0 })
              : t("codexProcessesRunning", { count: 0 })}
          </span>
        </span>

        {hasRunningProcesses && onCloseCodex && (
          <button
            type="button"
            className="app-btn app-btn-soft-danger px-2.5 py-1.5 text-xs"
            onClick={onCloseCodex}
            disabled={closingCodex}
            aria-label={t("closeCodex")}
            title={t("closeRunningCodexProcesses")}
          >
            <Icon name="close" size={14} />
            <span className="app-toolbar-status-label">{t("closeCodex")}</span>
          </button>
        )}

        <button
          type="button"
          data-toolbar-action="mask"
          className="app-icon-button"
          onClick={onToggleMaskAll}
          aria-label={allMasked ? t("showAllAccountNamesAndEmails") : t("hideAllAccountNamesAndEmails")}
          title={allMasked ? t("showAllAccountNamesAndEmails") : t("hideAllAccountNamesAndEmails")}
        >
          <Icon name={allMasked ? "eye-off" : "eye"} size={18} />
        </button>
        <button
          type="button"
          data-toolbar-action="refresh"
          className="app-icon-button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={refreshing ? t("refreshingAllUsage") : t("refreshAllUsage")}
          title={refreshing ? t("refreshingAllUsage") : t("refreshAllUsage")}
        >
          <Icon name="refresh" size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          data-toolbar-action="warmup"
          className="app-icon-button app-btn-soft-warning"
          onClick={onWarmupAll}
          disabled={warmingAll || accountsCount === 0}
          aria-label={warmingAll ? t("warmingUpAllAccounts") : t("warmUpAllAccounts")}
          title={warmingAll ? t("warmingUpAllAccounts") : t("warmUpAllAccounts")}
        >
          <Icon name="lightning" size={18} className={warmingAll ? "animate-pulse" : ""} />
        </button>
        <button
          type="button"
          data-toolbar-action="add"
          className="app-icon-button app-btn-primary"
          onClick={onAddAccount}
          aria-label={t("addAccount")}
          title={t("addAccount")}
        >
          <Icon name="plus" size={18} />
        </button>

        {actions.length > 0 && (
          <details ref={moreMenu.detailsRef} className="relative" onToggle={(event) => {
            if (event.currentTarget.open) {
              document.dispatchEvent(new CustomEvent("app-more-menu-opened"));
            }
          }}>
            <summary role="button" className="app-icon-button list-none cursor-pointer" aria-label={t("actionsMenu")} title={t("actionsMenu")}>
              <Icon name="more" size={18} />
            </summary>
            <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden app-surface-elevated p-1.5">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="app-menu-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm"
                  disabled={action.disabled}
                  onClick={() => moreMenu.select(action.onSelect)}
                >
                  <Icon name={action.icon} size={16} className="shrink-0 app-text-muted" />
                  <span className="min-w-0 flex-1 truncate">{action.label}</span>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    </header>
  );
}
