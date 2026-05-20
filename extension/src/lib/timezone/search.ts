// Curated-timezone search + resolution (Session 11, Phase 2). Pure functions
// consumed by the shared TimezonePicker. No DOM, no React — unit-testable in
// isolation.

import {
  CURATED_TIMEZONES,
  offsetToMinutes,
  type CuratedTimezone,
} from "./curated-timezones";
import { standardOffsetMinutes, zoneObservesDST } from "./zone-info";

/** The curated list sorted ascending by standard offset (west → east). The
 * source is authored in order already; sorting defensively keeps the picker
 * correct even if an entry is inserted out of order later. */
export const SORTED_CURATED_TIMEZONES: CuratedTimezone[] = [
  ...CURATED_TIMEZONES,
].sort((a, b) => offsetToMinutes(a.offset) - offsetToMinutes(b.offset));

// ─── Offset-string matching (design decision D7) ─────────────────────────
// Instead of duplicating raw offset variants into all 50 searchTerms arrays,
// we generate the variants for an entry's `offset` at query time and match
// the typed query against them. Covers "+5:30", "5:30", "0530", "+5.5",
// "gmt+5:30", "utc+05:30" → the UTC+5:30 entry.

/** Lowercased offset tokens a user might type for a "+05:30"-style offset.
 * Positive offsets carry NO leading "+" (so a bare "0530" or "5:30" matches);
 * negative offsets keep the "-" (so "8" never matches a -8 zone). The query is
 * normalised the same way in cleanOffsetQuery (leading "+" stripped). */
function offsetTokens(offset: string): string[] {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) return [];
  const [, sign, hh, mm] = m;
  const neg = sign === "-" ? "-" : "";
  const h = Number(hh);
  const min = Number(mm);
  const tokens = new Set<string>([
    `${neg}${h}:${mm}`, // 5:30 / -8:00
    `${neg}${hh}:${mm}`, // 05:30
    `${neg}${h}${mm}`, // 530
    `${neg}${hh}${mm}`, // 0530
    `${neg}${h}`, // 5 / -8
  ]);
  // Decimal form for fractional offsets: :30 → .5, :45 → .75.
  if (min === 30) tokens.add(`${neg}${h}.5`);
  if (min === 45) tokens.add(`${neg}${h}.75`);
  if (min === 0) tokens.add(`${neg}${h}.0`);
  return [...tokens].map((t) => t.toLowerCase());
}

/** Normalise an offset query: drop a leading "utc"/"gmt" and a leading "+"
 * so "GMT+5:30", "+5:30", "5:30" and "0530" all reduce to the same form. */
function cleanOffsetQuery(q: string): string {
  return q
    .trim()
    .replace(/^(utc|gmt)\s*/i, "")
    .trim()
    .replace(/^\+/, "");
}

const OFFSET_QUERY_RE = /^[+-]?\d/; // starts with a digit or sign → try offsets

function matchesOffset(entry: CuratedTimezone, qLower: string): boolean {
  const cleaned = cleanOffsetQuery(qLower);
  if (!OFFSET_QUERY_RE.test(cleaned)) return false;
  return offsetTokens(entry.offset).some((tok) => tok.startsWith(cleaned));
}

/** Does `entry` match `query`? Substring across label + abbreviations +
 * searchTerms, plus offset tokens.
 *
 * Case rule (owner request): when the WHOLE query is upper-case (e.g. "IST",
 * "PST"), the user is searching a timezone ABBREVIATION — match
 * case-SENSITIVELY against the label + abbreviations so "IST" finds India /
 * Israel's "(IST)" and NOT "Istanbul". Any lower-case letter ("Ist", "ist",
 * "india") keeps the normal case-insensitive city/country substring search. */
export function matchesEntry(entry: CuratedTimezone, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  if (/[A-Z]/.test(q) && q === q.toUpperCase()) {
    if (entry.label.includes(q)) return true;
    if (entry.abbreviations?.some((a) => a.includes(q))) return true;
    return matchesOffset(entry, q.toLowerCase());
  }

  const qLower = q.toLowerCase();
  if (entry.label.toLowerCase().includes(qLower)) return true;
  if (entry.abbreviations?.some((a) => a.toLowerCase().includes(qLower)))
    return true;
  if (entry.searchTerms.some((t) => t.includes(qLower))) return true;
  return matchesOffset(entry, qLower);
}

/** Curated entries matching `query`, in offset order. Empty/whitespace query
 * returns the whole list. */
export function searchCuratedTimezones(query: string): CuratedTimezone[] {
  const q = query.trim();
  if (!q) return SORTED_CURATED_TIMEZONES;
  return SORTED_CURATED_TIMEZONES.filter((e) => matchesEntry(e, q));
}

// ─── Stored-value resolution (requirement (e)) ───────────────────────────
// A stored IANA id (e.g. the browser-detected "Europe/Amsterdam", or a legacy
// "Asia/Calcutta") usually is NOT one of the 50 canonical primaries. Resolve
// it to the curated group to display for pre-selection — WITHOUT migrating the
// stored value. Layered, most-specific first:
//   1. exact canonical match;
//   2. the id's last path segment is a known searchTerm (calcutta, saigon…);
//   3. same standard offset + DST behaviour (covers any valid zone — e.g.
//      Amsterdam → Berlin/CET, Toronto → New York/Eastern);
//   4. none → undefined (caller shows the raw id + an "update" hint).

function leafTerm(iana: string): string {
  return (iana.split("/").pop() ?? iana).replace(/_/g, " ").toLowerCase();
}

export function resolveCuratedEntry(iana: string): CuratedTimezone | undefined {
  const exact = SORTED_CURATED_TIMEZONES.find((e) => e.ianaIdentifier === iana);
  if (exact) return exact;

  const leaf = leafTerm(iana);
  const byLeaf = SORTED_CURATED_TIMEZONES.find((e) =>
    e.searchTerms.includes(leaf),
  );
  if (byLeaf) return byLeaf;

  const offMin = standardOffsetMinutes(iana);
  if (Number.isNaN(offMin)) return undefined;
  const dst = zoneObservesDST(iana);
  return SORTED_CURATED_TIMEZONES.find(
    (e) => offsetToMinutes(e.offset) === offMin && e.observesDST === dst,
  );
}
