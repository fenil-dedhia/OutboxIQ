// PRD §5.3.3 — the three Quick Options, computed in the user's configured
// timezone and updating dynamically with the day of week.
//
// We work in WALL-CLOCK components in the user's IANA timezone (derived via
// Intl), not absolute UTC instants. Rationale: (a) the modal only needs the
// wall-clock time + tz abbreviation for display; (b) the actual scheduling
// delegates to Gmail's own native preset rows, which do the real tz/DST math
// themselves — so reimplementing DST-correct UTC conversion here would be
// effort with no consumer. This keeps the module pure and trivially testable.
//
// Decision #3 (this session): mirror Gmail's preset semantics. Where Gmail's
// exact behaviour is ambiguous from spec alone, the chosen behaviour is
// documented inline and is confirmable from the probe's "DIALOG (preset
// view)" dump (research/pick-date-time-probe.md).

export type PresetId =
  | "tomorrow_morning"
  | "tomorrow_afternoon"
  | "next_monday_morning";

export interface SchedulePreset {
  id: PresetId;
  /** PRD-fixed label, e.g. "Tomorrow morning". */
  label: string;
  /** Wall-clock target in the user's timezone. */
  wall: {
    year: number;
    month: number; // 1-12
    day: number;
    hour: number; // 0-23
    minute: number;
  };
  /** Human-readable, e.g. "Sun, May 17, 8:00 AM". */
  display: string;
}

interface Ymd {
  year: number;
  month: number;
  day: number;
  /** 0=Sun … 6=Sat (JS getUTCDay convention). */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The calendar date/weekday of `instant` as seen in `timeZone`. */
function ymdInTimeZone(instant: Date, timeZone: string): Ymd {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(instant);
  const get = (t: string): string =>
    parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** Pure calendar arithmetic via UTC (no tz shift — we only move dates). */
function addDays(base: Omit<Ymd, "weekday">, days: number): Ymd {
  const d = new Date(Date.UTC(base.year, base.month - 1, base.day));
  d.setUTCDate(d.getUTCDate() + days);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
  };
}

/** Format wall components for display. UTC timeZone so no shift is applied —
 * the components ARE already the user's local wall time. */
function displayOf(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function make(
  id: PresetId,
  label: string,
  date: Ymd,
  hour: number,
  minute: number,
): SchedulePreset {
  return {
    id,
    label,
    wall: { year: date.year, month: date.month, day: date.day, hour, minute },
    display: displayOf(date.year, date.month, date.day, hour, minute),
  };
}

/**
 * The three presets for `now`, expressed in `timeZone`.
 *
 * - Tomorrow morning   → tomorrow 08:00
 * - Tomorrow afternoon → tomorrow 13:00
 * - Next Monday morning→ the next Monday strictly in the future at 08:00.
 *   When today is Monday this is +7 days (mirrors Gmail: "Monday morning"
 *   always points at a future Monday, never today). Confirm against the
 *   probe's DIALOG dump if Gmail's behaviour differs for a given weekday.
 */
export function computePresets(
  now: Date,
  timeZone: string,
): [SchedulePreset, SchedulePreset, SchedulePreset] {
  const today = ymdInTimeZone(now, timeZone);
  const tomorrow = addDays(today, 1);

  // Days until the next future Monday (weekday 1). 0 → today is Monday → +7.
  const deltaToMonday = (1 - today.weekday + 7) % 7 || 7;
  const nextMonday = addDays(today, deltaToMonday);

  return [
    make("tomorrow_morning", "Tomorrow morning", tomorrow, 8, 0),
    make("tomorrow_afternoon", "Tomorrow afternoon", tomorrow, 13, 0),
    make("next_monday_morning", "Next Monday morning", nextMonday, 8, 0),
  ];
}
