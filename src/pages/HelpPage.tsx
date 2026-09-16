import type { TranslationKey } from "../lib/i18n";
import { useLanguage } from "../lib/i18n";
import { openExternalUrl } from "../lib/platform";
import { Icon } from "../components/layout/Icon";

const ONLINE_DOCS_URL = "https://github.com/Lampese/codex-switcher#readme";
const ISSUES_URL = "https://github.com/Lampese/codex-switcher/issues";

interface HelpSection {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const HELP_SECTIONS: readonly HelpSection[] = [
  { titleKey: "helpGettingStartedTitle", bodyKey: "helpGettingStartedBody" },
  { titleKey: "helpAccountsTitle", bodyKey: "helpAccountsBody" },
  { titleKey: "helpQuotasTitle", bodyKey: "helpQuotasBody" },
  { titleKey: "helpWarmupTitle", bodyKey: "helpWarmupBody" },
  { titleKey: "helpClosingTitle", bodyKey: "helpClosingBody" },
  { titleKey: "helpTrayTitle", bodyKey: "helpTrayBody" },
  { titleKey: "helpErrorsTitle", bodyKey: "helpErrorsBody" },
  { titleKey: "helpPrivacyTitle", bodyKey: "helpPrivacyBody" },
];

interface HelpPageProps {
  onCheckUpdates: () => void;
}

export function HelpPage({ onCheckUpdates }: HelpPageProps) {
  const { t } = useLanguage();

  return (
    <div className="app-page space-y-4">
      <section className="app-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl app-accent-bg">
            <Icon name="help" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold app-text-primary">{t("helpLocalGuide")}</h2>
            <p className="mt-0.5 text-xs app-text-secondary">{t("navHelpDescription")}</p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        {HELP_SECTIONS.map((section) => (
          <details key={section.titleKey} className="help-section">
            <summary className="app-details-button flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold app-text-primary hover:bg-[var(--surface-secondary)]">
              <span>{t(section.titleKey)}</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md app-surface-secondary">
                <Icon name="chevron-down" size={14} className="app-text-muted" />
              </span>
            </summary>
            <p className="whitespace-pre-line border-t border-[var(--border-subtle)] px-4 py-3 text-sm leading-6 app-text-secondary">
              {t(section.bodyKey)}
            </p>
          </details>
        ))}
      </section>

      <section className="app-surface p-4">
        <h3 className="app-section-label">{t("onlineDocs")}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="app-btn flex items-center justify-center gap-2 px-3 py-2.5 text-sm"
            onClick={() => void openExternalUrl(ONLINE_DOCS_URL)}
          >
            <Icon name="external" size={16} />
            {t("onlineDocs")}
          </button>
          <button
            type="button"
            className="app-btn flex items-center justify-center gap-2 px-3 py-2.5 text-sm"
            onClick={() => void openExternalUrl(ISSUES_URL)}
          >
            <Icon name="warning" size={16} />
            {t("reportIssue")}
          </button>
          <button
            type="button"
            className="app-btn flex items-center justify-center gap-2 px-3 py-2.5 text-sm"
            onClick={onCheckUpdates}
          >
            <Icon name="refresh" size={16} />
            {t("checkForUpdates")}
          </button>
        </div>
      </section>
    </div>
  );
}