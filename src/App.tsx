import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccounts } from "./hooks/useAccounts";
import { useDesktopReopen } from "./hooks/useDesktopReopen";
import { useCodexClosePreference } from "./hooks/useCodexClosePreference";
import { SettingsModal } from "./components/SettingsModal";
import { finishForceClose, type DesktopReopenPreference } from "./lib/desktopReopen";
import type { CodexClosePreference } from "./lib/codexClosePreference";
import { useForceCloseCodexProcesses } from "./hooks/useForceCloseCodexProcesses";
import { AddAccountModal, UpdateChecker } from "./components";
import type { AccountWithUsage, CodexProcessInfo, DockDisplayMode, UsageInfo } from "./types";
import {
  exportFullBackupFile,
  importFullBackupFile,
  isTauriRuntime,
  invokeBackend,
  openExternalUrl,
} from "./lib/platform";
import {
  applySkin,
  applyTheme,
  readStoredSkin,
  readStoredTheme,
  SKIN_CHANGED_EVENT,
  SKIN_STORAGE_KEY,
  THEME_CHANGED_EVENT,
  THEME_STORAGE_KEY,
  type SkinId,
  type ThemeMode,
} from "./lib/theme";
import {
  AUTO_WARMUP_ACCOUNTS_STORAGE_KEY,
  AUTO_WARMUP_ALL_CHANGED_EVENT,
  AUTO_WARMUP_LEDGER_STORAGE_KEY,
  TIMED_WARMUP_LEDGER_STORAGE_KEY,
  normalizeTimedWarmupTimes,
  readAutoWarmupAllEnabled,
  readTimedWarmupEnabled,
  readTimedWarmupTimes,
  writeAutoWarmupAllEnabled,
  writeTimedWarmupEnabled,
  writeTimedWarmupTimes,
} from "./lib/autoWarmup";
import {
  getAutoWarmupWindowKey,
  getAutoWarmupWindowKind,
  getDueAutoWarmupWindow,
  type AutoWarmupWindow,
  type AutoWarmupWindowKind,
} from "./lib/autoWarmupPolicy";
import { useLanguage } from "./lib/i18n";
import { AppShell } from "./app/AppShell";
import {
  getNavItem,
  readStoredPageId,
  writeStoredPageId,
  type PageId,
} from "./app/navigation";
import { TopToolbar, type ToolbarAction } from "./components/layout/TopToolbar";
import { CurrentAccountPage } from "./pages/CurrentAccountPage";
import { OtherAccountsPage, type AccountViewMode, type OtherAccountsSort } from "./pages/OtherAccountsPage";
import { UsageStatsPage } from "./pages/UsageStatsPage";
import { HelpPage } from "./pages/HelpPage";
import { SettingsPage } from "./pages/SettingsPage";
import {
  beginAccountWarmup,
  finishAccountWarmup,
  getCodexToolbarMode,
  hasSearchableAccounts,
  normalizeAccountSearchQuery,
  reconcileStatsAccountId,
  shouldConfirmAccountDeletion,
} from "./lib/appState";
import "./App.css";

const AUTO_WARMUP_CHECK_INTERVAL_MS = 30 * 1000;
const AUTO_WARMUP_RETRY_BACKOFF_MS = 60 * 1000;
const LIMIT_FULL_THRESHOLD = 99.5;
const SWITCH_ACCOUNT_BLOCKED_EVENT = "switch-account-blocked";
const CLOSE_BEHAVIOR_REQUESTED_EVENT = "close-behavior-requested";
const CHATGPT_BROWSER_URL = "https://chatgpt.com/";
interface SwitchAccountBlockedPayload {
  accountId?: string;
  error?: string;
}
interface CloseBehaviorRequestedPayload {
  requestId?: number;
}
type AutoWarmupLedger = Record<
  string,
  {
    lastSuccessfulWarmupAt?: number;
    lastAutoWindowKey?: string;
    lastAutoWindowKind?: AutoWarmupWindowKind;
  }
>;

function readStoredStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readStoredAutoWarmupLedger(): AutoWarmupLedger {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTO_WARMUP_LEDGER_STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const entries: Array<[string, AutoWarmupLedger[string]]> = [];
    for (const [accountId, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;

      const entry: AutoWarmupLedger[string] = {};
      if (
        "lastSuccessfulWarmupAt" in value &&
        typeof value.lastSuccessfulWarmupAt === "number"
      ) {
        entry.lastSuccessfulWarmupAt = value.lastSuccessfulWarmupAt;
      }
      if ("lastAutoWindowKey" in value && typeof value.lastAutoWindowKey === "string") {
        entry.lastAutoWindowKey = value.lastAutoWindowKey;
      }
      if (
        "lastAutoWindowKind" in value &&
        (value.lastAutoWindowKind === "session" || value.lastAutoWindowKind === "weekly")
      ) {
        entry.lastAutoWindowKind = value.lastAutoWindowKind;
      }

      if (Object.keys(entry).length > 0) entries.push([accountId, entry]);
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function readStoredTimedWarmupLedger(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TIMED_WARMUP_LEDGER_STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

function isLimitFull(usedPercent: number | null | undefined): boolean {
  return usedPercent !== null && usedPercent !== undefined && usedPercent >= LIMIT_FULL_THRESHOLD;
}

function getPreferredUsedPercent(usage: UsageInfo | undefined): number | null | undefined {
  return usage?.primary_used_percent ?? usage?.secondary_used_percent;
}

function getPreferredResetsAt(usage: UsageInfo | undefined): number | null | undefined {
  return usage?.primary_resets_at ?? usage?.secondary_resets_at;
}

function getTimedWarmupTargets(accounts: AccountWithUsage[]): AccountWithUsage[] {
  return accounts.filter(
    (account) =>
      account.usage &&
      !account.usageLoading &&
      !account.usage.error &&
      !isLimitFull(account.usage.secondary_used_percent)
  );
}

function matchesAccountSearch(
  account: AccountWithUsage,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true;

  return (
    account.name.toLowerCase().includes(normalizedQuery) ||
    account.email?.toLowerCase().includes(normalizedQuery) === true
  );
}

function App() {
  const { t } = useLanguage();
  const {
    accounts,
    loading,
    error,
    loadAccounts,
    refreshUsage,
    refreshSingleUsage,
    warmupAccount,
    warmupAllAccounts,
    switchAccount,
    deleteAccount,
    renameAccount,
    importFromFile,
    exportAccountsSlimText,
    importAccountsSlimText,
    startOAuthLogin,
    completeOAuthLogin,
    cancelOAuthLogin,
    loadMaskedAccountIds,
    saveMaskedAccountIds,
  } = useAccounts();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configModalMode, setConfigModalMode] = useState<"slim_export" | "slim_import">(
    "slim_export"
  );
  const [configPayload, setConfigPayload] = useState("");
  const [configModalError, setConfigModalError] = useState<string | null>(null);
  const [configCopied, setConfigCopied] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [processInfo, setProcessInfo] = useState<CodexProcessInfo | null>(null);
  const [pendingSwitchAccountId, setPendingSwitchAccountId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningCodex, setIsOpeningCodex] = useState(false);
  const [isExportingSlim, setIsExportingSlim] = useState(false);
  const [isImportingSlim, setIsImportingSlim] = useState(false);
  const [isExportingFull, setIsExportingFull] = useState(false);
  const [isImportingFull, setIsImportingFull] = useState(false);
  const [isWarmingAll, setIsWarmingAll] = useState(false);
  const [warmingUpId, setWarmingUpId] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [warmupToast, setWarmupToast] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [autoWarmupAllEnabled, setAutoWarmupAllEnabled] = useState(() => {
    return readAutoWarmupAllEnabled();
  });
  const [autoWarmupAccountIds, setAutoWarmupAccountIds] = useState<Set<string>>(
    () => new Set(readStoredStringArray(AUTO_WARMUP_ACCOUNTS_STORAGE_KEY))
  );
  const [autoWarmupLedger, setAutoWarmupLedger] =
    useState<AutoWarmupLedger>(() => readStoredAutoWarmupLedger());
  const [autoWarmupRunningIds, setAutoWarmupRunningIds] = useState<Set<string>>(
    new Set()
  );
  const [timedWarmupEnabled, setTimedWarmupEnabled] = useState(() =>
    readTimedWarmupEnabled()
  );
  const [timedWarmupTimes, setTimedWarmupTimes] = useState<string[]>(() =>
    readTimedWarmupTimes()
  );
  const [timedWarmupRunning, setTimedWarmupRunning] = useState(false);
  const [maskedAccounts, setMaskedAccounts] = useState<Set<string>>(new Set());
  const [accountSearchQuery, setAccountSearchQuery] = useState("");
  const isAccountSearchEnabled = hasSearchableAccounts(accounts);
  const [otherAccountsSort, setOtherAccountsSort] = useState<OtherAccountsSort>("deadline_asc");
  const [activePage, setActivePage] = useState<PageId>(readStoredPageId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("codex-switcher-sidebar-collapsed") === "1";
  });
  const [accountView, setAccountView] = useState<AccountViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    return window.localStorage.getItem("codex-switcher-account-view") === "list"
      ? "list"
      : "grid";
  });
  const [statsAccountId, setStatsAccountId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem("codex-switcher-stats-account");
    } catch {
      return null;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCompletingForceClose, setIsCompletingForceClose] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceCloseInFlightRef = useRef(false);
  const openBrowserAfterSwitchRef = useRef(false);
  const manualWarmupInFlightRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const stop = await listen("desktop-reopen-settings-requested", () => {
        setActivePage("settings");
      });
      if (disposed) stop();
      else unlisten = stop;
    }).catch((err) => console.error("Failed to listen for settings requests:", err));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredTheme);
  const [skinId, setSkinId] = useState<SkinId>(readStoredSkin);
  const [closeBehaviorPromptOpen, setCloseBehaviorPromptOpen] = useState(false);
  const [closeBehaviorDontAskAgain, setCloseBehaviorDontAskAgain] = useState(false);
  const [isCompletingCloseBehavior, setIsCompletingCloseBehavior] = useState(false);
  const accountsRef = useRef(accounts);
  const autoWarmupAccountIdsRef = useRef(autoWarmupAccountIds);
  const autoWarmupLedgerRef = useRef(autoWarmupLedger);
  const autoWarmupRunningIdsRef = useRef(autoWarmupRunningIds);
  const autoWarmupRetryAfterRef = useRef<Record<string, number>>({});
  const timedWarmupRunningRef = useRef(timedWarmupRunning);
  // Tracks the last calendar date (YYYY-MM-DD) each scheduled time fired on,
  // so each time triggers at most once per day.
  const timedWarmupLastFireRef = useRef<Record<string, string>>(readStoredTimedWarmupLedger());

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    if (!isAccountSearchEnabled && accountSearchQuery) {
      setAccountSearchQuery("");
    }
  }, [accountSearchQuery, isAccountSearchEnabled]);

  useEffect(() => {
    autoWarmupAccountIdsRef.current = autoWarmupAccountIds;
  }, [autoWarmupAccountIds]);

  useEffect(() => {
    autoWarmupRunningIdsRef.current = autoWarmupRunningIds;
  }, [autoWarmupRunningIds]);

  useEffect(() => {
    timedWarmupRunningRef.current = timedWarmupRunning;
  }, [timedWarmupRunning]);

  useEffect(() => {
    try {
      writeTimedWarmupEnabled(timedWarmupEnabled);
    } catch {
      // Ignore storage errors; timed warm-up still works for the current session.
    }
  }, [timedWarmupEnabled]);

  useEffect(() => {
    try {
      writeTimedWarmupTimes(timedWarmupTimes);
    } catch {
      // Ignore storage errors; timed warm-up still works for the current session.
    }
  }, [timedWarmupTimes]);

  useEffect(() => {
    if (loading || error) return;

    const validAccountIds = new Set(accounts.map((account) => account.id));

    setAutoWarmupAccountIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => validAccountIds.has(id)));
      return next.size === prev.size ? prev : next;
    });

    setAutoWarmupLedger((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([accountId]) => validAccountIds.has(accountId))
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });

    for (const accountId of Object.keys(autoWarmupRetryAfterRef.current)) {
      if (!validAccountIds.has(accountId)) {
        delete autoWarmupRetryAfterRef.current[accountId];
      }
    }
  }, [accounts, error, loading]);

  useEffect(() => {
    autoWarmupLedgerRef.current = autoWarmupLedger;
    try {
      window.localStorage.setItem(
        AUTO_WARMUP_LEDGER_STORAGE_KEY,
        JSON.stringify(autoWarmupLedger)
      );
    } catch {
      // Ignore storage errors; auto warm-up still works for the current session.
    }
  }, [autoWarmupLedger]);

  useEffect(() => {
    try {
      writeAutoWarmupAllEnabled(autoWarmupAllEnabled);
    } catch {
      // Ignore storage errors; auto warm-up still works for the current session.
    }

    if (isTauriRuntime()) {
      void import("@tauri-apps/api/event")
        .then(({ emit }) => emit(AUTO_WARMUP_ALL_CHANGED_EVENT, autoWarmupAllEnabled))
        .catch((err) => console.error("Failed to sync tray auto warm-up:", err));
    }
  }, [autoWarmupAllEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        AUTO_WARMUP_ACCOUNTS_STORAGE_KEY,
        JSON.stringify(Array.from(autoWarmupAccountIds))
      );
    } catch {
      // Ignore storage errors; auto warm-up still works for the current session.
    }
  }, [autoWarmupAccountIds]);

  const toggleMask = (accountId: string) => {
    setMaskedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      void saveMaskedAccountIds(Array.from(next));
      return next;
    });
  };

  const allMasked =
    accounts.length > 0 && accounts.every((account) => maskedAccounts.has(account.id));

  const toggleMaskAll = () => {
    setMaskedAccounts((prev) => {
      const shouldMaskAll = !accounts.every((account) => prev.has(account.id));
      const next = shouldMaskAll ? new Set(accounts.map((account) => account.id)) : new Set<string>();
      void saveMaskedAccountIds(Array.from(next));
      return next;
    });
  };

  const checkProcesses = useCallback(async () => {
    try {
      const info = await invokeBackend<CodexProcessInfo>("check_codex_processes");
      setProcessInfo((prev) => {
        if (
          prev &&
          prev.can_switch === info.can_switch &&
          prev.count === info.count &&
          prev.background_count === info.background_count &&
          prev.pids.length === info.pids.length &&
          prev.pids.every((pid, index) => pid === info.pids[index])
        ) {
          return prev;
        }
        return info;
      });
      return info;
    } catch (err) {
      console.error("Failed to check processes:", err);
      return null;
    }
  }, []);

  // Check processes on mount and periodically
  useEffect(() => {
    checkProcesses();
    const interval = setInterval(checkProcesses, 5000);
    return () => clearInterval(interval);
  }, [checkProcesses]);

  // Load masked accounts from storage on mount
  useEffect(() => {
    loadMaskedAccountIds().then((ids) => {
      if (ids.length > 0) {
        setMaskedAccounts(new Set(ids));
      }
    });
  }, [loadMaskedAccountIds]);

  useEffect(() => {
    writeStoredPageId(activePage);
  }, [activePage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "codex-switcher-sidebar-collapsed",
        sidebarCollapsed ? "1" : "0"
      );
    } catch {
      // Sidebar state is best effort.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem("codex-switcher-account-view", accountView);
    } catch {
      // View state is best effort.
    }
  }, [accountView]);

  useEffect(() => {
    const next = reconcileStatsAccountId(accounts, statsAccountId, loading);
    if (next !== statsAccountId) setStatsAccountId(next);
  }, [accounts, loading, statsAccountId]);

  useEffect(() => {
    try {
      if (statsAccountId) {
        window.localStorage.setItem("codex-switcher-stats-account", statsAccountId);
      } else {
        window.localStorage.removeItem("codex-switcher-stats-account");
      }
    } catch {
      // Stats selection is best effort.
    }
  }, [statsAccountId]);

  useEffect(() => {
    if (skinId === "default") applyTheme(themeMode);
    else document.documentElement.classList.remove("dark");
  }, [skinId, themeMode]);

  useEffect(() => {
    applyTheme(themeMode);
    if (skinId !== "default") {
      document.documentElement.classList.remove("dark");
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage errors; theme still works for current session.
    }

    if (isTauriRuntime()) {
      void import("@tauri-apps/api/event")
        .then(({ emit }) => emit(THEME_CHANGED_EVENT, themeMode))
        .catch((err) => console.error("Failed to sync tray theme:", err));
    }
  }, [themeMode, skinId]);

  useEffect(() => {
    applySkin(skinId);
    if (skinId === "default") applyTheme(themeMode);
    else document.documentElement.classList.remove("dark");
    try {
      window.localStorage.setItem(SKIN_STORAGE_KEY, skinId);
    } catch {
      // Ignore storage errors; skin still works for current session.
    }

    if (isTauriRuntime()) {
      void import("@tauri-apps/api/event")
        .then(({ emit }) => emit(SKIN_CHANGED_EVENT, skinId))
        .catch((err) => console.error("Failed to sync tray skin:", err));
    }
  }, [skinId, themeMode]);

  const handleSwitch = async (accountId: string) => {
    try {
      setSwitchingId(accountId);
      const latestProcessInfo = await checkProcesses();
      if (!latestProcessInfo) {
        showWarmupToast(t("couldNotCheckRunningCodexProcesses"), true);
        return;
      }
      if (!latestProcessInfo.can_switch) {
        setPendingSwitchAccountId(accountId);
        setForceCloseConfirmOpen(true);
        return;
      }

      await switchAccount(accountId);
    } catch (err) {
      console.error("Failed to switch account:", err);
      const latestProcessInfo = await checkProcesses();
      if (latestProcessInfo && !latestProcessInfo.can_switch) {
        setPendingSwitchAccountId(accountId);
        setForceCloseConfirmOpen(true);
      } else {
        showWarmupToast(t("switchFailed", { message: formatWarmupError(err) }), true);
      }
    } finally {
      setSwitchingId(null);
    }
  };

  const handleOpenInBrowser = async (accountId: string) => {
    try {
      const activeId = accounts.find((account) => account.is_active)?.id;
      if (activeId === accountId) {
        await openExternalUrl(CHATGPT_BROWSER_URL);
        showWarmupToast(t("openedInBrowser"));
        return;
      }

      setSwitchingId(accountId);
      const latestProcessInfo = await checkProcesses();
      if (!latestProcessInfo) {
        showWarmupToast(t("couldNotCheckRunningCodexProcesses"), true);
        return;
      }
      if (!latestProcessInfo.can_switch) {
        openBrowserAfterSwitchRef.current = true;
        setPendingSwitchAccountId(accountId);
        setForceCloseConfirmOpen(true);
        return;
      }

      await switchAccount(accountId);
      await openExternalUrl(CHATGPT_BROWSER_URL);
      showWarmupToast(t("openedInBrowser"));
    } catch (err) {
      console.error("Failed to switch account and open browser:", err);
      const activeId = accounts.find((account) => account.is_active)?.id;
      if (activeId === accountId) {
        showWarmupToast(t("openedInBrowserFailed", { message: formatWarmupError(err) }), true);
        return;
      }
      const latestProcessInfo = await checkProcesses();
      if (latestProcessInfo && !latestProcessInfo.can_switch) {
        openBrowserAfterSwitchRef.current = true;
        setPendingSwitchAccountId(accountId);
        setForceCloseConfirmOpen(true);
      } else {
        showWarmupToast(t("openedInBrowserFailed", { message: formatWarmupError(err) }), true);
      }
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (accountId: string, confirmed = false) => {
    if (!confirmed) {
      if (deleteConfirmId !== accountId) {
        setDeleteConfirmId(accountId);
        setTimeout(() => setDeleteConfirmId(null), 3000);
      }
      return;
    }

    try {
      await deleteAccount(accountId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete account:", err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    try {
      await refreshUsage(undefined, { refreshMetadata: true });
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const showWarmupToast = useCallback((message: string, isError = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setWarmupToast({ message, isError });
    toastTimerRef.current = setTimeout(() => setWarmupToast(null), isError ? 10000 : 2500);
  }, []);

  const formatWarmupError = useCallback((err: unknown) => {
    if (!err) return t("unknownError");
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "string") return err;
    try {
      return JSON.stringify(err);
    } catch {
      return t("unknownError");
    }
  }, [t]);

  const markSuccessfulWarmup = useCallback(
    (accountId: string, timestamp = Date.now(), window?: AutoWarmupWindow) => {
      delete autoWarmupRetryAfterRef.current[accountId];
      setAutoWarmupLedger((prev) => ({
        ...prev,
        [accountId]: {
          lastSuccessfulWarmupAt: timestamp,
          ...(window
            ? {
                lastAutoWindowKey: getAutoWarmupWindowKey(window),
                lastAutoWindowKind: window.kind,
              }
            : {}),
        },
      }));
    },
    []
  );

  const {
    forceCloseConfirmOpen,
    setForceCloseConfirmOpen,
    isForceClosingCodex: isKillingCodex,
    closeCodexProcesses,
  } = useForceCloseCodexProcesses({
    processCount: processInfo?.count ?? 0,
    checkProcesses,
    showToast: showWarmupToast,
    formatError: formatWarmupError,
    t,
  });
  const isForceClosingCodex = isKillingCodex || isCompletingForceClose;
  const desktopReopen = useDesktopReopen(forceCloseConfirmOpen);
  const codexClose = useCodexClosePreference(forceCloseConfirmOpen);
  const saveDesktopReopenPreference = (value: DesktopReopenPreference) => {
    try {
      desktopReopen.savePreference(value);
    } catch (err) {
      showWarmupToast(t("couldNotSavePreference", { message: formatWarmupError(err) }), true);
    }
  };
  const saveCodexClosePreference = (value: CodexClosePreference) => {
    try {
      codexClose.savePreference(value);
    } catch (err) {
      showWarmupToast(t("couldNotSaveClosePreference", { message: formatWarmupError(err) }), true);
    }
  };


  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let unlistenAutoWarmup: (() => void) | undefined;
    let unlistenCloseBehavior: (() => void) | undefined;

    void (async () => {
      if (!isTauriRuntime()) return;
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<SwitchAccountBlockedPayload>(
        SWITCH_ACCOUNT_BLOCKED_EVENT,
        async (event) => {
          if (forceCloseInFlightRef.current) return;
          const latestProcessInfo = await checkProcesses();
          const accountId = event.payload?.accountId;

          if (accountId && latestProcessInfo && !latestProcessInfo.can_switch) {
            setPendingSwitchAccountId(accountId);
            setForceCloseConfirmOpen(true);
            return;
          }

          if (accountId && latestProcessInfo?.can_switch) {
            try {
              setSwitchingId(accountId);
              await switchAccount(accountId);
              setPendingSwitchAccountId(null);
              showWarmupToast(t("switchedAccountFromTray"));
            } catch (err) {
              console.error("Failed to retry tray account switch:", err);
              showWarmupToast(t("switchFailed", { message: formatWarmupError(err) }), true);
            } finally {
              setSwitchingId(null);
            }
            return;
          }

          showWarmupToast(
            event.payload?.error || t("accountSwitchBlocked"),
            true
          );
        }
      );
      unlistenAutoWarmup = await listen<boolean>(
        AUTO_WARMUP_ALL_CHANGED_EVENT,
        ({ payload }) => {
          if (typeof payload === "boolean") {
            setAutoWarmupAllEnabled(payload);
          }
        }
      );
      unlistenCloseBehavior = await listen<CloseBehaviorRequestedPayload>(
        CLOSE_BEHAVIOR_REQUESTED_EVENT,
        ({ payload }) => {
          const requestId = payload?.requestId;
          if (typeof requestId === "number") {
            void invokeBackend("ack_close_behavior_prompt", { requestId });
          }
          setCloseBehaviorDontAskAgain(false);
          setCloseBehaviorPromptOpen(true);
        }
      );
    })();

    return () => {
      unlisten?.();
      unlistenAutoWarmup?.();
      unlistenCloseBehavior?.();
    };
  }, [checkProcesses, formatWarmupError, setForceCloseConfirmOpen, showWarmupToast, switchAccount, t]);

  const handleCloseBehaviorChoice = useCallback(
    async (mode: DockDisplayMode) => {
      try {
        setIsCompletingCloseBehavior(true);
        await invokeBackend("complete_close_behavior", {
          mode,
          dontAskAgain: closeBehaviorDontAskAgain,
        });
        setCloseBehaviorPromptOpen(false);
      } catch (err) {
        console.error("Failed to complete close behavior:", err);
        showWarmupToast(t("closeFailed", { message: formatWarmupError(err) }), true);
      } finally {
        setIsCompletingCloseBehavior(false);
      }
    },
    [closeBehaviorDontAskAgain, formatWarmupError, showWarmupToast, t]
  );

  const handleForceCloseConfirm = async () => {
    if (forceCloseInFlightRef.current || desktopReopen.checking) return;
    forceCloseInFlightRef.current = true;
    const accountId = pendingSwitchAccountId;
    const shouldReopen = desktopReopen.available && desktopReopen.reopen;
    setIsCompletingForceClose(true);
    try {
      try {
        desktopReopen.rememberSelection();
      } catch (err) {
        showWarmupToast(t("couldNotSavePreference", { message: formatWarmupError(err) }), true);
      }
      try {
        codexClose.rememberSelection();
      } catch (err) {
        showWarmupToast(t("couldNotSaveClosePreference", { message: formatWarmupError(err) }), true);
      }
      const result = await closeCodexProcesses(shouldReopen, codexClose.forceClose);
      if (!result?.processInfo?.can_switch) return;

      await finishForceClose(
        { canSwitch: true, reopenToken: result.reopenToken },
        accountId ? async () => {
          setSwitchingId(accountId);
          await switchAccount(accountId);
          if (openBrowserAfterSwitchRef.current) {
            try {
              await openExternalUrl(CHATGPT_BROWSER_URL);
              showWarmupToast(t("openedInBrowser"));
            } catch (err) {
              console.error("Failed to open browser after force close:", err);
              showWarmupToast(t("openedInBrowserFailed", { message: formatWarmupError(err) }), true);
            }
          } else {
            showWarmupToast(t("switchedAccountAfterClosing", {
              mode: codexClose.forceClose ? t("forceCloseAction") : t("gracefulCloseAction"),
            }));
          }
        } : null,
        async (token) => {
          try {
            await invokeBackend("reopen_closed_codex_desktop", { token });
            showWarmupToast(accountId ? t("accountSwitchedDesktopReopened") : t("codexDesktopReopened"));
          } catch (err) {
            showWarmupToast(
              accountId
                ? t("codexClosedAccountSwitchedReopenFailed", { message: formatWarmupError(err) })
                : t("codexClosedReopenFailed", { message: formatWarmupError(err) }),
              true,
            );
          }
        },
      );
      if (shouldReopen && !result.reopenToken) {
        showWarmupToast(t("noClosedDesktopAppIdentified"), true);
      }
    } catch (err) {
      console.error("Failed to switch account after closing Codex:", err);
      showWarmupToast(t("switchFailedAfterClosing", { message: formatWarmupError(err) }), true);
    } finally {
      setPendingSwitchAccountId(null);
      setSwitchingId(null);
      openBrowserAfterSwitchRef.current = false;
      setIsCompletingForceClose(false);
      forceCloseInFlightRef.current = false;
      void checkProcesses();
    }
  };

  const handleWarmupAccount = async (accountId: string, accountName: string) => {
    if (isWarmingAll || autoWarmupRunningIdsRef.current.has(accountId)) return;
    if (!beginAccountWarmup(manualWarmupInFlightRef.current, accountId)) return;
    try {
      setWarmingUpId(accountId);
      await warmupAccount(accountId);
      markSuccessfulWarmup(accountId);
      showWarmupToast(t("warmupSentFor", { name: accountName }));
    } catch (err) {
      console.error("Failed to warm up account:", err);
      showWarmupToast(
        t("warmupFailedFor", { name: accountName, message: formatWarmupError(err) }),
        true
      );
    } finally {
      finishAccountWarmup(manualWarmupInFlightRef.current, accountId);
      setWarmingUpId(null);
    }
  };

  const handleWarmupAll = async () => {
    try {
      setIsWarmingAll(true);
      const summary = await warmupAllAccounts();
      if (summary.total_accounts === 0) {
        showWarmupToast(t("noAccountsAvailableForWarmup"), true);
        return;
      }

      const warmedAt = Date.now();
      const failedAccountIds = new Set(summary.failed_account_ids);
      accounts.forEach((account) => {
        if (!failedAccountIds.has(account.id)) {
          markSuccessfulWarmup(account.id, warmedAt);
        }
      });

      if (summary.failed_account_ids.length === 0) {
        showWarmupToast(
          t("warmupSentForAll", { count: summary.warmed_accounts })
        );
      } else {
        showWarmupToast(
          t("warmupPartialFailure", {
            warmed: summary.warmed_accounts,
            count: summary.total_accounts,
            failed: summary.failed_account_ids.length,
          }),
          true
        );
      }
    } catch (err) {
      console.error("Failed to warm up all accounts:", err);
      showWarmupToast(t("warmupAllFailed", { message: formatWarmupError(err) }), true);
    } finally {
      setIsWarmingAll(false);
    }
  };

  const toggleAutoWarmupAccount = (accountId: string) => {
    setAutoWarmupAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const getDueAutoWarmupForAccount = useCallback(
    (accountId: string, usage: UsageInfo | undefined) => {
      return getDueAutoWarmupWindow(usage, autoWarmupLedgerRef.current[accountId]);
    },
    []
  );

  const formatWindowDuration = (minutes: number | null | undefined): string => {
    if (!minutes || minutes <= 0) return "";
    if (minutes < 24 * 60) {
      return `${Math.ceil(minutes / 60)}h`;
    }
    return `${Math.ceil(minutes / (24 * 60))}d`;
  };

  const getAutoWarmupLabel = useCallback(
    (
      usage: UsageInfo | undefined,
      isEnabled: boolean,
      isRunning: boolean
    ) => {
      if (isRunning) return t("warming");
      if (!isEnabled) return t("disabled");
      if (!usage || usage.error) return t("enabled");

      const windowKind = getAutoWarmupWindowKind(usage);
      if (windowKind === "session" && isLimitFull(usage.secondary_used_percent)) {
        const weeklyDuration = formatWindowDuration(usage.secondary_window_minutes);
        return weeklyDuration ? t("waiting", { message: weeklyDuration }) : t("waitingReset");
      }
      if (windowKind === "session") {
        return formatWindowDuration(usage.primary_window_minutes) || "5h";
      }
      if (windowKind === "weekly") {
        return formatWindowDuration(usage.secondary_window_minutes) || "7d";
      }

      return t("enabled");
    },
    [t]
  );

  const timedWarmupTargetsReady = useMemo(
    () =>
      accounts.length > 0 &&
      accounts.every((account) => account.usage && !account.usageLoading),
    [accounts]
  );

  const timedWarmupTargetCount = useMemo(
    () => getTimedWarmupTargets(accounts).length,
    [accounts]
  );

  const backOffAutoWarmupRetry = useCallback((accountId: string) => {
    autoWarmupRetryAfterRef.current[accountId] =
      Date.now() + AUTO_WARMUP_RETRY_BACKOFF_MS;
  }, []);

  const runAutoWarmupForAccount = useCallback(
    async (accountId: string, accountName: string) => {
      setAutoWarmupRunningIds((prev) => new Set(prev).add(accountId));

      try {
        let freshUsage: UsageInfo;
        try {
          freshUsage = await refreshSingleUsage(accountId);
        } catch (err) {
          console.error("Auto warm-up usage refresh failed:", err);
          backOffAutoWarmupRetry(accountId);
          return;
        }

        const window = getDueAutoWarmupForAccount(accountId, freshUsage);
        if (!window) return;

        await warmupAccount(accountId);
        markSuccessfulWarmup(accountId, Date.now(), window);
        const modeLabel = window.kind === "session" ? "5h" : t("weekly");
        showWarmupToast(t("autoWarmupSentFor", { mode: modeLabel, name: accountName }));
      } catch (err) {
        console.error("Auto warm-up failed:", err);
        backOffAutoWarmupRetry(accountId);
        showWarmupToast(
          t("autoWarmupFailedFor", { name: accountName, message: formatWarmupError(err) }),
          true
        );
      } finally {
        setAutoWarmupRunningIds((prev) => {
          const next = new Set(prev);
          next.delete(accountId);
          return next;
        });
      }
    },
    [
      backOffAutoWarmupRetry,
      formatWarmupError,
      getDueAutoWarmupForAccount,
      markSuccessfulWarmup,
      refreshSingleUsage,
      showWarmupToast,
      t,
      warmupAccount,
    ]
  );

  useEffect(() => {
    if (!autoWarmupAllEnabled && autoWarmupAccountIds.size === 0) return;

    const checkAutoWarmup = () => {
      for (const account of accountsRef.current) {
        const autoEnabled =
          autoWarmupAllEnabled || autoWarmupAccountIdsRef.current.has(account.id);
        if (!autoEnabled || autoWarmupRunningIdsRef.current.has(account.id)) continue;

        const retryAfter = autoWarmupRetryAfterRef.current[account.id];
        if (retryAfter && Date.now() < retryAfter) continue;

        if (!getDueAutoWarmupForAccount(account.id, account.usage)) continue;

        void runAutoWarmupForAccount(account.id, account.name);
      }
    };

    checkAutoWarmup();
    const interval = window.setInterval(
      checkAutoWarmup,
      AUTO_WARMUP_CHECK_INTERVAL_MS
    );

    return () => window.clearInterval(interval);
  }, [
    autoWarmupAccountIds.size,
    autoWarmupAllEnabled,
    getDueAutoWarmupForAccount,
    runAutoWarmupForAccount,
  ]);

  const runTimedWarmup = useCallback(async () => {
    const targets = getTimedWarmupTargets(accountsRef.current);
    if (targets.length === 0) return;

    setTimedWarmupRunning(true);
    try {
      const warmedAt = Date.now();
      let warmed = 0;
      let failed = 0;
      for (const account of targets) {
        try {
          await warmupAccount(account.id);
          markSuccessfulWarmup(account.id, warmedAt);
          warmed += 1;
        } catch (err) {
          console.error("Timed warm-up failed:", err);
          failed += 1;
        }
      }

      if (failed === 0) {
        showWarmupToast(
          t("timedWarmupSent", { count: warmed })
        );
      } else {
        showWarmupToast(t("timedWarmupPartialFailure", { warmed, failed }), true);
      }
    } finally {
      setTimedWarmupRunning(false);
    }
  }, [markSuccessfulWarmup, showWarmupToast, t, warmupAccount]);

  useEffect(() => {
    if (!timedWarmupEnabled || timedWarmupTimes.length === 0) return;

    const checkTimedWarmup = () => {
      if (timedWarmupRunningRef.current) return;

      const now = new Date();
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      // Only fire during the scheduled minute itself; a missed time (e.g. while
      // asleep) is skipped rather than warmed late at the wrong moment.
      if (!timedWarmupTimes.includes(currentTime)) return;
      if (timedWarmupLastFireRef.current[currentTime] === todayKey) return;
      if (!timedWarmupTargetsReady || timedWarmupTargetCount === 0) return;

      // Mark before running so a slow warm-up can't double-fire on the next tick.
      timedWarmupLastFireRef.current[currentTime] = todayKey;
      try {
        window.localStorage.setItem(
          TIMED_WARMUP_LEDGER_STORAGE_KEY,
          JSON.stringify(timedWarmupLastFireRef.current)
        );
      } catch {
        // Ignore storage errors; timed warm-up still works for the current session.
      }
      void runTimedWarmup();
    };

    checkTimedWarmup();
    const interval = window.setInterval(
      checkTimedWarmup,
      AUTO_WARMUP_CHECK_INTERVAL_MS
    );

    return () => window.clearInterval(interval);
  }, [
    timedWarmupEnabled,
    timedWarmupTimes,
    timedWarmupTargetsReady,
    timedWarmupTargetCount,
    runTimedWarmup,
  ]);

  const handleAddTimedWarmupTime = useCallback((draft: string) => {
    const normalized = normalizeTimedWarmupTimes([draft]);
    if (normalized.length === 0) return;
    setTimedWarmupTimes((prev) =>
      normalizeTimedWarmupTimes([...prev, normalized[0]])
    );
  }, []);

  const handleRemoveTimedWarmupTime = useCallback((time: string) => {
    setTimedWarmupTimes((prev) => prev.filter((entry) => entry !== time));
  }, []);

  const handleExportSlimText = async () => {
    setConfigModalMode("slim_export");
    setConfigModalError(null);
    setConfigPayload("");
    setConfigCopied(false);
    setIsConfigModalOpen(true);

    try {
      setIsExportingSlim(true);
      const payload = await exportAccountsSlimText();
      setConfigPayload(payload);
      showWarmupToast(t("slimTextExported", { count: accounts.length }));
    } catch (err) {
      console.error("Failed to export slim text:", err);
      const message = err instanceof Error ? err.message : String(err);
      setConfigModalError(message);
      showWarmupToast(t("slimExportFailed"), true);
    } finally {
      setIsExportingSlim(false);
    }
  };

  const handleImportSlimText = async () => {
    if (!configPayload.trim()) {
      setConfigModalError(t("pleasePasteSlimTextFirst"));
      return;
    }

    try {
      setIsImportingSlim(true);
      setConfigModalError(null);
      const summary = await importAccountsSlimText(configPayload);
      setMaskedAccounts(new Set());
      setIsConfigModalOpen(false);
      showWarmupToast(
        t("importSummary", {
          imported: summary.imported_count,
          skipped: summary.skipped_count,
          total: summary.total_in_payload,
        })
      );
    } catch (err) {
      console.error("Failed to import slim text:", err);
      const message = err instanceof Error ? err.message : String(err);
      setConfigModalError(message);
      showWarmupToast(t("slimImportFailed"), true);
    } finally {
      setIsImportingSlim(false);
    }
  };

  const handleExportFullFile = async () => {
    try {
      setIsExportingFull(true);
      const exported = await exportFullBackupFile(t);
      if (!exported) return;
      showWarmupToast(t("fullEncryptedFileExported"));
    } catch (err) {
      console.error("Failed to export full encrypted file:", err);
      showWarmupToast(t("fullExportFailed"), true);
    } finally {
      setIsExportingFull(false);
    }
  };

  const handleImportFullFile = async () => {
    try {
      setIsImportingFull(true);
      const summary = await importFullBackupFile(t);
      if (!summary) return;
      const accountList = await loadAccounts();
      await refreshUsage(accountList);
      const maskedIds = await loadMaskedAccountIds();
      setMaskedAccounts(new Set(maskedIds));
      showWarmupToast(
        t("importSummary", {
          imported: summary.imported_count,
          skipped: summary.skipped_count,
          total: summary.total_in_payload,
        })
      );
    } catch (err) {
      console.error("Failed to import full encrypted file:", err);
      showWarmupToast(t("fullImportFailed"), true);
    } finally {
      setIsImportingFull(false);
    }
  };

  const handleOpenCodexApp = async () => {
    try {
      setIsOpeningCodex(true);
      await invokeBackend("open_codex_app");
      showWarmupToast(t("codexAppOpened"));
      setTimeout(() => {
        void checkProcesses();
      }, 1500);
    } catch (err) {
      console.error("Failed to open Codex app:", err);
      showWarmupToast(t("openCodexFailed", { message: formatWarmupError(err) }), true);
    } finally {
      setIsOpeningCodex(false);
    }
  };

  const activeAccount = accounts.find((a) => a.is_active);
  const otherAccounts = accounts.filter((a) => !a.is_active);
  const hasRunningProcesses = processInfo && processInfo.count > 0;
  const pendingSwitchAccount = useMemo(
    () => accounts.find((account) => account.id === pendingSwitchAccountId),
    [accounts, pendingSwitchAccountId]
  );
  const closeConfirmLabel = pendingSwitchAccount
    ? t("closeAndSwitchAccount")
    : t("closeCodex");

  const sortedOtherAccounts = useMemo(() => {
    const getResetDeadline = (resetAt: number | null | undefined) =>
      resetAt ?? Number.POSITIVE_INFINITY;

    const getSubscriptionDeadline = (expiresAt: string | null | undefined) => {
      if (!expiresAt) return null;
      const timestamp = new Date(expiresAt).getTime();
      return Number.isNaN(timestamp) ? null : timestamp;
    };

    const compareOptionalNumber = (
      aValue: number | null,
      bValue: number | null,
      direction: "asc" | "desc"
    ) => {
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    };

    const getRemainingPercent = (usedPercent: number | null | undefined) => {
      if (usedPercent === null || usedPercent === undefined) {
        return Number.NEGATIVE_INFINITY;
      }
      return Math.max(0, 100 - usedPercent);
    };

    return [...otherAccounts].sort((a, b) => {
      if (
        otherAccountsSort === "subscription_asc" ||
        otherAccountsSort === "subscription_desc"
      ) {
        const subscriptionDiff = compareOptionalNumber(
          getSubscriptionDeadline(a.subscription_expires_at),
          getSubscriptionDeadline(b.subscription_expires_at),
          otherAccountsSort === "subscription_asc" ? "asc" : "desc"
        );
        if (subscriptionDiff !== 0) return subscriptionDiff;

        const deadlineDiff =
          getResetDeadline(getPreferredResetsAt(a.usage)) -
          getResetDeadline(getPreferredResetsAt(b.usage));
        if (deadlineDiff !== 0) return deadlineDiff;

        const remainingDiff =
          getRemainingPercent(getPreferredUsedPercent(b.usage)) -
          getRemainingPercent(getPreferredUsedPercent(a.usage));
        if (remainingDiff !== 0) return remainingDiff;

        return a.name.localeCompare(b.name);
      }

      if (otherAccountsSort === "deadline_asc" || otherAccountsSort === "deadline_desc") {
        const deadlineDiff =
          getResetDeadline(getPreferredResetsAt(a.usage)) -
          getResetDeadline(getPreferredResetsAt(b.usage));
        if (deadlineDiff !== 0) {
          return otherAccountsSort === "deadline_asc" ? deadlineDiff : -deadlineDiff;
        }
        const remainingDiff =
          getRemainingPercent(getPreferredUsedPercent(b.usage)) -
          getRemainingPercent(getPreferredUsedPercent(a.usage));
        if (remainingDiff !== 0) return remainingDiff;
        return a.name.localeCompare(b.name);
      }

      const remainingDiff =
        getRemainingPercent(getPreferredUsedPercent(b.usage)) -
        getRemainingPercent(getPreferredUsedPercent(a.usage));
      if (otherAccountsSort === "remaining_desc" && remainingDiff !== 0) {
        return remainingDiff;
      }
      if (otherAccountsSort === "remaining_asc" && remainingDiff !== 0) {
        return -remainingDiff;
      }
      const deadlineDiff =
        getResetDeadline(getPreferredResetsAt(a.usage)) -
        getResetDeadline(getPreferredResetsAt(b.usage));
      if (deadlineDiff !== 0) return deadlineDiff;
      return a.name.localeCompare(b.name);
    });
  }, [otherAccounts, otherAccountsSort]);

  const normalizedAccountSearchQuery = normalizeAccountSearchQuery(accountSearchQuery);
  const visibleOtherAccounts = useMemo(
    () =>
      sortedOtherAccounts.filter((account) =>
        matchesAccountSearch(account, normalizedAccountSearchQuery)
      ),
    [normalizedAccountSearchQuery, sortedOtherAccounts]
  );

  const handleRefreshAccount = async (accountId: string) => {
    try {
      await refreshSingleUsage(accountId, { refreshMetadata: true });
      showWarmupToast(t("usageRefreshedSuccessfully"));
    } catch (err) {
      showWarmupToast(t("refreshFailed", { message: formatWarmupError(err) }), true);
    }
  };

  const handleRename = async (accountId: string, name: string) => {
    try {
      await renameAccount(accountId, name);
      showWarmupToast(t("accountRenamed"));
    } catch (err) {
      showWarmupToast(t("renameFailed", { message: formatWarmupError(err) }), true);
      throw err;
    }
  };

  const handleCheckForUpdates = () => {
    window.dispatchEvent(new CustomEvent("codex-switcher-check-updates"));
  };

  const pageMeta = getNavItem(activePage);
  const handleNavigatePage = (pageId: PageId) => setActivePage(pageId);
  const handleWarmup = handleWarmupAccount;
  const handleToggleMask = toggleMask;
  const handleToggleAutoWarmup = toggleAutoWarmupAccount;
  const handleToggleMaskAll = toggleMaskAll;
  const handleOpenSlimImportModal = () => {
    setConfigModalMode("slim_import");
    setConfigPayload("");
    setConfigModalError(null);
    setIsConfigModalOpen(true);
  };
  const autoWarmupEnabledFor = (accountId: string) =>
    autoWarmupAllEnabled || autoWarmupAccountIds.has(accountId);
  const autoWarmupRunningFor = (accountId: string) =>
    autoWarmupRunningIds.has(accountId);
  const autoWarmupLabelFor = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    return getAutoWarmupLabel(
      account?.usage,
      autoWarmupAllEnabled || autoWarmupAccountIds.has(accountId),
      autoWarmupRunningIds.has(accountId)
    );
  };

  const toolbarActions: ToolbarAction[] = [
    {
      label: t("searchAccounts"),
      icon: "search",
      onSelect: () => handleNavigatePage("other-accounts"),
      disabled: !isAccountSearchEnabled,
    },
    {
      label: t("exportSlimText"),
      icon: "download",
      onSelect: () => void handleExportSlimText(),
      disabled: isExportingSlim,
    },
    {
      label: t("importSlimText"),
      icon: "upload",
      onSelect: handleOpenSlimImportModal,
      disabled: isImportingSlim,
    },
    {
      label: t("exportFullEncryptedFile"),
      icon: "download",
      onSelect: () => void handleExportFullFile(),
      disabled: isExportingFull,
    },
    {
      label: t("importFullEncryptedFile"),
      icon: "upload",
      onSelect: () => void handleImportFullFile(),
      disabled: isImportingFull,
    },
    {
      label: t("timedWarmup"),
      icon: "clock",
      onSelect: () => handleNavigatePage("settings"),
    },
  ];
  const codexToolbarMode = getCodexToolbarMode(processInfo, isTauriRuntime());
  if (codexToolbarMode === "open") {
    toolbarActions.unshift({
      label: isOpeningCodex ? t("opening") : t("openCodexApp"),
      icon: "external",
      onSelect: () => void handleOpenCodexApp(),
      disabled: isOpeningCodex,
    });
  }

  const activePageContent = (() => {
    if (activePage === "other-accounts") {
      return (
        <OtherAccountsPage
          accounts={accounts}
          visibleOtherAccounts={visibleOtherAccounts}
          otherAccounts={otherAccounts}
          searchQuery={accountSearchQuery}
          onSearchChange={setAccountSearchQuery}
          searchEnabled={isAccountSearchEnabled}
          sort={otherAccountsSort}
          onSortChange={setOtherAccountsSort}
          view={accountView}
          onViewChange={setAccountView}
          masked={maskedAccounts}
          switchingId={switchingId}
          processRunning={Boolean(hasRunningProcesses)}
          warmingUpId={warmingUpId}
          warmingAll={isWarmingAll}
          autoWarmupEnabled={autoWarmupEnabledFor}
          autoWarmupManagedByAll={autoWarmupAllEnabled}
          autoWarmupLabel={autoWarmupLabelFor}
          autoWarmupRunning={autoWarmupRunningFor}
          onSwitch={(accountId) => void handleSwitch(accountId)}
          onOpenInBrowser={(accountId) => void handleOpenInBrowser(accountId)}
          onRefresh={(accountId) => handleRefreshAccount(accountId)}
          onWarmup={(accountId, name) => handleWarmup(accountId, name)}
          onRename={(accountId, name) => handleRename(accountId, name)}
          onRemove={(accountId) => void handleDelete(accountId, true)}
          onToggleMask={handleToggleMask}
          onToggleAutoWarmup={(accountId) => void handleToggleAutoWarmup(accountId)}
          onViewStats={(accountId) => {
            setStatsAccountId(accountId);
            handleNavigatePage("usage-stats");
          }}
        />
      );
    }
    if (activePage === "usage-stats") {
      return (
        <UsageStatsPage
          accounts={accounts}
          selectedAccountId={statsAccountId}
          onSelectedAccountChange={setStatsAccountId}
          masked={maskedAccounts}
        />
      );
    }
    if (activePage === "help") {
      return <HelpPage onCheckUpdates={handleCheckForUpdates} />;
    }
    if (activePage === "settings") {
      return (
        <SettingsPage
          skin={skinId}
          themeMode={themeMode}
          onSkinChange={setSkinId}
          onThemeModeChange={setThemeMode}
          closePreference={codexClose.preference}
          onClosePreferenceChange={saveCodexClosePreference}
          reopenPreference={desktopReopen.preference}
          onReopenPreferenceChange={saveDesktopReopenPreference}
          autoWarmupAllEnabled={autoWarmupAllEnabled}
          onAutoWarmupAllEnabledChange={setAutoWarmupAllEnabled}
          timedWarmupEnabled={timedWarmupEnabled}
          onTimedWarmupEnabledChange={setTimedWarmupEnabled}
          timedWarmupTimes={timedWarmupTimes}
          onAddTimedWarmupTime={handleAddTimedWarmupTime}
          onRemoveTimedWarmupTime={handleRemoveTimedWarmupTime}
        />
      );
    }
    return (
      <CurrentAccountPage
        loading={loading}
        error={error}
        accounts={accounts}
        activeAccount={activeAccount}
        masked={maskedAccounts}
        onAddAccount={() => setIsAddModalOpen(true)}
        onImportAccounts={handleOpenSlimImportModal}
        onRetry={() => void loadAccounts()}
        onOpenInBrowser={(accountId) => void handleOpenInBrowser(accountId)}
        onRefresh={(accountId) => handleRefreshAccount(accountId)}
        onWarmup={(accountId, name) => void handleWarmup(accountId, name)}
        warmingUpId={warmingUpId}
        warmingAll={isWarmingAll}
        autoWarmupRunning={autoWarmupRunningFor}
        autoWarmupEnabled={autoWarmupEnabledFor}
        autoWarmupManagedByAll={autoWarmupAllEnabled}
        autoWarmupLabel={autoWarmupLabelFor}
        deleteConfirmationId={deleteConfirmId}
        onDelete={(accountId, confirmed) => void handleDelete(
          accountId,
          confirmed && shouldConfirmAccountDeletion(deleteConfirmId, accountId),
        )}
        onRename={(accountId, name) => handleRename(accountId, name)}
        onToggleMask={handleToggleMask}
        onToggleAutoWarmup={(accountId) => void handleToggleAutoWarmup(accountId)}
        onViewFullStats={() => {
          setStatsAccountId(activeAccount?.id ?? null);
          handleNavigatePage("usage-stats");
        }}
      />
    );
  })();

return (
    <div className="h-full">
      <AppShell
        activePage={activePage}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onNavigate={handleNavigatePage}
        activeAccount={activeAccount}
        masked={allMasked}
        toolbar={
          <TopToolbar
            title={t(pageMeta.labelKey)}
            description={t(pageMeta.descriptionKey)}
            processInfo={processInfo}
            allMasked={allMasked}
            refreshing={isRefreshing}
            warmingAll={isWarmingAll}
            accountsCount={accounts.length}
            onToggleMaskAll={handleToggleMaskAll}
            onRefresh={() => void handleRefresh()}
            onWarmupAll={() => void handleWarmupAll()}
            onAddAccount={() => setIsAddModalOpen(true)}
            onCloseCodex={codexToolbarMode === "close" ? () => {
              setPendingSwitchAccountId(null);
              setForceCloseConfirmOpen(true);
            } : undefined}
            closingCodex={isForceClosingCodex}
            actions={toolbarActions}
          />
        }
      >
        {activePageContent}
      </AppShell>


      {/* Refresh Success Toast */}
      {refreshSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg text-sm flex items-center gap-2">
          <span>✓</span> {t("usageRefreshedSuccessfully")}
        </div>
      )}

      {/* Warm-up Toast */}
      {warmupToast && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            warmupToast.isError
              ? "bg-red-600 text-white"
              : "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
          }`}
        >
          {warmupToast.message}
        </div>
      )}

      {/* Delete Confirmation Toast */}
      {deleteConfirmId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg text-sm">
          {t("clickDeleteAgainToConfirmRemoval")}
        </div>
      )}

      {isSettingsOpen && (
        <SettingsModal
          reopenPreference={desktopReopen.preference}
          onReopenPreferenceChange={saveDesktopReopenPreference}
          closePreference={codexClose.preference}
          onClosePreferenceChange={saveCodexClosePreference}
          skin={skinId}
          onSkinChange={setSkinId}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {forceCloseConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-xl">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("closeRunningCodexQuestion")}
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("closeProcessesBlockingSwitch", {
                  mode: codexClose.forceClose ? t("forceCloseAction") : t("gracefulCloseAction"),
                  count: processInfo?.count ?? 0,
                })}
              </p>
              <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                {codexClose.preference !== "ask" ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("codexCloseSettingSummary", {
                      mode: codexClose.forceClose ? t("forceClosedAction") : t("gracefulCloseAction"),
                    })}
                  </p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <input type="checkbox" checked={codexClose.forceClose} onChange={(event) => codexClose.setForceClose(event.target.checked)} disabled={isForceClosingCodex} className="h-4 w-4 accent-red-600" />
                      {t("forceCloseCodex")}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <input type="checkbox" checked={codexClose.remember} onChange={(event) => codexClose.setRemember(event.target.checked)} disabled={isForceClosingCodex} className="h-4 w-4 accent-orange-600" />
                      {t("rememberSelection")}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {codexClose.forceClose
                        ? t("stopsCodexImmediately")
                        : t("asksCodexQuitNormally")}
                    </p>
                  </>
                )}
              </div>
              {pendingSwitchAccount && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t("afterClosingSwitchTo", { name: pendingSwitchAccount.name })}
                </p>
              )}
              <div className="space-y-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                {desktopReopen.checking ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("checkingDesktopApp")}</p>
                ) : desktopReopen.available && desktopReopen.preference !== "ask" ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {desktopReopen.preference === "always"
                      ? t("codexDesktopReopensAutomatically")
                      : t("codexDesktopStaysClosed")}{" "}
                    {t("changeLaterInSettings")}
                  </p>
                ) : desktopReopen.available ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <input type="checkbox" checked={desktopReopen.reopen} onChange={(event) => desktopReopen.setReopen(event.target.checked)} disabled={isForceClosingCodex} className="h-4 w-4 accent-orange-600" />
                      {t("reopenCodexDesktopAfterClose")}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <input type="checkbox" checked={desktopReopen.remember} onChange={(event) => desktopReopen.setRemember(event.target.checked)} disabled={isForceClosingCodex} className="h-4 w-4 accent-orange-600" />
                      {t("rememberSelection")}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("changeLaterInSettings")} {t("terminalSessionsWillNotReopen")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("codexWillOnlyBeClosed")}</p>
                )}
              </div>
              {codexClose.forceClose && (
                <p className="text-sm text-red-600 dark:text-red-300">{t("unsavedCodexWorkMayBeLost")}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setPendingSwitchAccountId(null);
                  setForceCloseConfirmOpen(false);
                }}
                disabled={isForceClosingCodex}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  void handleForceCloseConfirm();
                }}
                disabled={isForceClosingCodex || desktopReopen.checking}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 ${codexClose.forceClose ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
              >
                {isForceClosingCodex
                  ? (codexClose.forceClose ? t("forceClosing") : t("closing"))
                  : closeConfirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {closeBehaviorPromptOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-xl">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("keepSwitcherInDock")}
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("closedWindowDockOrMenuBar")}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("changeLaterFromTray")}
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={closeBehaviorDontAskAgain}
                  onChange={(event) => setCloseBehaviorDontAskAgain(event.target.checked)}
                  className="h-4 w-4 accent-gray-900 dark:accent-gray-100"
                />
                <span>{t("dontAskAgain")}</span>
              </label>
            </div>
            <div className="flex flex-col gap-2 p-5 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:justify-end">
              <button
                onClick={() => setCloseBehaviorPromptOpen(false)}
                disabled={isCompletingCloseBehavior}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => void handleCloseBehaviorChoice("show_in_dock")}
                disabled={isCompletingCloseBehavior}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
              >
                {t("keepInDock")}
              </button>
              <button
                onClick={() => void handleCloseBehaviorChoice("menu_bar_only")}
                disabled={isCompletingCloseBehavior}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900 transition-colors disabled:opacity-50"
              >
                {t("menuBarOnly")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onImportFile={importFromFile}
        onStartOAuth={startOAuthLogin}
        onCompleteOAuth={completeOAuthLogin}
        onCancelOAuth={cancelOAuthLogin}
      />

      {/* Import/Export Config Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-2xl mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {configModalMode === "slim_export" ? t("exportSlimText") : t("importSlimText")}
              </h2>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {configModalMode === "slim_import" ? (
                <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                  {t("existingAccountsKept")}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("slimStringContainsSecrets")}
                </p>
              )}
              <textarea
                value={configPayload}
                onChange={(e) => setConfigPayload(e.target.value)}
                readOnly={configModalMode === "slim_export"}
                placeholder={
                  configModalMode === "slim_export"
                    ? isExportingSlim
                      ? t("generating")
                      : t("exportStringWillAppearHere")
                    : t("pasteConfigStringHere")
                }
                className="w-full h-48 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 font-mono"
              />
              {configModalError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                  {configModalError}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
              >
                {t("close")}
              </button>
              {configModalMode === "slim_export" ? (
                <button
                  onClick={async () => {
                    if (!configPayload) return;
                    try {
                      await navigator.clipboard.writeText(configPayload);
                      setConfigCopied(true);
                      setTimeout(() => setConfigCopied(false), 1500);
                    } catch {
                      setConfigModalError(t("clipboardUnavailablePleaseCopyManually"));
                    }
                  }}
                  disabled={!configPayload || isExportingSlim}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900 transition-colors disabled:opacity-50"
                >
                  {configCopied ? t("copied") : t("copyString")}
                </button>
              ) : (
                <button
                  onClick={handleImportSlimText}
                  disabled={isImportingSlim}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900 transition-colors disabled:opacity-50"
                >
                  {isImportingSlim ? t("importing") : t("importMissingAccounts")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <UpdateChecker />

    </div>
  );
}

export default App;
