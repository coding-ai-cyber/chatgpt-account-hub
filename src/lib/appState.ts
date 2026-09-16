import type { CodexProcessInfo } from "../types";

interface AccountIdentity {
  id: string;
  name: string;
  email: string | null;
  is_active?: boolean;
}

export function shouldConfirmAccountDeletion(
  pendingAccountId: string | null,
  requestedAccountId: string,
): boolean {
  return pendingAccountId === requestedAccountId;
}

export function getAccountIdentity(
  account: AccountIdentity,
  masked: boolean,
  hiddenName: string,
): Pick<AccountIdentity, "id" | "name" | "email"> {
  return masked
    ? { id: account.id, name: hiddenName, email: "••••••••" }
    : { id: account.id, name: account.name, email: account.email };
}

export function hasSearchableAccounts(accounts: readonly AccountIdentity[]): boolean {
  return accounts.some((account) => !account.is_active);
}

export function normalizeAccountSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function reconcileStatsAccountId(
  accounts: readonly AccountIdentity[],
  currentAccountId: string | null,
  loading: boolean,
): string | null {
  if (loading) return currentAccountId;
  if (currentAccountId && accounts.some((account) => account.id === currentAccountId)) {
    return currentAccountId;
  }
  return accounts.find((account) => account.is_active)?.id ?? accounts[0]?.id ?? null;
}

export function getCodexToolbarMode(
  processInfo: CodexProcessInfo | null,
  desktopRuntime: boolean,
): "open" | "close" | null {
  if (!desktopRuntime || !processInfo) return null;
  return processInfo.count > 0 ? "close" : "open";
}

export function beginAccountWarmup(inFlight: Set<string>, accountId: string): boolean {
  if (inFlight.has(accountId)) return false;
  inFlight.add(accountId);
  return true;
}

export function finishAccountWarmup(inFlight: Set<string>, accountId: string): void {
  inFlight.delete(accountId);
}
