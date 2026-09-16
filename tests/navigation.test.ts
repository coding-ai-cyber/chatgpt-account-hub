import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTIVE_PAGE_STORAGE_KEY,
  NAV_ITEMS,
  parsePageId,
  type PageId,
} from '../src/app/navigation.ts';

test('falls back to the current account page for unknown values', () => {
  assert.equal(parsePageId(undefined), 'current-account');
  assert.equal(parsePageId(null), 'current-account');
  assert.equal(parsePageId(''), 'current-account');
  assert.equal(parsePageId('totally-unknown'), 'current-account');
});

test('accepts every documented page id', () => {
  const pages: PageId[] = [
    'current-account',
    'other-accounts',
    'usage-stats',
    'help',
    'settings',
  ];

  for (const page of pages) {
    assert.equal(parsePageId(page), page);
  }
});

test('navigation storage key and menu items stay stable', () => {
  assert.equal(ACTIVE_PAGE_STORAGE_KEY, 'codex-switcher-active-page');
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.id),
    ['current-account', 'other-accounts', 'usage-stats', 'help', 'settings'],
  );
});