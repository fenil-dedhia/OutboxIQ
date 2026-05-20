import { useCallback, useEffect, useRef, useState } from "react";
import {
  getState,
  setState as persistState,
  type OutboxIQState,
  type RecipientCacheEntry,
} from "../../lib/storage";
import {
  clearRecipientCache,
  removeCachedRecipient,
  setCachedRecipient,
} from "../../lib/recipient-cache";

// State layer for the §5.8 Settings page. Local React state is the single
// source of truth the UI renders; every edit autosaves to chrome.storage.local
// (PRD §5.8 — "edits autosave per field", no global Save button).
//
// Concurrency note: the Schedule Send modal (a different surface) only ever
// writes `recipientCache`. So settings writes are read-modify-write on the
// freshest persisted state and touch ONLY the settings fields — they never
// carry a stale `recipientCache` back, so the two surfaces can't clobber each
// other. All writes go through one serialized chain so rapid edits can't
// interleave. (§6.7: a failed write is logged, never thrown — the panel keeps
// working off its in-memory state.)

type Status = "loading" | "ready";

export interface UseSettings {
  status: Status;
  state: OutboxIQState | null;
  /** Override the user's own timezone (PRD §5.8.2 Profile; source → manual). */
  setTimezone: (timezone: string) => void;
  /** Replace the pinned-timezone list (add / remove / reorder / remove-all). */
  setPinned: (pinned: string[]) => void;
  /** Correct a cached recipient's timezone — delete-then-re-add upsert that
   * KEEPS the original email + resolvedAt (a correction, not a re-resolution).
   * Source is normalised to "manual" (Free v1's only source). */
  editCacheTimezone: (entry: RecipientCacheEntry, timezone: string) => void;
  /** Remove one cached recipient (PRD §5.8.2 per-row delete). */
  deleteCacheEntry: (email: string) => void;
  /** PRD §5.8.2 bulk "Clear all cached recipient timezones". */
  clearCache: () => void;
}

export function useSettings(): UseSettings {
  const [status, setStatus] = useState<Status>("loading");
  const [state, setLocal] = useState<OutboxIQState | null>(null);
  // Mirror of `state` kept in sync *synchronously* so an action computes its
  // next value from the latest committed state (not a render-stale closure),
  // and so no side effect runs inside a setState updater (StrictMode-safe).
  const stateRef = useRef<OutboxIQState | null>(null);
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  const commit = useCallback((next: OutboxIQState) => {
    stateRef.current = next;
    setLocal(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getState().then((s) => {
      if (cancelled) return;
      commit(s);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [commit]);

  // Persist the settings fields of `next` onto the freshest persisted state.
  // Reads fresh first so a concurrent modal cache-write is preserved.
  const persistSettings = useCallback((next: OutboxIQState) => {
    writeChain.current = writeChain.current
      .then(async () => {
        const fresh = await getState();
        await persistState({
          ...fresh,
          user: next.user,
          workingHours: next.workingHours,
          featureToggles: next.featureToggles,
          pinnedTimezones: next.pinnedTimezones,
        });
      })
      .catch((err: unknown) => {
        console.error("[Fashionably Late] settings write failed:", err);
      });
  }, []);

  // Cache mutations go through the dedicated atomic recipient-cache helpers
  // (they own the recipientCache read-modify-write), then re-sync local from
  // the fully-consistent persisted state. Serialized on the same chain.
  const runCacheWrite = useCallback(
    (op: () => Promise<void>) => {
      writeChain.current = writeChain.current
        .then(async () => {
          await op();
          const after = await getState();
          commit(after);
        })
        .catch((err: unknown) => {
          console.error("[Fashionably Late] cache write failed:", err);
        });
    },
    [commit],
  );

  const setTimezone = useCallback(
    (timezone: string) => {
      const cur = stateRef.current;
      if (!cur) return;
      const next: OutboxIQState = {
        ...cur,
        user: { ...cur.user, timezone, timezoneSource: "manual" },
      };
      commit(next); // optimistic — local is authoritative for the UI
      persistSettings(next);
    },
    [commit, persistSettings],
  );

  const setPinned = useCallback(
    (pinned: string[]) => {
      const cur = stateRef.current;
      if (!cur) return;
      const next: OutboxIQState = { ...cur, pinnedTimezones: pinned };
      commit(next);
      persistSettings(next);
    },
    [commit, persistSettings],
  );

  const editCacheTimezone = useCallback(
    (entry: RecipientCacheEntry, timezone: string) => {
      runCacheWrite(() =>
        // Upsert keyed on the same email = delete-then-re-add in one storage
        // transaction. resolvedAt carried through so the "date resolved" stays
        // (a correction, not a fresh resolution); source forced to "manual".
        setCachedRecipient({
          email: entry.email,
          name: entry.name,
          timezone,
          source: "manual",
          resolvedAt: entry.resolvedAt,
        }),
      );
    },
    [runCacheWrite],
  );

  const deleteCacheEntry = useCallback(
    (email: string) => {
      runCacheWrite(() => removeCachedRecipient(email));
    },
    [runCacheWrite],
  );

  const clearCache = useCallback(() => {
    runCacheWrite(() => clearRecipientCache());
  }, [runCacheWrite]);

  return {
    status,
    state,
    setTimezone,
    setPinned,
    editCacheTimezone,
    deleteCacheEntry,
    clearCache,
  };
}
