# Task 2 Report: Visible application branding

## Status

Completed and verified.

## Changes

- Replaced the visible product name with `ChatGPT 账号管家` in the sidebar, tray UI, tray tooltip/window, Tauri product metadata, and all platform window titles.
- Replaced English product references with `ChatGPT Account Hub` and Chinese product references with `ChatGPT 账号管家` in React translations, native menu translations, README copy, the OAuth success page, the LAN server message, and the macOS elevation prompt.
- Updated the package description and illustrated-theme accessibility label while retaining the external product name `Codex` where it describes the managed Codex application.
- Preserved the existing `codex-switcher-*` storage/event keys, `com.lampese.codex-switcher` identifier, Rust crate/binary names, `.codex-switcher` configuration directory, backup filename, tray ID, and process-detection compatibility strings.

## TDD evidence

### RED

After adding the visible-surface inventory to `tests/branding.test.ts`, the focused test reported 2 passing and 1 failing test. The failure identified the stale `Codex Switcher` literal in `src/lib/i18n.tsx`.

A second red cycle expanded coverage to native and accessibility surfaces. It reported 2 passing and 1 failing test on the stale LAN-server product name. The process prompt check was then narrowed to the user-visible prompt phrase so the required legacy shortcut/process detection strings remain allowed.

### GREEN

- `node --experimental-strip-types --test tests/branding.test.ts`: 3 passed, 0 failed.
- `pnpm build`: completed successfully (`tsc && vite build`).
- `cargo check --manifest-path src-tauri/Cargo.toml`: completed successfully; it emitted the 6 pre-existing unused/dead-code warnings.
- `git diff --check`: passed; only line-ending conversion notices were emitted by Git.

## Scope and concerns

- Existing unrelated modifications to `.superpowers/sdd/progress.md`, `.superpowers/sdd/task-2-report.md`, and `src-tauri/Cargo.toml`, plus untracked `test-results/`, were preserved and excluded from this task commit.
- Internal compatibility identifiers intentionally retain the previous technical name. The remaining literal occurrences are limited to internal documentation/comments and process/shortcut compatibility checks, not user-facing product copy.
- No remaining Task 2 concern was found by the focused test, frontend build, Rust check, or diff inspection.
