import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useSettings } from "./useSettings";
import { createDefaultState, getState } from "../../lib/storage";
import {
  listCachedRecipients,
  setManualRecipientTimezone,
} from "../../lib/recipient-cache";

// End-to-end coverage of the §5.8 state-mutating actions: each persists through
// chrome.storage (asserted via getState()) and the hook's local `state`
// converges to the same truth.

async function readyHook() {
  const view = renderHook(() => useSettings());
  await waitFor(() => expect(view.result.current.status).toBe("ready"));
  return view;
}

describe("useSettings — settings autosave (§5.8.2)", () => {
  it("setTimezone persists the zone and marks the source manual", async () => {
    const { result } = await readyHook();
    act(() => result.current.setTimezone("Asia/Tokyo"));
    await waitFor(async () => {
      const s = await getState();
      expect(s.user.timezone).toBe("Asia/Tokyo");
      expect(s.user.timezoneSource).toBe("manual");
    });
    expect(result.current.state?.user.timezone).toBe("Asia/Tokyo");
  });

  it("setPinned persists the EXACT array order (reorder is authoritative)", async () => {
    const { result } = await readyHook();
    const ordered = ["Asia/Kolkata", "America/Los_Angeles", "Europe/Berlin"];
    act(() => result.current.setPinned(ordered));
    await waitFor(async () => {
      expect((await getState()).pinnedTimezones).toEqual(ordered);
    });
    // A reorder is just another setPinned with a permuted array.
    act(() =>
      result.current.setPinned([
        "America/Los_Angeles",
        "Asia/Kolkata",
        "Europe/Berlin",
      ]),
    );
    await waitFor(async () => {
      expect((await getState()).pinnedTimezones).toEqual([
        "America/Los_Angeles",
        "Asia/Kolkata",
        "Europe/Berlin",
      ]);
    });
  });

  it("setPinned does NOT disturb the recipient cache (no cross-field clobber)", async () => {
    await setManualRecipientTimezone("keep@example.com", "UTC", "Keep");
    const { result } = await readyHook();
    act(() => result.current.setPinned(["America/New_York"]));
    await waitFor(async () => {
      expect((await getState()).pinnedTimezones).toEqual(["America/New_York"]);
    });
    expect(await listCachedRecipients()).toHaveLength(1);
  });

  it("setWorkingHours persists working hours + Default boundaries", async () => {
    const { result } = await readyHook();
    const wh = {
      ...createDefaultState().workingHours,
      absoluteEarliest: "06:00",
      monday: { enabled: false, start: "09:00", end: "17:00" },
    };
    act(() => result.current.setWorkingHours(wh));
    await waitFor(async () => {
      const s = await getState();
      expect(s.workingHours.absoluteEarliest).toBe("06:00");
      expect(s.workingHours.monday.enabled).toBe(false);
    });
  });

  it("setWorkingHours to defaults round-trips (Reset path)", async () => {
    const { result } = await readyHook();
    // First change, then reset to defaults.
    act(() =>
      result.current.setWorkingHours({
        ...createDefaultState().workingHours,
        absoluteLatest: "23:00",
      }),
    );
    await waitFor(async () => {
      expect((await getState()).workingHours.absoluteLatest).toBe("23:00");
    });
    act(() =>
      result.current.setWorkingHours(createDefaultState().workingHours),
    );
    await waitFor(async () => {
      expect((await getState()).workingHours.absoluteLatest).toBe("19:00");
    });
  });

  it("setFeatureToggle persists a flag without touching the others", async () => {
    const { result } = await readyHook();
    act(() => result.current.setFeatureToggle("recipientOptimization", false));
    await waitFor(async () => {
      const t = (await getState()).featureToggles;
      expect(t.recipientOptimization).toBe(false);
      // The other Free-v1 toggle is untouched.
      expect(t.autoRescheduleOnOutsideHours).toBe(true);
    });
  });
});

describe("useSettings — recipient cache (§5.8.2)", () => {
  it("editCacheTimezone changes the zone but preserves email + resolvedAt", async () => {
    const resolvedAt = new Date("2026-01-02T03:04:05.000Z").toISOString();
    await setManualRecipientTimezone(
      "e@example.com",
      "America/New_York",
      "Edna",
    );
    // Backdate resolvedAt deterministically via a direct re-seed.
    {
      const s = await getState();
      s.recipientCache = s.recipientCache.map((r) =>
        r.email === "e@example.com" ? { ...r, resolvedAt } : r,
      );
      const { setState } = await import("../../lib/storage");
      await setState(s);
    }
    const { result } = await readyHook();
    const entry = result.current.state!.recipientCache.find(
      (r) => r.email === "e@example.com",
    )!;

    act(() => result.current.editCacheTimezone(entry, "Europe/Berlin"));
    await waitFor(async () => {
      const all = await listCachedRecipients();
      const hit = all.find((r) => r.email === "e@example.com")!;
      expect(hit.timezone).toBe("Europe/Berlin");
      expect(hit.resolvedAt).toBe(resolvedAt);
      expect(hit.source).toBe("manual");
      expect(all).toHaveLength(1); // not duplicated
    });
  });

  it("deleteCacheEntry removes one entry", async () => {
    await setManualRecipientTimezone("a@example.com", "UTC");
    await setManualRecipientTimezone("b@example.com", "Asia/Tokyo");
    const { result } = await readyHook();
    act(() => result.current.deleteCacheEntry("a@example.com"));
    await waitFor(async () => {
      const all = await listCachedRecipients();
      expect(all).toHaveLength(1);
      expect(all[0]!.email).toBe("b@example.com");
    });
    expect(result.current.state?.recipientCache).toHaveLength(1);
  });

  it("clearCache empties the cache", async () => {
    await setManualRecipientTimezone("a@example.com", "UTC");
    await setManualRecipientTimezone("b@example.com", "Asia/Tokyo");
    const { result } = await readyHook();
    act(() => result.current.clearCache());
    await waitFor(async () => {
      expect(await listCachedRecipients()).toEqual([]);
    });
    expect(result.current.state?.recipientCache).toEqual([]);
  });
});
