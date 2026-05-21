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
