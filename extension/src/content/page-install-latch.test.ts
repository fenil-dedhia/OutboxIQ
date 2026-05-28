// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  claimPageOwnership,
  isCurrentOwner,
  __resetPageOwnershipForTest,
} from "./page-install-latch";

// Single-active-instance page ownership (PRD §5.2 / §5.5.1). The marker is a
// <html> attribute (shared across isolated worlds), which jsdom shares across
// cases in a file, so reset before AND after each. NOTE: the real two-instance
// orphan scenario is single-world-impossible to reproduce here — these tests
// prove the token + liveness LOGIC; the live behavior is hands-on verified.

const OWNER_ATTR = "data-fashionably-late-owner";

beforeEach(() => __resetPageOwnershipForTest());
afterEach(() => __resetPageOwnershipForTest());

describe("page ownership (PRD §5.2 / §5.5.1 single-active-instance)", () => {
  it("a fresh page with nothing claimed defaults to acting (single instance)", () => {
    // No claim yet → a lone live instance must still act.
    expect(document.documentElement.getAttribute(OWNER_ATTR)).toBeNull();
    expect(isCurrentOwner()).toBe(true);
  });

  it("after claiming, this instance is the owner", () => {
    claimPageOwnership();
    expect(document.documentElement.getAttribute(OWNER_ATTR)).not.toBeNull();
    expect(isCurrentOwner()).toBe(true);
  });

  it("a newer instance's claim supersedes us — we go inert", () => {
    claimPageOwnership(); // we own it...
    expect(isCurrentOwner()).toBe(true);
    // ...then a newer instance (separate world, shares the DOM) claims. We
    // can't share its token, so simulate by overwriting the marker.
    document.documentElement.setAttribute(OWNER_ATTR, "fl-newer-instance");
    expect(isCurrentOwner()).toBe(false);
  });

  it("an orphaned context never acts, even while it still holds the token", () => {
    claimPageOwnership();
    expect(isCurrentOwner()).toBe(true);
    // Simulate the extension context being severed (orphaned after reload):
    // chrome.runtime.id becomes undefined.
    const runtime = chrome.runtime as unknown as { id?: string };
    const savedId = runtime.id;
    delete runtime.id;
    try {
      expect(isCurrentOwner()).toBe(false);
    } finally {
      runtime.id = savedId;
    }
  });

  it("reset clears the claim (new tab / Gmail refresh)", () => {
    claimPageOwnership();
    __resetPageOwnershipForTest();
    expect(document.documentElement.getAttribute(OWNER_ATTR)).toBeNull();
    expect(isCurrentOwner()).toBe(true); // unclaimed default
  });
});
