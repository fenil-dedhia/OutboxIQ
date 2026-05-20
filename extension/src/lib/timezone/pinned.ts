// Pinned-timezone helpers (PRD §5.1.3 Step 2, Session 11). The user pins up to
// MAX_PINNED_TIMEZONES zones (stored as canonical IANA ids on OutboxIQState);
// every TimezonePicker surfaces them in a "Pinned" section above "All
// timezones". Constants (MAX, defaults) live in constants.ts so the storage
// layer can import them without pulling in the curated dataset.

import { resolveCuratedEntry } from "./search";
import { offsetToMinutes, type CuratedTimezone } from "./curated-timezones";

export { MAX_PINNED_TIMEZONES, DEFAULT_PINNED_TIMEZONES } from "../constants";

/** Resolve stored pinned IANA ids to their curated entries — deduped by
 * curated group, offset-ordered, unknown/unresolvable ids dropped (§6.7). The
 * picker's "Pinned" section renders these. */
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
  return out.sort(
    (a, b) => offsetToMinutes(a.offset) - offsetToMinutes(b.offset),
  );
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
