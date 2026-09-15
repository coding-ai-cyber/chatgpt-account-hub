# Task 9 Report: Guard language initialization against stale saves

## Status

Completed and verified.

## Changes

- Added a monotonically increasing `languageRequestId` to `LanguageProvider`.
- Each backend language load and user language save captures its request ID; only the current operation may update React state and `localStorage` after its backend call completes.
- Kept Web/Tauri initialization, Tauri listener cleanup, storage behavior, and save-error propagation unchanged.

## RED evidence

- `pnpm exec -- node --experimental-strip-types --test tests/language.test.ts` reported 12 passing and 1 failing test before the production change: `does not let a stale backend language load overwrite a newer selection`.

## GREEN evidence

- Focused language tests: 13 passed, 0 failed.
- Full frontend tests: 31 passed, 0 failed (`pnpm exec -- node --experimental-strip-types --test tests/*.test.ts`).
- `pnpm build`: completed successfully (`tsc && vite build`).

## Scope

- The commit includes `src/lib/i18n.tsx`, the existing Task 9 regression test in `tests/language.test.ts`, this report, and the Task 9 progress entry only.
- Pre-existing changes to `.superpowers/sdd/task-2-report.md`, `src-tauri/Cargo.toml`, and `docs/superpowers/plans/2026-09-14-language-switch.md` remain unstaged.
