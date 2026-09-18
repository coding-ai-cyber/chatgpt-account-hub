import { NAV_ITEMS, type PageId } from "../../app/navigation";
import type { SidebarMode } from "../../app/sidebarState";
import { useLanguage } from "../../lib/i18n";
import type { AccountWithUsage } from "../../types";
import type { Ref } from "react";
import { Icon } from "./Icon";

export const SIDEBAR_NAVIGATION_ID = "app-sidebar-navigation";

interface SidebarProps {
  elementRef: Ref<HTMLElement>;
  mode: SidebarMode;
  hiddenFromAssistiveTechnology: boolean;
  activePage: PageId;
  activeAccount?: AccountWithUsage;
  masked?: boolean;
  onSelectPage: (pageId: PageId) => void;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  elementRef,
  mode,
  hiddenFromAssistiveTechnology,
  activePage,
  activeAccount,
  masked = false,
  onSelectPage,
  onToggleCollapsed,
}: SidebarProps) {
  const { t } = useLanguage();
  const compact = mode === "compact";
  const accountLabel = masked
    ? t("accountHidden")
    : activeAccount?.name || t("noAccountsConfigured");

  return (
    <aside
      ref={elementRef}
      id={SIDEBAR_NAVIGATION_ID}
      className={`app-sidebar ${compact ? "is-compact" : ""}`}
      data-mode={mode}
      aria-hidden={hiddenFromAssistiveTechnology || undefined}
      aria-label={t("navCurrentAccount")}
    >
      <div className="app-sidebar-brand">
        <span className="app-brand-mark" aria-hidden="true">
          C
        </span>
        <div className="app-brand-text min-w-0 flex-1">
          <div className="truncate text-sm font-semibold app-text-primary">{t("productName")}</div>
          <div className="hidden text-[11px] app-text-muted sm:block">
            {t("navCurrentAccountDescription")}
          </div>
        </div>
        <button
          type="button"
          className="app-icon-button hidden h-8 w-8 lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={compact ? t("expandSidebar") : t("collapseSidebar")}
          title={compact ? t("expandSidebar") : t("collapseSidebar")}
        >
          <Icon name={compact ? "chevron-right" : "chevron-left"} size={16} />
        </button>
      </div>

      <nav className="app-sidebar-nav" aria-label={t("navCurrentAccount")}>
        {NAV_ITEMS.map((item) => {
          const selected = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              className="app-nav-item"
              aria-label={t(item.labelKey)}
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelectPage(item.id)}
              title={`${t(item.labelKey)}: ${t(item.descriptionKey)}`}
            >
              <Icon name={item.icon} size={18} className="shrink-0" />
              <span className="app-nav-label min-w-0 flex-1 truncate">
                {t(item.labelKey)}
              </span>
              {selected && (
                <Icon
                  name="chevron-right"
                  size={14}
                  className="app-nav-label shrink-0 app-text-muted"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="app-sidebar-footer">
        <button
          type="button"
          className="app-account-summary w-full text-left"
          onClick={() => onSelectPage("current-account")}
          title={t("activeAccountSummary")}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md app-accent-bg">
            <Icon name="account" size={16} />
          </span>
          <span className="app-account-summary-text">
            <span className="block truncate text-xs font-semibold app-text-primary">
              {accountLabel}
            </span>
            <span className="block truncate text-[11px] app-text-muted">
              {t("statusActive")}
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}
