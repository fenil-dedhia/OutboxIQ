// PRD §5.3.5 (h) — compute the §5.3.5 Optimize-for-X send time.
//
// Given: a recipient timezone, a target hour in recipient time (9 AM or
// 1 PM per spec (f) — the only two timings; "End of day 4 PM" was dropped
// from product scope, not deferred), and the current moment, return the
// **soonest future** moment when it is `targetHour:00` in the recipient's
// timezone, expressed as a `WallTime` in the **user's own timezone** for
// the Gmail Schedule Send DOM recipe.
//
// Two outputs:
//   • `userWall` — WallTime in user's timezone, fed straight into
//     `formatForGmail()` for Gmail's date/time inputs (the recipe path).
//   • `recipientWall` — WallTime in recipient's timezone (always
//     `targetHour:00` on the chosen date), drives the (h) confirmation
//     line ("We'll send this at 9:00 AM in PDT (Los Angeles)…").
//
// Past-roll: if `targetHour` has already elapsed today in recipient tz,
// we roll to tomorrow. We also roll forward when "today at targetHour"
// is less than 5 minutes from now (the same `isPastWallTime` buffer the
// rest of the modal uses) — avoids Gmail's near-now-time rejections.
//
// Pure & deterministic — same `Date.now`-free contract as
// `working-hours.ts` / `gmail-format.ts`: caller passes a `Date` (`now`).
// All timezone math goes through `Intl.DateTimeFormat` with the IANA
// `timeZone` option; we don't bundle a tz database.

import { nowWallInTimeZone, type WallTime } from "./gmail-format";

export type OptimizeTiming = "morning" | "midday";

/** Spec (f): two options, exactly. "End of day 4 PM" is OUT OF SCOPE. */
export const OPTIMIZE_TIMING_HOURS: Record<OptimizeTiming, number> = {
  morning: 9, // "Morning peak (9:00 AM their time)" — default
  midday: 13, // "Midday engagement (1:00 PM their time)"
};

export interface OptimizeResult {
  /** WallTime in the user's tz — feeds formatForGmail() for Gmail inputs. */
  userWall: WallTime;
  /** WallTime in the recipient's tz — exactly `targetHour:00` on chosen day. */
  recipientWall: WallTime;
  /** The real moment, mostly for tests + debugging. */
  moment: Date;
}

/**
 * The recipient tz's UTC offset (in ms) at `at`. Read from
 * `Intl.DateTimeFormat({timeZoneName: "longOffset"})` so DST is handled by
 * the engine. Returns 0 on any parse failure (worst case: a degenerate
 * compute that gets caught by the past-roll guard).
 *
 * Note: `longOffset` returns "GMT+HH:MM" / "GMT-HH:MM" / "GMT" on
 * supported engines. Some emit "GMT" for UTC (no sign/digits) — handled.
 */
function tzOffsetMs(tz: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
      hour: "numeric",
      hour12: false,
    }).formatToParts(at);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    if (tzName === "GMT" || tzName === "UTC") return 0;
    const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tzName);
    if (!m) return 0;
    const sign = m[1] === "+" ? 1 : -1;
    const h = Number(m[2]);
    const min = Number(m[3] ?? "0");
    return sign * (h * 60 + min) * 60 * 1000;
  } catch {
    return 0;
  }
}

/**
 * The real moment when it is `hour:00` on (Y, M, D) in `tz`. Single
 * Newton-style iteration: take the naive UTC interpretation, fetch the
 * tz's offset at that moment, subtract; re-check the offset at the new
 * moment in case we crossed a DST boundary, adjust again if it changed.
 * One adjustment iteration suffices for every IANA zone (DST shifts are
 * ≤ 1 hour and only happen at specific transition instants).
 */
function momentAtTzWall(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, 0, 0);
  let offset = tzOffsetMs(tz, new Date(naive));
  let moment = new Date(naive - offset);
  const offset2 = tzOffsetMs(tz, moment);
  if (offset2 !== offset) {
    offset = offset2;
    moment = new Date(naive - offset);
  }
  return moment;
}

const MIN_BUFFER_MS = 5 * 60 * 1000; // matches `isPastWallTime` default

/** Pure calendar +1 day on a WallTime's date (clock unchanged). */
function plusOneDay(w: WallTime): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(w.year, w.month - 1, w.day));
  d.setUTCDate(d.getUTCDate() + 1);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * Compute the §5.3.5 Optimize-for-X send time.
 *
 * Determines the soonest future moment at which it is `targetHour:00`
 * in `recipientTz`, then expresses that as a WallTime in `userTz` for
 * the existing Gmail DOM recipe pipeline.
 */
export function computeOptimizeSendTime(
  now: Date,
  userTz: string,
  recipientTz: string,
  timing: OptimizeTiming,
): OptimizeResult {
  const targetHour = OPTIMIZE_TIMING_HOURS[timing];
  const recipNow = nowWallInTimeZone(recipientTz, now);

  // Candidate 1: today in recipient tz at targetHour:00.
  const momentToday = momentAtTzWall(
    recipientTz,
    recipNow.year,
    recipNow.month,
    recipNow.day,
    targetHour,
  );

  let chosenY = recipNow.year;
  let chosenM = recipNow.month;
  let chosenD = recipNow.day;
  let moment = momentToday;

  // Roll to tomorrow if today's target moment is already past (or within
  // the near-now buffer Gmail's scheduler rejects).
  if (momentToday.getTime() - now.getTime() < MIN_BUFFER_MS) {
    const tomorrow = plusOneDay({
      year: recipNow.year,
      month: recipNow.month,
      day: recipNow.day,
      hour: 0,
      minute: 0,
    });
    moment = momentAtTzWall(
      recipientTz,
      tomorrow.year,
      tomorrow.month,
      tomorrow.day,
      targetHour,
    );
    chosenY = tomorrow.year;
    chosenM = tomorrow.month;
    chosenD = tomorrow.day;
  }

  const userWall = nowWallInTimeZone(userTz, moment);
  const recipientWall: WallTime = {
    year: chosenY,
    month: chosenM,
    day: chosenD,
    hour: targetHour,
    minute: 0,
  };
  return { userWall, recipientWall, moment };
}
