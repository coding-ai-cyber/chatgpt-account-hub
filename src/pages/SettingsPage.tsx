import { useCallback, useEffect, useRef, useState } from "react";
import type { CodexClosePreference } from "../lib/codexClosePreference";
import type { DesktopReopenPreference } from "../lib/desktopReopen";
import { THEME_GROUPS, THEME_REGISTRY } from "../themes/registry";
import { invokeBackend, isTauriRuntime } from "../lib/platform";
import { useLanguage } from "../lib/i18n";
import type { Language } from "../lib/language";
import type { SkinId, ThemeMode } from "../lib/theme";
import type { DockDisplayMode } from "../types";
import { Icon } from "../components/layout/Icon";

type TrayDisplayMode = "icon_and_session" | "active_usage_text" | "hidden";
interface DisplaySettings {
  tray_display_mode: TrayDisplayMode;
  dock_display_mode: DockDisplayMode | null;
}

interface SettingsPageProps {
  skin: SkinId;
  themeMode: ThemeMode;
  onSkinChange: (value: SkinId) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  closePreference: CodexClosePreference;
  onClosePreferenceChange: (value: CodexClosePreference) => void;
  reopenPreference: DesktopReopenPreference;
  onReopenPreferenceChange: (value: DesktopReopenPreference) => void;
  autoWarmupAllEnabled: boolean;
  onAutoWarmupAllEnabledChange: (value: boolean) => void;
  timedWarmupEnabled: boolean;
  onTimedWarmupEnabledChange: (value: boolean) => void;
  timedWarmupTimes: string[];
  onAddTimedWarmupTime: (value: string) => void;
  onRemoveTimedWarmupTime: (value: string) => void;
}

function sectionTitle(children: React.ReactNode) {
  return <h2 className="text-sm font-semibold app-text-primary">{children}</h2>;
}

export function SettingsPage({
  skin,
  themeMode,
  onSkinChange,
  onThemeModeChange,
  closePreference,
  onClosePreferenceChange,
  reopenPreference,
  onReopenPreferenceChange,
  autoWarmupAllEnabled,
  onAutoWarmupAllEnabledChange,
  timedWarmupEnabled,
  onTimedWarmupEnabledChange,
  timedWarmupTimes,
  onAddTimedWarmupTime,
  onRemoveTimedWarmupTime,
}: SettingsPageProps) {
  const { language, setLanguage, t } = useLanguage();
  const desktop = isTauriRuntime();
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [displaySaving, setDisplaySaving] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState("");
  const requestId = useRef(0);

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
      const stop = await listen("app-settings-changed", () => void loadDisplaySettings());
      if (disposed) stop();
      else {
        unlisten = stop;
        void loadDisplaySettings();
      }
    }).catch(() => {});
    return () => {
      disposed = true;
      requestId.current += 1;
      unlisten?.();
    };
  }, [desktop, loadDisplaySettings]);

  const changeDisplaySetting = async (command: string, mode: string) => {
    setDisplaySaving(true);
    setDisplayError(null);
    try {
      await invokeBackend(command, { mode });
      await loadDisplaySettings();
    } catch (err) {
      requestId.current += 1;
      setDisplayError(String(err));
    } finally {
      setDisplaySaving(false);
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

  const addTime = () => {
    if (!draftTime) return;
    onAddTimedWarmupTime(draftTime);
    setDraftTime("");
  };

  return (
    <div className="app-page space-y-4">
      <section className="app-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl app-accent-bg">
            <Icon name="settings" size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold app-text-primary">{t("pageSettings")}</h2>
            <p className="mt-0.5 text-xs app-text-secondary">{t("navSettingsDescription")}</p>
          </div>
        </div>
      </section>

      <section className="app-surface p-4">
        {sectionTitle(t("settingsAppearance"))}
        <div className="mt-3 grid gap-2">
          {THEME_GROUPS.map((group) => {
            const items = THEME_REGISTRY.filter((theme) => theme.group === group.id);
            return (
              <fieldset key={group.id}>
                <legend className="app-section-label mb-2">
                  {t(group.labelKey)} · {items.length}
                </legend>
                <div role="radiogroup" aria-label={t(group.labelKey)} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {items.map((theme) => {
                    const selected = skin === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`app-card-button relative overflow-hidden p-2 text-left ${
                          selected ? "!border-[var(--accent)] shadow-[0_0_0_3px_var(--focus-ring)]" : ""
                        }`}
                        onClick={() => onSkinChange(theme.id)}
                      >
                        {theme.preview ? (
                          <span
                            aria-hidden="true"
                            className="block h-16 w-full overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
                            style={{ backgroundImage: `url("${theme.preview}")`, backgroundSize: "cover", backgroundPosition: "center" }}
                          />
                        ) : (
                          <span aria-hidden="true" className="block h-16 w-full rounded-[var(--radius-control)] border border-[var(--border-subtle)] p-1.5" style={{ backgroundColor: theme.swatches[0] }}>
                            <span className="flex h-full items-center gap-1">
                              <span className="h-full w-1/4 rounded-[var(--radius-control)]" style={{ backgroundColor: theme.swatches[1] }} />
                              <span className="h-full w-1/2 rounded-[var(--radius-control)]" style={{ backgroundColor: theme.swatches[2] }}>
                                <span className="mt-2 mx-2 block h-1.5 rounded-full opacity-90" style={{ backgroundColor: theme.swatches[3] }} />
                              </span>
                              <span className="h-full w-1/4 rounded-[var(--radius-control)]" style={{ backgroundColor: theme.swatches[2] }} />
                            </span>
                          </span>
                        )}
                        <span className="mt-1.5 block truncate text-xs font-medium app-text-primary">{t(theme.labelKey)}</span>
                        <span className="mt-0.5 block truncate text-[10px] app-text-muted">{t(theme.descriptionKey)}</span>
                        {selected && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow">
                            <Icon name="check" size={12} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <label htmlFor="default-theme-mode" className="block text-sm font-medium app-text-primary">
            {t("themeDefaultMode")}
          </label>
          <div className="mt-2 inline-flex overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)]">
            {(["light", "dark"] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`app-btn !rounded-none px-3 py-2 text-sm ${skin !== "default" ? "opacity-60" : ""} ${themeMode === mode && skin === "default" ? "app-accent-bg" : ""}`}
                disabled={skin !== "default"}
                onClick={() => onThemeModeChange(mode)}
                aria-pressed={themeMode === mode && skin === "default"}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon name={mode === "dark" ? "moon" : "sun"} size={15} />
                  {mode === "dark" ? t("dark") : t("light")}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs app-text-muted">{t("themeModeOnlyDefault")}</p>
        </div>
      </section>

      <section className="app-surface p-4">
        {sectionTitle(t("settingsLanguage"))}
        <p className="mt-1 text-xs app-text-muted">{t("changeLanguageHint")}</p>
        <label htmlFor="language" className="sr-only">{t("language")}</label>
        <select
          id="language"
          className="app-select mt-3 max-w-xs"
          value={language}
          disabled={languageSaving}
          onChange={(event) => void changeLanguage(event.target.value as Language)}
        >
          <option value="zh-CN">{t("chinese")}</option>
          <option value="en">{t("english")}</option>
        </select>
        {languageError && <p role="alert" className="app-alert app-alert-error mt-2">{t("failedToSave", { message: languageError })}</p>}
      </section>

      {desktop && (
        <section className="app-surface p-4">
          {sectionTitle(t("settingsTrayDock"))}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="tray-display-mode" className="mb-1.5 block text-sm font-medium app-text-primary">{t("tray")}</label>
              <select
                id="tray-display-mode"
                className="app-select"
                value={displaySettings?.tray_display_mode ?? ""}
                disabled={displaySaving || !displaySettings}
                onChange={(event) => void changeDisplaySetting("set_tray_display_mode", event.target.value)}
              >
                <option value="icon_and_session">{t("iconAndSession")}</option>
                <option value="active_usage_text">{t("hourlyAndWeekly")}</option>
                <option value="hidden">{t("hidden")}</option>
              </select>
            </div>
            {displaySettings?.dock_display_mode !== null && (
              <div>
                <label htmlFor="dock-display-mode" className="mb-1.5 block text-sm font-medium app-text-primary">{t("dockIcon")}</label>
                <select
                  id="dock-display-mode"
                  className="app-select"
                  value={displaySettings?.dock_display_mode ?? ""}
                  disabled={displaySaving || !displaySettings}
                  onChange={(event) => void changeDisplaySetting("set_dock_display_mode", event.target.value)}
                >
                  <option value="show_in_dock">{t("showInDock")}</option>
                  <option value="menu_bar_only">{t("menuBarOnly")}</option>
                </select>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs app-text-muted">{t("atLeastOneIconVisible")}</p>
          {displayError && <p role="alert" className="app-alert app-alert-error mt-2">{t("couldNotUpdateDisplaySettings", { message: displayError })}</p>}
        </section>
      )}

      <section className="app-surface p-4">
        {sectionTitle(t("settingsAccountBehavior"))}
        <p className="mt-1 text-xs app-text-muted">{t("accountBehaviorDescription")}</p>
        <label className="mt-3 flex items-center gap-2 text-sm app-text-primary">
          <input
            type="checkbox"
            checked={autoWarmupAllEnabled}
            onChange={(event) => onAutoWarmupAllEnabledChange(event.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          {t("autoWarmupAll")}
        </label>
        <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
          <label className="flex items-center gap-2 text-sm app-text-primary">
            <input
              type="checkbox"
              checked={timedWarmupEnabled}
              onChange={(event) => onTimedWarmupEnabledChange(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {t("timedWarmupEnabled")}
          </label>
          <label htmlFor="timed-warmup-time" className="mb-1.5 mt-3 block text-xs font-medium app-text-secondary">{t("timeInputLabel")}</label>
          <input
            id="timed-warmup-time"
            type="time"
            className="app-input max-w-xs"
            value={draftTime}
            onChange={(event) => setDraftTime(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") addTime(); }}
          />
          <button type="button" className="app-btn mt-2 px-3 py-2 text-sm" onClick={addTime} disabled={!draftTime}>
            {t("addTime")}
          </button>
          <div className="mt-3 space-y-1.5">
            {timedWarmupTimes.length === 0 ? (
              <p className="text-xs app-text-muted">{t("noTimesConfigured")}</p>
            ) : (
              timedWarmupTimes.map((time) => (
                <div key={time} className="flex items-center justify-between gap-2 rounded-lg app-surface-secondary px-3 py-2 text-sm">
                  <span className="font-mono app-text-primary">{time}</span>
                  <button
                    type="button"
                    className="app-icon-button h-8 w-8"
                    onClick={() => onRemoveTimedWarmupTime(time)}
                    aria-label={t("removeScheduledTime", { time })}
                    title={t("removeScheduledTime", { time })}
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="app-surface p-4">
        {sectionTitle(t("settingsLifecycle"))}
        <p className="mt-1 text-xs app-text-muted">{t("closePreferenceDescription")}</p>
        <label htmlFor="codex-close-preference" className="sr-only">{t("closeCodex")}</label>
        <select
          id="codex-close-preference"
          className="app-select mt-3 max-w-xs"
          value={closePreference}
          onChange={(event) => onClosePreferenceChange(event.target.value as CodexClosePreference)}
        >
          <option value="ask">{t("askEveryTime")}</option>
          <option value="graceful">{t("gracefullyClose")}</option>
          <option value="force">{t("forceClose")}</option>
        </select>
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <p className="text-xs app-text-muted">{t("reopenPreferenceDescription")}</p>
          <label htmlFor="desktop-reopen-preference" className="sr-only">{t("reopenCodexAfterForceClose")}</label>
          <select
            id="desktop-reopen-preference"
            className="app-select mt-3 max-w-xs"
            value={reopenPreference}
            onChange={(event) => onReopenPreferenceChange(event.target.value as DesktopReopenPreference)}
          >
            <option value="ask">{t("askEveryTime")}</option>
            <option value="always">{t("reopenDesktopApp")}</option>
            <option value="never">{t("keepClosed")}</option>
          </select>
        </div>
      </section>
    </div>
  );
}