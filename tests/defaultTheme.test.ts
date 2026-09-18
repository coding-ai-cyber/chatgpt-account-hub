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

function hexRgb(value: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  assert.ok(match, `expected a hex color, got ${value}`);
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16),
  ];
}

function relativeLuminance(value: string): number {
  const channels = hexRgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function blendRgbaOver(rgba: string, background: string): string {
  const match =
    /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*(0?\.\d+)\s*\)$/i.exec(rgba);
  assert.ok(match, `expected an rgba color, got ${rgba}`);
  const [red, green, blue] = [1, 2, 3].map((index) =>
    Number.parseInt(match[index], 10),
  );
  const alpha = Number.parseFloat(match[4]);
  const [bgRed, bgGreen, bgBlue] = hexRgb(background);
  return `#${[red, green, blue]
    .map((channel, index) =>
      Math.round(
        channel * alpha + [bgRed, bgGreen, bgBlue][index] * (1 - alpha),
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function parseThemeBlock(selector: string): Record<string, string> {
  const start = themes.indexOf(selector);
  assert.notEqual(start, -1, `missing ${selector}`);
  const open = themes.indexOf("{", start);
  const close = themes.indexOf("}", open);
  const tokens: Record<string, string> = {};
  for (const match of themes.slice(open + 1, close).matchAll(
    /(--[\w-]+)\s*:\s*([^;]+);/g,
  )) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

test("mcwood text keeps 4.5:1 contrast on its lit toolbar, sidebar, and surfaces", () => {
  const mcwood = parseThemeBlock(':root[data-skin="mcwood"]');
  const surfaces = [
    "--toolbar-bg",
    "--sidebar-bg",
    "--surface-primary",
    "--surface-secondary",
  ];
  for (const surface of surfaces) {
    for (const text of [
      "--text-primary",
      "--text-secondary",
      "--text-muted",
    ]) {
      assert.ok(
        contrastRatio(mcwood[text], mcwood[surface]) >= 4.5,
        `${text} has insufficient contrast on ${surface}`,
      );
    }
  }
  for (const [text, background] of [
    ["--success", "--success-soft"],
    ["--warning", "--warning-soft"],
    ["--danger", "--danger-soft"],
  ] as const) {
    for (const surface of surfaces) {
      assert.ok(
        contrastRatio(
          mcwood[text],
          blendRgbaOver(mcwood[background], mcwood[surface]),
        ) >= 4.5,
        `${text} has insufficient contrast on ${background} over ${surface}`,
      );
    }
  }
  assert.ok(
    contrastRatio(mcwood["--accent-contrast"], mcwood["--accent"]) >= 4.5,
    "accent button text has insufficient contrast",
  );
});
