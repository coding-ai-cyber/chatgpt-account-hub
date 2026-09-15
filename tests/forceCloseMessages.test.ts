import assert from "node:assert/strict";
import test from "node:test";
import { getForceCloseMessage } from "../src/lib/forceCloseMessages.ts";

test("maps verification failure to an error translation", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "verification-failed" }),
    { key: "couldNotVerifyCodexClosed", isError: true },
  );
});

test("maps no targeted processes to a non-error translation", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "no-processes" }),
    { key: "noRunningCodexProcesses", isError: false },
  );
});

test("maps complete graceful and force closes", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "closed", count: 1, forceClose: false }),
    { key: "codexProcessesClosed", params: { count: 1 }, isError: false },
  );
  assert.deepEqual(
    getForceCloseMessage({ kind: "closed", count: 2, forceClose: true }),
    { key: "codexProcessesForceClosed", params: { count: 2 }, isError: false },
  );
});

test("maps partial and still-running closes with the correct mode", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "partial", closed: 1, total: 3, remaining: 2, forceClose: false }),
    {
      key: "codexProcessesClosedPartially",
      params: { closed: 1, total: 3, remaining: 2 },
      isError: true,
    },
  );
  assert.deepEqual(
    getForceCloseMessage({ kind: "still-running", remaining: 2, forceClose: true }),
    { key: "codexProcessesForceCloseFailed", params: { remaining: 2 }, isError: true },
  );
});

test("maps backend exceptions to the translated close-error message", () => {
  assert.deepEqual(
    getForceCloseMessage({ kind: "request-failed", message: "permission denied" }),
    { key: "closeCodexProcessesFailed", params: { message: "permission denied" }, isError: true },
  );
});
