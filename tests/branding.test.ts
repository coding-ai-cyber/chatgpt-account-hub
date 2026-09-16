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
