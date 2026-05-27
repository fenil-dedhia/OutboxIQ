// PRD §6.1.1 GDPR data rights — "right to access" (export) and "right to
// erasure" (delete). Free v1 is local-only (§6.1.2 tier amendment): both touch
// ONLY chrome.storage.local. Export writes a file on-device; erasure clears the
// owned keys. Nothing is ever transmitted — no network, no telemetry, and (the
// binding §6.1.2 point) no backend/account/token to revoke (§11 / Entry 39).
//
// Design note (anti-omission): the export embeds the WHOLE state object as
// returned by getState() — never an enumerated allow-list of fields. So a field
// a future session adds to OutboxIQState is exported automatically, with no
// change here. The ONE exception is a small, explicit DENY-list of known-inert
// featureToggles keys (EXPORT_OMITTED_TOGGLE_KEYS) that are stripped from the
// export FILE only — they would mislead a user (Free v1 neither uses nor shows
// them). A new, genuinely-Free-v1 toggle is not on that list, so it still
// exports automatically; only the named dead keys are dropped. The stored
// schema is unchanged. (Owner decisions, Session 13.)

import {
  getState,
  getStoredOnboardingDraft,
  type FeatureToggles,
  type OnboardingDraft,
  type OutboxIQState,
} from "./storage";
import {
  STORAGE_KEY_STATE,
  STORAGE_KEY_ONBOARDING_DRAFT,
  STORAGE_KEY_AUTH,
} from "./constants";

/** Stable marker written into the export file so a future Import feature can
 * recognise it before writing anything back. */
export const EXPORT_APPLICATION_NAME = "Fashionably Late";

export interface FashionablyLateDataExport {
  /** Identifies the file as a Fashionably Late export. */
  application: string;
  /** ISO timestamp the export was produced. */
  exportedAt: string;
  /** §7.2 schema version of the contained state, surfaced at the top level so
   * a future Import can branch on it without parsing `data` first. Mirrors
   * data[STORAGE_KEY_STATE].schemaVersion. */
  schemaVersion: number;
  /**
   * The exported payload, keyed by the chrome.storage.local key it came from
   * so a future Import can write it back 1:1. The full state object is embedded
   * as-is (the anti-omission guarantee above). The onboarding draft key is
   * present only when one is actually persisted — a fully-onboarded user has
   * none (completeOnboarding clears it).
   */
  data: Record<string, unknown>;
}

/**
 * featureToggles keys present in the stored schema but NOT part of Free v1 —
 * so they are stripped from the export file (only). Typed as keyof
 * FeatureToggles, so renaming/removing a toggle is a compile error here,
 * forcing a deliberate review. Each is never surfaced in the Free-v1 UI:
 *  - unscheduleOnReply        — Premium v1 only (PRD §5.6).
 *  - scheduleConfirmationToast — moot: tied to §5.9 Undo, which was removed
 *                                (Entry 37; Gmail shows its own confirmation).
 *  - alwaysScheduleOutsideHours — §5.5.2 auto-suppress, dropped for v1.
 * (Owner decision, Session 13: a `true` here would imply an active feature.)
 */
export const EXPORT_OMITTED_TOGGLE_KEYS: readonly (keyof FeatureToggles)[] = [
  "unscheduleOnReply",
  "scheduleConfirmationToast",
  "alwaysScheduleOutsideHours",
];

/** Pure assembly of the export payload from already-loaded data. Kept separate
 * from the storage read so the anti-omission guarantee is directly testable:
 * pass a state with an extra top-level field and it appears in the output. The
 * only filtering is EXPORT_OMITTED_TOGGLE_KEYS within featureToggles. */
export function assembleDataExport(
  state: OutboxIQState,
  draft: OnboardingDraft | null,
  now: Date,
): FashionablyLateDataExport {
  // Strip the known-inert toggle keys from a COPY — the stored state is
  // untouched; this only shapes the export file.
  const featureToggles: Record<string, unknown> = { ...state.featureToggles };
  for (const key of EXPORT_OMITTED_TOGGLE_KEYS) {
    delete featureToggles[key];
  }
  const exportedState: Record<string, unknown> = { ...state, featureToggles };

  const data: Record<string, unknown> = { [STORAGE_KEY_STATE]: exportedState };
  if (draft !== null) {
    data[STORAGE_KEY_ONBOARDING_DRAFT] = draft;
  }
  return {
    application: EXPORT_APPLICATION_NAME,
    exportedAt: now.toISOString(),
    schemaVersion: state.schemaVersion,
    data,
  };
}

/** Read all local data and assemble the §6.1.1 export object. */
export async function buildDataExport(
  now: Date = new Date(),
): Promise<FashionablyLateDataExport> {
  const [state, draft] = await Promise.all([
    getState(),
    getStoredOnboardingDraft(),
  ]);
  return assembleDataExport(state, draft, now);
}

/** Pretty-printed (2-space) so the file is human-readable, per §6.1.1. */
export function serializeDataExport(file: FashionablyLateDataExport): string {
  return JSON.stringify(file, null, 2);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Self-describing, date-stamped filename, e.g.
 * `fashionably-late-data-export-2026-05-27.json`. Local date (the user's). */
export function exportFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  return `fashionably-late-data-export-${y}-${m}-${d}.json`;
}

/**
 * Trigger a fully-local file download of `contents`. No network: a Blob + an
 * object URL + a synthesized anchor click, revoked immediately after (§11 /
 * Free-v1 local-only — nothing is ever transmitted). The only DOM-touching
 * function in this module.
 */
export function downloadJsonFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// --- §6.1.1 right to erasure ------------------------------------------------

/**
 * Every chrome.storage.local key this extension owns (the constants.ts set).
 * Erasure clears EXACTLY these — never the whole namespace blind, so a key
 * another extension happened to write is untouched. STORAGE_KEY_AUTH is inert
 * in Free v1 (no OAuth — Entry 39), so it is normally absent; it is still
 * removed here for an exhaustive wipe (a no-op when absent).
 */
export const OWNED_STORAGE_KEYS: readonly string[] = [
  STORAGE_KEY_STATE,
  STORAGE_KEY_ONBOARDING_DRAFT,
  STORAGE_KEY_AUTH,
];

/**
 * Irreversibly delete ALL local Fashionably Late data (PRD §6.1.1 right to
 * erasure). Free v1 is local-only (§6.1.2): there is no backend, account, or
 * token to revoke — this clears chrome.storage.local and nothing else.
 *
 * Keys are removed one at a time so a single failing key is SURFACED rather
 * than masking the rest (§6.7 graceful degradation — never a silent half-wipe).
 * After a successful call, getState() returns defaults (un-onboarded).
 */
export async function deleteAllData(): Promise<void> {
  const failed: string[] = [];
  for (const key of OWNED_STORAGE_KEYS) {
    try {
      await chrome.storage.local.remove(key);
    } catch (err) {
      console.error(`[Fashionably Late] failed to delete "${key}":`, err);
      failed.push(key);
    }
  }
  if (failed.length > 0) {
    throw new Error(`Could not delete: ${failed.join(", ")}`);
  }
}
