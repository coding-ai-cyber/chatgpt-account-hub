import assert from "node:assert/strict";
import test from "node:test";
import {
  beginAccountWarmup,
  finishAccountWarmup,
  getAccountIdentity,
  getCodexToolbarMode,
  hasSearchableAccounts,
  normalizeAccountSearchQuery,
  reconcileStatsAccountId,
  shouldConfirmAccountDeletion,
} from "../src/lib/appState.ts";

const accounts = [
  { id: "active", name: "Active User", email: "active@example.com", is_active: true },
  { id: "other", name: "Other User", email: "other@example.com", is_active: false },
];

test("the second current-account delete click is forwarded as confirmed", () => {
  assert.equal(shouldConfirmAccountDeletion(null, "active"), false);
  assert.equal(shouldConfirmAccountDeletion("other", "active"), false);
  assert.equal(shouldConfirmAccountDeletion("active", "active"), true);
});

test("masking changes display identity without changing account ids", () => {
  const masked = getAccountIdentity(accounts[1], true, "Hidden account");
  assert.deepEqual(masked, {
    id: "other",
    name: "Hidden account",
    email: "••••••••",
  });

  const visible = getAccountIdentity(accounts[1], false, "Hidden account");
  assert.deepEqual(visible, {
    id: "other",
    name: "Other User",
    email: "other@example.com",
  });
});

test("search remains available and normalized for a two-account install", () => {
  assert.equal(hasSearchableAccounts(accounts), true);
  assert.equal(normalizeAccountSearchQuery("  OTHER@Example.COM "), "other@example.com");
});

test("search is unavailable when there is no non-active account", () => {
  assert.equal(hasSearchableAccounts(accounts.slice(0, 1)), false);
});

test("stored stats selection survives initial loading and reconciles afterwards", () => {
  assert.equal(reconcileStatsAccountId(accounts, "other", true), "other");
  assert.equal(reconcileStatsAccountId([], "other", true), "other");
  assert.equal(reconcileStatsAccountId(accounts, "other", false), "other");
  assert.equal(reconcileStatsAccountId(accounts, "missing", false), "active");
});

test("stats fallback selection does not mutate login-account activity", () => {
  const snapshot = structuredClone(accounts);
  assert.equal(reconcileStatsAccountId(accounts, "missing", false), "active");
  assert.deepEqual(accounts, snapshot);
});

test("toolbar exposes close while Codex runs and open only when desktop is idle", () => {
  assert.equal(
    getCodexToolbarMode({ count: 1, background_count: 0, can_switch: false, pids: [1] }, true),
    "close",
  );
  assert.equal(
    getCodexToolbarMode({ count: 0, background_count: 0, can_switch: true, pids: [] }, true),
    "open",
  );
  assert.equal(getCodexToolbarMode(null, true), null);
  assert.equal(
    getCodexToolbarMode({ count: 0, background_count: 0, can_switch: true, pids: [] }, false),
    null,
  );
});

test("warm-up guard rejects concurrent requests for the same account", () => {
  const inFlight = new Set<string>();
  assert.equal(beginAccountWarmup(inFlight, "active"), true);
  assert.equal(beginAccountWarmup(inFlight, "active"), false);
  assert.equal(beginAccountWarmup(inFlight, "other"), true);
  finishAccountWarmup(inFlight, "active");
  assert.equal(beginAccountWarmup(inFlight, "active"), true);
});
