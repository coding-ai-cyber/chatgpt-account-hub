import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tokens = readFileSync(`${root}/src/styles/tokens.css`, "utf8");
const themes = readFileSync(`${root}/src/styles/themes.css`, "utf8");

test("default tokens define the approved soft-gradient dashboard", () => {
  assert.match(tokens, /--app-bg:\s*#f4f7fc;/);
  assert.match(tokens, /--app-bg-image:[\s\S]*radial-gradient[\s\S]*radial-gradient/);
  assert.match(tokens, /--sidebar-width:\s*188px;/);
  assert.match(tokens, /--surface-primary:\s*rgba\(255,\s*255,\s*255,\s*0\.94\);/);
  assert.match(tokens, /--radius-card:\s*0\.875rem;/);
});

test("representative custom skins continue overriding their own palettes", () => {
  for (const skin of ["mint", "graphite", "glass", "illustrated"]) {
    assert.match(themes, new RegExp(`:root\\[data-skin="${skin}"\\]`));
  }
});
