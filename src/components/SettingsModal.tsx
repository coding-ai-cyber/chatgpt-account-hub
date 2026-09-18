import { useCallback, useEffect, useRef, useState } from "react";
import type { DesktopReopenPreference } from "../lib/desktopReopen";
import type { CodexClosePreference } from "../lib/codexClosePreference";
import { invokeBackend, isTauriRuntime } from "../lib/platform";
import type { SkinId } from "../lib/theme";
import { useLanguage, type TranslationKey } from "../lib/i18n";
import type { Language } from "../lib/language";
import type { DockDisplayMode } from "../types";

type TrayDisplayMode = "icon_and_session" | "active_usage_text" | "hidden";
interface DisplaySettings {
  tray_display_mode: TrayDisplayMode;
  dock_display_mode: DockDisplayMode | null;
}

type SkinGroupId = "standard" | "anime";

interface SkinOption {
  id: SkinId;
  labelKey: TranslationKey;
  group: SkinGroupId;
  swatches?: [string, string, string, string];
  preview?: string;
}

const SKIN_OPTIONS: SkinOption[] = [
  { id: "default", labelKey: "skinDefault", group: "standard", swatches: ["#f9fafb", "#ffffff", "#111827", "#2563eb"] },
  { id: "mint", labelKey: "skinMint", group: "standard", swatches: ["#effaf4", "#def4e7", "#264739", "#10b590"] },
  { id: "graphite", labelKey: "skinGraphite", group: "standard", swatches: ["#171b1f", "#252b31", "#eff2f5", "#e7a83c"] },
  { id: "aurora", labelKey: "skinAurora", group: "standard", swatches: ["#071117", "#10232c", "#eaf2f5", "#1ec291"] },
  { id: "cyberpunk", labelKey: "skinCyberpunk", group: "standard", swatches: ["#0a0f14", "#141d29", "#f5f7ff", "#f6d365"] },
  { id: "minecraft", labelKey: "skinMinecraft", group: "standard", swatches: ["#fff7c9", "#f0c84b", "#281f10", "#2f9f52"] },
  { id: "glass", labelKey: "skinGlass", group: "standard", swatches: ["#11172b", "rgba(255,255,255,0.14)", "#f6f7fc", "#38bdf8"] },
  { id: "mcwood", labelKey: "skinMcWood", group: "standard", swatches: ["#4a2a12", "#e8d29a", "#3f8f3a", "#2f6fd0"] },
  {
    id: "anime-sunset",
    labelKey: "skinAnimeSunset",
    group: "anime",
    preview: "/themes/twilight.png",
    swatches: ["#2b1d2f", "#f28b64", "#40536d", "#ffc989"],
  },
  {
    id: "anime-neon",
    labelKey: "skinAnimeNeon",
    group: "anime",
    preview: "/themes/neon.png",
    swatches: ["#11172e", "#241b3f", "#e9e4ff", "#22e7ff"],
  },
  {
    id: "anime-forest",
    labelKey: "skinAnimeForest",
    group: "anime",
    preview: "/themes/forest.png",
    swatches: ["#c0e8c2", "#f2d4a8", "#456c50", "#f7c25e"],
  },
  {
    id: "anime-stars",
    labelKey: "skinAnimeStars",
    group: "anime",
    preview: "/themes/stars.png",
    swatches: ["#08142f", "#27333f", "#cfe4ff", "#8cd2e8"],
  },
];

interface SettingsModalProps {
  reopenPreference: DesktopReopenPreference;
  onReopenPreferenceChange: (value: DesktopReopenPreference) => void;
  closePreference: CodexClosePreference;
  onClosePreferenceChange: (value: CodexClosePreference) => void;
  skin: SkinId;
  onSkinChange: (value: SkinId) => void;
  onClose: () => void;
}

export function SettingsModal({
  reopenPreference,
  onReopenPreferenceChange,
  closePreference,
  onClosePreferenceChange,
  skin,
  onSkinChange,
  onClose,
}: SettingsModalProps) {
  const { language, setLanguage, t } = useLanguage();
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const requestId = useRef(0);
  const desktop = isTauriRuntime();
  const [activeSkinGroup, setActiveSkinGroup] = useState<SkinGroupId>("standard");

  useEffect(() => {
    setActiveSkinGroup(SKIN_OPTIONS.find((option) => option.id === skin)?.group ?? "standard");
  }, [skin]);
  const loadDisplaySettings = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      const settings = await invokeBackend<DisplaySettings>("get_display_settings");
      if (currentRequest === requestId.current) {
        setDisplaySettings(settings);
        setDisplayError(null);
      }
    } catch (err) {
      if (currentRequest === requestId.current) setDisplayError(String(err));
    }
  }, []);

  useEffect(() => {
    if (!desktop) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const stop = await listen("app-settings-changed", () => {
        void loadDisplaySettings();
      });
      if (disposed) stop();
      else {
        unlisten = stop;
        void loadDisplaySettings();
      }
    }).catch((err) => {
      if (!disposed) setDisplayError(String(err));
    });
    return () => {
      disposed = true;
      requestId.current += 1;
      unlisten?.();
    };
  }, [desktop, loadDisplaySettings]);

  const changeDisplaySetting = async (command: string, mode: string) => {
    setSaving(true);
    setDisplayError(null);
    try {
      await invokeBackend(command, { mode });
      // Changing tray visibility can also adjust the Dock mode, and vice versa.
      await loadDisplaySettings();
    } catch (err) {
      requestId.current += 1;
      setDisplayError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const changeLanguage = async (nextLanguage: Language) => {
    if (nextLanguage === language) return;
    setLanguageSaving(true);
    setLanguageError(null);
    try {
      await setLanguage(nextLanguage);
    } catch (err) {
      setLanguageError(String(err));
    } finally {
      setLanguageSaving(false);
    }
  };

  const selectClassName = "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-xl mx-4 shadow-xl">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 id="settings-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("settings")}</h2>
        </div>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {desktop && (
            <>
              {displaySettings ? (
                <>
                  <label htmlFor="tray-display-mode" className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t("tray")}</label>
                  <select
                    id="tray-display-mode"
                    value={displaySettings.tray_display_mode}
                    disabled={saving}
                    onChange={(event) => void changeDisplaySetting("set_tray_display_mode", event.target.value)}
                    className={selectClassName}
                  >
                    <option value="icon_and_session">{t("iconAndSession")}</option>
                    <option value="active_usage_text">{t("hourlyAndWeekly")}</option>
                    <option value="hidden">{t("hidden")}</option>
                  </select>
                  {displaySettings.dock_display_mode !== null && (
                    <>
                      <label htmlFor="dock-display-mode" className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t("dockIcon")}</label>
                      <select
                        id="dock-display-mode"
                        value={displaySettings.dock_display_mode}
                        disabled={saving}
                        onChange={(event) => void changeDisplaySetting("set_dock_display_mode", event.target.value)}
                        className={selectClassName}
                      >
                        <option value="show_in_dock">{t("showInDock")}</option>
                        <option value="menu_bar_only">{t("menuBarOnly")}</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t("atLeastOneIconVisible")}</p>
                    </>
                  )}
                </>
              ) : !displayError && <p className="text-sm text-gray-500 dark:text-gray-400">{t("loadingDisplaySettings")}</p>}
              {displayError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{t("couldNotUpdateDisplaySettings", { message: displayError })}</p>}
              <div className="border-t border-gray-100 dark:border-gray-800" />
            </>
          )}
          <label htmlFor="language" className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t("language")}</label>
          <select
            id="language"
            value={language}
            disabled={languageSaving}
            onChange={(event) => void changeLanguage(event.target.value as Language)}
            className={selectClassName}
          >
            <option value="zh-CN">{t("chinese")}</option>
            <option value="en">{t("english")}</option>
          </select>
          {languageError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{t("failedToSave", { message: languageError })}</p>}
          <span id="skin-label" className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t("skin")}</span>
          <div role="tablist" aria-label={t("skin")} className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {(["standard", "anime"] as const).map((group) => {
              const groupLabel = t(group === "standard" ? "skinGroupStandard" : "skinGroupAnime");
              const count = SKIN_OPTIONS.filter((option) => option.group === group).length;
              return (
                <button
                  key={group}
                  type="button"
                  role="tab"
                  aria-selected={activeSkinGroup === group}
                  onClick={() => setActiveSkinGroup(group)}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    activeSkinGroup === group
                      ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-50"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                  }`}
                >
                  {groupLabel}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                    activeSkinGroup === group
                      ? "bg-blue-500/15 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div role="tabpanel" className="space-y-1.5">
            {(() => {
              const options = SKIN_OPTIONS.filter((option) => option.group === activeSkinGroup);
              return (
                <div role="radiogroup" aria-label={t(activeSkinGroup === "standard" ? "skinGroupStandard" : "skinGroupAnime")} className="grid grid-cols-3 gap-2">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={skin === option.id}
                      onClick={() => onSkinChange(option.id)}
                      className={`relative flex flex-col rounded-xl border p-1.5 text-left transition-all ${
                        skin === option.id
                          ? "border-blue-500 ring-2 ring-blue-500/30 dark:border-blue-400"
                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      }`}
                    >
                      {option.preview ? (
                        <span
                          aria-hidden="true"
                          className="relative block h-16 w-full overflow-hidden rounded-lg border border-white/20 bg-gray-950"
                          style={{
                            backgroundImage: `url("${option.preview}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        >
                          <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/55" />
                          {skin === option.id && (
                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </span>
                      ) : (
                        <span aria-hidden="true" className="block h-16 rounded-lg border border-gray-300/60 p-1.5 dark:border-gray-600" style={{ backgroundColor: option.swatches?.[0] }}>
                          <span className="flex h-full items-center gap-1">
                            <span className="h-full w-1/4 rounded-md" style={{ backgroundColor: option.swatches?.[1] }} />
                            <span className="h-full w-1/2 rounded-md" style={{ backgroundColor: option.swatches?.[2] }}>
                              <span className="mt-2 mx-2 block h-1.5 rounded-full opacity-90" style={{ backgroundColor: option.swatches?.[3] }} />
                            </span>
                            <span className="h-full w-1/4 rounded-md" style={{ backgroundColor: option.swatches?.[2] }} />
                          </span>
                        </span>
                      )}
                      <span className="mt-1.5 block truncate text-center text-xs font-medium text-gray-800 dark:text-gray-100">
                        {t(option.labelKey)}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("skinDescription")}</p>
          <label htmlFor="codex-close-preference" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            {t("closeCodex")}
          </label>
          <select id="codex-close-preference" value={closePreference} onChange={(event) => onClosePreferenceChange(event.target.value as CodexClosePreference)} className={selectClassName}>
            <option value="ask">{t("askEveryTime")}</option>
            <option value="graceful">{t("gracefullyClose")}</option>
            <option value="force">{t("forceClose")}</option>
          </select>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("asksCodexQuitNormally")} {t("stopsCodexImmediately")}
          </p>
          <label htmlFor="desktop-reopen-preference" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            {t("reopenCodexAfterForceClose")}
          </label>
          <select id="desktop-reopen-preference" value={reopenPreference} onChange={(event) => onReopenPreferenceChange(event.target.value as DesktopReopenPreference)} className={selectClassName}>
            <option value="ask">{t("askEveryTime")}</option>
            <option value="always">{t("reopenDesktopApp")}</option>
            <option value="never">{t("keepClosed")}</option>
          </select>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("codexDesktopReopensAutomatically")}
          </p>
        </div>
        <div className="flex justify-end p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50">{t("done")}</button>
        </div>
      </div>
    </div>
  );
}
