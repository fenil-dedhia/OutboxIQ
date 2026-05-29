// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, afterEach } from "vitest";
import {
  getCachedConfig,
  setCachedConfig,
  startConfigWatch,
} from "./config-cache";
import { createDefaultState, setState } from "../../lib/storage";
import { emitStorageChange } from "../../test/chrome-mock";
import { STORAGE_KEY_STATE } from "../../lib/constants";

// Real storage→cache propagation for the §5.8.2 autoRescheduleOnOutsideHours
// toggle (the path the guard's own test bypasses by mocking getCachedConfig).

const flush = () => new Promise((r) => setTimeout(r, 0));

let teardown: (() => void) | null = null;
afterEach(() => {
  teardown?.();
  teardown = null;
  setCachedConfig(null);
});

describe("config-cache — autoRescheduleOnOutsideHours propagation", () => {
  it("seeds the toggle from getState() when started without an initial", async () => {
    const s = createDefaultState();
    s.featureToggles.autoRescheduleOnOutsideHours = false;
    await setState(s);

    teardown = startConfigWatch(); // no initial → refresh() reads storage
    await flush();

    expect(getCachedConfig()?.autoRescheduleOnOutsideHours).toBe(false);
  });

  it("refreshes the toggle on a storage change (Settings edit, no reload)", async () => {
    await setState(createDefaultState()); // toggle defaults ON
    teardown = startConfigWatch();
    await flush();
    expect(getCachedConfig()?.autoRescheduleOnOutsideHours).toBe(true);

    // Settings turns it off in another context: persist + fire onChanged.
    const off = createDefaultState();
    off.featureToggles.autoRescheduleOnOutsideHours = false;
    await setState(off);
    emitStorageChange({
      [STORAGE_KEY_STATE]: { newValue: off as unknown as object },
    });
    await flush();

    expect(getCachedConfig()?.autoRescheduleOnOutsideHours).toBe(false);
  });
});

// Session 17 hardening: re-read on tab re-show / re-focus (DOM events fire in
// every isolated world regardless of chrome.* liveness), and null the snapshot
// when a read fails (severed context → guard fails open). Defensive freshness
// for the multi-instance reload case.
describe("config-cache — freshness on return-to-tab + fail-open", () => {
  it("re-reads working hours when the tab becomes visible again", async () => {
    const before = createDefaultState();
    before.workingHours.monday.end = "17:00";
    await setState(before);
    // Seeded with the (stale) snapshot, as on reload.
    teardown = startConfigWatch({
      timezone: before.user.timezone,
      workingHours: before.workingHours,
      autoRescheduleOnOutsideHours: true,
    });
    expect(getCachedConfig()?.workingHours.monday.end).toBe("17:00");

    // Settings widens Monday's hours while away — NO onChanged fired (the path
    // that proved unreliable across instances).
    const after = createDefaultState();
    after.workingHours.monday.end = "23:00";
    await setState(after);

    // Returning to the tab fires visibilitychange (jsdom defaults to visible).
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();

    expect(getCachedConfig()?.workingHours.monday.end).toBe("23:00");
  });

  it("nulls the snapshot (fails open) when a read throws — severed context", async () => {
    await setState(createDefaultState());
    teardown = startConfigWatch({
      timezone: "America/New_York",
      workingHours: createDefaultState().workingHours,
      autoRescheduleOnOutsideHours: true,
    });
    expect(getCachedConfig()).not.toBeNull();

    const realGet = chrome.storage.local.get;
    chrome.storage.local.get = (() =>
      Promise.reject(
        new Error("Extension context invalidated."),
      )) as typeof chrome.storage.local.get;
    try {
      document.dispatchEvent(new Event("visibilitychange"));
      await flush();
      expect(getCachedConfig()).toBeNull(); // guard sees null → native Send proceeds
    } finally {
      chrome.storage.local.get = realGet;
    }
  });
});
