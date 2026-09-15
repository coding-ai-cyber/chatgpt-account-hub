import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_LANGUAGE,
  languageLocale,
  parseLanguage,
  type Language,
} from '../src/lib/language.ts';

test('uses zh-CN as the default language', () => {
  assert.equal(DEFAULT_LANGUAGE, 'zh-CN');
  assert.equal(parseLanguage(undefined), 'zh-CN');
  assert.equal(parseLanguage(null), 'zh-CN');
  assert.equal(parseLanguage(''), 'zh-CN');
  assert.equal(parseLanguage('fr-FR'), 'zh-CN');
});

test('accepts only supported language values', () => {
  const values: Language[] = ['zh-CN', 'en'];

  for (const value of values) {
    assert.equal(parseLanguage(value), value);
  }
});

test('maps languages to their locales', () => {
  assert.equal(languageLocale('zh-CN'), 'zh-CN');
  assert.equal(languageLocale('en'), 'en-US');
});

test('keeps Chinese and English translation keys in sync', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/i18n.tsx', import.meta.url)),
    'utf8',
  );
  const englishBody = source.match(/const englishTranslations = \{([\s\S]*?)\} as const;/)?.[1];
  const chineseBody = source.match(/const chineseTranslations: Record<TranslationKey, string> = \{([\s\S]*?)\n\};/)?.[1];

  assert.ok(englishBody);
  assert.ok(chineseBody);
  const englishKeys = [...englishBody.matchAll(/^\s+([A-Za-z][A-Za-z0-9]*):/gm)].map((match) => match[1]).sort();
  const chineseKeys = englishKeys.filter((key) => new RegExp(`\\b${key}:`).test(chineseBody));

  assert.deepEqual(
    chineseKeys,
    englishKeys,
  );
});

test('keeps the visible React copy inventory in the translation dictionary', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/i18n.tsx', import.meta.url)),
    'utf8',
  );
  const requiredKeys = [
    'minimize', 'restore', 'maximize', 'closeRunningCodexProcesses', 'openCodexApp',
    'opening', 'showAllAccountNamesAndEmails', 'hideAllAccountNamesAndEmails',
    'refreshingAllUsage', 'refreshAllUsage', 'warmingUpAllAccounts', 'warmUpAllAccounts',
    'hideAccountSearch', 'searchAccounts', 'menu', 'autoWarmUp', 'timer', 'appearance',
    'timedWarmup', 'exporting', 'exportSlimText', 'importing', 'importSlimText',
    'exportFullEncryptedFile', 'importFullEncryptedFile', 'loadingAccounts',
    'failedToLoadAccounts', 'searchAccountsByNameOrEmail', 'clearAccountSearch',
    'resetEarliestToLatest', 'resetLatestToEarliest', 'checkingDesktopApp',
    'closeAndSwitchAccount', 'dontAskAgain', 'exportStringWillAppearHere',
    'pasteConfigStringHere', 'copyString', 'importMissingAccounts', 'never', 'justNow',
    'neverUsed', 'apiKey', 'clickToRename', 'showInfo', 'hideInfo',
    'closeRunningCodexProcessesAndSwitchAccount', 'switching', 'hideUsageStatistics',
    'showUsageStatistics', 'removeAccount', 'chatGPTLogin', 'importFile',
    'leaveBlankToUseEmail', 'waitingForBrowserLogin', 'copiedBang', 'generateLoginLink',
    'weeklyLimit', 'atLeastOneIconVisible', 'loadingDisplaySettings',
    'couldNotUpdateDisplaySettings', 'askEveryTime', 'gracefullyClose', 'reopenDesktopApp',
    'keepClosed', 'done', 'downloadingUpdate', 'all', 'allReported', 'tokenActivity',
    'tokenActivityRange', 'longestTask', 'longestStreak', 'days', 'fastMode', 'reasoning',
    'skillsExplored', 'totalThreads', 'statsAsOf', 'chatGPTBackend', 'refreshUsageStats',
    'lifetime', 'reported', 'currentStreak', 'peakDay', 'resetCreditExpiryDetails',
    'resetsNow', 'resetsIn', 'neverExpiry', 'cannotSwitchWhile', 'codexUsageStatsSource',
    'noFileSelected', 'exportFullEncryptedAccountConfig', 'importFullEncryptedAccountConfig',
    'codexWillOnlyBeClosed', 'unsavedCodexWorkMayBeLost', 'desktopAppNotIdentified',
    'couldNotCheckRunningCodexProcesses', 'noAccountsAvailableForWarmup', 'warming',
    'usageRefreshedSuccessfully', 'clickDeleteAgainToConfirmRemoval', 'clipboardUnavailablePleaseCopyManually',
    'switchedAccountFromTray', 'accountSwitchBlocked', 'accountSwitchedDesktopReopened', 'codexDesktopReopened',
    'noClosedDesktopAppIdentified', 'autoWarming', 'timedWarming', 'slimExportFailed', 'pleasePasteSlimTextFirst',
    'slimImportFailed', 'fullEncryptedFileExported', 'fullExportFailed', 'fullImportFailed', 'codexAppOpened',
    'closeCodex', 'stopsCodexImmediately', 'asksCodexQuitNormally', 'codexDesktopReopensAutomatically',
    'codexDesktopStaysClosed', 'forceClosing', 'closing', 'generating', 'clipboardUnavailableCopyLinkManually',
    'adding', 'sendingWarmupRequest', 'sendMinimalWarmupRequest', 'autoWarmupEnabledForAllAccounts',
    'disableAutoWarmupForThisAccount', 'enableAutoWarmupForThisAccount', 'usageStatsChatGPTOnly',
    'usageStatsUnavailable',
    'disableAutoWarmupForAllAccounts', 'enableAutoWarmupForAllAccounts', 'refreshUsage',
    'waiting', 'waitingReset', 'iconAndSession', 'pleaseSelectAuthFile', 'unknown',
    'autoOn', 'autoOff', 'timedOff', 'timedAt', 'last30Days', 'last3Months', 'last6Months',
    'last7DaysLabel',
    'requestFailedWithStatus', 'codexProcessesRunning', 'switchFailed',
    'couldNotSavePreference', 'couldNotSaveClosePreference', 'closeFailed',
    'switchedAccountAfterClosing', 'codexClosedAccountSwitchedReopenFailed',
    'codexClosedReopenFailed', 'switchFailedAfterClosing', 'warmupSentFor',
    'warmupFailedFor', 'warmupSentForAll', 'warmupPartialFailure', 'warmupAllFailed',
    'autoWarmupSentFor', 'autoWarmupFailedFor', 'timedWarmupSent',
    'timedWarmupPartialFailure', 'slimTextExported', 'importSummary', 'openCodexFailed',
    'noTimesAdded', 'removeTime', 'add', 'noAccountsYet', 'addFirstAccount',
    'noMatchingAccounts', 'tryDifferentAccount', 'activeAccount', 'otherAccountsCount',
    'otherAccountsFilteredCount', 'sort', 'remainingHighestToLowest',
    'remainingLowestToHighest', 'expiryEarliestToLatest', 'expiryLatestToEarliest',
    'closeRunningCodexQuestion', 'closeProcessesBlockingSwitch',
    'codexCloseSettingSummary', 'forceCloseCodex', 'rememberSelection',
    'afterClosingSwitchTo', 'reopenCodexDesktopAfterClose', 'keepSwitcherInDock',
    'closedWindowDockOrMenuBar', 'changeLaterFromTray', 'keepInDock',
    'existingAccountsKept', 'slimStringContainsSecrets', 'accountNameOptional',
    'openFollowingLoginLink', 'oauthSameHost', 'generateLoginLinkHelp', 'browse',
    'importAuthJsonHelp', 'import', 'fetchingUsage', 'noRateLimitData',
    'fiveHourLimit', 'percentLeft', 'credits', 'secondsAgo', 'minutesAgo',
    'hoursAgo', 'expiredOn', 'untilDate', 'dailyActivityUnavailable',
    'thirtyDaysShort', 'threeMonthsShort', 'sixMonthsShort', 'moreUsageDetails',
    'activityInsights', 'mostUsedPlugins', 'runs', 'updatedAgo', 'last7DaysTitle',
    'availableResets', 'oneReset', 'multipleResets', 'noExpiryLower',
    'expiryUnavailableLower', 'closestExpiry', 'clickForExpiryDetails',
    'resetOrdinal', 'timesShownLocal', 'update', 'updateReady', 'restart',
    'updateInstallFailed', 'dismiss',
  ];
  const englishBody = source.match(/const englishTranslations = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
  const missing = requiredKeys.filter((key) => !new RegExp(`\\b${key}:`).test(englishBody));
  assert.deepEqual(missing, []);
});

test('routes the complete visible React copy inventory through useLanguage', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const expectedKeysByFile: Record<string, string[]> = {
    'src/App.tsx': [
      'unknownError', 'couldNotCheckRunningCodexProcesses', 'switchFailed',
      'switchedAccountFromTray', 'accountSwitchBlocked', 'closeFailed',
      'couldNotSavePreference', 'couldNotSaveClosePreference',
      'switchedAccountAfterClosing', 'accountSwitchedDesktopReopened',
      'codexDesktopReopened', 'codexClosedAccountSwitchedReopenFailed',
      'codexClosedReopenFailed', 'noClosedDesktopAppIdentified',
      'switchFailedAfterClosing', 'warmupSentFor', 'warmupFailedFor',
      'noAccountsAvailableForWarmup', 'warmupSentForAll', 'warmupPartialFailure',
      'warmupAllFailed', 'autoWarmupSentFor', 'autoWarmupFailedFor',
      'timedWarmupSent', 'timedWarmupPartialFailure', 'slimTextExported',
      'slimExportFailed', 'pleasePasteSlimTextFirst', 'importSummary',
      'slimImportFailed', 'fullEncryptedFileExported', 'fullExportFailed',
      'fullImportFailed', 'codexAppOpened', 'openCodexFailed', 'minimize',
      'restore', 'maximize', 'close', 'codexProcessesRunning',
      'closeRunningCodexProcesses', 'openCodexApp', 'opening',
      'showAllAccountNamesAndEmails', 'hideAllAccountNamesAndEmails',
      'refreshingAllUsage', 'refreshAllUsage', 'warmingUpAllAccounts',
      'warmUpAllAccounts', 'hideAccountSearch', 'searchAccounts', 'menu',
      'settings', 'autoWarmUp', 'timer', 'appearance', 'dark', 'light',
      'timedWarmup', 'noTimesAdded', 'removeTime', 'add', 'account',
      'addAccount', 'exporting', 'exportSlimText', 'importing', 'importSlimText',
      'exportFullEncryptedFile', 'importFullEncryptedFile', 'loadingAccounts',
      'failedToLoadAccounts', 'noAccountsYet', 'addFirstAccount',
      'noMatchingAccounts', 'tryDifferentAccount', 'searchAccountsByNameOrEmail',
      'clearAccountSearch', 'activeAccount', 'otherAccountsCount',
      'otherAccountsFilteredCount', 'sort', 'resetEarliestToLatest',
      'resetLatestToEarliest', 'remainingHighestToLowest',
      'remainingLowestToHighest', 'expiryEarliestToLatest',
      'expiryLatestToEarliest', 'usageRefreshedSuccessfully',
      'clickDeleteAgainToConfirmRemoval', 'closeRunningCodexQuestion',
      'closeProcessesBlockingSwitch', 'codexCloseSettingSummary',
      'forceCloseCodex', 'rememberSelection', 'stopsCodexImmediately',
      'asksCodexQuitNormally', 'afterClosingSwitchTo', 'checkingDesktopApp',
      'codexDesktopReopensAutomatically', 'codexDesktopStaysClosed',
      'changeLaterInSettings', 'reopenCodexDesktopAfterClose',
      'terminalSessionsWillNotReopen', 'codexWillOnlyBeClosed',
      'unsavedCodexWorkMayBeLost', 'cancel', 'forceClosing', 'closing',
      'closeAndSwitchAccount', 'closeCodex', 'keepSwitcherInDock',
      'closedWindowDockOrMenuBar', 'changeLaterFromTray', 'dontAskAgain',
      'keepInDock', 'menuBarOnly', 'existingAccountsKept',
      'slimStringContainsSecrets', 'generating', 'exportStringWillAppearHere',
      'pasteConfigStringHere', 'clipboardUnavailablePleaseCopyManually',
      'copied', 'copyString', 'importMissingAccounts',
    ],
    'src/TrayMenu.tsx': [
      'unknownError', 'codexUsageStatsSource', 'disableAutoWarmupForAllAccounts',
      'enableAutoWarmupForAllAccounts', 'autoOn', 'autoOff', 'refreshUsage',
      'loading', 'noAccountsConfigured', 'session', 'weekly', 'percentLeft',
      'resetsNow', 'resetsIn', 'usageUnavailable', 'today', 'last7Days',
      'dock', 'show', 'menuBar', 'openCodexSwitcher', 'quit',
    ],
    'src/components/AccountCard.tsx': [
      'never', 'justNow', 'secondsAgo', 'minutesAgo', 'hoursAgo',
      'expiryUnavailable', 'expiredOn', 'untilDate', 'apiKey', 'unknown',
      'clickToRename', 'refreshUsage', 'showInfo', 'hideInfo', 'lastUpdated',
      'active', 'closeRunningCodexProcessesAndSwitchAccount', 'switching',
      'switch', 'sendingWarmupRequest', 'sendMinimalWarmupRequest',
      'autoWarmupEnabledForAllAccounts', 'disableAutoWarmupForThisAccount',
      'enableAutoWarmupForThisAccount', 'hideUsageStatistics',
      'showUsageStatistics', 'removeAccount',
    ],
    'src/components/AccountUsageStats.tsx': [
      'codexUsageStatsSource', 'justNow', 'minutesAgo', 'hoursAgo',
      'thirtyDaysShort', 'threeMonthsShort', 'sixMonthsShort', 'all',
      'last30Days', 'last3Months', 'last6Months', 'allReported',
      'dailyActivityUnavailable', 'tokenActivity', 'tokenActivityRange',
      'moreUsageDetails', 'reported', 'longestTask', 'longestStreak', 'days',
      'activityInsights', 'fastMode', 'reasoning', 'skillsExplored',
      'totalThreads', 'mostUsedPlugins', 'runs', 'usageStatsChatGPTOnly',
      'statsAsOf', 'chatGPTBackend', 'updatedAgo', 'refreshUsageStats',
      'lifetime', 'today', 'last7DaysTitle', 'currentStreak', 'peakDay',
      'tokens', 'usageStatsUnavailable',
    ],
    'src/components/AddAccountModal.tsx': [
      'pleaseSelectAuthFile', 'addAccount', 'chatGPTLogin', 'importFile',
      'accountNameOptional', 'leaveBlankToUseEmail', 'waitingForBrowserLogin',
      'openFollowingLoginLink', 'clipboardUnavailableCopyLinkManually',
      'copiedBang', 'copy', 'open', 'oauthSameHost', 'generateLoginLinkHelp',
      'selectAuthFile', 'browse', 'importAuthJsonHelp', 'cancel', 'adding',
      'generateLoginLink', 'import',
    ],
    'src/components/ResetCreditsMenu.tsx': [
      'noExpiry', 'expiryUnavailable', 'expiresOn', 'oneReset',
      'multipleResets', 'noExpiryLower', 'expiryUnavailableLower',
      'closestExpiry', 'clickForExpiryDetails', 'resetCreditExpiryDetails',
      'availableResets', 'resetOrdinal', 'timesShownLocal',
    ],
    'src/components/UpdateChecker.tsx': [
      'updateAvailable', 'later', 'update', 'downloadingUpdate',
      'updateReady', 'restart', 'updateInstallFailed', 'dismiss',
    ],
    'src/components/UsageBar.tsx': [
      'resetsNow', 'percentLeft', 'resetsIn', 'fetchingUsage',
      'noRateLimitData', 'fiveHourLimit', 'weeklyLimit', 'credits',
    ],
  };

  for (const [relativePath, keys] of Object.entries(expectedKeysByFile)) {
    const source = readFileSync(`${root}/${relativePath}`, 'utf8');
    assert.match(source, /useLanguage\(\)/, `${relativePath} must use the shared language context`);
    for (const key of keys) {
      assert.match(source, new RegExp(`t\\(["']${key}["']`), `${relativePath} must translate ${key}`);
    }
  }

  const traySource = readFileSync(`${root}/src/TrayMenu.tsx`, 'utf8');
  assert.match(traySource, /languageLocale\(language\)/);

  const platformSource = readFileSync(`${root}/src/lib/platform.ts`, 'utf8');
  assert.match(platformSource, /import type \{ Translate \} from "\.\/i18n"/);
  for (const key of [
    'requestFailedWithStatus', 'selectAuthFile', 'exportFullEncryptedAccountConfig',
    'importFullEncryptedAccountConfig', 'fullEncryptedBackup', 'noFileSelected',
  ]) {
    assert.match(platformSource, new RegExp(`t\\(["']${key}["']`), `platform.ts must translate ${key}`);
  }
  assert.match(platformSource, /export function setPlatformTranslate\(translate: Translate \| null\)/);

  const i18nSource = readFileSync(`${root}/src/lib/i18n.tsx`, 'utf8');
  assert.match(i18nSource, /setPlatformTranslate\(t\)/);
});

test('persists a normalized backend language after loading it', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/i18n.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(
    source,
    /const nextLanguage = parseLanguage\(await invokeBackend<string>\("get_language"\)\);[\s\S]*?setLanguageState\(nextLanguage\);[\s\S]*?window\.localStorage\.setItem\(LANGUAGE_STORAGE_KEY, nextLanguage\)/,
  );
});

test('loads the persisted backend language in web mode during provider initialization', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/i18n.tsx', import.meta.url)),
    'utf8',
  );
  const providerSource = source.slice(source.indexOf('export function LanguageProvider'));

  assert.match(
    providerSource,
    /useEffect\(\(\) => \{[\s\S]*?void loadBackendLanguage\(\);[\s\S]*?if \(isTauriRuntime\(\)\)/,
  );
  assert.doesNotMatch(providerSource, /if \(!isTauriRuntime\(\)\) return;/);
});

test('does not let a stale backend language load overwrite a newer selection', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/i18n.tsx', import.meta.url)),
    'utf8',
  );
  const loadSource = source.slice(
    source.indexOf('const loadBackendLanguage'),
    source.indexOf('const setLanguage ='),
  );
  const saveSource = source.slice(
    source.indexOf('const setLanguage ='),
    source.indexOf('const t ='),
  );

  assert.match(source, /const languageRequestId = useRef\(0\);/);
  assert.match(source, /const languageSaveQueue = useRef\(Promise\.resolve\(\)\);/);
  assert.match(loadSource, /const requestId = \+\+languageRequestId\.current;/);
  assert.match(loadSource, /const saveQueue = languageSaveQueue\.current;/);
  assert.match(loadSource, /await saveQueue;/);
  assert.match(loadSource, /if \(requestId !== languageRequestId\.current\) return;/);
  assert.match(saveSource, /const requestId = \+\+languageRequestId\.current;/);
  assert.match(saveSource, /const save = languageSaveQueue\.current\.then\(/);
  assert.match(saveSource, /await invokeBackend\("set_language", \{ language: nextLanguage \}\);[\s\S]*?if \(requestId !== languageRequestId\.current\) return;/);
  assert.match(saveSource, /languageSaveQueue\.current = save\.catch\(\(\) => \{\}\);/);
  assert.match(saveSource, /return save;/);
});

test('mounts language providers and saves language selection from settings', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const mainSource = readFileSync(`${root}/src/main.tsx`, 'utf8');
  const traySource = readFileSync(`${root}/src/tray-main.tsx`, 'utf8');
  const settingsSource = readFileSync(`${root}/src/components/SettingsModal.tsx`, 'utf8');

  assert.match(mainSource, /<LanguageProvider>\s*<App\s*\/>\s*<\/LanguageProvider>/);
  assert.match(traySource, /<LanguageProvider>\s*<TrayMenu\s*\/>\s*<\/LanguageProvider>/);
  assert.match(settingsSource, /const \{ language, setLanguage, t \} = useLanguage\(\);/);
  assert.match(settingsSource, /id="language"[\s\S]*?value=\{language\}[\s\S]*?disabled=\{languageSaving\}/);
  assert.match(settingsSource, /await setLanguage\(nextLanguage\);/);
  assert.match(settingsSource, /catch \(err\) \{[\s\S]*?setLanguageError\(String\(err\)\);/);
  assert.match(settingsSource, /t\("settings"\)/);
  assert.match(settingsSource, /t\("failedToSave", \{ message: languageError \}\)/);
});

test('keeps language and display setting errors independent', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/components/SettingsModal.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(source, /const \[displayError, setDisplayError\] = useState<string \| null>\(null\);/);
  assert.match(source, /const \[languageError, setLanguageError\] = useState<string \| null>\(null\);/);
  assert.match(source, /setDisplaySettings\(settings\);\s*setDisplayError\(null\);/);
  assert.match(source, /catch \(err\) \{\s*setLanguageError\(String\(err\)\);/);
  assert.match(source, /displayError && <p[\s\S]*?t\("couldNotUpdateDisplaySettings", \{ message: displayError \}\)/);
  assert.match(source, /languageError && <p[\s\S]*?t\("failedToSave", \{ message: languageError \}\)/);
});

test('shows language save errors outside the desktop-only settings block', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/components/SettingsModal.tsx', import.meta.url)),
    'utf8',
  );
  const desktopBlockStart = source.indexOf('{desktop && (');
  const desktopBlockEnd = source.indexOf('          )}', desktopBlockStart);
  const languageError = source.indexOf('{languageError &&');
  const languageLabel = source.indexOf('<label htmlFor="language"');

  assert.ok(desktopBlockStart >= 0);
  assert.ok(desktopBlockEnd > desktopBlockStart);
  assert.ok(languageError > languageLabel);
  assert.ok(languageError > desktopBlockEnd);
});

test('interpolates arbitrary named translation parameters', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/i18n.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(source, /\\\{\(\[A-Za-z\]\[A-Za-z0-9\]\*\)\\\}\/g/);
});
