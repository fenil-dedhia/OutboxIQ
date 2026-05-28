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
//   • Two rule types: ABSOLUTE limits = hard floor/ceiling in local time;
//     WORKING HOURS = soft per-weekday preference.
//   • If BOTH are violated, surface the ABSOLUTE one (the harder constraint).
//   • Snap target differs by rule:
//       - working-hours violation → §5.5.3 next-working-day algorithm
//         (same day at start if before start on a working day; else the
//         soonest upcoming configured working day at its start).
//       - absolute violation → the absolute boundary on the SAME calendar
//         day the user picked (clock-time rule, honour the chosen day).
//   • ZERO enabled working days is a legitimate "absolute-limits-only"
//     config → no working-hours soft constraint at all (the working-hours
//     check is inactive; only absolute limits apply).
//   • Boundaries are inclusive: scheduling exactly at 07:00 when the floor
//     is 07:00 is allowed (the user said "earliest I'd EVER send").
//
// CONSUMERS — this module computes BOTH rule types unconditionally; each
// consumer narrows for itself. Do NOT delete the working-hours branch as
// "unused": the Schedule Send path ignoring it does not make it dead.
//   1. §5.5 Schedule Send (ScheduleModal.gate) — acts on `kind:"absolute"`
//      ONLY (locked Session 5.5: warning on a deliberate off-hours
//      *schedule* trains dismissal — that's the core use case).
//   2. §5.5.1 regular Send (Session 5.6) — acts on the FULL verdict
//      (working-hours AND absolute: an immediate off-hours send is
//      unintended, unlike a deliberate off-hours schedule).
//   3. §5.3.5 recipient optimization (Session 6) — uses working-hours
//      `detail`/`snap` as an advisory recommendation input (never a hard
//      block; absolute stays the only hard constraint).
//
// PAST-SNAP FORWARD-ROLL (Session 7, owner decision 2026-05-17; PRD §5.5.3
// amendment): the locked "absolute snap = the violated boundary on the SAME
// calendar day" rule is correct for §5.3 Schedule Send (the user picked a
// FUTURE day), but an `after-latest` snap to today's ceiling is in the PAST
// when there is no picked future day (§5.5.1 regular Send — "now" is already
// past the ceiling) or a Schedule-Send pick is later-today while the clock
// is already past it. `ensureFutureSnap()` rolls ONLY that one past-prone
// case forward to the next working morning. checkWorkingHours stays pure and
// unchanged (and Date.now-free — the caller passes a fresh `nowWall`); the
// roll is a separate, explicitly time-aware layer both consumers apply.

import { isPastWallTime, type WallTime } from "./gmail-format";
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

export type ViolationKind = "absolute" | "working-hours";

export type ViolationDetail =
  | "before-earliest" // absolute: before absoluteEarliest
  | "after-latest" // absolute: after absoluteLatest
  | "non-working-day" // working-hours: that weekday is not enabled
  | "before-start" // working-hours: enabled day, before its start
  | "after-end"; // working-hours: enabled day, after its end

export interface WorkingHoursVerdict {
  /** True → the chosen time breaks no rule; schedule it as-is. */
  ok: boolean;
  /** Which rule was violated (absolute wins when both). Null when ok. */
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
 * Forward-roll target for a "too late today" absolute violation (owner
 * decision 2026-05-17): the soonest enabled working day STRICTLY AFTER
 * `after`'s date, at that day's working-hours start. If zero working days
 * are configured (legitimate absolute-only config) fall back to the next
 * calendar day at `absoluteEarliest` ("tomorrow at your earliest").
 *
 * Unlike `nextWorkingWindow` (only ever called when ≥1 day is enabled, so it
 * may return null), this is used to REPLACE a past snap, so it must always
 * return a concrete future morning — hence the zero-days fallback.
 */
function nextWorkingMorning(after: WallTime, wh: WorkingHours): WallTime {
  for (let i = 1; i <= 7; i++) {
    const date = addDays(after, i);
    const day = wh[weekdayOf({ ...date, hour: 0, minute: 0 })];
    if (day.enabled) return { ...date, ...clockToHm(day.start) };
  }
  const d = addDays(after, 1);
  return { ...d, ...clockToHm(wh.absoluteEarliest) };
}

/**
 * The §5.5 decision. `requested` is the chosen send time as wall-clock
 * components in the user's configured timezone; `wh` is their stored
 * WorkingHours (validateWorkingHours guarantees absoluteLatest ≥
 * absoluteEarliest and per-day end ≥ start for committed state).
 */
export function checkWorkingHours(
  requested: WallTime,
  wh: WorkingHours,
): WorkingHoursVerdict {
  const mins = minutesOfWall(requested);
  const ok = (
    snap: WallTime | null,
    kind: ViolationKind | null,
    detail: ViolationDetail | null,
  ): WorkingHoursVerdict => ({
    ok: kind === null,
    kind,
    detail,
    requested,
    snap,
  });

  // 1. Absolute limits (hard) — checked first; wins when both are violated.
  const aEarliest = minutesOfClock(wh.absoluteEarliest);
  const aLatest = minutesOfClock(wh.absoluteLatest);
  if (mins < aEarliest) {
    const t = clockToHm(wh.absoluteEarliest);
    return ok(
      {
        year: requested.year,
        month: requested.month,
        day: requested.day,
        ...t,
      },
      "absolute",
      "before-earliest",
    );
  }
  if (mins > aLatest) {
    const t = clockToHm(wh.absoluteLatest);
    return ok(
      {
        year: requested.year,
        month: requested.month,
        day: requested.day,
        ...t,
      },
      "absolute",
      "after-latest",
    );
  }

  // 2. Working hours (soft). Zero enabled days = no soft constraint at all
  //    (legitimate absolute-limits-only config — owner decision).
  if (!anyDayEnabled(wh)) return ok(null, null, null);

  const day = wh[weekdayOf(requested)];
  let detail: ViolationDetail | null = null;
  if (!day.enabled) detail = "non-working-day";
  else if (mins < minutesOfClock(day.start)) detail = "before-start";
  else if (mins > minutesOfClock(day.end)) detail = "after-end";

  if (detail === null) return ok(null, null, null);
  return ok(nextWorkingWindow(requested, wh, detail), "working-hours", detail);
}

/**
 * Forward-roll guard for the ONE snap that can land in the past.
 *
 * An absolute `after-latest` violation snaps to the violated ceiling on the
 * SAME calendar day (locked §5.5 decision). That is correct when the day is
 * a FUTURE day the user picked (§5.3 Schedule Send) — but it is in the past
 * when there is no picked future day (§5.5.1 regular Send: "now" is already
 * past the ceiling, so today's ceiling is behind us) or a Schedule-Send pick
 * is later-today while the clock is already past the ceiling. Gmail then
 * rejects it ("Invalid time") — the bug Session 7 Phase 1 Test G found.
 *
 * Every OTHER snap is provably strictly future: `before-earliest` → a
 * later-today floor; every working-hours snap → a future day's start (or the
 * same day at a start that is, by the violation, after the requested time).
 * So this guard is deliberately scoped to `after-latest` ONLY and leaves the
 * locked same-day behaviour untouched whenever it is still a valid future
 * time (the §5.3 user-picked-future-day case the lock was written for,
 * including its intentional non-working-day landings).
 *
 * `nowWall` is the caller's FRESH wall-clock now in the user's timezone
 * (this module stays Date.now-free — purity contract; `isPastWallTime` is a
 * pure WallTime comparison). When the same-day ceiling snap is not safely in
 * the future, it is replaced with the next working morning (owner decision
 * 2026-05-17 — see PRD §5.5.3 amendment / CLAUDE.md "Locked product
 * decisions"; falls back to "next day at absoluteEarliest" when zero working
 * days are configured).
 */
export function ensureFutureSnap(
  verdict: WorkingHoursVerdict,
  nowWall: WallTime,
  wh: WorkingHours,
): WorkingHoursVerdict {
  if (
    verdict.kind === "absolute" &&
    verdict.detail === "after-latest" &&
    verdict.snap !== null &&
    isPastWallTime(verdict.snap, nowWall)
  ) {
    return { ...verdict, snap: nextWorkingMorning(nowWall, wh) };
  }
  return verdict;
}
