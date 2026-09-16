import { useEffect, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "../lib/platform";
import type { AccountWithUsage } from "../types";
import type { PageId } from "./navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Icon } from "../components/layout/Icon";
import { useLanguage } from "../lib/i18n";
import { useSidebarMode } from "./sidebarState";

const appWindow = isTauriRuntime() ? getCurrentWindow() : null;
const isMacOs =
  typeof navigator !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

interface AppShellProps {
  activePage: PageId;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate: (pageId: PageId) => void;
  activeAccount?: AccountWithUsage;
  masked?: boolean;
  toolbar: ReactNode;
  children: ReactNode;
}

export function AppShell({
  activePage,
  collapsed,
  onToggleCollapsed,
  onNavigate,
  activeAccount,
  masked = false,
  toolbar,
  children,
}: AppShellProps) {
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const sidebarMode = useSidebarMode(collapsed);
  const usesDrawer = sidebarMode === "drawer";

  useEffect(() => {
    if (!usesDrawer) setDrawerOpen(false);
  }, [usesDrawer]);

  const handleTitlebarDrag = (event: React.MouseEvent) => {
    if (!isTauriRuntime() || !appWindow || event.button !== 0) return;
    void appWindow.startDragging();
  };

  const handleTitlebarDoubleClick = () => {
    if (!isTauriRuntime() || !appWindow) return;
    void appWindow.toggleMaximize();
  };

  const handleNavigate = (pageId: PageId) => {
    setDrawerOpen(false);
    onNavigate(pageId);
  };

  const syncMaximized = () => {
    if (!appWindow) return;
    void appWindow.isMaximized().then(setIsMaximized).catch(() => {});
  };

  return (
    <div className={`app-shell app-bg ${drawerOpen ? "is-drawer-open" : ""}`}>
      <header className="app-titlebar">
        <div className="flex items-center gap-1" style={isMacOs ? { paddingLeft: "4.5rem" } : undefined}>
          {!isMacOs && usesDrawer && (
            <button
              type="button"
              data-testid="navigation-trigger"
              className="app-titlebar-action"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("openNavigation")}
            >
              <Icon name="menu" size={16} />
            </button>
          )}
        </div>
        <div
          className="app-titlebar-drag"
          onMouseDown={handleTitlebarDrag}
          onDoubleClick={handleTitlebarDoubleClick}
        />
        {!isMacOs && (
          <div className="app-titlebar-actions">
            <button
              type="button"
              className="app-titlebar-action"
              onClick={() => void appWindow?.minimize()}
              title={t("minimize")}
              aria-label={t("minimize")}
            >
              <Icon name="minus" size={16} />
            </button>
            <button
              type="button"
              className="app-titlebar-action"
              onClick={() => {
                void appWindow?.toggleMaximize();
                window.setTimeout(syncMaximized, 100);
              }}
              title={isMaximized ? t("restore") : t("maximize")}
              aria-label={isMaximized ? t("restore") : t("maximize")}
            >
              {isMaximized ? <Icon name="restore" size={15} /> : <Icon name="expand" size={15} />}
            </button>
            <button
              type="button"
              className="app-titlebar-action app-titlebar-close"
              onClick={() => void appWindow?.close()}
              title={t("close")}
              aria-label={t("close")}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1">
        <Sidebar
          mode={sidebarMode}
          activePage={activePage}
          activeAccount={activeAccount}
          masked={masked}
          onSelectPage={handleNavigate}
          onToggleCollapsed={onToggleCollapsed}
        />
        {usesDrawer && drawerOpen && (
          <button
            type="button"
            className="app-drawer-scrim"
            onClick={() => setDrawerOpen(false)}
            aria-label={t("closeNavigation")}
          />
        )}
        <main className="app-main">
          {toolbar}
          <div className="app-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
