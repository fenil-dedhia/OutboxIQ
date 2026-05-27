// PRD §6.1.1 GDPR data rights — "right to access" (export). Free v1 is
// local-only (§6.1.2 tier amendment): export reads ONLY chrome.storage.local
// and writes a file on-device. Nothing is ever transmitted — no network, no
// telemetry (§11 / Entry 39). The erasure half ("right to erasure") is added
// here in Phase 2.
//
// Design note (anti-omission): the export embeds the WHOLE state object as
// returned by getState(), never an enumerated subset of fields. So a field a
// future session adds to OutboxIQState is exported automatically, with no
// change to this module — there is no second place a field can be silently
// dropped. (Owner decision, Session 13.)

import {
  getState,
  getStoredOnboardingDraft,
  type OnboardingDraft,
  type OutboxIQState,
} from "./storage";
import { STORAGE_KEY_STATE, STORAGE_KEY_ONBOARDING_DRAFT } from "./constants";

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

/** Pure assembly of the export payload from already-loaded data. Kept separate
 * from the storage read so the anti-omission guarantee is directly testable:
 * pass a state with an extra field and it appears in the output, unchanged. */
export function assembleDataExport(
  state: OutboxIQState,
  draft: OnboardingDraft | null,
  now: Date,
): FashionablyLateDataExport {
  const data: Record<string, unknown> = { [STORAGE_KEY_STATE]: state };
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
