// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Intl/ICU-derived facts about an arbitrary IANA zone (Session 11). This is
// the single source of truth used by BOTH the curated-dataset validation
// tests and the picker's "resolve a stored zone to its curated group" logic
// (src/lib/timezone/search.ts). It depends only on the platform's tz data —
// no bundled offset tables to drift out of date.
//
// All functions are defensive (§6.7 graceful degradation): a malformed or
// unrecognised zone yields a safe default rather than throwing.

// Four samples across a year catch DST in either hemisphere (Jan/Jul are the
// extremes for N/S; Apr/Oct guard odd transition windows). DST always *moves
// clocks forward* — a larger UTC offset — so standard time is the MINIMUM
// offset observed across the year.
const YEAR_SAMPLE_MONTHS = [0, 3, 6, 9];

/** Signed-minutes UTC offset of `timeZone` at `date`, read from Intl's
 * longOffset name ("GMT+05:30", "GMT-08:00", or "GMT"/"UTC" == +0). Returns
 * NaN if the zone is unrecognised. */
export function offsetMinutesAt(timeZone: string, date: Date): number {
  let name: string | undefined;
  try {
    name = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value;
  } catch {
    return NaN;
  }
  if (!name || name === "GMT" || name === "UTC") return name ? 0 : NaN;
  const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(name);
  if (!m) return NaN;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + (m[3] ? Number(m[3]) : 0));
}

function yearOffsets(timeZone: string): number[] {
  return YEAR_SAMPLE_MONTHS.map((mo) =>
    offsetMinutesAt(timeZone, new Date(Date.UTC(2025, mo, 15, 12, 0, 0))),
  );
}

/** The zone's STANDARD-time offset in signed minutes (the minimum across the
 * year). NaN if the zone is unrecognised. */
export function standardOffsetMinutes(timeZone: string): number {
  const offs = yearOffsets(timeZone);
  if (offs.some((o) => Number.isNaN(o))) return NaN;
  return Math.min(...offs);
}

/** True if `timeZone` observes seasonal DST (its offset varies across the
 * year). False for fixed-offset zones and for unrecognised input. */
export function zoneObservesDST(timeZone: string): boolean {
  const offs = yearOffsets(timeZone);
  if (offs.some((o) => Number.isNaN(o))) return false;
  return Math.max(...offs) !== Math.min(...offs);
}
