// Pinned-timezone helpers (PRD §5.1.3 Step 2, Session 11). The user pins up to
// MAX_PINNED_TIMEZONES zones (stored as canonical IANA ids on OutboxIQState);
// every TimezonePicker surfaces them in a "Pinned" section above "All
// timezones". Constants (MAX, defaults) live in constants.ts so the storage
// layer can import them without pulling in the curated dataset.

import { resolveCuratedEntry } from "./search";
import { type CuratedTimezone } from "./curated-timezones";

export { MAX_PINNED_TIMEZONES, DEFAULT_PINNED_TIMEZONES } from "../constants";

/** Resolve stored pinned IANA ids to their curated entries — deduped by
 * curated group, unknown/unresolvable ids dropped (§6.7), **preserving the
 * input array order**. The order in `state.pinnedTimezones` is authoritative
 * and user-controlled (Session 12 §5.8.2 reorder controls); the picker's
 * "Pinned" section and the Settings chips both render in this order. (Was
 * offset-sorted through Session 11, before pins were user-orderable.) */
export function resolvePinnedEntries(
  ianaIds: readonly string[],
): CuratedTimezone[] {
  const seen = new Set<string>();
  const out: CuratedTimezone[] = [];
  for (const id of ianaIds) {
    const entry = resolveCuratedEntry(id);
    if (entry && !seen.has(entry.ianaIdentifier)) {
      seen.add(entry.ianaIdentifier);
      out.push(entry);
    }
  }
  return out;
}

/** PRD §5.8.2 Settings reorder: move the pinned id at `index` one slot toward
 * the start (`dir = -1`) or end (`dir = +1`), returning a NEW array. A move
 * that would cross a boundary (or an out-of-range index) returns a copy
 * unchanged. The keyboard (arrow-key) reorder path uses this. Pure (no
 * storage), so it unit-tests in isolation. */
export function movePinned(
  ids: readonly string[],
  index: number,
  dir: -1 | 1,
): string[] {
  return reorderPinned(ids, index, index + dir);
}

/** Move the pinned id from `from` to `to` (arbitrary distance), returning a NEW
 * array. The drag-and-drop reorder path uses this. A no-op move or an
 * out-of-range index returns a copy unchanged. Pure — unit-tested. */
export function reorderPinned(
  ids: readonly string[],
  from: number,
  to: number,
): string[] {
  if (
    from === to ||
    from < 0 ||
    from >= ids.length ||
    to < 0 ||
    to >= ids.length
  ) {
    return [...ids];
  }
  const next = [...ids];
  const moved = next[from];
  if (moved === undefined) return [...ids]; // unreachable given the guard above
  next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** A compact label for a pinned-zone chip: the descriptor + offset, dropping
 * the city list. e.g. "(UTC+5:30) India, Sri Lanka — Mumbai…" → "India, Sri
 * Lanka (UTC+5:30)"; "(UTC+8:00) Singapore" → "Singapore (UTC+8:00)". */
export function pinnedChipLabel(entry: CuratedTimezone): string {
  const m = /^\((UTC[^)]*)\)\s*(.+)$/.exec(entry.label);
  if (!m) return entry.label;
  const offset = m[1] ?? "";
  const descriptor = (m[2] ?? "").split(" — ")[0]?.trim() ?? entry.label;
  return `${descriptor} (${offset})`;
}
