export type Language = "zh-CN" | "en";

export const DEFAULT_LANGUAGE: Language = "zh-CN";
export const LANGUAGE_STORAGE_KEY = "codex-switcher-language";

export function parseLanguage(value: string | null | undefined): Language {
  return value === "en" || value === "zh-CN" ? value : DEFAULT_LANGUAGE;
}

export function languageLocale(language: Language): "zh-CN" | "en-US" {
  return language === "en" ? "en-US" : "zh-CN";
}
