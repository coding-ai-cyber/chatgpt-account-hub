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
  minimize: "Minimize",
  restore: "Restore",
  maximize: "Maximize",
  closeRunningCodexProcesses: "Close running Codex processes",
  openCodexApp: "Open Codex app",
  opening: "Opening...",
  showAllAccountNamesAndEmails: "Show all account names and emails",
  hideAllAccountNamesAndEmails: "Hide all account names and emails",
  refreshingAllUsage: "Refreshing all usage",
  refreshAllUsage: "Refresh all usage",
  warmingUpAllAccounts: "Warming up all accounts",
  warmUpAllAccounts: "Warm up all accounts",
  hideAccountSearch: "Hide account search",
  searchAccounts: "Search accounts",
  menu: "Menu",
  autoWarmUp: "Auto Warm Up",
  timer: "Timer",
  appearance: "Appearance",
  timedWarmup: "Timed warm-up",
  exporting: "Exporting...",
  exportSlimText: "Export Slim Text",
  importing: "Importing...",
  importSlimText: "Import Slim Text",
  exportFullEncryptedFile: "Export Full Encrypted File",
  importFullEncryptedFile: "Import Full Encrypted File",
  loadingAccounts: "Loading accounts...",
  failedToLoadAccounts: "Failed to load accounts",
  searchAccountsByNameOrEmail: "Search accounts by name or email",
  clearAccountSearch: "Clear account search",
  resetEarliestToLatest: "Reset: earliest to latest",
  resetLatestToEarliest: "Reset: latest to earliest",
  checkingDesktopApp: "Checking for a desktop app to reopen...",
  closeAndSwitchAccount: "Close and switch account",
  dontAskAgain: "Don't ask again",
  exportStringWillAppearHere: "Export string will appear here",
  pasteConfigStringHere: "Paste config string here",
  copyString: "Copy String",
  importMissingAccounts: "Import Missing Accounts",
  never: "Never",
  justNow: "Just now",
  neverUsed: "Never",
  apiKey: "API Key",
  clickToRename: "Click to rename",
  showInfo: "Show info",
  hideInfo: "Hide info",
  closeRunningCodexProcessesAndSwitchAccount: "Close running Codex processes and switch account",
  switching: "Switching...",
  hideUsageStatistics: "Hide usage statistics",
  showUsageStatistics: "Show usage statistics",
  removeAccount: "Remove account",
  chatGPTLogin: "ChatGPT Login",
  importFile: "Import File",
  leaveBlankToUseEmail: "Leave blank to use email",
  waitingForBrowserLogin: "Waiting for browser login...",
  copiedBang: "Copied!",
  generateLoginLink: "Generate Login Link",
  weeklyLimit: "Weekly Limit",
  atLeastOneIconVisible: "At least one of the Dock or tray icons stays visible so you can reopen Codex Switcher.",
  loadingDisplaySettings: "Loading display settings...",
  couldNotUpdateDisplaySettings: "Could not update display settings: {message}",
  askEveryTime: "Ask every time",
  gracefullyClose: "Gracefully close",
  reopenDesktopApp: "Reopen desktop app",
  keepClosed: "Keep closed",
  done: "Done",
  downloadingUpdate: "Downloading update...",
  all: "All",
  allReported: "All reported",
  tokenActivity: "Token activity",
  tokenActivityRange: "Token activity range",
  longestTask: "Longest task",
  longestStreak: "Longest streak",
  days: "days",
  fastMode: "Fast mode",
  reasoning: "Reasoning",
  skillsExplored: "Skills explored",
  totalThreads: "Total threads",
  statsAsOf: "Stats as of {date}",
  chatGPTBackend: "ChatGPT backend",
  refreshUsageStats: "Refresh usage stats",
  lifetime: "Lifetime",
  reported: "reported",
  currentStreak: "Current streak",
  peakDay: "Peak day",
  resetCreditExpiryDetails: "Reset credit expiry details",
  resetsNow: "Resets now",
  resetsIn: "Resets in {reset}",
  neverExpiry: "No expiry",
  cannotSwitchWhile: "Cannot switch accounts while {message}",
  codexUsageStatsSource: "Codex usage stats via ChatGPT backend",
  noFileSelected: "No file selected",
  exportFullEncryptedAccountConfig: "Export Full Encrypted Account Config",
  importFullEncryptedAccountConfig: "Import Full Encrypted Account Config",
  codexWillOnlyBeClosed: "No supported desktop app could be identified for reopening. Codex will only be closed.",
  unsavedCodexWorkMayBeLost: "Unsaved Codex work may be lost.",
  desktopAppNotIdentified: "No supported desktop app could be identified for reopening.",
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
  minimize: "最小化", restore: "还原", maximize: "最大化", closeRunningCodexProcesses: "关闭正在运行的 Codex 进程",
  openCodexApp: "打开 Codex 应用", opening: "正在打开…", showAllAccountNamesAndEmails: "显示所有账户名称和邮箱",
  hideAllAccountNamesAndEmails: "隐藏所有账户名称和邮箱", refreshingAllUsage: "正在刷新所有用量", refreshAllUsage: "刷新所有用量",
  warmingUpAllAccounts: "正在预热所有账户", warmUpAllAccounts: "预热所有账户", hideAccountSearch: "隐藏账户搜索",
  searchAccounts: "搜索账户", menu: "菜单", autoWarmUp: "自动预热", timer: "定时器", appearance: "外观",
  timedWarmup: "定时预热", exporting: "正在导出…", exportSlimText: "导出精简文本", importing: "正在导入…",
  importSlimText: "导入精简文本", exportFullEncryptedFile: "导出完整加密文件", importFullEncryptedFile: "导入完整加密文件",
  loadingAccounts: "正在加载账户…", failedToLoadAccounts: "加载账户失败", searchAccountsByNameOrEmail: "按名称或邮箱搜索账户",
  clearAccountSearch: "清除账户搜索", resetEarliestToLatest: "重置：从最早到最晚", resetLatestToEarliest: "重置：从最晚到最早",
  checkingDesktopApp: "正在检查可重新打开的桌面应用…", closeAndSwitchAccount: "关闭并切换账户", dontAskAgain: "不再询问",
  exportStringWillAppearHere: "导出字符串将在此显示", pasteConfigStringHere: "在此粘贴配置字符串", copyString: "复制字符串",
  importMissingAccounts: "导入缺失账户", never: "从未", justNow: "刚刚", neverUsed: "从未使用", apiKey: "API 密钥",
  clickToRename: "点击重命名", showInfo: "显示信息", hideInfo: "隐藏信息", closeRunningCodexProcessesAndSwitchAccount: "关闭正在运行的 Codex 进程并切换账户",
  switching: "正在切换…", hideUsageStatistics: "隐藏用量统计", showUsageStatistics: "显示用量统计", removeAccount: "移除账户",
  chatGPTLogin: "ChatGPT 登录", importFile: "导入文件", leaveBlankToUseEmail: "留空以使用邮箱", waitingForBrowserLogin: "等待浏览器登录…",
  copiedBang: "已复制！", generateLoginLink: "生成登录链接", weeklyLimit: "每周限制", atLeastOneIconVisible: "Dock 或托盘图标至少有一个保持可见，以便重新打开 Codex Switcher。",
  loadingDisplaySettings: "正在加载显示设置…", couldNotUpdateDisplaySettings: "无法更新显示设置：{message}", askEveryTime: "每次询问",
  gracefullyClose: "正常关闭", reopenDesktopApp: "重新打开桌面应用", keepClosed: "保持关闭", done: "完成", downloadingUpdate: "正在下载更新…",
  all: "全部", allReported: "全部已报告", tokenActivity: "令牌活动", tokenActivityRange: "令牌活动范围", longestTask: "最长任务",
  longestStreak: "最长连续天数", days: "天", fastMode: "快速模式", reasoning: "推理", skillsExplored: "探索的技能", totalThreads: "线程总数",
  statsAsOf: "统计截至 {date}", chatGPTBackend: "ChatGPT 后端", refreshUsageStats: "刷新用量统计", lifetime: "生命周期", reported: "已报告",
  currentStreak: "当前连续天数", peakDay: "峰值日", resetCreditExpiryDetails: "重置额度过期详情", resetsNow: "立即重置", resetsIn: "{reset} 后重置",
  neverExpiry: "无过期时间", cannotSwitchWhile: "无法在 {message} 时切换账户", codexUsageStatsSource: "通过 ChatGPT 后端获取 Codex 用量统计",
  noFileSelected: "未选择文件", exportFullEncryptedAccountConfig: "导出完整加密账户配置", importFullEncryptedAccountConfig: "导入完整加密账户配置",
  codexWillOnlyBeClosed: "未找到可重新打开的受支持桌面应用。Codex 将仅关闭。", unsavedCodexWorkMayBeLost: "未保存的 Codex 工作可能会丢失。",
  desktopAppNotIdentified: "未找到可重新打开的受支持桌面应用。",
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
    try {
      const nextLanguage = parseLanguage(await invokeBackend<string>("get_language"));
      setLanguageState(nextLanguage);
      try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage); } catch { /* storage is optional */ }
    } catch { /* retain local value */ }
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
