// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.5.1 — synchronous working-hours config snapshot.
//
// Why this exists: §5.5.1 must decide "is *now* outside working hours?"
// *inside* the Send-button event handler, BEFORE calling preventDefault —
// the probe (research/send-button-probe.md) proved Gmail finalises the send
// within the same gesture, so there is no time to `await chrome.storage`.
// We therefore keep a synchronously-readable snapshot, seeded from
// getState() at install and refreshed on chrome.storage changes.
//
// Fail-OPEN by design: if the snapshot is null (not yet loaded, or storage
// unavailable) the guard does nothing and the native Send proceeds. We never
// block a send because we don't yet know the rules — §5.2.3 / §6.7.

import { getState } from "../../lib/storage";
import { STORAGE_KEY_STATE } from "../../lib/constants";
import type { WorkingHours } from "../../lib/storage";

export interface SendGuardConfig {
  /** User's configured IANA timezone (PRD §7.2 user.timezone). */
  timezone: string;
  /** Working hours + absolute limits (PRD §7.2). The §5.5 calc input. */
  workingHours: WorkingHours;
  /** §5.8.2 toggle. When false, the §5.5.1 guard does not intercept Send at
   * all (fail-toward-send) — the off-hours auto-reschedule prompt is disabled. */
  autoRescheduleOnOutsideHours: boolean;
}

let cached: SendGuardConfig | null = null;

/** The current snapshot, or null if not loaded yet (→ guard inert). */
export function getCachedConfig(): SendGuardConfig | null {
  return cached;
}

/** Test seam + content-script seed: set the snapshot directly. */
export function setCachedConfig(c: SendGuardConfig | null): void {
  cached = c;
}

/**
 * Keep the snapshot fresh: re-derive from getState() whenever the persisted
 * state changes (so an onboarding edit / Settings change takes effect without
 * a page reload). Returns a teardown (used by tests; the content script
 * installs once for the page lifetime). Any failure nulls the snapshot so the
 * guard fails OPEN — never throws into Gmail.
 */
export function startConfigWatch(initial?: SendGuardConfig): () => void {
  let disposed = false;
  if (initial) cached = initial;

  const refresh = (): void => {
    void getState()
      .then((s) => {
        if (!disposed) {
          cached = {
            timezone: s.user.timezone,
            workingHours: s.workingHours,
            autoRescheduleOnOutsideHours:
              s.featureToggles.autoRescheduleOnOutsideHours,
          };
        }
      })
      .catch(() => {
        // A failed read most likely means a SEVERED extension context — i.e.
        // an orphaned post-reload instance whose chrome.* is dead. Drop the
        // snapshot to null so the §5.5.1 guard fails OPEN (no warning) rather
        // than acting on a frozen, possibly-stale snapshot. A live instance
        // only hits this on a transient error and recovers on the next
        // refresh; fail-open is the §5.2.3 / §6.7 contract either way.
        if (!disposed) cached = null;
      });
  };

  // Seed if no initial snapshot was supplied.
  if (!initial) refresh();

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (area !== "local" || !changes[STORAGE_KEY_STATE]) return;
    refresh(); // via getState() so default-merge / schema migration applies
  };

  // Re-read when the tab is re-shown / re-focused. Belt-and-braces for the
  // multi-instance reload case: after an extension reload the user may edit
  // Settings and return to an already-open Gmail tab. `onChanged` alone proved
  // unreliable across the orphaned-old + freshly-injected instance pair, but
  // the DOM visibilitychange/focus events fire in EVERY isolated world
  // regardless of whether its chrome.* context is alive — so on return a LIVE
  // instance re-reads fresh config and a SEVERED one nulls its cache (fails
  // open). Refresh is fail-open and never throws into Gmail; this does not
  // touch the guard's decision logic.
  const onVisible = (): void => {
    if (document.visibilityState === "visible") refresh();
  };
  try {
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
  } catch {
    /* no DOM here (non-jsdom test env) — onChanged + seed still apply */
  }

  try {
    chrome.storage.onChanged.addListener(listener);
  } catch {
    /* no chrome.storage.onChanged here (e.g. tests) — seed-only is fine */
  }

  return (): void => {
    disposed = true;
    try {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    } catch {
      /* ignore */
    }
    try {
      chrome.storage.onChanged.removeListener(listener);
    } catch {
      /* ignore */
    }
  };
}
