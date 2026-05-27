import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  claimPageInstall,
  __resetPageInstallForTest,
} from "./page-install-latch";

// The latch lives on a <html> attribute (shared across isolated worlds), which
// jsdom shares across cases in a file, so reset before AND after each so neither
// order-dependence nor leakage into other test files can occur.
beforeEach(() => __resetPageInstallForTest());
afterEach(() => __resetPageInstallForTest());

const INSTALL_ATTR = "data-fashionably-late-installed";

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
    __resetPageInstallForTest(); // simulates a fresh document
    expect(claimPageInstall()).toBe(true);
  });

  it("the claim lives on the shared DOM, not on this world's window", () => {
    claimPageInstall();
    // Page-scoped (not call-scoped): the marker is on <html>.
    expect(document.documentElement.getAttribute(INSTALL_ATTR)).toBe("1");
    // It must NOT be a window property — that is exactly what failed to dedupe
    // across a reloaded instance's separate isolated world (the resurfaced
    // "Send now anyway does nothing" bug).
    expect(
      (window as unknown as Record<string, unknown>)
        .__fashionablyLateIntegrationsInstalled,
    ).toBeUndefined();
  });

  it("sees a claim made by a DIFFERENT isolated world (the reload case)", () => {
    // Another content-script instance (separate world, separate `window`) would
    // not share our window — but it DOES share the DOM. Simulate its claim by
    // setting the attribute directly, then assert we correctly skip installing.
    document.documentElement.setAttribute(INSTALL_ATTR, "1");
    expect(claimPageInstall()).toBe(false);
  });
});
