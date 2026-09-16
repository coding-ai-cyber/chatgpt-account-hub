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
