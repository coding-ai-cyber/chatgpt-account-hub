# Task 8 Report: Web language synchronization and save-error visibility

## Status

Completed and verified.

## Changes

- `LanguageProvider` now reads the persisted backend language when it initializes in both web and Tauri runtimes. The `app-settings-changed` Tauri event import, listener, and cleanup remain inside the Tauri-only branch.
- `SettingsModal` now renders the language-save error immediately after the language selector, outside the desktop-only display-settings block.
- Preserved the existing language save flow, display-setting behavior, and Tauri listener cleanup.

## RED evidence

Before the production changes, `pnpm exec -- node --experimental-strip-types --test tests/language.test.ts` reported 10 passing and 2 failing tests:

- `loads the persisted backend language in web mode during provider initialization`
- `shows language save errors outside the desktop-only settings block`

## GREEN evidence

- Focused language tests: `12` passed, `0` failed.
- Full frontend tests: `30` passed, `0` failed.
- `pnpm build`: completed successfully (`tsc && vite build`).

## Scope and concerns

- Changed only `src/lib/i18n.tsx`, `src/components/SettingsModal.tsx`, the pre-existing Task 8 regression additions in `tests/language.test.ts`, and this Task 8 report/progress record.
- Existing unrelated changes to `.superpowers/sdd/task-2-report.md`, `src-tauri/Cargo.toml`, and `docs/superpowers/plans/2026-09-14-language-switch.md` were preserved and not staged.
- No remaining Task 8 concerns identified by the focused tests, full frontend tests, or build.
