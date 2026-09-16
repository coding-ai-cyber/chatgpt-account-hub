import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  PROJECT_DOCS_URL,
  PROJECT_ISSUES_URL,
  PROJECT_RELEASES_URL,
  PROJECT_REPO_URL,
  PROJECT_UPDATE_MANIFEST_URL,
} from "../src/lib/links.ts";

test("project links point to the owner's repository", () => {
  assert.equal(PROJECT_REPO_URL, "https://github.com/coding-ai-cyber/codex_switch");
  assert.equal(PROJECT_DOCS_URL, `${PROJECT_REPO_URL}#readme`);
  assert.equal(PROJECT_ISSUES_URL, `${PROJECT_REPO_URL}/issues`);
  assert.equal(PROJECT_RELEASES_URL, `${PROJECT_REPO_URL}/releases/latest`);
  assert.equal(
    PROJECT_UPDATE_MANIFEST_URL,
    `${PROJECT_RELEASES_URL}/download/latest.json`,
  );
});

test("project consumers do not retain the original repository URL", () => {
  const root = resolve(import.meta.dirname, "..");
  const sources = [
    readFileSync(resolve(root, "src/pages/HelpPage.tsx"), "utf8"),
    readFileSync(resolve(root, "src-tauri/tauri.conf.json"), "utf8"),
    readFileSync(resolve(root, "README.md"), "utf8"),
  ];

  for (const source of sources) {
    assert.equal(source.includes("github.com/Lampese/codex-switcher"), false);
  }

  assert.equal(
    sources[1].includes(
      "github.com/coding-ai-cyber/codex_switch/releases/latest/download/latest.json",
    ),
    true,
  );
});

test("visible surfaces use the ChatGPT account hub brand", () => {
  const root = resolve(import.meta.dirname, "..");
  const visibleSurfaces = [
    ["index.html", ["<title>ChatGPT 账号管家</title>"]],
    ["tray.html", ["<title>ChatGPT 账号管家 · 托盘</title>"]],
    ["src/lib/i18n.tsx", ["ChatGPT 账号管家", "ChatGPT Account Hub"]],
    ["src/components/layout/Sidebar.tsx", ["ChatGPT 账号管家"]],
    ["src/TrayMenu.tsx", ["ChatGPT 账号管家"]],
    ["src-tauri/tauri.conf.json", ["ChatGPT 账号管家"]],
    ["src-tauri/tauri.windows.conf.json", ["ChatGPT 账号管家"]],
    ["src-tauri/tauri.macos.conf.json", ["ChatGPT 账号管家"]],
    ["src-tauri/tauri.linux.conf.json", ["ChatGPT 账号管家"]],
    ["src-tauri/src/tray.rs", ["ChatGPT 账号管家"]],
    ["src-tauri/src/i18n.rs", ["ChatGPT 账号管家", "ChatGPT Account Hub"]],
    ["src-tauri/src/web.rs", ["ChatGPT Account Hub"]],
    ["src-tauri/src/auth/oauth_server.rs", ["ChatGPT Account Hub"]],
    ["public/themes/illustrated.svg", ["ChatGPT Account Hub"]],
    ["README.md", ["ChatGPT 账号管家", "ChatGPT Account Hub"]],
    ["package.json", ["ChatGPT Account Hub"]],
  ] as const;

  for (const [file, expectedNames] of visibleSurfaces) {
    const source = readFileSync(resolve(root, file), "utf8");
    for (const staleName of ["Codex Switcher", "Codex.Switcher"]) {
      assert.equal(
        source.includes(staleName),
        false,
        `${file} retains the stale visible product name ${staleName}`,
      );
    }

    for (const expectedName of expectedNames) {
      assert.equal(
        source.includes(expectedName),
        true,
        `${file} is missing ${expectedName}`,
      );
    }
  }

  const processSource = readFileSync(
    resolve(root, "src-tauri/src/commands/process.rs"),
    "utf8",
  );
  assert.equal(
    processSource.includes("Codex Switcher needs permission"),
    false,
    "the macOS elevation prompt retains the stale visible product name",
  );
  assert.equal(
    processSource.includes("ChatGPT Account Hub needs permission"),
    true,
    "the macOS elevation prompt is missing the English product name",
  );

  const readme = readFileSync(resolve(root, "README.md"), "utf8");
  for (const packagePattern of [
    "ChatGPT 账号管家_*_aarch64.dmg",
    "ChatGPT 账号管家_*_x64.dmg",
    "ChatGPT 账号管家_*_x64-setup.exe",
    "ChatGPT 账号管家_*_x64_en-US.msi",
    "ChatGPT 账号管家_*_amd64.deb",
    "ChatGPT 账号管家_*_amd64.AppImage",
    "ChatGPT 账号管家-*-1.x86_64.rpm",
  ]) {
    assert.equal(
      readme.includes(packagePattern),
      true,
      `README.md is missing release package pattern ${packagePattern}`,
    );
  }
  assert.equal(
    readme.includes("pgrep -x 'codex-switcher'"),
    true,
    "the macOS keep-awake command must use the retained executable name",
  );
  assert.equal(
    readme.includes("pgrep -x 'ChatGPT 账号管家'"),
    false,
    "the macOS keep-awake command must not use the display name",
  );
});
