import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountUsageStats as AccountUsageStatsInfo } from "../types";
import { invokeBackend } from "../lib/platform";

export interface AccountUsageStatsState {
  stats: AccountUsageStatsInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAccountUsageStats(
  accountId: string | null | undefined,
  enabled = true
): AccountUsageStatsState {
  const [stats, setStats] = useState<AccountUsageStatsInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!accountId || !enabled) return;
    const requestId = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const next = await invokeBackend<AccountUsageStatsInfo>("get_account_usage_stats", {
        accountId,
      });
      if (requestId === requestSeq.current) {
        setStats(next);
      }
    } catch (err) {
      if (requestId === requestSeq.current) {
        setStats(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
  }, [accountId, enabled]);

  useEffect(() => {
    requestSeq.current += 1;
    setStats(null);
    setError(null);
    setLoading(false);
    if (accountId && enabled) void refresh();
  }, [accountId, enabled, refresh]);

  return { stats, loading, error, refresh };
}