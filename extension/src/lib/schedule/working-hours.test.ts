import { describe, it, expect } from "vitest";
import { checkWorkingHours } from "./working-hours";
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
