// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Formats wall-clock time the way Gmail's custom "Pick date & time" inputs
// expect, plus a human display string. Formats confirmed by the Session 4
// probe (research/pick-date-time-probe.md Result log):
//   date input  → "May 17, 2026"   (MMM D, YYYY)
//   time input  → "8:00 AM"        (h:mm A)
//   display     → "Sun, May 17, 8:00 AM" (Gmail's row style)
//
// Pure (Intl + the UTC-construction trick so wall components are formatted
// verbatim with no timezone shift). No DST math: callers pass wall-clock
// components already in the user's timezone.

export interface WallTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
}

export interface GmailScheduleStrings {
  /** "Sun, May 17, 8:00 AM" — for our modal + the stored "last scheduled". */
  display: string;
  /** "May 17, 2026" — Gmail custom date input. */
  gmailDate: string;
  /** "8:00 AM" — Gmail custom time input. */
  gmailTime: string;
  /**
   * "May 17, 8:00 AM" — the date+time substring Gmail concatenates into a
   * native preset row ("Tomorrow morningMay 17, 8:00 AM"). Used to match the
   * correct row by content (NOT position), which is what makes preset
   * targeting robust against Gmail's extra "Last scheduled time" row.
   */
  rowKey: string;
}

function asUtc(w: WallTime): Date {
  return new Date(Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute));
}

export function formatForGmail(w: WallTime): GmailScheduleStrings {
  const d = asUtc(w);
  const fmt = (opts: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(d);
  return {
    display: fmt({
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    gmailDate: fmt({ month: "short", day: "numeric", year: "numeric" }),
    gmailTime: fmt({ hour: "numeric", minute: "2-digit", hour12: true }),
    rowKey:
      fmt({ month: "short", day: "numeric" }) +
      ", " +
      fmt({ hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

// --- Past-time guard helpers (Session 5.5, A2) -----------------------------
// Wall-clock comparison via the same UTC-construction trick used everywhere
// here (Date.UTC over the wall components): both operands use the identical
// convention, so "is target before ref" is exact. DST is ignored (a wall
// comparison straddling a DST flip can be off by ≤1h once a year) — the
// accepted, codebase-wide tradeoff (see presets.ts / formatForGmail).

function wallMs(w: WallTime): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
}

/** "now" as wall-clock components in `timeZone` (fresh per call — callers
 * pass a live Date for the click-time defense-in-depth). */
export function nowWallInTimeZone(
  timeZone: string,
  ref: Date = new Date(),
): WallTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(ref);
  const g = (t: string): number =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  const hour = g("hour");
  return {
    year: g("year"),
    month: g("month"),
    day: g("day"),
    hour: hour === 24 ? 0 : hour, // some engines emit "24" at midnight
    minute: g("minute"),
  };
}

/** Add whole minutes to a wall time (DST-free, same UTC trick). */
export function addMinutesToWall(w: WallTime, mins: number): WallTime {
  const d = new Date(wallMs(w) + mins * 60000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** True if `target` is before `ref` + `bufferMins` (i.e. in the past, or
 * too soon). Minimum acceptable schedule time is now + bufferMins. */
export function isPastWallTime(
  target: WallTime,
  ref: WallTime,
  bufferMins = 5,
): boolean {
  return wallMs(target) < wallMs(ref) + bufferMins * 60000;
}

/** "YYYY-MM-DD" for an `<input type="date">` value/min. */
export function wallToDateInput(w: WallTime): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${w.year}-${p(w.month)}-${p(w.day)}`;
}

/** "HH:MM" (24h) for an `<input type="time">` value/min. */
export function wallToTimeInput(w: WallTime): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${p(w.hour)}:${p(w.minute)}`;
}

const MONTH_ABBR = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/**
 * Inverse of `formatForGmail` for the stored "Last scheduled time" strings
 * ("May 17, 2026" + "8:00 AM"). Deterministic — formatForGmail emits a fixed
 * en-US format, so this parse is exact (no locale/Intl needed). Used so the
 * §5.5 working-hours check can run on the "last scheduled" selection (which
 * persists only these strings, not a WallTime). Returns null if malformed.
 */
export function parseGmailDateTime(
  gmailDate: string,
  gmailTime: string,
): WallTime | null {
  const dm = /^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/.exec(gmailDate.trim());
  const tm = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(gmailTime.trim());
  if (!dm || !tm) return null;
  const monthStr = dm[1] ?? "";
  const ampm = tm[3] ?? "";
  const month = MONTH_ABBR.indexOf(monthStr.slice(0, 3).toLowerCase()) + 1;
  if (month === 0) return null;
  let hour = Number(tm[1]) % 12;
  if (/p/i.test(ampm)) hour += 12;
  const w: WallTime = {
    year: Number(dm[3]),
    month,
    day: Number(dm[2]),
    hour,
    minute: Number(tm[2]),
  };
  if (w.day < 1 || w.day > 31 || w.hour > 23 || w.minute > 59) return null;
  return w;
}

/**
 * Parse the modal's native `<input type="date">` (yyyy-mm-dd) and
 * `<input type="time">` (HH:MM, 24h) into wall components. Returns null on
 * anything malformed/incomplete so the caller can keep the Schedule button
 * disabled rather than schedule garbage.
 */
export function parsePickerInputs(
  dateStr: string,
  timeStr: string,
): WallTime | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const tm = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dm || !tm) return null;
  const w: WallTime = {
    year: Number(dm[1]),
    month: Number(dm[2]),
    day: Number(dm[3]),
    hour: Number(tm[1]),
    minute: Number(tm[2]),
  };
  // Reject impossible values (e.g. month 13, day 32, hour 24).
  if (
    w.month < 1 ||
    w.month > 12 ||
    w.day < 1 ||
    w.day > 31 ||
    w.hour > 23 ||
    w.minute > 59
  ) {
    return null;
  }
  return w;
}
