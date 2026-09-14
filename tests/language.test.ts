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
