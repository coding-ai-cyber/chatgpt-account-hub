# Task 2 Implementation and TDD Report

## Scope

Implemented the pure force-close message formatter and added matching English and Chinese translation entries. The Hook and App were intentionally left untouched for Task 3.

## Changed files

- `src/lib/forceCloseMessages.ts`: Added the typed `ForceCloseMessageInput` and `ForceCloseMessage` contracts plus `getForceCloseMessage`, covering verification failure, no processes, complete close, partial close, still-running processes, and backend request failures.
- `src/lib/i18n.tsx`: Added the nine required keys to both translation dictionaries with matching key sets and the specified interpolation placeholders.

## TDD and verification

1. Confirmed the pre-implementation focused test failed because `src/lib/forceCloseMessages.ts` was absent.
2. Implemented the minimum formatter and dictionary changes.
3. Focused tests:

   `pnpm exec -- node --experimental-strip-types --test tests/forceCloseMessages.test.ts tests/language.test.ts`

   Result: 15 tests passed, 0 failed.

4. Full frontend tests:

   `pnpm exec -- node --experimental-strip-types --test tests/*.test.ts`

   Result: 28 tests passed, 0 failed.

5. Production build:

   `pnpm build`

   Result: TypeScript compilation and Vite production build completed with exit code 0.

## Commit

`feat: localize force-close messages`

## Concerns

- Existing unrelated worktree changes remain untouched: `src-tauri/Cargo.toml` and `docs/superpowers/plans/2026-09-14-language-switch.md`.
- Task 3 still needs to wire the formatter into the force-close Hook and App flow.
