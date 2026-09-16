# Default Theme Dashboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the sidebar overflow bug and turn the default current-account page into the approved soft-gradient dashboard without regressing the other twelve skins or account operations.

**Architecture:** Keep `App.tsx` as the application controller. Add pure dashboard selectors for quota and activity semantics, derive one responsive sidebar mode in `AppShell`, and move the account hero/dashboard rendering into focused presentational components. Use the normal Vite server plus a deterministic Playwright-only HTML entry for real layout and screenshot checks.

**Tech Stack:** Tauri 2, React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4, Node test runner, Playwright Chromium, CSS custom properties.

## Global Constraints

- Preserve the five-page AppShell and all 13 existing `SkinId` values.
- Change only the default theme palette; `glass`, `illustrated`, `graphite`, `mint`, and the remaining skins keep their own tokens.
- Keep the minimum supported window at `600×500`; do not hide the bug by raising `minWidth`.
- Do not modify Rust commands, account storage, OAuth, token refresh, rate-limit API semantics, tray behavior, or updater behavior.
- Do not add a router, global state library, chart library, or UI component framework.
- Unknown values render as `--` or localized “unavailable”; numeric zero remains `0`.
- Viewing dashboard data must never switch the active account.
- Respect `prefers-reduced-motion`, keyboard focus, accessible names, and 4.5:1 text contrast.
- The worktree already contains user-owned uncommitted implementation. Before every commit, stage only the files listed in that task and inspect `git diff --cached --name-only`.

## File Structure

### New files

- `src/lib/accountDashboard.ts` — pure quota-window, recent-token, peak-date, and advice selectors.
- `src/app/sidebarState.ts` — pure viewport-to-sidebar-mode resolver plus the resize hook.
- `src/components/dashboard/CurrentAccountHero.tsx` — account identity, quick actions, quota ring, and both rate-limit rows.
- `src/components/dashboard/CurrentAccountDashboard.tsx` — four summary metrics, recent activity, advice, and full-stats navigation.
- `tests/accountDashboard.test.ts` — deterministic selector and zero/unknown tests.
- `tests/sidebarState.test.ts` — responsive mode boundary tests.
- `tests/defaultTheme.test.ts` — default-token and custom-skin isolation checks.
- `tests/ui/preview.html` — Vite-served visual-test entry that is not part of the production Rollup inputs.
- `tests/ui/preview-main.tsx` — deterministic AppShell/current-account fixture renderer.
- `tests/ui/fixtures.ts` — non-sensitive account and statistics fixtures.
- `tests/ui/playwright.config.ts` — Chromium viewport and Vite web-server configuration.
- `tests/ui/dashboard.spec.ts` — overflow, action-menu, responsive, and screenshot checks.

### Modified files

- `package.json`, `pnpm-lock.yaml` — Playwright test dependency and scripts.
- `src/app/AppShell.tsx` — use one responsive sidebar mode and mobile-only drawer trigger.
- `src/components/layout/Sidebar.tsx` — render expanded, compact, or drawer semantics from `SidebarMode`.
- `src/components/layout/TopToolbar.tsx` — enforce one primary action and non-wrapping narrow-window behavior.
- `src/components/dashboard/QuotaRing.tsx` — render an embeddable quota summary using pure selectors.
- `src/components/dashboard/MetricCard.tsx` — lighter summary-card hierarchy.
- `src/pages/CurrentAccountPage.tsx` — retain loading/error/empty ownership and delegate populated rendering.
- `src/lib/format.ts` — localized date-only formatting for peak dates.
- `src/lib/i18n.tsx` — dashboard advice, peak-date, and account-action copy.
- `src/styles/tokens.css` — approved default soft-gradient tokens.
- `src/styles/layout.css` — compact sidebar, hero, quota rows, metric strip, and narrow-toolbar layout.
- `tests/language.test.ts` — require all new visible copy to use translations.

---

### Task 1: Make Dashboard Data Semantics Deterministic

**Files:**
- Create: `src/lib/accountDashboard.ts`
- Create: `tests/accountDashboard.test.ts`
- Modify: `src/lib/format.ts`
- Modify: `src/lib/i18n.tsx`
- Modify: `tests/language.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `UsageInfo`, `AccountDailyUsage`, and `Language` from the existing codebase.
- Produces: `DashboardQuotaWindow`, `getQuotaWindows()`, `getPrimaryQuotaWindow()`, `sumRecentTokens()`, `getPeakUsageDay()`, `getUsageAdviceKey()`, and `formatDateOnly()`.

- [ ] **Step 1: Write selector tests that distinguish dates, token values, zero, and missing data**

Create `tests/accountDashboard.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  getPeakUsageDay,
  getPrimaryQuotaWindow,
  getQuotaWindows,
  getUsageAdviceKey,
  sumRecentTokens,
} from "../src/lib/accountDashboard.ts";
import { formatDateOnly } from "../src/lib/format.ts";
import type { UsageInfo } from "../src/types/index.ts";

const healthyUsage: UsageInfo = {
  account_id: "account-1",
  plan_type: "plus",
  primary_used_percent: 42,
  primary_window_minutes: 300,
  primary_resets_at: 1_800_000_000,
  secondary_used_percent: 15,
  secondary_window_minutes: 10_080,
  secondary_resets_at: 1_800_500_000,
  has_credits: false,
  unlimited_credits: false,
  credits_balance: null,
  error: null,
};

test("selects weekly quota first and exposes both remaining percentages", () => {
  const windows = getQuotaWindows(healthyUsage);
  assert.equal(windows.session?.remainingPercent, 58);
  assert.equal(windows.weekly?.remainingPercent, 85);
  assert.equal(getPrimaryQuotaWindow(healthyUsage)?.kind, "weekly");
});

test("falls back to the session quota when weekly data is absent", () => {
  const usage = { ...healthyUsage, secondary_used_percent: null };
  assert.equal(getPrimaryQuotaWindow(usage)?.kind, "session");
});

test("returns null quota windows for an errored response", () => {
  const usage = { ...healthyUsage, error: "request failed" };
  assert.deepEqual(getQuotaWindows(usage), { session: null, weekly: null });
});

test("sums a deterministic local seven-day window and keeps zero as zero", () => {
  const now = new Date(2026, 8, 16, 12, 0, 0);
  const daily = [
    { date: "2026-09-16", tokens: 0 },
    { date: "2026-09-15", tokens: 10 },
    { date: "2026-09-10", tokens: 20 },
    { date: "2026-09-09", tokens: 99 },
  ];
  assert.equal(sumRecentTokens(daily, 1, now), 0);
  assert.equal(sumRecentTokens(daily, 7, now), 30);
  assert.equal(sumRecentTokens([], 7, now), null);
});

test("returns the newest date when peak token counts tie", () => {
  const peak = getPeakUsageDay([
    { date: "2026-09-14", tokens: 82_500_000 },
    { date: "2026-09-15", tokens: 82_500_000 },
    { date: "invalid", tokens: 99_000_000 },
  ]);
  assert.deepEqual(peak, { date: "2026-09-15", tokens: 82_500_000 });
});

test("chooses conservative advice from real quota data", () => {
  assert.equal(getUsageAdviceKey(healthyUsage), "usageAdviceHealthy");
  assert.equal(
    getUsageAdviceKey({ ...healthyUsage, primary_used_percent: 78 }),
    "usageAdviceWatchReset",
  );
  assert.equal(getUsageAdviceKey(undefined), "usageAdviceRefresh");
});

test("formats a peak date as a date instead of a token count", () => {
  assert.match(formatDateOnly("2026-09-15", "zh-CN"), /9月15日/);
  assert.equal(formatDateOnly(null, "zh-CN"), "--");
});
```

- [ ] **Step 2: Add the dashboard test script and verify the tests fail for a missing module**

Add this script to `package.json`:

```json
"test:dashboard-data": "node --experimental-strip-types --test tests/accountDashboard.test.ts"
```

Temporarily run only the file that exists:

```powershell
node --experimental-strip-types --test tests/accountDashboard.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/accountDashboard.ts`.

- [ ] **Step 3: Implement the pure dashboard selectors**

Create `src/lib/accountDashboard.ts`:

```ts
import type { AccountDailyUsage, UsageInfo } from "../types";

export type DashboardQuotaKind = "session" | "weekly";

export interface DashboardQuotaWindow {
  kind: DashboardQuotaKind;
  usedPercent: number;
  remainingPercent: number;
  windowMinutes: number | null;
  resetsAt: number | null;
}

export type UsageAdviceKey =
  | "usageAdviceHealthy"
  | "usageAdviceWatchReset"
  | "usageAdviceRefresh";

function quotaWindow(
  kind: DashboardQuotaKind,
  usedPercent: number | null | undefined,
  windowMinutes: number | null | undefined,
  resetsAt: number | null | undefined,
): DashboardQuotaWindow | null {
  if (usedPercent === null || usedPercent === undefined || !Number.isFinite(usedPercent)) {
    return null;
  }
  const used = Math.min(100, Math.max(0, usedPercent));
  return {
    kind,
    usedPercent: used,
    remainingPercent: 100 - used,
    windowMinutes: windowMinutes ?? null,
    resetsAt: resetsAt ?? null,
  };
}

export function getQuotaWindows(usage: UsageInfo | undefined): {
  session: DashboardQuotaWindow | null;
  weekly: DashboardQuotaWindow | null;
} {
  if (!usage || usage.error) return { session: null, weekly: null };
  return {
    session: quotaWindow(
      "session",
      usage.primary_used_percent,
      usage.primary_window_minutes,
      usage.primary_resets_at,
    ),
    weekly: quotaWindow(
      "weekly",
      usage.secondary_used_percent,
      usage.secondary_window_minutes,
      usage.secondary_resets_at,
    ),
  };
}

export function getPrimaryQuotaWindow(
  usage: UsageInfo | undefined,
): DashboardQuotaWindow | null {
  const windows = getQuotaWindows(usage);
  return windows.weekly ?? windows.session;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sumRecentTokens(
  daily: AccountDailyUsage[],
  days: number,
  now = new Date(),
): number | null {
  if (daily.length === 0 || days <= 0) return null;
  const keys = new Set<string>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    keys.add(localDateKey(date));
  }
  return daily.reduce(
    (total, entry) => total + (keys.has(entry.date) && Number.isFinite(entry.tokens) ? entry.tokens : 0),
    0,
  );
}

export function getPeakUsageDay(daily: AccountDailyUsage[]): AccountDailyUsage | null {
  return daily.reduce<AccountDailyUsage | null>((peak, entry) => {
    const timestamp = Date.parse(`${entry.date}T00:00:00`);
    if (!Number.isFinite(timestamp) || !Number.isFinite(entry.tokens) || entry.tokens < 0) return peak;
    if (!peak || entry.tokens > peak.tokens) return entry;
    if (entry.tokens === peak.tokens && entry.date > peak.date) return entry;
    return peak;
  }, null);
}

export function getUsageAdviceKey(usage: UsageInfo | undefined): UsageAdviceKey {
  const windows = getQuotaWindows(usage);
  const available = [windows.session, windows.weekly].filter(
    (window): window is DashboardQuotaWindow => window !== null,
  );
  if (available.length === 0) return "usageAdviceRefresh";
  return available.some((window) => window.remainingPercent <= 30)
    ? "usageAdviceWatchReset"
    : "usageAdviceHealthy";
}
```

- [ ] **Step 4: Add localized date-only formatting**

Append this function to `src/lib/format.ts`:

```ts
export function formatDateOnly(
  value: string | null | undefined,
  language: Language,
): string {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(languageLocale(language), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
```

- [ ] **Step 5: Add exact English and Chinese copy for the new semantic labels**

Add these entries to `englishTranslations` in `src/lib/i18n.tsx`:

```ts
peakDate: "Peak date",
usageAdviceTitle: "Usage guidance",
usageAdviceHealthy: "Current quota is healthy; no account switch is needed.",
usageAdviceWatchReset: "A quota window is running low; check the nearest reset time.",
usageAdviceRefresh: "Refresh this account to load current quota guidance.",
moreAccountActions: "More account actions",
quotaHealthy: "Healthy",
```

Add the matching entries to `chineseTranslations`:

```ts
peakDate: "峰值日期",
usageAdviceTitle: "使用建议",
usageAdviceHealthy: "当前额度充足，无需切换账户。",
usageAdviceWatchReset: "有额度周期即将用尽，请关注最近的重置时间。",
usageAdviceRefresh: "刷新此账户以获取最新额度建议。",
moreAccountActions: "更多账户操作",
quotaHealthy: "状态良好",
```

Add the seven key names to the `requiredKeys` array in `tests/language.test.ts`.

- [ ] **Step 6: Run the selector and language tests**

```powershell
node --experimental-strip-types --test tests/accountDashboard.test.ts
node --experimental-strip-types --test tests/language.test.ts
```

Expected: both commands report all tests passing.

- [ ] **Step 7: Commit only the data-semantics change**

```powershell
git add package.json src/lib/accountDashboard.ts src/lib/format.ts src/lib/i18n.tsx tests/accountDashboard.test.ts tests/language.test.ts
git diff --cached --name-only
git commit -m "fix: make dashboard usage semantics explicit"
```

Expected staged paths: exactly the six paths listed by `git add`.

---

### Task 2: Fix Responsive Sidebar State and Real Overflow

**Files:**
- Create: `src/app/sidebarState.ts`
- Create: `tests/sidebarState.test.ts`
- Create: `tests/ui/preview.html`
- Create: `tests/ui/preview-main.tsx`
- Create: `tests/ui/fixtures.ts`
- Create: `tests/ui/playwright.config.ts`
- Create: `tests/ui/dashboard.spec.ts`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/styles/layout.css`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: persisted `collapsed` boolean from `App.tsx`.
- Produces: `SidebarMode = "expanded" | "compact" | "drawer"`, `resolveSidebarMode(width, userCollapsed)`, and `useSidebarMode(userCollapsed)`.

- [ ] **Step 1: Write breakpoint tests**

Create `tests/sidebarState.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { resolveSidebarMode } from "../src/app/sidebarState.ts";

test("uses a drawer below 768px", () => {
  assert.equal(resolveSidebarMode(600, false), "drawer");
  assert.equal(resolveSidebarMode(767, true), "drawer");
});

test("uses compact navigation from 768px through 1023px", () => {
  assert.equal(resolveSidebarMode(768, false), "compact");
  assert.equal(resolveSidebarMode(888, false), "compact");
  assert.equal(resolveSidebarMode(1023, false), "compact");
});

test("restores the saved user preference on wide windows", () => {
  assert.equal(resolveSidebarMode(1024, false), "expanded");
  assert.equal(resolveSidebarMode(1024, true), "compact");
  assert.equal(resolveSidebarMode(1440, false), "expanded");
});
```

- [ ] **Step 2: Install Playwright and create a deterministic Vite-only fixture entry**

Run:

```powershell
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Add this script to `package.json`:

```json
"test:sidebar": "node --experimental-strip-types --test tests/sidebarState.test.ts",
"test:ui": "playwright test -c tests/ui/playwright.config.ts"
```

Create `tests/ui/preview.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Codex Switcher UI Fixture</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./preview-main.tsx"></script>
  </body>
</html>
```

Create `tests/ui/fixtures.ts`:

```ts
import type { AccountUsageStats, AccountWithUsage } from "../../src/types";

export const fixtureAccount: AccountWithUsage = {
  id: "fixture-account",
  name: "numeral.octet-0h@icloud.com",
  email: "numeral.octet-0h@icloud.com",
  plan_type: "plus",
  subscription_expires_at: "2026-10-16T00:00:00Z",
  auth_mode: "chat_g_p_t",
  is_active: true,
  created_at: "2026-09-15T00:00:00Z",
  last_used_at: "2026-09-16T00:00:00Z",
  usageLoading: false,
  usage: {
    account_id: "fixture-account",
    plan_type: "plus",
    primary_used_percent: 42,
    primary_window_minutes: 300,
    primary_resets_at: 1_800_000_000,
    secondary_used_percent: 15,
    secondary_window_minutes: 10_080,
    secondary_resets_at: 1_800_500_000,
    has_credits: false,
    unlimited_credits: false,
    credits_balance: null,
    error: null,
  },
};

export const fixtureStats: AccountUsageStats = {
  account_id: "fixture-account",
  available: true,
  source: "fixture",
  generated_at: "2026-09-16T08:00:00Z",
  stats_as_of: "2026-09-16T08:00:00Z",
  summary: {
    lifetime_tokens: 82_500_000,
    peak_daily_tokens: 4_200_000,
    longest_task_seconds: 3_600,
    current_streak_days: 6,
    longest_streak_days: 11,
  },
  activity: {
    fast_mode_percent: 0,
    reasoning_effort: "high",
    reasoning_effort_percent: 64,
    skills_explored: 3,
    total_skills_used: 7,
    total_threads: 15,
  },
  daily: [
    { date: "2026-09-14", tokens: 4_200_000 },
    { date: "2026-09-15", tokens: 2_100_000 },
    { date: "2026-09-16", tokens: 0 },
  ],
  top_invocations: [],
  reset_credits: null,
  error: null,
};
```

Create `tests/ui/preview-main.tsx` with the shell only for this task:

```tsx
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "../../src/app/AppShell";
import { LanguageProvider } from "../../src/lib/i18n";
import { fixtureAccount } from "./fixtures";
import "../../src/App.css";
import "../../src/styles/tokens.css";
import "../../src/styles/layout.css";
import "../../src/styles/themes.css";

function Preview() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      activePage="current-account"
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((value) => !value)}
      onNavigate={() => {}}
      activeAccount={fixtureAccount}
      toolbar={<div className="app-toolbar app-toolbar-bg"><strong>当前账户</strong></div>}
    >
      <div className="app-content-inner app-surface p-6">Dashboard fixture</div>
    </AppShell>
  );
}

window.localStorage.setItem("codex-switcher-language", "zh-CN");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <LanguageProvider><Preview /></LanguageProvider>,
);
```

Create `tests/ui/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "dashboard.spec.ts",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:1420",
    colorScheme: "light",
    locale: "zh-CN",
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1",
    url: "http://127.0.0.1:1420/tests/ui/preview.html",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write the failing 888px overflow test**

Create `tests/ui/dashboard.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("888px viewport uses a compact sidebar without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 888, height: 693 });
  await page.goto("/tests/ui/preview.html");
  const sidebar = page.locator(".app-sidebar");
  await expect(sidebar).toHaveAttribute("data-mode", "compact");
  await expect(sidebar.locator(".app-nav-label").first()).toBeHidden();
  const titlebarBox = await page.locator(".app-titlebar").boundingBox();
  const sidebarBox = await sidebar.boundingBox();
  expect(titlebarBox?.width).toBe(888);
  expect(sidebarBox?.x).toBe(0);
  expect(sidebarBox?.y).toBe(titlebarBox?.height);
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    sidebar: document.querySelector<HTMLElement>(".app-sidebar")!.scrollWidth -
      document.querySelector<HTMLElement>(".app-sidebar")!.clientWidth,
    main: document.querySelector<HTMLElement>(".app-main")!.scrollWidth -
      document.querySelector<HTMLElement>(".app-main")!.clientWidth,
  }));
  expect(overflow).toEqual({ document: 0, sidebar: 0, main: 0 });
});

test("600px viewport keeps navigation in a labeled drawer", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator(".app-sidebar")).toHaveAttribute("data-mode", "drawer");
  await page.getByTestId("navigation-trigger").click();
  await expect(page.locator(".app-sidebar-nav").getByRole("button", { name: "当前账户" })).toBeVisible();
});
```

Run:

```powershell
pnpm test:ui
```

Expected: FAIL because `.app-sidebar` has no `data-mode="compact"` and the current media query only shrinks width.

- [ ] **Step 4: Implement one sidebar mode resolver and hook**

Create `src/app/sidebarState.ts`:

```ts
import { useEffect, useState } from "react";

export type SidebarMode = "expanded" | "compact" | "drawer";

export function resolveSidebarMode(width: number, userCollapsed: boolean): SidebarMode {
  if (width < 768) return "drawer";
  if (width < 1024) return "compact";
  return userCollapsed ? "compact" : "expanded";
}

export function useSidebarMode(userCollapsed: boolean): SidebarMode {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1120 : window.innerWidth,
  );
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return resolveSidebarMode(width, userCollapsed);
}
```

- [ ] **Step 5: Wire the mode through AppShell and Sidebar**

In `src/app/AppShell.tsx`:

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { useSidebarMode } from "./sidebarState";

// Inside AppShell:
const sidebarMode = useSidebarMode(collapsed);
const usesDrawer = sidebarMode === "drawer";

useEffect(() => {
  if (!usesDrawer) setDrawerOpen(false);
}, [usesDrawer]);

// Replace the titlebar navigation button with:
{!isMacOs && usesDrawer && (
  <button
    type="button"
    data-testid="navigation-trigger"
    className="app-titlebar-action"
    onClick={() => setDrawerOpen(true)}
    aria-label={t("openNavigation")}
  >
    <Icon name="menu" size={16} />
  </button>
)}

// Replace the Sidebar call and scrim condition with:
<Sidebar
  mode={sidebarMode}
  activePage={activePage}
  activeAccount={activeAccount}
  masked={masked}
  onSelectPage={handleNavigate}
  onToggleCollapsed={onToggleCollapsed}
/>
{usesDrawer && drawerOpen && (
  <button
    type="button"
    className="app-drawer-scrim"
    onClick={() => setDrawerOpen(false)}
    aria-label={t("closeNavigation")}
  />
)}
```

In `src/components/layout/Sidebar.tsx`, replace `collapsed` with `mode`, remove `getNavItem` and the duplicate caption, and use this shell:

```tsx
import { NAV_ITEMS, type PageId } from "../../app/navigation";
import type { SidebarMode } from "../../app/sidebarState";

interface SidebarProps {
  mode: SidebarMode;
  activePage: PageId;
  activeAccount?: AccountWithUsage;
  masked?: boolean;
  onSelectPage: (pageId: PageId) => void;
  onToggleCollapsed: () => void;
}

const compact = mode === "compact";

<aside
  className={`app-sidebar ${compact ? "is-compact" : ""}`}
  data-mode={mode}
  aria-label={t("navCurrentAccount")}
>
  {/* keep the existing brand mark; hide its text through .is-compact */}
  <nav className="app-sidebar-nav" aria-label={t("navCurrentAccount")}>
    {NAV_ITEMS.map((item) => {
      const selected = item.id === activePage;
      return (
        <button
          key={item.id}
          type="button"
          className="app-nav-item"
          aria-label={t(item.labelKey)}
          aria-current={selected ? "page" : undefined}
          onClick={() => onSelectPage(item.id)}
          title={`${t(item.labelKey)}: ${t(item.descriptionKey)}`}
        >
          <Icon name={item.icon} size={18} className="shrink-0" />
          <span className="app-nav-label min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
          {selected && <Icon name="chevron-right" size={14} className="app-nav-label shrink-0 app-text-muted" />}
        </button>
      );
    })}
  </nav>
  {/* keep the current footer account button; its second line is always t("statusActive") */}
</aside>
```

- [ ] **Step 6: Replace the conflicting sidebar CSS**

In `src/styles/layout.css`, change the base width and collapsed class:

```css
.app-shell {
  flex-direction: column;
}

.app-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  max-width: 100%;
  overflow-x: clip;
}

.app-sidebar.is-compact {
  width: var(--sidebar-width-collapsed);
  min-width: var(--sidebar-width-collapsed);
}

.app-sidebar.is-compact .app-brand-text,
.app-sidebar.is-compact .app-nav-label,
.app-sidebar.is-compact .app-account-summary-text {
  display: none;
}

.app-sidebar.is-compact .app-sidebar-brand,
.app-sidebar.is-compact .app-nav-item,
.app-sidebar.is-compact .app-account-summary {
  justify-content: center;
}

.app-sidebar.is-compact .app-sidebar-footer {
  padding-inline: 0.5rem;
}
```

Delete the entire existing `@media (max-width: 1023px)` block that changes sidebar width independently of React state. Replace the mobile block with:

```css
@media (max-width: 767px) {
  .app-sidebar,
  .app-sidebar.is-compact {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    width: min(84vw, 288px);
    min-width: min(84vw, 288px);
    transform: translateX(-102%);
    box-shadow: var(--shadow-overlay);
  }

  .app-shell:not(.is-drawer-open) .app-sidebar { pointer-events: none; }
  .app-shell.is-drawer-open .app-sidebar { transform: translateX(0); }
  .app-toolbar { padding-inline: 0.9rem; }
  .app-content { padding-inline: 0.9rem; }
  .account-grid { grid-template-columns: minmax(0, 1fr); }
}
```

Also add:

```css
.app-main,
.app-content,
.app-content-inner,
.current-account-hero,
.current-account-hero > * {
  min-inline-size: 0;
}
```

- [ ] **Step 7: Run unit, Playwright, and build checks**

```powershell
node --experimental-strip-types --test tests/sidebarState.test.ts
pnpm test:ui
pnpm build
```

Expected: all commands pass; the titlebar spans all `888px`, the sidebar begins at `x=0` below it, and the overflow object is `{ document: 0, sidebar: 0, main: 0 }`.

- [ ] **Step 8: Commit the responsive sidebar fix**

```powershell
git add package.json pnpm-lock.yaml src/app/sidebarState.ts src/app/AppShell.tsx src/components/layout/Sidebar.tsx src/styles/layout.css tests/sidebarState.test.ts tests/ui/preview.html tests/ui/preview-main.tsx tests/ui/fixtures.ts tests/ui/playwright.config.ts tests/ui/dashboard.spec.ts
git diff --cached --name-only
git commit -m "fix: make sidebar responsive without overflow"
```

---

### Task 3: Apply the Approved Default Soft-Gradient Theme

**Files:**
- Create: `tests/defaultTheme.test.ts`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/layout.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing semantic CSS classes and all existing custom-skin overrides.
- Produces: the approved default background, surface, border, shadow, radius, and 188px sidebar tokens.

- [ ] **Step 1: Write a source-level token regression test**

Create `tests/defaultTheme.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tokens = readFileSync(`${root}/src/styles/tokens.css`, "utf8");
const themes = readFileSync(`${root}/src/styles/themes.css`, "utf8");

test("default tokens define the approved soft-gradient dashboard", () => {
  assert.match(tokens, /--app-bg:\s*#f4f7fc;/);
  assert.match(tokens, /--app-bg-image:[\s\S]*radial-gradient[\s\S]*radial-gradient/);
  assert.match(tokens, /--sidebar-width:\s*188px;/);
  assert.match(tokens, /--surface-primary:\s*rgba\(255,\s*255,\s*255,\s*0\.94\);/);
  assert.match(tokens, /--radius-card:\s*0\.875rem;/);
});

test("representative custom skins continue overriding their own palettes", () => {
  for (const skin of ["mint", "graphite", "glass", "illustrated"]) {
    assert.match(themes, new RegExp(`:root\\[data-skin="${skin}"\\]`));
  }
});
```

Run:

```powershell
node --experimental-strip-types --test tests/defaultTheme.test.ts
```

Expected: FAIL because the current default background is `#f6f7fb`, has no radial gradient, and uses a `208px` sidebar.

- [ ] **Step 2: Add the combined dashboard test script now that all three files exist**

Add this script to `package.json`:

```json
"test:dashboard": "node --experimental-strip-types --test tests/accountDashboard.test.ts tests/sidebarState.test.ts tests/defaultTheme.test.ts"
```

- [ ] **Step 3: Replace only the default `:root` visual tokens**

In `src/styles/tokens.css`, set the default block to these exact values while keeping the existing semantic variable names:

```css
:root {
  color-scheme: light;
  --app-bg: #f4f7fc;
  --app-bg-image:
    radial-gradient(circle at 72% 0%, rgba(166, 188, 255, 0.28), transparent 34%),
    radial-gradient(circle at 100% 58%, rgba(210, 190, 255, 0.2), transparent 30%);
  --sidebar-bg: rgba(248, 250, 254, 0.88);
  --toolbar-bg: rgba(250, 252, 255, 0.78);
  --surface-primary: rgba(255, 255, 255, 0.94);
  --surface-secondary: #f0f4fa;
  --surface-elevated: #ffffff;
  --text-primary: #152238;
  --text-secondary: #56657b;
  --text-muted: #8795a9;
  --accent: #3168ec;
  --accent-hover: #2557d4;
  --accent-contrast: #ffffff;
  --success: #24ad7b;
  --success-soft: rgba(36, 173, 123, 0.12);
  --warning: #b97918;
  --warning-soft: rgba(185, 121, 24, 0.13);
  --danger: #d9414b;
  --danger-soft: rgba(217, 65, 75, 0.12);
  --border-subtle: #dfe6f1;
  --border-strong: #c7d2e1;
  --focus-ring: rgba(49, 104, 236, 0.4);
  --shadow-card: 0 1px 2px rgba(37, 55, 88, 0.04), 0 10px 28px rgba(37, 55, 88, 0.07);
  --shadow-overlay: 0 22px 64px rgba(37, 55, 88, 0.2);
  --radius-control: 0.625rem;
  --radius-card: 0.875rem;
  --blur-surface: 16px;
  --sidebar-width: 188px;
  --sidebar-width-collapsed: 72px;
}
```

Do not edit the palette blocks in `src/styles/themes.css`.

- [ ] **Step 4: Make the shell render the gradient and lighter hierarchy consistently**

In `src/styles/tokens.css`, update `.app-bg` and `.app-surface`:

```css
.app-bg {
  background-color: var(--app-bg);
  background-image: var(--app-bg-image);
  background-attachment: fixed;
  background-position: center;
  background-size: var(--app-bg-size, cover);
}

.app-surface {
  background: var(--surface-primary);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(calc(var(--blur-surface) * 0.45));
  -webkit-backdrop-filter: blur(calc(var(--blur-surface) * 0.45));
}
```

In `src/styles/layout.css`, change `.app-content` spacing to:

```css
.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  padding: 1.125rem 1.375rem 1.75rem;
}
```

- [ ] **Step 5: Run token tests and build**

```powershell
node --experimental-strip-types --test tests/defaultTheme.test.ts
pnpm build
```

Expected: token tests pass and Vite completes without CSS warnings.

- [ ] **Step 6: Commit the default-theme foundation**

```powershell
git add package.json src/styles/tokens.css src/styles/layout.css tests/defaultTheme.test.ts
git diff --cached --name-only
git commit -m "style: refine default dashboard theme"
```

---

### Task 4: Build the Unified Current-Account Hero

**Files:**
- Create: `src/components/dashboard/CurrentAccountHero.tsx`
- Modify: `src/components/dashboard/QuotaRing.tsx`
- Modify: `src/styles/layout.css`
- Modify: `tests/ui/preview-main.tsx`
- Modify: `tests/ui/dashboard.spec.ts`
- Modify: `tests/language.test.ts`

**Interfaces:**
- Consumes: `AccountWithUsage`, existing account callbacks, `getQuotaWindows()`, and `getPrimaryQuotaWindow()`.
- Produces: `CurrentAccountHeroProps` with callback-only actions; the component never invokes Tauri directly.

- [ ] **Step 1: Extend the fixture test to require one hero and a hidden destructive action**

Append to `tests/ui/dashboard.spec.ts`:

```ts
test("account actions are grouped and delete stays behind the more menu", async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator(".current-account-hero")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "移除账户" })).toBeHidden();
  await page.getByRole("button", { name: "更多账户操作" }).click();
  await expect(page.getByRole("button", { name: "移除账户" })).toBeVisible();
  await expect(page.getByText("5 小时额度")).toBeVisible();
  await expect(page.getByText("7 天额度")).toBeVisible();
});
```

Run `pnpm test:ui`.

Expected: FAIL because `CurrentAccountHero` is not rendered and delete is currently a top-level button.

- [ ] **Step 2: Make QuotaRing embeddable and selector-driven**

In `src/components/dashboard/QuotaRing.tsx`:

```tsx
import { getPrimaryQuotaWindow } from "../../lib/accountDashboard";

// Replace getPreferredUsageWindow with:
const window = useMemo(() => getPrimaryQuotaWindow(usage), [usage]);
const remaining = window?.remainingPercent ?? null;

// Replace window.labelKind references with window.kind.
// Replace the outer element class with:
<div className="quota-overview flex min-w-0 items-center gap-4">
  {/* keep the existing ring and text body */}
</div>
```

Keep the existing accessible ring label, warning/danger thresholds, exact reset time, loading state, and unavailable state. Remove only the outer `app-surface` styling because the hero now owns the surface.

- [ ] **Step 3: Create the presentational hero component**

Create `src/components/dashboard/CurrentAccountHero.tsx` with this public interface and structure:

```tsx
import type { AccountWithUsage } from "../../types";
import { getQuotaWindows, type DashboardQuotaWindow } from "../../lib/accountDashboard";
import { formatExactResetTime, formatResetAt } from "../../lib/format";
import { useLanguage } from "../../lib/i18n";
import { languageLocale } from "../../lib/language";
import { QuotaRing } from "./QuotaRing";
import { Icon } from "../layout/Icon";

export interface CurrentAccountHeroProps {
  account: AccountWithUsage;
  masked: boolean;
  onOpenInBrowser: () => void;
  onRefresh: () => void;
  onWarmup: () => void;
  onToggleMask: () => void;
  onToggleAutoWarmup: () => void;
  onDelete: () => void;
}

function formatAccountDate(value: string | null, locale: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function QuotaLimitRow({ kind, window }: { kind: "session" | "weekly"; window: DashboardQuotaWindow | null }) {
  const { language, t } = useLanguage();
  const label = kind === "weekly" ? t("sevenDayQuota") : t("fiveHourQuota");
  if (!window) {
    return <div className="quota-limit-row"><div className="quota-limit-label"><span>{label}</span><span>{t("quotaUnavailable")}</span></div><div className="app-progress-track" /></div>;
  }
  const relative = formatResetAt(window.resetsAt);
  const exact = formatExactResetTime(window.resetsAt, language, "full");
  const tone = window.remainingPercent <= 10 ? "app-progress-bar-danger" : window.remainingPercent <= 30 ? "app-progress-bar-warning" : "";
  return (
    <div className="quota-limit-row">
      <div className="quota-limit-label">
        <span>{label}</span>
        <span>{t("percentLeft", { count: Math.round(window.remainingPercent) })}{relative ? ` · ${t("resetsIn", { reset: relative })}` : ""}</span>
      </div>
      <div className="app-progress-track"><div className={`app-progress-bar ${tone}`} style={{ width: `${window.remainingPercent}%` }} /></div>
      {exact && <div className="quota-limit-reset">{t("resetsAtExact", { date: exact })}</div>}
    </div>
  );
}

export function CurrentAccountHero(props: CurrentAccountHeroProps) {
  const { account, masked } = props;
  const { language, t } = useLanguage();
  const windows = getQuotaWindows(account.usage);
  const locale = languageLocale(language);
  const plan = account.plan_type
    ? account.plan_type.charAt(0).toUpperCase() + account.plan_type.slice(1)
    : account.auth_mode === "api_key" ? t("apiKey") : t("unknown");
  const created = formatAccountDate(account.created_at, locale);
  const subscription = formatAccountDate(account.subscription_expires_at, locale);

  return (
    <section className="current-account-hero app-surface overflow-hidden">
      <div className="current-account-hero-header">
        <span className="current-account-avatar"><Icon name="account" size={24} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="long-text text-lg font-semibold app-text-primary">{masked ? t("accountHidden") : account.name}</h2>
            <span className="app-chip app-chip-success"><span className="app-qr-status-dot" />{t("statusActive")}</span>
            <span className="app-chip">{plan}</span>
          </div>
          <p className="long-text mt-1 text-sm app-text-secondary">{masked ? "••••••••" : account.email || t("noAccountsConfigured")}</p>
          <p className="mt-1.5 text-xs app-text-muted">
            {t("activeSince", { date: created })}
            {account.subscription_expires_at ? ` · ${t("subscriptionStatus")} ${subscription}` : ""}
          </p>
        </div>
        <div className="current-account-actions">
          <button type="button" className="app-btn px-3 py-2 text-sm" onClick={props.onOpenInBrowser}><Icon name="external" size={16} />{t("openInBrowserAction")}</button>
          <button type="button" className="app-btn px-3 py-2 text-sm" onClick={props.onRefresh}><Icon name="refresh" size={16} />{t("refreshAccount")}</button>
          <button type="button" className="app-btn app-btn-soft-warning px-3 py-2 text-sm" onClick={props.onWarmup}><Icon name="lightning" size={16} />{t("warmup")}</button>
          <details className="relative">
            <summary className="app-icon-button list-none cursor-pointer" aria-label={t("moreAccountActions")} title={t("moreAccountActions")}><Icon name="more" size={18} /></summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-56 app-surface-elevated p-1.5">
              <button type="button" className="app-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm" onClick={props.onToggleMask}><Icon name={masked ? "eye-off" : "eye"} size={16} />{masked ? t("showInfo") : t("hideInfo")}</button>
              <button type="button" className="app-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm" onClick={props.onToggleAutoWarmup}><Icon name="clock" size={16} />{t("autoWarmupLabel")}</button>
              <button type="button" className="app-menu-item app-text-danger flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm" aria-label={t("removeAccount")} onClick={props.onDelete}><Icon name="delete" size={16} />{t("removeAccount")}</button>
            </div>
          </details>
        </div>
      </div>
      <div className="current-account-hero-body">
        <QuotaRing usage={account.usage} loading={account.usageLoading} />
        <div className="quota-limits">
          <QuotaLimitRow kind="session" window={windows.session} />
          <QuotaLimitRow kind="weekly" window={windows.weekly} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add the hero layout CSS**

Append to `src/styles/layout.css`:

```css
.current-account-hero { border-radius: var(--radius-card); }
.current-account-hero-header { display:flex; align-items:flex-start; gap:0.875rem; padding:1rem 1.1rem 0.8rem; }
.current-account-avatar { display:inline-flex; width:2.75rem; height:2.75rem; flex:0 0 auto; align-items:center; justify-content:center; border-radius:calc(var(--radius-control) + 0.2rem); background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 68%, #8b5cf6)); color:var(--accent-contrast); box-shadow:0 8px 20px color-mix(in srgb,var(--accent) 24%, transparent); }
.current-account-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:0.45rem; }
.current-account-actions .app-btn { display:inline-flex; align-items:center; gap:0.45rem; white-space:nowrap; }
.current-account-hero-body { display:grid; grid-template-columns:minmax(210px,0.8fr) minmax(0,1.7fr); gap:1rem; padding:0.75rem 1.1rem 1.1rem; }
.quota-overview { padding:0.75rem; border-radius:var(--radius-card); background:color-mix(in srgb,var(--surface-primary) 72%, transparent); }
.quota-limits { display:grid; align-content:center; gap:0.85rem; padding:0.5rem 0.25rem; }
.quota-limit-row { display:grid; gap:0.4rem; }
.quota-limit-label { display:flex; justify-content:space-between; gap:1rem; color:var(--text-secondary); font-size:0.75rem; font-weight:600; }
.quota-limit-reset { color:var(--text-muted); font-size:0.6875rem; }
.app-text-danger { color:var(--danger); }

@media (max-width: 900px) {
  .current-account-hero-header { flex-wrap:wrap; }
  .current-account-actions { width:100%; justify-content:flex-start; }
  .current-account-hero-body { grid-template-columns:1fr; }
}
```

- [ ] **Step 5: Render the real hero in the visual fixture**

Import `CurrentAccountHero` in `tests/ui/preview-main.tsx` and replace the placeholder content with:

```tsx
<div className="app-content-inner">
  <CurrentAccountHero
    account={fixtureAccount}
    masked={false}
    onOpenInBrowser={() => {}}
    onRefresh={() => {}}
    onWarmup={() => {}}
    onToggleMask={() => {}}
    onToggleAutoWarmup={() => {}}
    onDelete={() => {}}
  />
</div>
```

- [ ] **Step 6: Update the language inventory and run checks**

Add `src/components/dashboard/CurrentAccountHero.tsx` to `expectedKeysByFile` in `tests/language.test.ts` with every `t("...")` key used above. Remove moved keys from the `CurrentAccountPage.tsx` inventory only after Task 5 moves the live page to the hero.

Run:

```powershell
pnpm test:ui
node --experimental-strip-types --test tests/language.test.ts
pnpm build
```

Expected: the hero test passes, both quota labels are visible, and delete appears only after opening the menu.

- [ ] **Step 7: Commit the hero component**

```powershell
git add src/components/dashboard/CurrentAccountHero.tsx src/components/dashboard/QuotaRing.tsx src/styles/layout.css tests/ui/preview-main.tsx tests/ui/dashboard.spec.ts tests/language.test.ts
git diff --cached --name-only
git commit -m "feat: unify current account and quota hero"
```

---

### Task 5: Replace the Fragmented Home Page with the Approved Dashboard

**Files:**
- Create: `src/components/dashboard/CurrentAccountDashboard.tsx`
- Modify: `src/pages/CurrentAccountPage.tsx`
- Modify: `src/components/dashboard/MetricCard.tsx`
- Modify: `src/styles/layout.css`
- Modify: `tests/ui/preview-main.tsx`
- Modify: `tests/ui/dashboard.spec.ts`
- Modify: `tests/language.test.ts`

**Interfaces:**
- Consumes: `CurrentAccountHero`, `AccountUsageStats`, selector functions from Task 1, and existing callbacks from `CurrentAccountPage`.
- Produces: `CurrentAccountDashboardProps`; the page wrapper keeps loading/error/empty states and the stats-fetch hook.

- [ ] **Step 1: Write the failing content hierarchy and peak-date test**

Append to `tests/ui/dashboard.spec.ts`:

```ts
test("dashboard shows four summary metrics and a real peak date", async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator("[data-testid='summary-metric']")).toHaveCount(4);
  await expect(page.getByText("峰值日期")).toBeVisible();
  await expect(page.getByText(/2026年9月14日|2026\/9\/14/)).toBeVisible();
  await expect(page.getByText("最长任务")).toHaveCount(0);
  await expect(page.getByText("当前额度充足，无需切换账户。")).toBeVisible();
});
```

Run `pnpm test:ui`.

Expected: FAIL because the fixture currently renders only the hero.

- [ ] **Step 2: Create the populated dashboard component**

Create `src/components/dashboard/CurrentAccountDashboard.tsx`:

```tsx
import { useMemo } from "react";
import type { AccountUsageStats, AccountWithUsage } from "../../types";
import { formatDateOnly, formatNumber, formatTokens } from "../../lib/format";
import { getPeakUsageDay, getUsageAdviceKey, sumRecentTokens } from "../../lib/accountDashboard";
import { useLanguage } from "../../lib/i18n";
import { CurrentAccountHero, type CurrentAccountHeroProps } from "./CurrentAccountHero";
import { MetricCard } from "./MetricCard";
import { Icon } from "../layout/Icon";

export interface CurrentAccountDashboardProps extends Omit<CurrentAccountHeroProps, "account"> {
  account: AccountWithUsage;
  stats: AccountUsageStats | null;
  statsLoading: boolean;
  statsError: string | null;
  onRefreshStats: () => void;
  onViewFullStats: () => void;
}

export function CurrentAccountDashboard(props: CurrentAccountDashboardProps) {
  const { language, t } = useLanguage();
  const {
    account,
    masked,
    stats,
    statsLoading,
    statsError,
    onOpenInBrowser,
    onRefresh,
    onWarmup,
    onToggleMask,
    onToggleAutoWarmup,
    onDelete,
    onRefreshStats,
    onViewFullStats,
  } = props;
  const todayTokens = stats ? sumRecentTokens(stats.daily, 1) : null;
  const sevenDayTokens = stats ? sumRecentTokens(stats.daily, 7) : null;
  const peak = stats ? getPeakUsageDay(stats.daily) : null;
  const metrics = useMemo(() => [
    { label: t("lifetimeTokens"), value: stats?.available ? formatTokens(stats.summary.lifetime_tokens) : "--", icon: "history" as const },
    { label: t("todayTokens"), value: stats?.available ? formatTokens(todayTokens) : "--", icon: "clock" as const },
    { label: t("lastSevenDayTokens"), value: stats?.available ? formatTokens(sevenDayTokens) : "--", icon: "chart" as const },
    { label: t("currentStreakDays"), value: stats?.available && stats.summary.current_streak_days !== null ? `${formatNumber(stats.summary.current_streak_days, language)} ${t("days")}` : "--", icon: "sparkles" as const },
  ], [language, sevenDayTokens, stats, t, todayTokens]);

  return (
    <div className="current-account-dashboard app-page">
      <CurrentAccountHero
        account={account}
        masked={masked}
        onOpenInBrowser={onOpenInBrowser}
        onRefresh={onRefresh}
        onWarmup={onWarmup}
        onToggleMask={onToggleMask}
        onToggleAutoWarmup={onToggleAutoWarmup}
        onDelete={onDelete}
      />
      <section className="current-account-summary" aria-label={t("usageSummary")}>
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>
      <section className="current-account-lower-grid">
        <div className="app-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="app-section-label">{t("recentActivity")}</h3>
            <button type="button" className="app-btn px-2.5 py-1.5 text-xs" onClick={onRefreshStats}><Icon name="refresh" size={14} />{t("refresh")}</button>
          </div>
          {statsLoading ? <div className="app-skeleton mt-3 h-16" /> : stats?.available ? (
            <div className="recent-activity-grid mt-3">
              <div><span>{t("fastMode")}</span><strong>{stats.activity.fast_mode_percent === null ? "--" : `${Math.round(stats.activity.fast_mode_percent)}%`}</strong></div>
              <div><span>{t("totalThreads")}</span><strong>{formatNumber(stats.activity.total_threads, language)}</strong></div>
              <div><span>{t("peakDate")}</span><strong>{formatDateOnly(peak?.date, language)}</strong></div>
            </div>
          ) : <p className="mt-3 text-sm app-text-muted">{statsError || t("activityUnavailable")}</p>}
          <button type="button" className="app-btn mt-3 px-3 py-1.5 text-xs" onClick={onViewFullStats}>{t("viewFullStats")}<Icon name="arrow-right" size={14} /></button>
        </div>
        <div className="app-surface p-4">
          <h3 className="app-section-label">{t("usageAdviceTitle")}</h3>
          <div className="usage-advice mt-3"><span className="usage-advice-icon"><Icon name="sparkles" size={18} /></span><p>{t(getUsageAdviceKey(account.usage))}</p></div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Make MetricCard a lightweight summary tile**

In `src/components/dashboard/MetricCard.tsx`, add the test marker and replace the surface class:

```tsx
<div data-testid="summary-metric" className="metric-card min-w-0 p-3.5">
  {/* keep the current icon, label, value, and optional sub rendering */}
</div>
```

Remove the screen-reader text that says `noRateLimitData` solely because `sub` is absent; the visible `--` value already communicates unavailable data and the label identifies the metric.

- [ ] **Step 4: Replace the populated branch in CurrentAccountPage**

In `src/pages/CurrentAccountPage.tsx`:

1. Remove local `dayKey`, `sumDays`, metrics, `QuotaRing`, `MetricCard`, `formatDuration`, and the populated-page JSX.
2. Keep the existing loading, account-load error, and no-account branches unchanged.
3. Render:

```tsx
return (
  <CurrentAccountDashboard
    account={account}
    masked={isMasked}
    stats={stats}
    statsLoading={statsLoading}
    statsError={statsError}
    onOpenInBrowser={() => onOpenInBrowser(account.id)}
    onRefresh={() => { void onRefresh(account.id); }}
    onWarmup={() => onWarmup(account.id, account.name)}
    onToggleMask={() => onToggleMask(account.id)}
    onToggleAutoWarmup={() => onToggleAutoWarmup(account.id)}
    onDelete={() => onDelete(account.id)}
    onRefreshStats={() => { void refreshStats(); }}
    onViewFullStats={onViewFullStats}
  />
);
```

- [ ] **Step 5: Add the approved dashboard layout CSS**

Append to `src/styles/layout.css`:

```css
.current-account-dashboard { display:grid; gap:0.8rem; }
.current-account-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0.6rem; }
.metric-card { border:1px solid var(--border-subtle); border-radius:var(--radius-card); background:color-mix(in srgb,var(--surface-primary) 82%, transparent); box-shadow:0 6px 18px rgba(37,55,88,0.045); }
.current-account-lower-grid { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(260px,0.8fr); gap:0.75rem; }
.recent-activity-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:0.5rem; }
.recent-activity-grid > div { display:grid; gap:0.25rem; padding:0.7rem; border-radius:var(--radius-control); background:var(--surface-secondary); }
.recent-activity-grid span { color:var(--text-muted); font-size:0.6875rem; }
.recent-activity-grid strong { color:var(--text-primary); font-size:0.875rem; }
.usage-advice { display:flex; align-items:center; gap:0.75rem; min-height:4rem; padding:0.75rem; border-radius:var(--radius-card); background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 11%, var(--surface-primary)),color-mix(in srgb,#8b5cf6 9%, var(--surface-primary))); color:var(--text-secondary); font-size:0.75rem; line-height:1.5; }
.usage-advice-icon { display:inline-flex; width:2.25rem; height:2.25rem; flex:0 0 auto; align-items:center; justify-content:center; border-radius:var(--radius-control); background:var(--surface-primary); color:var(--accent); }

@media (max-width: 900px) {
  .current-account-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .current-account-lower-grid { grid-template-columns:1fr; }
}

@media (max-width: 540px) {
  .current-account-summary { grid-template-columns:1fr; }
  .recent-activity-grid { grid-template-columns:1fr; }
}
```

- [ ] **Step 6: Render the real dashboard fixture and update i18n inventory**

In `tests/ui/preview-main.tsx`, replace `CurrentAccountHero` with `CurrentAccountDashboard`, pass `fixtureStats`, `statsLoading={false}`, `statsError={null}`, and no-op callbacks.

In `tests/language.test.ts`:

- Add a `src/components/dashboard/CurrentAccountDashboard.tsx` entry containing `usageSummary`, `lifetimeTokens`, `todayTokens`, `lastSevenDayTokens`, `currentStreakDays`, `days`, `recentActivity`, `refresh`, `fastMode`, `totalThreads`, `peakDate`, `activityUnavailable`, `viewFullStats`, and `usageAdviceTitle`.
- Keep `usageAdviceHealthy`, `usageAdviceWatchReset`, and `usageAdviceRefresh` in `requiredKeys`; they are selected dynamically and therefore cannot be found by a literal `t("...")` scan.
- Reduce the `CurrentAccountPage.tsx` entry to keys still used by its loading/error/empty branches.

- [ ] **Step 7: Run semantic, browser, language, and build checks**

```powershell
node --experimental-strip-types --test tests/accountDashboard.test.ts
node --experimental-strip-types --test tests/language.test.ts
pnpm test:ui
pnpm build
```

Expected: four summary metrics render, peak date is a localized date, “最长任务” is absent from the home page, and zero fast mode displays `0%`.

- [ ] **Step 8: Commit the home-page hierarchy**

```powershell
git add src/components/dashboard/CurrentAccountDashboard.tsx src/components/dashboard/MetricCard.tsx src/pages/CurrentAccountPage.tsx src/styles/layout.css tests/ui/preview-main.tsx tests/ui/dashboard.spec.ts tests/language.test.ts
git diff --cached --name-only
git commit -m "feat: polish current account dashboard hierarchy"
```

---

### Task 6: Stabilize the Top Toolbar at Narrow Widths

**Files:**
- Modify: `src/components/layout/TopToolbar.tsx`
- Modify: `src/styles/layout.css`
- Modify: `tests/ui/preview-main.tsx`
- Modify: `tests/ui/dashboard.spec.ts`

**Interfaces:**
- Consumes: existing `TopToolbarProps` and `ToolbarAction[]` from `App.tsx`.
- Produces: exactly one persistent primary control (`onAddAccount`) and a non-wrapping action row.

- [ ] **Step 1: Add a failing toolbar priority test**

Add to `tests/ui/dashboard.spec.ts`:

```ts
test("toolbar keeps one primary action and never wraps at 888px", async ({ page }) => {
  await page.setViewportSize({ width: 888, height: 693 });
  await page.goto("/tests/ui/preview.html");
  await expect(page.locator(".app-toolbar .app-btn-primary")).toHaveCount(1);
  const rows = await page.locator(".app-toolbar-actions > *").evaluateAll((items) =>
    new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
  );
  expect(rows).toBe(1);
});
```

Update the fixture to render the real `TopToolbar` with `processInfo={{ count: 1, background_count: 0, can_switch: false, pids: [1] }}`, four global callbacks, and one sample more-menu action.

Run `pnpm test:ui`.

Expected: FAIL if the current flex wrapping produces more than one row at `888px`.

- [ ] **Step 2: Mark toolbar content for predictable responsive degradation**

In `src/components/layout/TopToolbar.tsx`:

```tsx
<p className="app-toolbar-description truncate text-xs app-text-muted">{description}</p>

<span className={`app-toolbar-status app-chip ${hasRunningProcesses ? "app-chip-warning" : "app-chip-success"}`} ...>
  <span className="app-qr-status-dot" ... />
  <span className="app-toolbar-status-label">...</span>
</span>

<button data-toolbar-action="mask" ... />
<button data-toolbar-action="refresh" ... />
<button data-toolbar-action="warmup" ... />
<button data-toolbar-action="add" className="app-icon-button app-btn-primary" ... />
```

Keep the existing labels, handlers, disabled states, and more menu. Do not create a second primary action.

- [ ] **Step 3: Enforce a single toolbar row without losing actions**

Replace `.app-toolbar-actions` and add responsive rules in `src/styles/layout.css`:

```css
.app-toolbar-actions {
  display:flex;
  min-width:0;
  align-items:center;
  justify-content:flex-end;
  gap:0.45rem;
  flex-wrap:nowrap;
}

@media (max-width: 900px) {
  .app-toolbar { gap:0.65rem; padding-inline:0.9rem; }
  .app-toolbar-status-label { display:none; }
  .app-toolbar-status { width:2rem; min-width:2rem; justify-content:center; padding-inline:0; }
}

@media (max-width: 640px) {
  .app-toolbar-description { display:none; }
  .app-toolbar-title h1 { max-width:9rem; }
}
```

The icon-only status chip retains the full process description through its existing `title` attribute.

- [ ] **Step 4: Run the toolbar test and production build**

```powershell
pnpm test:ui
pnpm build
```

Expected: exactly one `.app-btn-primary` in the toolbar and one top-coordinate row at `888px`.

- [ ] **Step 5: Commit the toolbar polish**

```powershell
git add src/components/layout/TopToolbar.tsx src/styles/layout.css tests/ui/preview-main.tsx tests/ui/dashboard.spec.ts
git diff --cached --name-only
git commit -m "fix: keep dashboard toolbar compact"
```

---

### Task 7: Capture Representative Theme Baselines and Complete Release Verification

**Files:**
- Modify: `tests/ui/preview-main.tsx`
- Modify: `tests/ui/dashboard.spec.ts`
- Create: `tests/ui/dashboard.spec.ts-snapshots/*` through Playwright's snapshot command
- Modify: `README.md`

**Interfaces:**
- Consumes: completed layout and all 13 existing skin IDs.
- Produces: stable screenshots for five representative skins and documented UI verification commands.

- [ ] **Step 1: Let the UI fixture select representative skins through the URL**

Add before React rendering in `tests/ui/preview-main.tsx`:

```ts
const params = new URLSearchParams(window.location.search);
const skin = params.get("skin");
if (skin && skin !== "default") {
  document.documentElement.setAttribute("data-skin", skin);
} else {
  document.documentElement.removeAttribute("data-skin");
}
```

- [ ] **Step 2: Add responsive and representative-theme screenshot tests**

Append to `tests/ui/dashboard.spec.ts`:

```ts
for (const skin of ["default", "glass", "graphite", "mint", "illustrated"] as const) {
  test(`${skin} skin keeps the approved dashboard structure`, async ({ page }) => {
    await page.setViewportSize({ width: 1120, height: 760 });
    await page.goto(`/tests/ui/preview.html?skin=${skin}`);
    await expect(page.locator(".current-account-hero")).toBeVisible();
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await expect(page).toHaveScreenshot(`current-account-${skin}-1120x760.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}

test("default dashboard remains usable at the minimum window", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto("/tests/ui/preview.html?skin=default");
  await expect(page).toHaveScreenshot("current-account-default-600x500.png", {
    animations: "disabled",
    fullPage: true,
  });
});

for (const viewport of [
  { width: 900, height: 700 },
  { width: 1440, height: 900 },
] as const) {
  test(`default dashboard has no overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/ui/preview.html?skin=default");
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: document.querySelector<HTMLElement>(".app-sidebar")!.scrollWidth -
        document.querySelector<HTMLElement>(".app-sidebar")!.clientWidth,
      main: document.querySelector<HTMLElement>(".app-main")!.scrollWidth -
        document.querySelector<HTMLElement>(".app-main")!.clientWidth,
    }));
    expect(overflow).toEqual({ document: 0, sidebar: 0, main: 0 });
  });
}

for (const skin of [
  "default", "mint", "graphite", "aurora", "cyberpunk", "minecraft", "glass",
  "mcwood", "illustrated", "anime-sunset", "anime-neon", "anime-forest", "anime-stars",
] as const) {
  test(`${skin} skin has no structural overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 1120, height: 760 });
    await page.goto(`/tests/ui/preview.html?skin=${skin}`);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}
```

- [ ] **Step 3: Generate and review the initial screenshot baselines**

```powershell
pnpm test:ui -- --update-snapshots
pnpm test:ui
```

Expected: six snapshot files are created, all 13 skins pass the structural smoke test, and the second command passes without pixel differences. Manually inspect that `minecraft` and `mcwood` remain readable even though they are not stored as image baselines.

- [ ] **Step 4: Document the deterministic UI checks**

Add this section to `README.md` under the build instructions:

````md
### Dashboard UI verification

```bash
pnpm test:dashboard
pnpm test:ui
```

`test:dashboard` validates quota, peak-date, default-theme, and sidebar-state rules. `test:ui` starts a local Vite fixture and checks responsive overflow plus representative theme screenshots. Install the local Chromium test runtime once with `pnpm exec playwright install chromium`.
````

- [ ] **Step 5: Run every existing and new JavaScript check**

```powershell
pnpm test:desktop-reopen
pnpm test:close-preference
pnpm test:reset-credits
pnpm test:navigation
pnpm test:theme
pnpm test:dashboard
node --experimental-strip-types --test tests/language.test.ts
pnpm test:ui
pnpm build
```

Expected: every test command passes and Vite reports a successful production build.

- [ ] **Step 6: Run Rust and Windows packaging checks**

```powershell
cargo check --manifest-path src-tauri/Cargo.toml
pnpm tauri:win build
```

Expected: `cargo check` finishes successfully; Tauri creates Windows bundles under `src-tauri/target/release/bundle/`.

- [ ] **Step 7: Perform installed-app acceptance checks**

Install the generated Windows setup bundle and verify this exact checklist:

```text
[ ] 600x500 (600×500): menu button opens a labeled drawer; every core action remains reachable.
[ ] 888x693 (888×693): compact sidebar icons are centered; no vertical text or horizontal scrollbar.
[ ] 900x700 (900×700): compact sidebar remains stable one pixel above the expanded breakpoint.
[ ] 1120x760 (1120×760): account, ring, and both quota windows form one hero card.
[ ] 1440x900 (1440×900): expanded sidebar and dashboard surfaces use the available width without excessive stretching.
[ ] Home page: exactly four summary metrics are visible.
[ ] Peak date is a localized date, not a token count.
[ ] Delete appears only inside More and still requires existing confirmation.
[ ] Default skin persists after restart.
[ ] glass, graphite, mint, and illustrated remain readable.
[ ] Tray opens, follows the selected skin palette, and switches accounts normally.
[ ] Refresh, warm-up, browser open, page switching, and updater entry still work.
```

- [ ] **Step 8: Commit visual baselines and verification documentation**

```powershell
git add tests/ui/preview-main.tsx tests/ui/dashboard.spec.ts tests/ui/dashboard.spec.ts-snapshots README.md
git diff --cached --name-only
git commit -m "test: lock dashboard responsive visuals"
```

Expected staged paths: only the two UI sources, snapshot directory, and README.

---

## Final Review Checklist

- [ ] `git status --short` contains no newly staged unrelated user files.
- [ ] The current account page has one hero surface, four summary metrics, one recent-activity surface, and one advice surface.
- [ ] `peakDate` renders a date derived from `stats.daily`; `peakDay` remains available for token-based statistics elsewhere.
- [ ] `SidebarMode` names match in resolver, AppShell, Sidebar, CSS selectors, unit tests, and Playwright tests.
- [ ] All new visible strings exist in English and Simplified Chinese and are covered by `tests/language.test.ts`.
- [ ] Custom skins still override default surfaces and colors.
- [ ] No page or sidebar horizontal overflow exists at all five required viewport sizes: `600x500`, `888x693`, `900x700`, `1120x760`, and `1440x900`.
- [ ] Node tests, Playwright tests, Vite build, Cargo check, and Windows Tauri build pass.
