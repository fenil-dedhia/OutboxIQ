import { useEffect, useState } from "react";
import { STORAGE_KEY_STATE } from "../../lib/constants";
import type { OutboxIQState } from "../../lib/storage";

// Live pinned-timezone list for the open §5.3 modal (owner UX call, Session 12).
// Initialised from the snapshot the content script passed at modal-open, then
// kept in sync with chrome.storage so a reorder/add/remove made on the Settings
// page (a SEPARATE extension context) is reflected in the open modal WITHOUT
// reopening it.
//
// Deliberately scoped to `pinnedTimezones` ONLY. Everything else the modal read
// at open — the user's timezone, the preset send-times, the working-hours
// boundaries — stays frozen, by design: live-shifting those mid-interaction
// would move the very times the user is reading. The owner accepted that a
// reorder while the picker dropdown is open reshuffles its options.
//
// Lifecycle: one listener per open modal, removed on unmount (modal close), so
// it never leaks across opens. Writes that don't change the pin list (the
// modal's own lastScheduled / recipient-cache writes fire storage events too)
// are no-ops thanks to the equality guard.
export function useLivePinnedTimezones(initial: string[]): string[] {
  const [pinned, setPinned] = useState<string[]>(initial);

  useEffect(() => {
    // jsdom / non-extension envs may stub onChanged — guard so the modal still
    // renders off the initial snapshot when there's nothing to subscribe to.
    const onChanged = chrome.storage?.onChanged;
    if (!onChanged?.addListener) return;

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ): void => {
      if (area !== "local") return;
      const change = changes[STORAGE_KEY_STATE];
      if (!change) return;
      const next = (change.newValue as Partial<OutboxIQState> | undefined)
        ?.pinnedTimezones;
      if (!Array.isArray(next)) return;
      // Only re-render when the pin list actually changed (ignore the modal's
      // own non-pin writes, e.g. lastScheduled / recipient cache).
      setPinned((prev) => (arraysEqual(prev, next) ? prev : next));
    };

    onChanged.addListener(listener);
    return () => onChanged.removeListener(listener);
  }, []);

  return pinned;
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
