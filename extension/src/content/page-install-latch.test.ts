import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  claimPageInstall,
  __resetPageInstallForTest,
} from "./page-install-latch";

// The latch lives on `window`, which jsdom shares across cases in a file, so
// reset before AND after each so neither order-dependence nor leakage into
// other test files can occur.
beforeEach(() => __resetPageInstallForTest());
afterEach(() => __resetPageInstallForTest());

describe("claimPageInstall (PRD §5.5.1 cross-instance idempotency)", () => {
  it("first caller in a fresh page wins the claim", () => {
    expect(claimPageInstall()).toBe(true);
  });

  it("a second caller (e.g. a re-injected instance) loses the claim", () => {
    expect(claimPageInstall()).toBe(true); // instance A installs
    expect(claimPageInstall()).toBe(false); // instance B must skip
    expect(claimPageInstall()).toBe(false); // and stays skipped
  });

  it("a reset page (new tab / refresh) lets the next caller win again", () => {
    expect(claimPageInstall()).toBe(true);
    __resetPageInstallForTest(); // simulates a fresh window
    expect(claimPageInstall()).toBe(true);
  });

  it("the flag persists on window across calls (proves it is page-scoped, not call-scoped)", () => {
    claimPageInstall();
    expect(
      (window as unknown as Record<string, unknown>)
        .__fashionablyLateIntegrationsInstalled,
    ).toBe(true);
  });
});
