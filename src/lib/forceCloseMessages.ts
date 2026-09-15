import type { TranslationKey, TranslationParams } from "./i18n";

export type ForceCloseMessageInput =
  | { kind: "verification-failed" }
  | { kind: "no-processes" }
  | { kind: "closed"; count: number; forceClose: boolean }
  | { kind: "partial"; closed: number; total: number; remaining: number; forceClose: boolean }
  | { kind: "still-running"; remaining: number; forceClose: boolean }
  | { kind: "request-failed"; message: string };

export type ForceCloseMessage = {
  key: TranslationKey;
  params?: TranslationParams;
  isError: boolean;
};

export function getForceCloseMessage(input: ForceCloseMessageInput): ForceCloseMessage {
  switch (input.kind) {
    case "verification-failed": return { key: "couldNotVerifyCodexClosed", isError: true };
    case "no-processes": return { key: "noRunningCodexProcesses", isError: false };
    case "closed": return {
      key: input.forceClose ? "codexProcessesForceClosed" : "codexProcessesClosed",
      params: { count: input.count }, isError: false,
    };
    case "partial": return {
      key: input.forceClose ? "codexProcessesForceClosedPartially" : "codexProcessesClosedPartially",
      params: { closed: input.closed, total: input.total, remaining: input.remaining }, isError: true,
    };
    case "still-running": return {
      key: input.forceClose ? "codexProcessesForceCloseFailed" : "codexProcessesCloseFailed",
      params: { remaining: input.remaining }, isError: true,
    };
    case "request-failed": return { key: "closeCodexProcessesFailed", params: { message: input.message }, isError: true };
  }
}
