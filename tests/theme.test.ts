import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSkin, type SkinId } from '../src/lib/theme.ts';

test('uses the default skin for unknown or empty values', () => {
  assert.equal(parseSkin(undefined), 'default');
  assert.equal(parseSkin(null), 'default');
  assert.equal(parseSkin(''), 'default');
  assert.equal(parseSkin('missing'), 'default');
});

test('accepts all 13 skin ids', () => {
  const skins: SkinId[] = [
    'default', 'mint', 'graphite', 'aurora', 'cyberpunk', 'minecraft',
    'glass', 'illustrated', 'mcwood', 'anime-sunset', 'anime-neon',
    'anime-forest', 'anime-stars',
  ];

  for (const skin of skins) {
    assert.equal(parseSkin(skin), skin);
  }
});

test('keeps the legacy anime alias compatible', () => {
  assert.equal(parseSkin('anime-sakura'), 'anime-sunset');
});