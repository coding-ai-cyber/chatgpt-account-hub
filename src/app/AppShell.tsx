import { useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "../lib/platform";
import type { AccountWithUsage } from "../types";
import type { PageId } from "./navigation";
import { Sidebar, SIDEBAR_NAVIGATION_ID } from "../components/layout/Sidebar";
import { Icon } from "../components/layout/Icon";
import { useLanguage } from "../lib/i18n";
import { useSidebarMode } from "./sidebarState";

const appWindow = isTauriRuntime() ? getCurrentWindow() : null;
const isMacOs =
  typeof navigator !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

const DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getDrawerFocusableElements(sidebar: HTMLElement): HTMLElement[] {
  return Array.from(sidebar.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
}

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
  const navigationTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const titlebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const restoreDrawerFocusRef = useRef(false);
  const sidebarMode = useSidebarMode(collapsed);
  const usesDrawer = sidebarMode === "drawer";
  const drawerHidden = usesDrawer && !drawerOpen;
  const backgroundHidden = usesDrawer && drawerOpen;

  useEffect(() => {
    if (!usesDrawer) setDrawerOpen(false);
  }, [usesDrawer]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    sidebar.inert = drawerHidden;
    if (titlebarRef.current) titlebarRef.current.inert = backgroundHidden;
    if (mainRef.current) mainRef.current.inert = backgroundHidden;
    if (usesDrawer && drawerOpen) {
      sidebar.querySelector<HTMLElement>(".app-sidebar-nav button")?.focus();
      return;
    }

    if (usesDrawer && restoreDrawerFocusRef.current) {
      restoreDrawerFocusRef.current = false;
      navigationTriggerRef.current?.focus();
    }
  }, [backgroundHidden, drawerHidden, drawerOpen, usesDrawer]);

  useEffect(() => {
    if (!usesDrawer || !drawerOpen) return;
    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreDrawerFocusRef.current = true;
        setDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab" || !sidebarRef.current) return;
      const focusableElements = getDrawerFocusableElements(sidebarRef.current);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) return;

      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === firstElement || !sidebarRef.current.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || !sidebarRef.current.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    window.addEventListener("keydown", handleDrawerKeyDown);
    return () => window.removeEventListener("keydown", handleDrawerKeyDown);
  }, [drawerOpen, usesDrawer]);

  const handleTitlebarDrag = (event: React.MouseEvent) => {
    if (!isTauriRuntime() || !appWindow || event.button !== 0) return;
    void appWindow.startDragging();
  };

  const handleTitlebarDoubleClick = () => {
    if (!isTauriRuntime() || !appWindow) return;
    void appWindow.toggleMaximize();
  };

  const handleNavigate = (pageId: PageId) => {
    if (usesDrawer) restoreDrawerFocusRef.current = true;
    setDrawerOpen(false);
    onNavigate(pageId);
  };

  const syncMaximized = () => {
    if (!appWindow) return;
    void appWindow.isMaximized().then(setIsMaximized).catch(() => {});
  };

  return (
    <div className={`app-shell app-bg ${drawerOpen ? "is-drawer-open" : ""}`}>
      <header
        ref={titlebarRef}
        className="app-titlebar"
        aria-hidden={backgroundHidden || undefined}
      >
        <div className="flex items-center gap-1" style={isMacOs ? { paddingLeft: "4.5rem" } : undefined}>
          {usesDrawer && (
            <button
              ref={navigationTriggerRef}
              type="button"
              data-testid="navigation-trigger"
              className="app-titlebar-action"
              onClick={() => {
                restoreDrawerFocusRef.current = false;
                setDrawerOpen(true);
              }}
              aria-label={t("openNavigation")}
              aria-controls={SIDEBAR_NAVIGATION_ID}
              aria-expanded={drawerOpen}
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
          elementRef={sidebarRef}
          mode={sidebarMode}
          hiddenFromAssistiveTechnology={drawerHidden}
          activePage={activePage}
          activeAccount={activeAccount}
          masked={masked}
          onSelectPage={handleNavigate}
          onToggleCollapsed={onToggleCollapsed}
        />
        {usesDrawer && drawerOpen && (
          <button
            type="button"
            tabIndex={-1}
            className="app-drawer-scrim"
            onClick={() => {
              restoreDrawerFocusRef.current = true;
              setDrawerOpen(false);
            }}
            aria-label={t("closeNavigation")}
          />
        )}
        <main
          ref={mainRef}
          className="app-main"
          aria-hidden={backgroundHidden || undefined}
        >
          {toolbar}
          <div className="app-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
