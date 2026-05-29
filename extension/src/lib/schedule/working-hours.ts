// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.5 — Auto-Reschedule on Outside Working Hours (the *decision* logic).
//
// Pure and deterministic, like presets.ts / gmail-format.ts: given a chosen
// wall-clock send time (already in the user's configured timezone) and the
// user's WorkingHours, decide whether it violates a rule and, if so, what to
// snap to. The §5.5 modal renders the verdict; this module never touches the
// DOM, Date.now(), or Intl-with-a-real-timezone (a calendar date's weekday is
// timezone-independent — same UTC-construction trick the rest of the
// scheduling code uses).
//
// Locked decisions encoded here (CLAUDE.md "Locked product decisions"):
//   • ONE rule type since SCHEMA_VERSION 4 (Session 17): the per-weekday
//     WORKING HOURS window. The former global "Default boundaries" (absolute
//     floor/ceiling) were removed — they produced a redundant second warning
//     on regular Send; see owner-decisions-log + the PRD §5.5 amendment.
//   • Working-hours snap target → §5.5.3 next-working-day algorithm (same day
//     at start if before start on a working day; else the soonest upcoming
//     configured working day at its start). Always strictly future.
//   • ZERO enabled working days is a legitimate "no configured window" config
//     → no constraint at all (the check is inactive; nothing to warn on).
//
// CONSUMERS:
//   1. §5.5.1 regular Send (Session 5.6) — acts on the verdict: an immediate
//      off-hours send is plausibly unintended, so it warns.
//   2. §5.3.5 recipient optimization (Session 6) — uses `detail`/`snap` as an
//      advisory recommendation input (never a hard block).
//   §5.3 Schedule Send no longer consults this for a warning at all: a
//   deliberate off-hours *schedule* is the core use case (warning on it trains
//   dismissal — locked Entry 21), and with the absolute floor/ceiling removed
//   there is no longer any boundary it would warn on.
//
// Every working-hours snap is provably strictly future (a future day's start,
// or the same day at a start after the requested time), so no past-snap
// forward-roll is needed — the old `ensureFutureSnap`, which only ever fixed
// the absolute `after-latest` past-ceiling case, was removed with the absolute
// rule. checkWorkingHours stays pure and Date.now-free.

import type { WallTime } from "./gmail-format";
import type { WorkingHours, Weekday } from "../storage";

/** getUTCDay() index (0=Sun … 6=Sat) → WorkingHours weekday key. */
const DAY_BY_INDEX: readonly Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// One rule type since SCHEMA_VERSION 4 (the global "Default boundaries" were
// removed — Session 17). The alias is kept for readable consumer code.
export type ViolationKind = "working-hours";

export type ViolationDetail =
  | "non-working-day" // that weekday is not enabled
  | "before-start" // enabled day, before its start
  | "after-end"; // enabled day, after its end

export interface WorkingHoursVerdict {
  /** True → the chosen time breaks no rule; schedule it as-is. */
  ok: boolean;
  /** Which rule was violated. Null when ok. (Only "working-hours" since v4.) */
  kind: ViolationKind | null;
  /** Finer reason, drives the modal copy. Null when ok. */
  detail: ViolationDetail | null;
  /** The time the user chose (echoed for the modal copy). */
  requested: WallTime;
  /** Suggested corrected time (the "Snap to…" option). Null when ok. */
  snap: WallTime | null;
}

function minutesOfClock(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

function minutesOfWall(w: WallTime): number {
  return w.hour * 60 + w.minute;
}

/** Weekday of a calendar date (tz-independent — a Y-M-D is a fixed weekday).
 * Same UTC-construction trick used in presets.ts / gmail-format.ts. */
function weekdayOf(w: WallTime): Weekday {
  const idx = new Date(Date.UTC(w.year, w.month - 1, w.day)).getUTCDay();
  // getUTCDay() is always 0..6 so the index is always in range; the `??`
  // satisfies noUncheckedIndexedAccess (same house pattern as presets.ts).
  return DAY_BY_INDEX[idx] ?? "sunday";
}

/** Pure calendar shift by whole days (no tz move — only the date changes). */
function addDays(
  w: WallTime,
  days: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(w.year, w.month - 1, w.day));
  d.setUTCDate(d.getUTCDate() + days);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function clockToHm(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":");
  return { hour: Number(h), minute: Number(m) };
}

function anyDayEnabled(wh: WorkingHours): boolean {
  return DAY_BY_INDEX.some((d) => wh[d].enabled);
}

/**
 * §5.5.3 next-working-day calculation, given a working-hours violation.
 *
 * - If the chosen day is itself an enabled working day and the chosen time
 *   is BEFORE that day's start → same day at start (§5.5.3 step 3).
 * - Otherwise → the soonest upcoming day (search +1…+7) whose weekday is an
 *   enabled working day, at that day's start. The 7-day horizon always
 *   resolves because this function is only called on a working-hours
 *   violation, which can only arise when ≥1 day is enabled.
 *
 * (PRD §5.5.3 is terse — "the next 24 hours for a configured working day".
 * This implements it as "soonest upcoming configured working day; same day
 * if before start", which is what the modal's "Send on [Next Working Day]
 * at [start]" copy describes. Recorded in the PRD §5.5.3 amendment.)
 */
function nextWorkingWindow(
  w: WallTime,
  wh: WorkingHours,
  detail: ViolationDetail,
): WallTime | null {
  if (detail === "before-start") {
    const start = clockToHm(wh[weekdayOf(w)].start);
    return { year: w.year, month: w.month, day: w.day, ...start };
  }
  for (let i = 1; i <= 7; i++) {
    const date = addDays(w, i);
    const day = wh[weekdayOf({ ...date, hour: 0, minute: 0 })];
    if (day.enabled) {
      return { ...date, ...clockToHm(day.start) };
    }
  }
  return null; // unreachable by construction (≥1 enabled in this branch)
}

/**
 * The §5.5 decision. `requested` is the chosen send time as wall-clock
 * components in the user's configured timezone; `wh` is their stored
 * WorkingHours (validateWorkingHours guarantees per-day end ≥ start for
 * committed state).
 *
 * As of SCHEMA_VERSION 4 (Session 17) there is ONE rule type: the per-day
 * working window. The former global "Default boundaries" (absolute floor/
 * ceiling) were removed — they produced a redundant second warning. Every
 * working-hours snap is provably strictly future (a future day's start, or
 * the same day at a start that is, by the violation, after the requested
 * time), so the old `ensureFutureSnap` past-ceiling forward-roll — which only
 * ever fixed the absolute `after-latest` case — is no longer needed.
 */
export function checkWorkingHours(
  requested: WallTime,
  wh: WorkingHours,
): WorkingHoursVerdict {
  const mins = minutesOfWall(requested);
  const ok = (
    snap: WallTime | null,
    detail: ViolationDetail | null,
  ): WorkingHoursVerdict => ({
    ok: detail === null,
    kind: detail === null ? null : "working-hours",
    detail,
    requested,
    snap,
  });

  // Zero enabled days = no working-hours constraint at all (a legitimate
  // "no configured window" config — owner decision); nothing to warn on.
  if (!anyDayEnabled(wh)) return ok(null, null);

  const day = wh[weekdayOf(requested)];
  let detail: ViolationDetail | null = null;
  if (!day.enabled) detail = "non-working-day";
  else if (mins < minutesOfClock(day.start)) detail = "before-start";
  else if (mins > minutesOfClock(day.end)) detail = "after-end";

  if (detail === null) return ok(null, null);
  return ok(nextWorkingWindow(requested, wh, detail), detail);
}
