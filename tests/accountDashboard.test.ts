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

test("rejects impossible calendar dates when selecting the peak day", () => {
  const peak = getPeakUsageDay([
    { date: "2026-09-15", tokens: 82_500_000 },
    { date: "2026-02-30", tokens: 99_000_000 },
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

test("rejects impossible calendar dates when formatting", () => {
  assert.equal(formatDateOnly("2026-02-30", "zh-CN"), "--");
});
