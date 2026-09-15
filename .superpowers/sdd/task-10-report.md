# Task 10 Report: Serialize language writes and synchronize reads

## Status

Completed and verified.

## Changes

- Added a `languageSaveQueue` that chains backend `set_language` calls in invocation order.
- Each load captures the current queue and waits for that snapshot before reading the backend; it does not join the queue, so reads do not delay later saves.
- Retained request-ID guards so only the newest load or save updates React state and `localStorage`.
- Kept save failures observable to callers while allowing the internal queue to continue with later saves.
- Preserved Web/Tauri initialization and event-listener cleanup.

## RED evidence

- `pnpm exec -- node --experimental-strip-types --test tests/language.test.ts` reported 12 passing and 1 failing test before the production change: `does not let a stale backend language load overwrite a newer selection`.

## GREEN evidence

- Focused language tests: 13 passed, 0 failed.
- Full frontend tests: 31 passed, 0 failed (`pnpm exec -- node --experimental-strip-types --test tests/*.test.ts`).
- `pnpm build`: completed successfully (`tsc && vite build`).

## Scope

- This task changes only `src/lib/i18n.tsx`, `tests/language.test.ts`, this report, and the Task 10 progress entry.
- Pre-existing changes to `.superpowers/sdd/task-2-report.md`, `src-tauri/Cargo.toml`, and `docs/superpowers/plans/2026-09-14-language-switch.md` remain unstaged.
