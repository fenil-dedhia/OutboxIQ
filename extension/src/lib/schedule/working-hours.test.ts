// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { checkWorkingHours, ensureFutureSnap } from "./working-hours";
import { createDefaultState, WEEKDAYS, type WorkingHours } from "../storage";

// Default config: Mon–Fri 09:00–17:00, Sat/Sun off, absolute 07:00–19:00.
const DEFAULT_WH = createDefaultState().workingHours;

// Known weekdays (consistent with the Session 4 record: 2026-05-17 = Sun):
//   05-18 Mon · 05-19 Tue · 05-22 Fri · 05-23 Sat · 05-24 Sun · 05-25 Mon
const at = (day: number, hour: number, minute = 0) => ({
  year: 2026,
  month: 5,
  day,
  hour,
  minute,
});

function allDaysOff(): WorkingHours {
  const wh: WorkingHours = { ...DEFAULT_WH };
  for (const d of WEEKDAYS) wh[d] = { ...wh[d], enabled: false };
  return wh;
}

function allDaysOn(start = "00:00", end = "23:59"): WorkingHours {
  const wh: WorkingHours = { ...DEFAULT_WH };
  for (const d of WEEKDAYS) wh[d] = { enabled: true, start, end };
  return wh;
}

describe("checkWorkingHours — no violation", () => {
  it("a weekday time inside working hours and absolute bounds is ok", () => {
    const v = checkWorkingHours(at(18, 12), DEFAULT_WH); // Mon 12:00
    expect(v.ok).toBe(true);
    expect(v.kind).toBeNull();
    expect(v.snap).toBeNull();
  });

  it("boundaries are inclusive: exactly day start / end is ok", () => {
    expect(checkWorkingHours(at(18, 9), DEFAULT_WH).ok).toBe(true); // 09:00
    expect(checkWorkingHours(at(18, 17), DEFAULT_WH).ok).toBe(true); // 17:00
  });
});

describe("checkWorkingHours — absolute limits (hard)", () => {
  it("before absoluteEarliest → absolute/before-earliest, snap same day at floor", () => {
    const v = checkWorkingHours(at(18, 3), DEFAULT_WH); // Mon 03:00
    expect(v.kind).toBe("absolute");
    expect(v.detail).toBe("before-earliest");
    expect(v.snap).toEqual(at(18, 7)); // same day, 07:00
  });

  it("after absoluteLatest → absolute/after-latest, snap same day at ceiling", () => {
    const v = checkWorkingHours(at(18, 20), DEFAULT_WH); // Mon 20:00
    expect(v.kind).toBe("absolute");
    expect(v.detail).toBe("after-latest");
    expect(v.snap).toEqual(at(18, 19)); // same day, 19:00
  });

  it("absolute wins when BOTH absolute and working hours are violated", () => {
    // Mon 03:00 is < 07:00 (absolute) AND before the 09:00 working start.
    const v = checkWorkingHours(at(18, 3), DEFAULT_WH);
    expect(v.kind).toBe("absolute");
  });

  it("absolute boundary is inclusive (exactly the floor is ok)", () => {
    // 07:00 is NOT an absolute violation; it is still before the 09:00
    // working start, so the soft rule fires instead — proves the absolute
    // check used strict `<`, not `<=`.
    const v = checkWorkingHours(at(18, 7), DEFAULT_WH);
    expect(v.kind).toBe("working-hours");
    expect(v.detail).toBe("before-start");
  });
});

describe("checkWorkingHours — working hours (soft)", () => {
  it("enabled day before start → before-start, snap SAME day at start", () => {
    const v = checkWorkingHours(at(18, 8), DEFAULT_WH); // Mon 08:00
    expect(v.kind).toBe("working-hours");
    expect(v.detail).toBe("before-start");
    expect(v.snap).toEqual(at(18, 9)); // same day, 09:00 (§5.5.3 step 3)
  });

  it("non-working day → snap to the soonest upcoming working day at start", () => {
    const v = checkWorkingHours(at(23, 10), DEFAULT_WH); // Sat 10:00
    expect(v.kind).toBe("working-hours");
    expect(v.detail).toBe("non-working-day");
    expect(v.snap).toEqual(at(25, 9)); // Sun off → Mon 05-25 09:00
  });

  it("after end on a working day → next working day at start", () => {
    const v = checkWorkingHours(at(19, 18), DEFAULT_WH); // Tue 18:00
    expect(v.kind).toBe("working-hours");
    expect(v.detail).toBe("after-end");
    expect(v.snap).toEqual(at(20, 9)); // Wed 05-20 09:00
  });

  it("week boundary: Friday after end → Monday at start (Sat/Sun off)", () => {
    const v = checkWorkingHours(at(22, 18), DEFAULT_WH); // Fri 18:00
    expect(v.detail).toBe("after-end");
    expect(v.snap).toEqual(at(25, 9)); // Sat/Sun off → Mon 05-25 09:00
  });

  it("absolute ceiling inclusive while soft still fires (19:00 > 17:00 end)", () => {
    const v = checkWorkingHours(at(18, 19), DEFAULT_WH); // Mon 19:00
    expect(v.kind).toBe("working-hours"); // not absolute (19:00 == ceiling)
    expect(v.detail).toBe("after-end");
    expect(v.snap).toEqual(at(19, 9)); // Tue 05-19 09:00
  });
});

describe("checkWorkingHours — zero enabled days (absolute-limits-only)", () => {
  it("no soft constraint: an off-hours-but-within-absolute time is ok", () => {
    const v = checkWorkingHours(at(23, 10), allDaysOff()); // Sat 10:00
    expect(v.ok).toBe(true);
    expect(v.kind).toBeNull();
  });

  it("absolute limits still apply with zero enabled days", () => {
    expect(checkWorkingHours(at(23, 2), allDaysOff()).kind).toBe("absolute");
    expect(checkWorkingHours(at(23, 22), allDaysOff()).detail).toBe(
      "after-latest",
    );
  });
});

// Session 7 Phase 1 Test G: an `after-latest` snap to today's ceiling is in
// the PAST when there is no picked future day (§5.5.1) or a Schedule-Send
// pick is later-today while already past the ceiling. ensureFutureSnap rolls
// ONLY that one case forward to the next working morning (owner decision
// 2026-05-17; PRD §5.5.3 amendment). Every other case must pass through.
describe("ensureFutureSnap — past after-latest snap forward-roll", () => {
  it("§5.5.1 shape: now is past the ceiling → roll to next working morning", () => {
    // Mon 20:00, now === requested (regular Send has no picked day).
    const v = checkWorkingHours(at(18, 20), DEFAULT_WH);
    expect(v.detail).toBe("after-latest");
    expect(v.snap).toEqual(at(18, 19)); // checkWorkingHours is unchanged
    const rolled = ensureFutureSnap(v, at(18, 20), DEFAULT_WH);
    expect(rolled.kind).toBe("absolute");
    expect(rolled.detail).toBe("after-latest");
    expect(rolled.snap).toEqual(at(19, 9)); // Tue 05-19 09:00 (next morning)
  });

  it("Test G regression: 11:36, ceiling 10:36, all days on → next day, NOT the past", () => {
    const wh = {
      ...allDaysOn(),
      absoluteEarliest: "00:00",
      absoluteLatest: "10:36",
    };
    const v = checkWorkingHours(at(17, 11, 36), wh); // Sun 11:36
    expect(v.detail).toBe("after-latest");
    const rolled = ensureFutureSnap(v, at(17, 11, 36), wh);
    expect(rolled.snap).toEqual(at(18, 0)); // Mon 05-18 00:00 (all days on)
    expect(rolled.snap).not.toEqual(at(17, 10, 36)); // never the past
  });

  it("§5.3 normal: a genuinely FUTURE picked day is left untouched (locked)", () => {
    // Picked Tue 23:00 while now is the prior Mon 10:00.
    const v = checkWorkingHours(at(19, 23), DEFAULT_WH);
    expect(v.detail).toBe("after-latest");
    const out = ensureFutureSnap(v, at(18, 10), DEFAULT_WH);
    expect(out.snap).toEqual(at(19, 19)); // same-day ceiling preserved
  });

  it("§5.3 future NON-working picked day stays at its ceiling (locked permit)", () => {
    // Picked Sat 23:00 while now is Wed — locked behaviour allows a
    // non-working-day landing; it is future, so it must NOT roll.
    const v = checkWorkingHours(at(23, 23), DEFAULT_WH);
    const out = ensureFutureSnap(v, at(20, 10), DEFAULT_WH);
    expect(out.snap).toEqual(at(23, 19));
  });

  it("zero working days: rolls to NEXT DAY at absoluteEarliest", () => {
    const wh = allDaysOff(); // abs 07:00–19:00
    const v = checkWorkingHours(at(23, 22), wh); // Sat 22:00 → after-latest
    const out = ensureFutureSnap(v, at(23, 22), wh);
    expect(out.snap).toEqual(at(24, 7)); // Sun 05-24 07:00 (tomorrow @ floor)
  });

  it("does NOT touch before-earliest (absolute but always future)", () => {
    const v = checkWorkingHours(at(18, 3), DEFAULT_WH); // Mon 03:00
    expect(v.detail).toBe("before-earliest");
    const out = ensureFutureSnap(v, at(18, 3), DEFAULT_WH);
    expect(out.snap).toEqual(at(18, 7)); // unchanged
  });

  it("does NOT touch working-hours or ok verdicts", () => {
    const wh = checkWorkingHours(at(23, 10), DEFAULT_WH); // non-working-day
    expect(ensureFutureSnap(wh, at(23, 10), DEFAULT_WH).snap).toEqual(
      at(25, 9),
    );
    const okv = checkWorkingHours(at(18, 12), DEFAULT_WH); // ok
    const out = ensureFutureSnap(okv, at(18, 12), DEFAULT_WH);
    expect(out.ok).toBe(true);
    expect(out.snap).toBeNull();
  });
});
