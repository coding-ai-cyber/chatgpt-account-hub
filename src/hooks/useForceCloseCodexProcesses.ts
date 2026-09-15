import { useCallback, useState } from "react";
import type { CodexProcessInfo } from "../types";
import { invokeBackend } from "../lib/platform";
import type { Translate } from "../lib/i18n";
import { getForceCloseMessage } from "../lib/forceCloseMessages";

interface KillCodexProcessesResult {
  targeted_count: number;
  killed_pids: number[];
  failed_pids: number[];
  reopen_token?: string | null;
}

interface UseForceCloseCodexProcessesOptions {
  processCount: number;
  checkProcesses: () => Promise<CodexProcessInfo | null>;
  showToast: (message: string, isError?: boolean) => void;
  formatError: (err: unknown) => string;
  t: Translate;
}

export function useForceCloseCodexProcesses({
  processCount,
  checkProcesses,
  showToast,
  formatError,
  t,
}: UseForceCloseCodexProcessesOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isForceClosing, setIsForceClosing] = useState(false);

  const closeCodexProcesses = useCallback(async (reopenDesktop = false, forceClose = false) => {
    try {
      setIsForceClosing(true);

      const result = await invokeBackend<KillCodexProcessesResult>(
        "kill_codex_processes",
        { reopenDesktop, forceClose }
      );
      const latestProcessInfo = await checkProcesses();
      const remainingCount = latestProcessInfo?.count ?? processCount;
      const closedCount = Math.max(0, processCount - remainingCount);

      const message = !latestProcessInfo
        ? getForceCloseMessage({ kind: "verification-failed" })
        : result.targeted_count === 0
          ? getForceCloseMessage({ kind: "no-processes" })
          : remainingCount === 0
            ? getForceCloseMessage({ kind: "closed", count: processCount, forceClose })
            : closedCount > 0
              ? getForceCloseMessage({
                  kind: "partial",
                  closed: closedCount,
                  total: processCount,
                  remaining: remainingCount,
                  forceClose,
                })
              : getForceCloseMessage({ kind: "still-running", remaining: remainingCount, forceClose });

      showToast(t(message.key, message.params), message.isError);

      return { processInfo: latestProcessInfo, reopenToken: result.reopen_token ?? null };
    } catch (err) {
      console.error("Failed to close Codex processes:", err);
      const message = getForceCloseMessage({
        kind: "request-failed",
        message: formatError(err),
      });
      showToast(t(message.key, message.params), message.isError);
      return null;
    } finally {
      setConfirmOpen(false);
      setIsForceClosing(false);
    }
  }, [checkProcesses, formatError, processCount, showToast, t]);

  return {
    forceCloseConfirmOpen: confirmOpen,
    setForceCloseConfirmOpen: setConfirmOpen,
    isForceClosingCodex: isForceClosing,
    closeCodexProcesses,
  };
}
