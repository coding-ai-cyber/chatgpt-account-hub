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
