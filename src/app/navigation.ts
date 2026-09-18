import type { TranslationKey } from "../lib/i18n";

export type PageId =
  | "current-account"
  | "other-accounts"
  | "usage-stats"
  | "help"
  | "settings";

export const ACTIVE_PAGE_STORAGE_KEY = "codex-switcher-active-page";

export const PAGE_IDS: readonly PageId[] = [
  "current-account",
  "other-accounts",
  "usage-stats",
  "help",
  "settings",
];

export interface NavItemDefinition {
  id: PageId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: "account" | "users" | "chart" | "help" | "settings";
}

export const NAV_ITEMS: readonly NavItemDefinition[] = [
  {
    id: "current-account",
    labelKey: "navCurrentAccount",
    descriptionKey: "navCurrentAccountDescription",
    icon: "account",
  },
  {
    id: "other-accounts",
    labelKey: "navOtherAccounts",
    descriptionKey: "navOtherAccountsDescription",
    icon: "users",
  },
  {
    id: "usage-stats",
    labelKey: "navUsageStats",
    descriptionKey: "navUsageStatsDescription",
    icon: "chart",
  },
  {
    id: "help",
    labelKey: "navHelp",
    descriptionKey: "navHelpDescription",
    icon: "help",
  },
  {
    id: "settings",
    labelKey: "navSettings",
    descriptionKey: "navSettingsDescription",
    icon: "settings",
  },
];

export function parsePageId(value: string | null | undefined): PageId {
  return PAGE_IDS.includes(value as PageId) ? (value as PageId) : "current-account";
}

export function readStoredPageId(): PageId {
  if (typeof window === "undefined") return "current-account";
  try {
    return parsePageId(window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY));
  } catch {
    return "current-account";
  }
}

export function writeStoredPageId(pageId: PageId): void {
  try {
    window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, pageId);
  } catch {
    // Persistent navigation is best effort; the in-memory page still works.
  }
}

export function getNavItem(pageId: PageId): NavItemDefinition {
  return NAV_ITEMS.find((item) => item.id === pageId) ?? NAV_ITEMS[0];
}