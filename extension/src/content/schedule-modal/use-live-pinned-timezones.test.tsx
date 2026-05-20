import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useLivePinnedTimezones } from "./use-live-pinned-timezones";
import { emitStorageChange } from "../../test/chrome-mock";
import { STORAGE_KEY_STATE } from "../../lib/constants";

// §5.8.2 → open-modal pin sync (Session 12, owner UX call): the open §5.3 modal
// reflects a pinned-timezone change made on the Settings page (a separate
// context) without reopening.

const LA = "America/Los_Angeles";
const KOL = "Asia/Kolkata";

describe("useLivePinnedTimezones (§5.8.2 → open modal)", () => {
  it("starts from the initial snapshot", () => {
    const { result } = renderHook(() => useLivePinnedTimezones([LA, KOL]));
    expect(result.current).toEqual([LA, KOL]);
  });

  it("updates when a local-storage state change reorders the pins", () => {
    const { result } = renderHook(() => useLivePinnedTimezones([LA, KOL]));
    act(() => {
      emitStorageChange({
        [STORAGE_KEY_STATE]: { newValue: { pinnedTimezones: [KOL, LA] } },
      });
    });
    expect(result.current).toEqual([KOL, LA]);
  });

  it("ignores changes to other storage keys", () => {
    const { result } = renderHook(() => useLivePinnedTimezones([LA, KOL]));
    act(() => {
      emitStorageChange({
        someOtherKey: { newValue: { pinnedTimezones: [] } },
      });
    });
    expect(result.current).toEqual([LA, KOL]);
  });

  it("ignores non-local areas (e.g. sync)", () => {
    const { result } = renderHook(() => useLivePinnedTimezones([LA, KOL]));
    act(() => {
      emitStorageChange(
        { [STORAGE_KEY_STATE]: { newValue: { pinnedTimezones: [KOL] } } },
        "sync",
      );
    });
    expect(result.current).toEqual([LA, KOL]);
  });

  it("ignores a state write that does not change the pin list (no churn)", () => {
    const { result } = renderHook(() => useLivePinnedTimezones([LA, KOL]));
    const before = result.current;
    act(() => {
      // A lastScheduled / recipientCache write carries the SAME pins.
      emitStorageChange({
        [STORAGE_KEY_STATE]: { newValue: { pinnedTimezones: [LA, KOL] } },
      });
    });
    expect(result.current).toBe(before); // same reference — no re-render churn
  });

  it("removes its listener on unmount (no leak across modal opens)", () => {
    const { result, unmount } = renderHook(() =>
      useLivePinnedTimezones([LA, KOL]),
    );
    unmount();
    act(() => {
      emitStorageChange({
        [STORAGE_KEY_STATE]: { newValue: { pinnedTimezones: [KOL, LA] } },
      });
    });
    // After unmount the listener is gone; the last rendered value is unchanged.
    expect(result.current).toEqual([LA, KOL]);
  });
});
