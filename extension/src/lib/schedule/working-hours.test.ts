// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { checkWorkingHours } from "./working-hours";
import { createDefaultState, WEEKDAYS, type WorkingHours } from "../storage";

// Default config: Mon–Fri 09:00–17:00, Sat/Sun off. (The global "Default
// boundaries" were removed in SCHEMA_VERSION 4 — per-day working hours is the
// only rule now; see working-hours.ts.)
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
  it("a weekday time inside working hours is ok", () => {
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

describe("checkWorkingHours — working hours (the only rule since v4)", () => {
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

  it("a late evening time (well after end) → after-end, next working morning", () => {
    const v = checkWorkingHours(at(18, 21), DEFAULT_WH); // Mon 21:00
    expect(v.kind).toBe("working-hours");
    expect(v.detail).toBe("after-end");
    expect(v.snap).toEqual(at(19, 9)); // Tue 05-19 09:00 — always future
  });
});

describe("checkWorkingHours — zero enabled days (no configured window)", () => {
  it("no constraint at all: any time is ok (Default boundaries gone in v4)", () => {
    expect(checkWorkingHours(at(23, 10), allDaysOff()).ok).toBe(true); // Sat 10:00
    expect(checkWorkingHours(at(23, 2), allDaysOff()).ok).toBe(true); // Sat 02:00
    expect(checkWorkingHours(at(23, 22), allDaysOff()).ok).toBe(true); // Sat 22:00
  });
});
