import { NAV_ITEMS, getNavItem, type PageId } from "../../app/navigation";
import { useLanguage } from "../../lib/i18n";
import type { AccountWithUsage } from "../../types";
import { Icon } from "./Icon";

interface SidebarProps {
  collapsed: boolean;
  activePage: PageId;
  activeAccount?: AccountWithUsage;
  masked?: boolean;
  onSelectPage: (pageId: PageId) => void;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  collapsed,
  activePage,
  activeAccount,
  masked = false,
  onSelectPage,
  onToggleCollapsed,
}: SidebarProps) {
  const { t } = useLanguage();
  const currentPage = getNavItem(activePage);
  const accountLabel = masked
    ? t("accountHidden")
    : activeAccount?.name || t("noAccountsConfigured");

  return (
    <aside
      className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`}
      aria-label={t("navCurrentAccount")}
    >
      <div className="app-sidebar-brand">
        <span className="app-brand-mark" aria-hidden="true">
          C
        </span>
        <div className="app-brand-text min-w-0 flex-1">
          <div className="truncate text-sm font-semibold app-text-primary">Codex Switcher</div>
          <div className="hidden text-[11px] app-text-muted sm:block">
            {t("navCurrentAccountDescription")}
          </div>
        </div>
        <button
          type="button"
          className="app-icon-button hidden h-8 w-8 lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
        >
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={16} />
        </button>
      </div>

      <nav className="app-sidebar-nav" aria-label={t("navCurrentAccount")}>
        <div className="app-sidebar-caption app-nav-label">Codex Switcher</div>
        {NAV_ITEMS.map((item) => {
          const selected = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              className="app-nav-item"
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
              {currentPage.labelKey === "navCurrentAccount" ? t("statusActive") : t("activeAccountSummary")}
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}