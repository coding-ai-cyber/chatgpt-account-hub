# Force-close Flow Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Codex 关闭/强制关闭流程的用户提示完整接入中英文翻译，并验证正式 Windows 产物和核心功能。

**Architecture:** 用一个无副作用的 `getForceCloseMessage` 纯函数把关闭结果映射为翻译键、插值参数和错误标记。Hook 继续负责后端调用和状态计算，只接收现有 `t` 函数并负责显示结果。发布阶段使用 Tauri 的正式构建链，不改变账户存储或 OAuth 协议。

**Tech Stack:** React 19, TypeScript, Node test runner, Vite, Tauri 2, Rust/Cargo, PowerShell。

## Global Constraints

- 保持默认语言为 `zh-CN`，支持语言仅为 `zh-CN` 和 `en`。
- 不改变账户数据格式、OAuth 流程、后端命令协议和 Codex 关闭策略。
- 用户可见完整句子必须来自 `src/lib/i18n.tsx` 的翻译字典。
- 验收导入/导出使用临时测试文件，不删除用户账户数据。
- 清理只处理本轮创建的诊断产物；WebView2 备份保留到用户确认后再处理。

---

### Task 1: Add the failing message-mapping tests

**Files:**
- Create: `tests/forceCloseMessages.test.ts`
- Read: `src/hooks/useForceCloseCodexProcesses.ts`

**Interfaces:**
- Produces the required contract for `getForceCloseMessage`:
  `ForceCloseMessageInput` is a discriminated union with `kind` values `verification-failed`, `no-processes`, `closed`, `partial`, `still-running`, and `request-failed`.
- The return value is `{ key: TranslationKey; params?: TranslationParams; isError: boolean }`.

- [ ] **Step 1: Write the failing test**

Create the test with one assertion per close-result branch:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getForceCloseMessage } from "../src/lib/forceCloseMessages.ts";

test("maps verification failure to an error translation", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "verification-failed" }),
    { key: "couldNotVerifyCodexClosed", isError: true },
  );
});

test("maps no targeted processes to a non-error translation", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "no-processes" }),
    { key: "noRunningCodexProcesses", isError: false },
  );
});

test("maps complete graceful and force closes", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "closed", count: 1, forceClose: false }),
    { key: "codexProcessesClosed", params: { count: 1 }, isError: false },
  );
  assert.deepEqual(
    getForceCloseMessage({ kind: "closed", count: 2, forceClose: true }),
    { key: "codexProcessesForceClosed", params: { count: 2 }, isError: false },
  );
});

test("maps partial and still-running closes with the correct mode", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "partial", closed: 1, total: 3, remaining: 2, forceClose: false }),
    {
      key: "codexProcessesClosedPartially",
      params: { closed: 1, total: 3, remaining: 2 },
      isError: true,
    },
  );
  assert.deepEqual(
    getForceCloseMessage({ kind: "still-running", remaining: 2, forceClose: true }),
    { key: "codexProcessesForceCloseFailed", params: { remaining: 2 }, isError: true },
  );
});

test("maps backend exceptions to the translated close-error message", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "request-failed", message: "permission denied" }),
    { key: "closeCodexProcessesFailed", params: { message: "permission denied" }, isError: true },
  );
});
```

- [ ] **Step 2: Run the focused test and verify the expected red failure**

Run:

```powershell
pnpm exec -- node --experimental-strip-types --test tests/forceCloseMessages.test.ts
```

Expected: FAIL because `src/lib/forceCloseMessages.ts` does not exist yet. The failure must be a missing module or missing export, not a test syntax error.

- [ ] **Step 3: Commit the test contract after the red run**

```powershell
git add -- tests/forceCloseMessages.test.ts
git commit -m "test: specify force-close message translations"
```

---

### Task 2: Implement the pure formatter and dictionary entries

**Files:**
- Create: `src/lib/forceCloseMessages.ts`
- Modify: `src/lib/i18n.tsx` in both `englishTranslations` and `chineseTranslations`
- Test: `tests/forceCloseMessages.test.ts`

**Interfaces:**
- Consumes: `TranslationKey` and `TranslationParams` from `src/lib/i18n.tsx`.
- Produces: `ForceCloseMessageInput`, `ForceCloseMessage`, and `getForceCloseMessage` for the Hook.

- [ ] **Step 1: Add the new translation keys to both dictionaries**

Add these entries to `englishTranslations`:

```ts
couldNotVerifyCodexClosed: "Could not verify that Codex closed. Account switching and reopening were skipped.",
noRunningCodexProcesses: "No running Codex processes found.",
codexProcessesClosed: "Closed {count} Codex session(s).",
codexProcessesForceClosed: "Force closed {count} Codex session(s).",
codexProcessesClosedPartially: "Closed {closed}/{total} Codex sessions. {remaining} still running.",
codexProcessesForceClosedPartially: "Force closed {closed}/{total} Codex sessions. {remaining} still running.",
codexProcessesCloseFailed: "Could not gracefully close {remaining} Codex session(s).",
codexProcessesForceCloseFailed: "Could not force close {remaining} Codex session(s).",
closeCodexProcessesFailed: "Close failed: {message}",
```

Add the corresponding Chinese entries to `chineseTranslations`:

```ts
couldNotVerifyCodexClosed: "无法确认 Codex 已关闭，已跳过账户切换和重新打开。",
noRunningCodexProcesses: "没有找到正在运行的 Codex 进程。",
codexProcessesClosed: "已关闭 {count} 个 Codex 会话。",
codexProcessesForceClosed: "已强制关闭 {count} 个 Codex 会话。",
codexProcessesClosedPartially: "已关闭 {closed}/{total} 个 Codex 会话，仍有 {remaining} 个运行中。",
codexProcessesForceClosedPartially: "已强制关闭 {closed}/{total} 个 Codex 会话，仍有 {remaining} 个运行中。",
codexProcessesCloseFailed: "无法正常关闭 {remaining} 个 Codex 会话。",
codexProcessesForceCloseFailed: "无法强制关闭 {remaining} 个 Codex 会话。",
closeCodexProcessesFailed: "关闭失败：{message}",
```

- [ ] **Step 2: Add the minimal pure implementation**

Create `src/lib/forceCloseMessages.ts`:

```ts
import type { TranslationKey, TranslationParams } from "./i18n";

export type ForceCloseMessageInput =
  | { kind: "verification-failed" }
  | { kind: "no-processes" }
  | { kind: "closed"; count: number; forceClose: boolean }
  | { kind: "partial"; closed: number; total: number; remaining: number; forceClose: boolean }
  | { kind: "still-running"; remaining: number; forceClose: boolean }
  | { kind: "request-failed"; message: string };

export type ForceCloseMessage = {
  key: TranslationKey;
  params?: TranslationParams;
  isError: boolean;
};

export function getForceCloseMessage(input: ForceCloseMessageInput): ForceCloseMessage {
  switch (input.kind) {
    case "verification-failed":
      return { key: "couldNotVerifyCodexClosed", isError: true };
    case "no-processes":
      return { key: "noRunningCodexProcesses", isError: false };
    case "closed":
      return {
        key: input.forceClose ? "codexProcessesForceClosed" : "codexProcessesClosed",
        params: { count: input.count },
        isError: false,
      };
    case "partial":
      return {
        key: input.forceClose
          ? "codexProcessesForceClosedPartially"
          : "codexProcessesClosedPartially",
        params: { closed: input.closed, total: input.total, remaining: input.remaining },
        isError: true,
      };
    case "still-running":
      return {
        key: input.forceClose ? "codexProcessesForceCloseFailed" : "codexProcessesCloseFailed",
        params: { remaining: input.remaining },
        isError: true,
      };
    case "request-failed":
      return { key: "closeCodexProcessesFailed", params: { message: input.message }, isError: true };
  }
}
```

The formatter itself must not contain user-visible English or Chinese sentences.

- [ ] **Step 3: Run the focused test and the language key test**

Run:

```powershell
pnpm exec -- node --experimental-strip-types --test tests/forceCloseMessages.test.ts tests/language.test.ts
```

Expected: all focused message tests pass, and the existing language tests report no missing dictionary keys.

- [ ] **Step 4: Commit the formatter and dictionaries**

```powershell
git add -- src/lib/forceCloseMessages.ts src/lib/i18n.tsx tests/forceCloseMessages.test.ts
git commit -m "feat: localize force-close messages"
```

---

### Task 3: Wire the Hook and App to the formatter

**Files:**
- Modify: `src/hooks/useForceCloseCodexProcesses.ts:1-75`
- Modify: `src/App.tsx:1-45, 648-658`
- Test: `tests/forceCloseMessages.test.ts`

**Interfaces:**
- Consumes: `getForceCloseMessage` and `Translate`.
- Produces: every `showToast` call in the Hook receives `t(message.key, message.params)` rather than a hard-coded sentence.

- [ ] **Step 1: Add the translation dependency to the Hook options**

Update the imports and options:

```ts
import type { Translate } from "../lib/i18n";
import { getForceCloseMessage } from "../lib/forceCloseMessages";

interface UseForceCloseCodexProcessesOptions {
  processCount: number;
  checkProcesses: () => Promise<CodexProcessInfo | null>;
  showToast: (message: string, isError?: boolean) => void;
  formatError: (err: unknown) => string;
  t: Translate;
}
```

- [ ] **Step 2: Replace every hard-coded toast branch**

Destructure `t`, then replace the body of each current message branch with this mapping:

```ts
const message = !latestProcessInfo
  ? getForceCloseMessage({ kind: "verification-failed" })
  : result.targeted_count === 0
    ? getForceCloseMessage({ kind: "no-processes" })
    : remainingCount === 0
      ? getForceCloseMessage({ kind: "closed", count: processCount, forceClose })
      : closedCount > 0
        ? getForceCloseMessage({
            kind: "partial",
            closed: closedCount,
            total: processCount,
            remaining: remainingCount,
            forceClose,
          })
        : getForceCloseMessage({ kind: "still-running", remaining: remainingCount, forceClose });

showToast(t(message.key, message.params), message.isError);
```

Replace the catch branch with:

```ts
const message = getForceCloseMessage({
  kind: "request-failed",
  message: formatError(err),
});
showToast(t(message.key, message.params), message.isError);
```

Add `t` to the `useCallback` dependency list.

- [ ] **Step 3: Pass `t` from App**

Update the existing Hook call in `src/App.tsx`:

```tsx
  } = useForceCloseCodexProcesses({
    processCount: processInfo?.count ?? 0,
    checkProcesses,
    showToast: showWarmupToast,
    formatError: formatWarmupError,
    t,
  });
```

- [ ] **Step 4: Prove the hard-coded strings are gone**

Run:

```powershell
rg -n "Could not verify|No running Codex|Force closed|Closed .*Codex|Close failed" src/hooks/useForceCloseCodexProcesses.ts
```

Expected: no output. The only user-visible messages from this Hook must come from the formatter and translation dictionary.

- [ ] **Step 5: Run all frontend tests and build**

```powershell
pnpm exec -- node --experimental-strip-types --test tests/*.test.ts
pnpm build
```

Expected: 28 frontend tests pass, 0 fail (the existing 23 plus 5 new message tests); `tsc && vite build` exits with code 0.

- [ ] **Step 6: Commit the wiring change**

```powershell
git add -- src/hooks/useForceCloseCodexProcesses.ts src/App.tsx
git commit -m "fix: route force-close to translations"
```

---

### Task 4: Run the complete Rust and frontend verification

**Files:**
- Read: `src-tauri/Cargo.toml`
- Read: `src-tauri/src/`
- Test: `tests/*.test.ts`

- [ ] **Step 1: Run frontend tests and production build fresh**

```powershell
pnpm exec -- node --experimental-strip-types --test tests/*.test.ts
pnpm build
```

Expected: 28 tests pass and the Vite production build exits with code 0.

- [ ] **Step 2: Run the full Rust suite in the Visual Studio environment**

```powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml'
```

Expected: 59 Rust tests pass and 0 fail. Existing compiler warnings are recorded separately and do not count as test failures.

- [ ] **Step 3: Check the diff for whitespace errors**

```powershell
git diff --check origin/main..HEAD
```

Expected: no output and exit code 0.

---

### Task 5: Build and inspect the formal Windows artifact

**Files:**
- Read: `src-tauri/tauri.conf.json`
- Create by build: `src-tauri/target/release/` and `src-tauri/target/release/bundle/`

- [ ] **Step 1: Build the formal Tauri Windows package**

```powershell
pnpm tauri:win build
```

Expected: the release build and configured Windows bundle finish successfully.

- [ ] **Step 2: Inventory the generated artifacts**

```powershell
Get-ChildItem -LiteralPath 'src-tauri\target\release\codex-switcher.exe' -ErrorAction Stop | Select-Object FullName,Length,LastWriteTime
Get-ChildItem -LiteralPath 'src-tauri\target\release\bundle' -Recurse -Include '*.exe','*.msi' | Select-Object FullName,Length,LastWriteTime
```

Expected: the release EXE exists, and at least one configured Windows installer or bundle artifact is listed.

- [ ] **Step 3: Launch the release EXE without the Vite dev server**

Close only test instances started for this step, then launch:

```powershell
Start-Process -FilePath 'D:\项目\Codex Switcher\src-tauri\target\release\codex-switcher.exe'
```

Expected: the release app opens without requiring `http://127.0.0.1:1420`, displays Chinese by default, and shows the account list or empty-account state.

---

### Task 6: Perform manual acceptance without touching real account data

**Files:**
- Read: `src/App.tsx`
- Read: `src/components/SettingsModal.tsx`
- Read: `src/TrayMenu.tsx`
- Record: `docs/superpowers/reports/2026-09-15-acceptance.md`

- [ ] **Step 1: Verify language behavior**

Record each result in the acceptance report:

```text
[ ] Fresh launch defaults to Chinese.
[ ] Settings -> English changes main UI and tray labels.
[ ] Settings -> Chinese restores Chinese labels.
[ ] After restart, the selected language remains active.
```

- [ ] **Step 2: Verify account management**

Use a disposable auth/config fixture or the user's explicit test account:

```text
[ ] Add account from auth.json succeeds.
[ ] Add account through browser login returns to the app.
[ ] Rename and switch account update the visible active state.
[ ] Delete is confirmed and removes only the selected test account.
[ ] Slim export/import reports the correct imported/skipped counts.
[ ] Full encrypted export/import completes with a temporary file.
```

- [ ] **Step 3: Verify usage, tray, and close flows**

```text
[ ] Refresh usage and warm-up show translated success/error toasts.
[ ] Tray popup opens the main window and its language matches the main UI.
[ ] Normal close and force close show Chinese/English complete sentences.
[ ] Partial close and backend-error branches show translated messages.
[ ] Reopen-after-close behavior matches the selected preference.
[ ] Update checker states render and dismiss correctly.
```

---

### Task 7: Clean up artifacts and create the final reviewable state

**Files:**
- Remove only: `diagnose-webview.ps1`, `window-debug.png`, and temporary diagnostic launch files created by this work after confirming they are not needed.
- Keep: `docs/superpowers/specs/2026-09-15-force-close-localization-design.md`, this plan, and acceptance records.
- Preserve: user-authored changes and the WebView2 backup directory until explicit confirmation.

- [ ] **Step 1: Review the final worktree**

```powershell
git status --short
git diff --stat
git diff --check
```

Expected: source, test, and required documentation changes are visible; no account data or secrets are staged.

- [ ] **Step 2: Remove only confirmed diagnostic artifacts**

Verify each exact path exists and was created by this work before removal. Leave the WebView2 backup and any user-authored files in place.

- [ ] **Step 3: Commit the final implementation and verification records**

```powershell
git add -- src tests docs/superpowers
git commit -m "chore: finalize localized force-close flow"
```

- [ ] **Step 4: Report evidence**

Report the commit IDs, test counts, build artifact paths, manual acceptance results, and any remaining external dependency such as the Codex desktop installation or network-backed usage API.
