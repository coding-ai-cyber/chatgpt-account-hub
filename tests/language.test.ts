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
  ];
  const englishBody = source.match(/const englishTranslations = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
  const missing = requiredKeys.filter((key) => !new RegExp(`\\b${key}:`).test(englishBody));
  assert.deepEqual(missing, []);
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
  assert.match(settingsSource, /catch \(err\) \{[\s\S]*?setErrorTranslation\("failedToSave"\);[\s\S]*?setError\(String\(err\)\);/);
  assert.match(settingsSource, /t\("settings"\)/);
  assert.match(settingsSource, /t\(errorTranslation, \{ message: error \}\)/);
});
