# ChatGPT 账号管家品牌与发布资产实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将应用可见品牌切换为「ChatGPT 账号管家 · ChatGPT Account Hub」，把项目链接切换到 `coding-ai-cyber/codex_switch`，并生成统一的新桌面/托盘图标。

**Architecture:** 使用一个前端项目链接模块集中管理仓库、文档、反馈、发布和 updater manifest 地址；可见名称通过翻译键和 Tauri 平台配置同步，旧 crate 名、数据目录、localStorage 键和事件名保留以保证升级兼容。以 SVG 作为唯一图标母版，通过 Tauri 图标生成命令派生所有平台资源。

**Tech Stack:** React 19、TypeScript、Vite、Tauri 2、Rust、Node `node:test`、Playwright、Tauri CLI icon generator。

## Global Constraints

- 中文显示名必须为 `ChatGPT 账号管家`，英文副标题必须为 `ChatGPT Account Hub`。
- 项目仓库根地址必须为 `https://github.com/coding-ai-cyber/codex_switch`。
- 旧 localStorage 键、`.codex-switcher` 配置目录、Rust crate 名和内部事件名保持不变。
- 默认主题、精确 `--text-muted: #8795a9`、13 套皮肤、5 个独立页面和 600×500 最小窗口保持不变。
- 图标母版为 1024×1024 SVG；不得复制 OpenAI 标志或在小尺寸图标中放长文本。
- 每个任务必须先写失败测试，再实现、回归测试并单独提交。

---

### Task 1: 集中治理项目链接

**Files:**
- Create: `src/lib/links.ts`
- Modify: `src/pages/HelpPage.tsx`
- Modify: `src/App.tsx:1420-1423`
- Modify: `src-tauri/tauri.conf.json:44-51`
- Modify: `README.md` 项目仓库、发布页、克隆命令链接
- Test: `tests/branding.test.ts`

**Interfaces:**
- Produces `PROJECT_REPO_URL`, `PROJECT_DOCS_URL`, `PROJECT_ISSUES_URL`, `PROJECT_RELEASES_URL`, `PROJECT_UPDATE_MANIFEST_URL` as exported string constants.
- `HelpPage` imports the docs/issues constants; manual update event name stays `codex-switcher-check-updates` for compatibility.

- [ ] **Step 1: Write the failing link assertions**

Add `tests/branding.test.ts` with these exact assertions:

```ts
import assert from "node:assert/strict";
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
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --experimental-strip-types --test tests/branding.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/links.ts`.

- [ ] **Step 3: Implement the link module and consumers**

Create `src/lib/links.ts`:

```ts
export const PROJECT_REPO_URL = "https://github.com/coding-ai-cyber/codex_switch";
export const PROJECT_DOCS_URL = `${PROJECT_REPO_URL}#readme`;
export const PROJECT_ISSUES_URL = `${PROJECT_REPO_URL}/issues`;
export const PROJECT_RELEASES_URL = `${PROJECT_REPO_URL}/releases/latest`;
export const PROJECT_UPDATE_MANIFEST_URL = `${PROJECT_RELEASES_URL}/download/latest.json`;
```

Replace `HelpPage`'s two hard-coded URLs with imports from this module. Change `tauri.conf.json` updater endpoint to `PROJECT_UPDATE_MANIFEST_URL`'s literal value because JSON cannot import TypeScript. Change README project links to the same repository and release paths. Keep the README link to `https://github.com/openai/codex` because it documents the external Codex product.

- [ ] **Step 4: Add a source-contract check for stale project links**

Extend `tests/branding.test.ts` using `node:fs` and `node:path` to read `src/pages/HelpPage.tsx`, `src-tauri/tauri.conf.json`, and `README.md`; assert none contains `github.com/Lampese/codex-switcher` and the config contains `github.com/coding-ai-cyber/codex_switch/releases/latest/download/latest.json`.

- [ ] **Step 5: Run tests and commit**

Run: `node --experimental-strip-types --test tests/branding.test.ts`

Expected: all branding link assertions pass.

Commit:

```bash
git add src/lib/links.ts src/pages/HelpPage.tsx src-tauri/tauri.conf.json README.md tests/branding.test.ts
git commit -m "fix: point project links to owned repository"
```

### Task 2: 应用可见品牌改名

**Files:**
- Modify: `src/lib/i18n.tsx` visible product-name translation values
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/TrayMenu.tsx`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/tauri.windows.conf.json`
- Modify: `src-tauri/tauri.macos.conf.json`
- Modify: `src-tauri/tauri.linux.conf.json`
- Modify: `src-tauri/src/tray.rs`, `src-tauri/src/i18n.rs`, and other user-visible Rust copy found by the stale-name test
- Modify: `README.md`, `package.json` description only where it is user-visible
- Test: `tests/branding.test.ts`

**Interfaces:**
- Visible product name is `ChatGPT 账号管家`; visible English product name is `ChatGPT Account Hub`.
- Internal identifiers (`codex-switcher-*` storage/events, crate names, config directory) remain unchanged.

- [ ] **Step 1: Add the failing stale-visible-brand test**

Extend `tests/branding.test.ts` with a file inventory for visible surfaces (`src/lib/i18n.tsx`, `src/components/layout/Sidebar.tsx`, `src/TrayMenu.tsx`, all four Tauri config files, `src-tauri/src/tray.rs`, `src-tauri/src/i18n.rs`, `README.md`). Assert each file has the new visible name where applicable and that no user-facing literal `Codex Switcher` remains. Exclude internal compatibility strings by checking only the listed display files and translation values.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types --test tests/branding.test.ts`

Expected: FAIL on existing `Codex Switcher` text in Sidebar, TrayMenu, translations, platform titles, and README.

- [ ] **Step 3: Replace visible copy while preserving compatibility identifiers**

Use the exact copy mapping:

```text
Codex Switcher          -> ChatGPT 账号管家
Open Codex Switcher     -> 打开 ChatGPT 账号管家 / Open ChatGPT Account Hub
Welcome to Codex Switcher -> 欢迎使用 ChatGPT 账号管家 / Welcome to ChatGPT Account Hub
```

Update Tauri `productName` and every platform window `title` to `ChatGPT 账号管家`; keep `identifier`, crate names, binary detection strings, storage keys, and event names unchanged. Update tray tooltip/title and sidebar brand text. Keep occurrences of “Codex” when they describe the managed external application, not the product name.

- [ ] **Step 4: Run focused and type checks**

Run: `node --experimental-strip-types --test tests/branding.test.ts` and `pnpm build`.

Expected: branding tests and Vite/TypeScript build pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.tsx src/components/layout/Sidebar.tsx src/TrayMenu.tsx src-tauri/tauri.conf.json src-tauri/tauri.windows.conf.json src-tauri/tauri.macos.conf.json src-tauri/tauri.linux.conf.json src-tauri/src/tray.rs src-tauri/src/i18n.rs README.md package.json tests/branding.test.ts
git commit -m "feat: rebrand app as ChatGPT account hub"
```

### Task 3: 重绘并生成桌面/托盘图标

**Files:**
- Modify: `src-tauri/icons/logo.svg`
- Regenerate: `src-tauri/icons/32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.png`, `icon.ico`, `icon.icns`, `tray.png`, and existing platform icon sizes
- Test: `tests/branding.test.ts`

**Interfaces:**
- Tauri icon paths remain unchanged; all generated files are consumed by the existing `bundle.icon` list.

- [ ] **Step 1: Add failing icon invariants**

Extend `tests/branding.test.ts` to read `src-tauri/icons/logo.svg` and assert it contains `viewBox="0 0 1024 1024"`, a gradient definition, and the new accessible label `ChatGPT 账号管家`. Assert every configured icon path exists and has a non-zero file size.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types --test tests/branding.test.ts`

Expected: FAIL because the existing logo uses a dark background, account cards, and no new brand label.

- [ ] **Step 3: Replace the SVG master**

Create a deterministic vector master with a rounded square blue-purple gradient, a white chat-bubble `C`, and a small four-point star/node accent. Use no text other than the single `C`, keep the mark centered with safe padding, and include:

```svg
<svg width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="ChatGPT 账号管家" ...>
```

Do not alter Tauri config icon filenames.

- [ ] **Step 4: Generate all platform assets**

Run: `pnpm tauri icon src-tauri/icons/logo.svg`.

Expected: the command completes and updates the configured PNG/ICO/ICNS and platform icon files without changing their paths.

- [ ] **Step 5: Verify dimensions, assets, and visual output**

Run: `node --experimental-strip-types --test tests/branding.test.ts`, `pnpm build`, and inspect the generated icon files with `Get-Item` plus `Get-FileHash`. Open the rebuilt EXE after Task 4 and verify the new icon appears in the title bar/taskbar and tray.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/icons
git commit -m "feat: add ChatGPT account hub app icon"
```

### Task 4: 全量回归、打包与进度记录

**Files:**
- Modify: `tests/ui/dashboard.spec.ts` only if a visible brand selector needs coverage
- Modify: `.superpowers/sdd/progress.md`
- Create: `.superpowers/sdd/chatgpt-account-hub-branding-report.md`

**Interfaces:**
- Consumes all previous task commits and produces verified Windows artifacts under `src-tauri/target/release`.

- [ ] **Step 1: Run the complete verification suite**

Run each command separately:

```bash
node --experimental-strip-types --test tests/*.test.ts
pnpm test:ui
pnpm build
pnpm test:dashboard
pnpm test:theme
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: all tests pass; Cargo may emit only the existing warnings.

- [ ] **Step 2: Search for stale project URLs and visible names**

Run:

```powershell
rg -n "github\.com/Lampese/codex-switcher|Codex Switcher" src src-tauri README.md package.json public
```

Expected: no stale project URL; any remaining `Codex Switcher` hit must be an explicitly documented internal compatibility identifier and be listed in the report.

- [ ] **Step 3: Build Windows artifacts**

Run: `pnpm tauri:win build`.

Expected: EXE, MSI, and NSIS files are produced. If the command exits during updater signing because `TAURI_SIGNING_PRIVATE_KEY` is absent, record that after confirming all three artifacts exist and the EXE launches.

- [ ] **Step 4: Write report and update progress**

Record commit hashes, test counts, artifact paths, SHA-256 values, visible smoke-launch result, and any signing warning in `.superpowers/sdd/chatgpt-account-hub-branding-report.md`; append a completion row to `.superpowers/sdd/progress.md`.

- [ ] **Step 5: Final review and commit bookkeeping**

Run `git diff --check` and `git status --short`; ensure only intended implementation commits contain product changes. Commit report/progress updates separately:

```bash
git add .superpowers/sdd/progress.md .superpowers/sdd/chatgpt-account-hub-branding-report.md
git commit -m "docs: record ChatGPT account hub branding verification"
```
