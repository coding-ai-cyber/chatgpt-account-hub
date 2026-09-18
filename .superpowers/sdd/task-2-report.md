# Task 2 Implementation Report

## Status

DONE

- Branch: `codex/default-theme-dashboard-polish`
- Starting commit: `35adb66`
- Task commit: `ff59879` (`fix: make sidebar responsive without overflow`)
- Scope: Task 2 only; Tasks 3–7 were not implemented.

## Files changed

- `package.json`
- `pnpm-lock.yaml`
- `src/app/AppShell.tsx`
- `src/app/sidebarState.ts`
- `src/components/layout/Sidebar.tsx`
- `src/styles/layout.css`
- `tests/sidebarState.test.ts`
- `tests/ui/dashboard.spec.ts`
- `tests/ui/fixtures.ts`
- `tests/ui/playwright.config.ts`
- `tests/ui/preview-main.tsx`
- `tests/ui/preview.html`

The staged file list was checked before commit and contained exactly these 12 task files. The controller-owned `.superpowers/sdd/progress.md` modification remained unstaged.

## Implementation summary

- Added `SidebarMode`, `resolveSidebarMode(width, userCollapsed)`, and `useSidebarMode(userCollapsed)`.
- Applied the exact breakpoint behavior: drawer below 768px, automatic compact navigation from 768px through 1023px, and the persisted user preference from 1024px upward.
- Routed the resolved mode through `AppShell` and `Sidebar`, exposed it as `data-mode`, and limited the titlebar navigation trigger and scrim to drawer mode.
- Closed an open drawer automatically when the viewport leaves drawer mode.
- Removed the duplicate sidebar caption and stale `getNavItem` dependency; the footer status now consistently uses `statusActive`.
- Made the shell a column layout so the titlebar spans the full viewport and the sidebar begins below it.
- Replaced the competing CSS-only breakpoint state with mode-driven `.is-compact` styling and the labeled mobile drawer.
- Added shrink constraints and explicit overflow protection for the shell, sidebar, content, and future current-account hero.
- Corrected a pre-existing cascade conflict where the later `.app-icon-button` token rule overrode Tailwind's `hidden`, leaving the collapse control visible at 888px.
- Added a wide-window compact-state regression test and stacked the brand mark/control vertically in that state so the saved compact preference also has zero sidebar overflow.
- Added a deterministic Vite-only UI fixture and Playwright Chromium coverage.

## TDD evidence

### Initial RED

Command:

```powershell
node --experimental-strip-types --test tests/sidebarState.test.ts
```

Observed:

- Exit code `1`.
- `ERR_MODULE_NOT_FOUND` for `src/app/sidebarState.ts`, confirming the requested resolver did not yet exist.

Command:

```powershell
pnpm test:ui
```

Observed:

- Exit code `1`.
- `2 failed`.
- Both 888px and 600px tests received no `data-mode` attribute instead of `compact` and `drawer` respectively.

### First GREEN / diagnostic cycle

After the minimal state and layout implementation:

- Resolver tests: `3 passed`.
- 600px labeled drawer test: passed.
- 888px overflow test: failed with `{ document: 0, sidebar: 6, main: 0 }` instead of all zeros.

Root-cause diagnostics showed the 40px collapse button was still displayed at 888px because `tokens.css` loaded after Tailwind and `.app-icon-button { display: inline-flex }` overrode `hidden`. An explicit 1024px display rule removed the six-pixel overflow, after which both planned Playwright tests passed.

### Added edge-case RED

A 1024px test was added for the saved compact preference. Its first form passed before the width transition settled, so it was corrected to wait until the sidebar reached 72px. The corrected test then failed as intended:

- Expected sidebar overflow: `0`.
- Received sidebar overflow: `6`.

The compact wide-screen brand layout was changed to a vertical arrangement. The final run passed all three Playwright tests.

## Final verification

Command:

```powershell
node --experimental-strip-types --test tests/sidebarState.test.ts
```

Observed: exit `0`, `3 passed`, `0 failed`.

Command:

```powershell
pnpm test:ui
```

Observed: exit `0`, `3 passed`, including:

- 888px compact sidebar, full-width titlebar, and zero document/sidebar/main overflow.
- 600px labeled drawer navigation.
- 1024px user-triggered compact sidebar with zero internal overflow after the width transition settles.

Command:

```powershell
pnpm build
```

Observed: exit `0`; TypeScript completed, Vite transformed 85 modules, and the production bundle was generated successfully.

Command:

```powershell
node --experimental-strip-types --test tests/navigation.test.ts tests/theme.test.ts tests/accountDashboard.test.ts
```

Observed: exit `0`, `15 passed`, `0 failed`.

Command:

```powershell
pnpm test:sidebar
```

Observed: exit `0`, `3 passed`, `0 failed`, confirming the new package script works.

Command:

```powershell
git diff --cached --check
git diff --cached --name-only
```

Observed before commit: no whitespace errors; only the 12 files listed above were staged.

## Self-review

- Breakpoints match the brief exactly at 767/768 and 1023/1024 boundaries.
- The persisted `collapsed` boolean remains owned by `App.tsx`; responsive mode derivation is centralized and does not change persistence semantics.
- The 888px layout now keeps the titlebar at 888px wide, places the sidebar at `x=0` beneath it, hides navigation labels, and reports zero overflow in all three measured regions.
- Drawer mode keeps navigation labels and accessible names, closes after navigation, and hides the scrim outside drawer mode.
- Compact wide mode retains an operable expand control without reintroducing internal overflow.
- The implementation uses the existing icon and semantic token systems; no new visual theme or dashboard hierarchy work from later tasks was introduced.
- UI guidance search confirmed the relevant high-severity rules: prevent horizontal scrolling and apply `min-inline-size: 0` to shrinkable flex/grid children. The React-specific search returned no database match, so the implementation followed the plan's concrete hook and breakpoint contract.
- Generated Playwright result artifacts were removed before staging.

## Concerns

- Playwright emits a non-failing warning that `NO_COLOR` is ignored because `FORCE_COLOR` is set by the environment. Tests still complete with exit code 0.
- `pnpm exec playwright install chromium` updated the local Playwright browser cache outside the repository as expected; no browser binary was added to the commit.
- No functional or scope concerns remain for Task 2.

## Review correction — macOS trigger and drawer accessibility

### Status and commit

- Status: DONE
- Correction commit: `33a1b3d` (`fix: make drawer navigation accessible`)
- Task 2 commits: `ff59879`, `33a1b3d`

### Review findings verified

- `AppShell` rendered the drawer trigger only under `!isMacOs && usesDrawer`, so a macOS-like 600px viewport had drawer mode but no operable trigger.
- A closed drawer was translated off-screen but remained in the accessibility tree and keyboard tab order; it also had no `aria-expanded`/`aria-controls` relationship or focus lifecycle.

### TDD RED evidence

After adding the two Playwright regressions, this command was run before production changes:

```powershell
pnpm test:ui
```

Observed: exit `1`, `2 failed`, `3 passed`.

- The macOS-like test failed because `getByTestId("navigation-trigger")` found no element.
- The drawer accessibility test failed because the trigger had no `aria-controls="app-sidebar-navigation"` attribute.

### Correction implementation

- The drawer trigger now renders whenever `usesDrawer` is true on every platform. The existing macOS titlebar wrapper keeps its 4.5rem traffic-light inset, and the regression verifies the trigger begins at or beyond 72px.
- Added a stable `app-sidebar-navigation` ID and connected the trigger with `aria-controls` and `aria-expanded`.
- Added an `HTMLElement` ref to the sidebar. A state effect writes the native `inert` property, while the rendered sidebar uses `aria-hidden` whenever drawer mode is closed.
- Opening by mouse, Enter, or Space moves focus to the first navigation item.
- Escape and scrim closure mark focus for restoration and return it to the drawer trigger after closing.
- Leaving drawer mode clears inert state, so expanded and compact desktop behavior remains unaffected.
- Removed the unused `.app-sidebar-caption` rule.
- Removed the inherited `NO_COLOR` variable inside the Playwright config because Playwright enables colored child-process output. This eliminated the prior `NO_COLOR`/`FORCE_COLOR` warning without changing application code.

### Final correction verification

Command:

```powershell
pnpm test:ui
```

Observed: exit `0`, `5 passed`, `0 failed`, with no color-environment warning. Coverage includes:

- 888px compact sidebar and zero overflow.
- 600px labeled drawer.
- macOS-like 600px drawer trigger outside the traffic-light inset.
- closed drawer excluded from the accessibility tree and Tab order.
- keyboard opening, focus entry, Escape closing, scrim closing, and trigger focus restoration.
- 1024px saved compact preference and zero internal overflow.

Command:

```powershell
pnpm test:sidebar
```

Observed: exit `0`, `3 passed`, `0 failed`.

Command:

```powershell
node --experimental-strip-types --test tests/navigation.test.ts tests/theme.test.ts tests/accountDashboard.test.ts
```

Observed: exit `0`, `15 passed`, `0 failed`.

Command:

```powershell
pnpm build
```

Observed: exit `0`; TypeScript and Vite completed successfully, with 85 modules transformed.

Command:

```powershell
git diff --cached --name-only
git diff --cached --check
```

Observed before commit: no whitespace errors; only these five Task 2 files were staged:

- `src/app/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/styles/layout.css`
- `tests/ui/dashboard.spec.ts`
- `tests/ui/playwright.config.ts`

### Correction self-review and concerns

- Accessible names on the trigger, navigation items, scrim, and desktop collapse control are preserved.
- `aria-hidden` and `inert` are limited to a closed drawer; they are not applied in compact or expanded desktop modes.
- The macOS regression changes the navigator user agent before application modules load, so it exercises the same module-level platform branch used by the application.
- No remaining functional concerns were found. The earlier Playwright color warning is resolved.

## Re-review correction — drawer focus containment

### Status and commit

- Status: DONE
- Correction commit: `f256454` (`fix: contain drawer keyboard focus`)
- Task 2 commits: `ff59879`, `33a1b3d`, `f256454`

### Re-review findings verified

- While the drawer was open, the titlebar and main content remained focusable below the scrim. Reverse Tab from the first drawer control escaped to the titlebar, and forward Tab from the last drawer control did not wrap to the drawer start.
- The scrim was a native button without a negative tab index, so it could become an unintended keyboard stop.
- `handleNavigate` closed the drawer without setting the focus-restoration marker, leaving keyboard focus on a navigation button as its containing sidebar became inert.

### TDD RED evidence

The forward Tab, reverse Tab, and keyboard navigation regressions were added before the implementation change, then this command was run:

```powershell
pnpm test:ui
```

Observed: exit `1`, `3 failed`, `5 passed`.

- Reverse Tab failed because the last drawer control did not receive focus.
- Forward Tab failed because the first navigation control did not receive focus.
- Keyboard navigation closure failed because the trigger did not regain focus.

### Correction implementation

- Added titlebar and main element refs. While the drawer is open, both regions receive native `inert` and `aria-hidden="true"`; both states are cleared outside open drawer mode.
- Added a drawer focusable-control query that excludes disabled, negative-tab-index, and non-rendered elements.
- The existing drawer keydown listener now contains focus: Shift+Tab on the first control wraps to the last, and Tab on the last control wraps to the first. If focus is unexpectedly outside the drawer, the same direction-aware recovery is applied.
- The scrim now has `tabIndex={-1}`, preserving pointer closure and its accessible name without adding it to sequential keyboard navigation.
- `handleNavigate` now requests focus restoration before closing in drawer mode, so keyboard navigation activation returns focus to the visible trigger after the sidebar becomes inert.
- Compact and expanded desktop modes do not install the focus trap and keep titlebar/main content interactive.

### Final re-review verification

Command:

```powershell
pnpm test:ui
```

Observed: exit `0`, `8 passed`, `0 failed`, with no warnings. The suite now additionally covers forward focus wrapping, reverse focus wrapping, scrim exclusion from the Tab sequence, background inert/ARIA state, and keyboard navigation focus restoration.

Command:

```powershell
pnpm test:sidebar
```

Observed: exit `0`, `3 passed`, `0 failed`.

Command:

```powershell
node --experimental-strip-types --test tests/navigation.test.ts tests/theme.test.ts tests/accountDashboard.test.ts
```

Observed: exit `0`, `15 passed`, `0 failed`.

Command:

```powershell
pnpm build
```

Observed: exit `0`; TypeScript and Vite completed successfully with 85 modules transformed.

Command:

```powershell
git diff --cached --name-only
git diff --cached --check
```

Observed before commit: no whitespace errors; only these Task 2 files were staged:

- `src/app/AppShell.tsx`
- `tests/ui/dashboard.spec.ts`

### Re-review self-review and concerns

- The focusable selector is scoped to the open sidebar and filters controls with no rendered client rect, so the mobile-hidden desktop collapse button is not included in the focus loop.
- Titlebar/main inert state is removed before focus restoration, allowing the trigger to receive focus after Escape, scrim closure, or navigation activation.
- macOS trigger placement, closed-drawer inert behavior, 888px overflow behavior, and desktop compact preference remain covered by the same passing suite.
- No remaining functional concerns or test warnings were observed.
