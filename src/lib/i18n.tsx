import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  parseLanguage,
  type Language,
} from "./language";
import { invokeBackend, isTauriRuntime } from "./platform";

export type TranslationParams = Record<string, string | number>;

const englishTranslations = {
  settings: "Settings",
  close: "Close",
  save: "Save",
  cancel: "Cancel",
  language: "Language",
  chinese: "中文",
  english: "English",
  loading: "Loading...",
  noAccountsConfigured: "No accounts configured",
  addAccount: "Add Account",
  importAccounts: "Import Accounts",
  exportAccounts: "Export Accounts",
  account: "Account",
  accounts: "Accounts",
  active: "Active",
  inactive: "Inactive",
  switch: "Switch",
  rename: "Rename",
  delete: "Delete",
  refresh: "Refresh",
  retry: "Retry",
  remove: "Remove",
  confirm: "Confirm",
  error: "Error",
  success: "Success",
  usage: "Usage",
  session: "Session",
  weekly: "Weekly",
  reset: "Reset",
  today: "today",
  last7Days: "last 7 days",
  warmup: "Warm-up",
  warmed: "warmed",
  failed: "failed",
  openCodexSwitcher: "Open Codex Switcher",
  quit: "Quit",
  dock: "Dock",
  show: "Show",
  menuBar: "Menu Bar",
  file: "File",
  edit: "Edit",
  view: "View",
  tray: "Tray",
  hourlyAndWeekly: "Hourly and weekly",
  hidden: "Hidden",
  dockIcon: "Dock icon",
  showInDock: "Show in Dock",
  menuBarOnly: "Menu bar only",
  reopenCodexAfterForceClose: "Reopen Codex after force close",
  displayMode: "Display mode",
  trayDisplayMode: "Tray display mode",
  dockDisplayMode: "Dock display mode",
  activeUsageText: "Active usage text",
  compact: "Compact",
  detailed: "Detailed",
  forceClose: "Force close",
  closeGracefully: "Close gracefully",
  codexWillClose: "Codex will {message}.",
  changeLaterInSettings: "You can change this later in Settings.",
  terminalSessionsWillNotReopen: "Terminal and IDE sessions will not reopen.",
  noExpiry: "No expiry",
  expiryUnavailable: "Expiry unavailable",
  expiresOn: "Expires on {date}",
  resetCount: "{count} reset(s)",
  resetCredits: "Reset credits",
  importSuccess: "Imported {count} account(s).",
  exportSuccess: "Accounts exported.",
  accountName: "Account name",
  name: "Name",
  message: "{message}",
  updateAvailable: "Update available",
  updateNow: "Update now",
  later: "Later",
  checkingForUpdates: "Checking for updates...",
  updateFailed: "Update check failed: {message}",
  lastUpdated: "Last updated {date}",
  usageUnavailable: "Usage unavailable",
  requests: "Requests",
  tokens: "Tokens",
  percentage: "{count}%",
  warmupSummary: "{warmed} warmed, {failed} failed",
  accountsCount: "{count} account(s)",
  resetAt: "Resets {reset}",
  createdAt: "Created {date}",
  copied: "Copied",
  copy: "Copy",
  open: "Open",
  selectFile: "Select file",
  selectAuthFile: "Select auth.json file",
  importExportBackup: "Import/export backup",
  fullEncryptedBackup: "Full encrypted backup",
  localSettings: "Local settings",
  failedToLoad: "Failed to load: {message}",
  failedToSave: "Failed to save: {message}",
  unknownError: "Unknown error",
  welcome: "Welcome to Codex Switcher",
  getStarted: "Get started",
  noUsageData: "No usage data",
  plan: "Plan",
  expires: "Expires",
  remaining: "Remaining",
  used: "Used",
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  system: "System",
  enable: "Enable",
  disable: "Disable",
  enabled: "Enabled",
  disabled: "Disabled",
} as const;

export type TranslationKey = keyof typeof englishTranslations;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;

const chineseTranslations: Record<TranslationKey, string> = {
  settings: "设置", close: "关闭", save: "保存", cancel: "取消", language: "语言",
  chinese: "中文", english: "English", loading: "加载中…", noAccountsConfigured: "未配置账户",
  addAccount: "添加账户", importAccounts: "导入账户", exportAccounts: "导出账户", account: "账户",
  accounts: "账户", active: "当前", inactive: "未启用", switch: "切换", rename: "重命名", delete: "删除",
  refresh: "刷新", retry: "重试", remove: "移除", confirm: "确认", error: "错误", success: "成功",
  usage: "用量", session: "会话", weekly: "每周", reset: "重置", today: "今天", last7Days: "最近 7 天",
  warmup: "预热", warmed: "已预热", failed: "失败", openCodexSwitcher: "打开 Codex Switcher", quit: "退出",
  dock: "Dock", show: "显示", menuBar: "菜单栏", file: "文件", edit: "编辑", view: "视图", tray: "托盘",
  hourlyAndWeekly: "每小时和每周", hidden: "隐藏", dockIcon: "Dock 图标", showInDock: "在 Dock 中显示",
  menuBarOnly: "仅菜单栏", reopenCodexAfterForceClose: "强制关闭后重新打开 Codex", displayMode: "显示模式",
  trayDisplayMode: "托盘显示模式", dockDisplayMode: "Dock 显示模式", activeUsageText: "当前用量文字",
  compact: "紧凑", detailed: "详细", forceClose: "强制关闭", closeGracefully: "正常关闭",
  codexWillClose: "Codex 将{message}。", changeLaterInSettings: "稍后可在设置中更改。",
  terminalSessionsWillNotReopen: "终端和 IDE 会话不会重新打开。", noExpiry: "无过期时间", expiryUnavailable: "无法获取过期时间",
  expiresOn: "于 {date} 过期", resetCount: "{count} 次重置", resetCredits: "重置额度", importSuccess: "已导入 {count} 个账户。",
  exportSuccess: "账户已导出。", accountName: "账户名称", name: "名称", message: "{message}", updateAvailable: "有可用更新",
  updateNow: "立即更新", later: "稍后", checkingForUpdates: "正在检查更新…", updateFailed: "检查更新失败：{message}",
  lastUpdated: "最后更新于 {date}", usageUnavailable: "用量不可用", requests: "请求", tokens: "令牌", percentage: "{count}%",
  warmupSummary: "{warmed} 个已预热，{failed} 个失败", accountsCount: "{count} 个账户", resetAt: "重置时间 {reset}",
  createdAt: "创建于 {date}", copied: "已复制", copy: "复制", open: "打开", selectFile: "选择文件", selectAuthFile: "选择 auth.json 文件",
  importExportBackup: "导入/导出备份", fullEncryptedBackup: "完整加密备份", localSettings: "本地设置", failedToLoad: "加载失败：{message}",
  failedToSave: "保存失败：{message}", unknownError: "未知错误", welcome: "欢迎使用 Codex Switcher", getStarted: "开始使用",
  noUsageData: "暂无用量数据", plan: "计划", expires: "过期时间", remaining: "剩余", used: "已使用", theme: "主题",
  light: "浅色", dark: "深色", system: "跟随系统", enable: "启用", disable: "停用", enabled: "已启用", disabled: "已停用",
};

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: englishTranslations,
  "zh-CN": chineseTranslations,
};

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => Promise<void>; t: Translate };
const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try { return parseLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)); } catch { return DEFAULT_LANGUAGE; }
}

function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;
  return text.replace(/\{(name|count|message|reset|warmed|failed|date)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function LanguageProvider(props: { children: ReactNode }): ReactElement {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const loadBackendLanguage = useCallback(async () => {
    try { setLanguageState(parseLanguage(await invokeBackend<string>("get_language"))); } catch { /* retain local value */ }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      if (disposed) return;
      unlisten = await listen("app-settings-changed", () => { void loadBackendLanguage(); });
      void loadBackendLanguage();
    }).catch(() => { /* browser/web mode or unavailable event bridge */ });
    return () => { disposed = true; unlisten?.(); };
  }, [loadBackendLanguage]);

  const setLanguage = useCallback(async (nextLanguage: Language) => {
    await invokeBackend("set_language", { language: nextLanguage });
    setLanguageState(nextLanguage);
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage); } catch { /* storage is optional */ }
  }, []);

  const t = useCallback<Translate>((key, params) => {
    const text = translations[language][key] ?? translations.en[key] ?? String(key);
    return interpolate(text, params);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return createElement(LanguageContext.Provider, { value }, props.children) as ReactElement;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
