export const THEME_CHANGED_EVENT = "theme-changed";
export const THEME_STORAGE_KEY = "codex-switcher-theme";
export const SKIN_CHANGED_EVENT = "skin-changed";
export const SKIN_STORAGE_KEY = "codex-switcher-skin";

export type ThemeMode = "light" | "dark";
export type SkinId =
  | "default"
  | "mint"
  | "graphite"
  | "aurora"
  | "cyberpunk"
  | "minecraft"
  | "glass"
  | "illustrated"
  | "mcwood"
  | "anime-sunset"
  | "anime-neon"
  | "anime-forest"
  | "anime-stars";

const SKIN_LEGACY_ALIASES: Record<string, SkinId> = {
  "anime-sakura": "anime-sunset",
};

const SKINS = new Set<SkinId>([
  "default",
  "mint",
  "graphite",
  "aurora",
  "cyberpunk",
  "minecraft",
  "glass",
  "illustrated",
  "mcwood",
  "anime-sunset",
  "anime-neon",
  "anime-forest",
  "anime-stars",
]);

export function parseSkin(value: string | null | undefined): SkinId {
  const normalized = value ? SKIN_LEGACY_ALIASES[value] ?? value : value;
  return normalized && SKINS.has(normalized as SkinId) ? (normalized as SkinId) : "default";
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function readStoredSkin(): SkinId {
  if (typeof window === "undefined") return "default";
  try {
    return parseSkin(window.localStorage.getItem(SKIN_STORAGE_KEY));
  } catch {
    return "default";
  }
}

export function applySkin(skin: SkinId): void {
  if (skin === "default") {
    document.documentElement.removeAttribute("data-skin");
  } else {
    document.documentElement.setAttribute("data-skin", skin);
  }
}

export function syncThemeFromStorage(): void {
  applyTheme(readStoredTheme());
  applySkin(readStoredSkin());
}
