// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  formatForGmail,
  parsePickerInputs,
  parseGmailDateTime,
  nowWallInTimeZone,
  addMinutesToWall,
  isPastWallTime,
  wallToDateInput,
  wallToTimeInput,
} from "./gmail-format";

describe("formatForGmail (probe-confirmed Gmail input formats)", () => {
  it("formats morning preset wall time", () => {
    expect(
      formatForGmail({ year: 2026, month: 5, day: 17, hour: 8, minute: 0 }),
    ).toEqual({
      display: "Sun, May 17, 8:00 AM",
      gmailDate: "May 17, 2026",
      gmailTime: "8:00 AM",
      rowKey: "May 17, 8:00 AM",
    });
  });

  it("formats afternoon (12h PM) correctly", () => {
    const f = formatForGmail({
      year: 2026,
      month: 5,
      day: 17,
      hour: 13,
      minute: 0,
    });
    expect(f.gmailTime).toBe("1:00 PM");
    expect(f.display).toBe("Sun, May 17, 1:00 PM");
  });

  it("matches Gmail's 'Last scheduled time' style (Thu, May 21, 1:25 PM)", () => {
    expect(
      formatForGmail({ year: 2026, month: 5, day: 21, hour: 13, minute: 25 }),
    ).toEqual({
      display: "Thu, May 21, 1:25 PM",
      gmailDate: "May 21, 2026",
      gmailTime: "1:25 PM",
      rowKey: "May 21, 1:25 PM",
    });
  });
});

describe("parsePickerInputs (modal native inputs → wall time)", () => {
  it("parses valid date + time", () => {
    expect(parsePickerInputs("2026-12-31", "09:05")).toEqual({
      year: 2026,
      month: 12,
      day: 31,
      hour: 9,
      minute: 5,
    });
  });

  it("returns null for incomplete or malformed input", () => {
    expect(parsePickerInputs("", "")).toBeNull();
    expect(parsePickerInputs("2026-12-31", "")).toBeNull();
    expect(parsePickerInputs("not-a-date", "09:05")).toBeNull();
  });

  it("rejects impossible component values", () => {
    expect(parsePickerInputs("2026-13-01", "09:05")).toBeNull();
    expect(parsePickerInputs("2026-12-31", "25:00")).toBeNull();
  });
});

describe("parseGmailDateTime (inverse of formatForGmail, for the 'last' path)", () => {
  it("round-trips formatForGmail across AM/PM/noon/midnight", () => {
    for (const w of [
      { year: 2026, month: 5, day: 17, hour: 8, minute: 0 },
      { year: 2026, month: 5, day: 21, hour: 13, minute: 25 },
      { year: 2026, month: 1, day: 1, hour: 0, minute: 0 }, // 12:00 AM
      { year: 2026, month: 12, day: 31, hour: 12, minute: 30 }, // 12:30 PM
      { year: 2026, month: 9, day: 9, hour: 23, minute: 59 },
    ]) {
      const f = formatForGmail(w);
      expect(parseGmailDateTime(f.gmailDate, f.gmailTime)).toEqual(w);
    }
  });

  it("returns null on malformed input", () => {
    expect(parseGmailDateTime("", "")).toBeNull();
    expect(parseGmailDateTime("May 17, 2026", "8 AM")).toBeNull();
    expect(parseGmailDateTime("Foo 17, 2026", "8:00 AM")).toBeNull();
    expect(parseGmailDateTime("2026-05-17", "08:00")).toBeNull();
  });
});

describe("past-time guard helpers (A2)", () => {
  const ref = new Date("2026-05-16T03:33:00Z");

  it("nowWallInTimeZone reads wall components in the given tz", () => {
    expect(nowWallInTimeZone("UTC", ref)).toEqual({
      year: 2026,
      month: 5,
      day: 16,
      hour: 3,
      minute: 33,
    });
    // EDT = UTC-4 in May → previous evening.
    expect(nowWallInTimeZone("America/New_York", ref)).toEqual({
      year: 2026,
      month: 5,
      day: 15,
      hour: 23,
      minute: 33,
    });
  });

  it("addMinutesToWall rolls over hour/day boundaries", () => {
    expect(
      addMinutesToWall(
        { year: 2026, month: 5, day: 16, hour: 23, minute: 58 },
        5,
      ),
    ).toEqual({ year: 2026, month: 5, day: 17, hour: 0, minute: 3 });
  });

  it("isPastWallTime: min acceptable is ref + bufferMins (inclusive)", () => {
    const now = { year: 2026, month: 5, day: 16, hour: 12, minute: 0 };
    expect(isPastWallTime({ ...now, hour: 11 }, now)).toBe(true); // past
    expect(isPastWallTime({ ...now, minute: 4 }, now)).toBe(true); // in buffer
    expect(isPastWallTime({ ...now, minute: 5 }, now)).toBe(false); // == now+5
    expect(
      isPastWallTime(
        { year: 2026, month: 5, day: 17, hour: 9, minute: 0 },
        now,
      ),
    ).toBe(false); // tomorrow
  });

  it("wallToDateInput / wallToTimeInput zero-pad for native inputs", () => {
    const w = { year: 2026, month: 5, day: 9, hour: 7, minute: 5 };
    expect(wallToDateInput(w)).toBe("2026-05-09");
    expect(wallToTimeInput(w)).toBe("07:05");
  });
});

// Session 19 — "fails safe near a DST transition" for the past-time guard.
// gmail-format.ts:68 documents that the guard does pure wall-clock arithmetic
// (DST ignored), so a comparison straddling a flip is approximate by ≤1h. These
// tests demonstrate WHAT that approximation can and cannot do, so the
// "fails safe" claim is shown rather than asserted.
//
// The 2026 transition dates below are DELIBERATE pinned fixtures (real US
// fall-back / spring-forward days for that year), not magic numbers — chosen so
// the constructed wall ambiguity is reproducible; a different year needs its own.
//
// Operative semantics (matches how Gmail itself resolves a picked time): a
// scheduled send means "the NEXT FUTURE instant whose wall clock is the picked
// value." Under that rule, wall-clock ordering IS the correct comparison, and
// the guard's only job is a conservative UX pre-check; Gmail is the final
// authority and never schedules into the past.
describe("past-time guard — DST fails-safe (Session 19)", () => {
  it("buffer biases toward REJECT: everything in [now, now+5min) is rejected", () => {
    const now = { year: 2026, month: 3, day: 8, hour: 1, minute: 30 };
    // The whole 5-minute safety margin is treated as "past" (reject), so a
    // borderline time can only ever be over-rejected, never let through early.
    for (let m = 0; m < 5; m++) {
      expect(isPastWallTime({ ...now, minute: 30 + m }, now)).toBe(true);
    }
    expect(isPastWallTime({ ...now, minute: 35 }, now)).toBe(false); // exactly +5
  });

  it("spring-forward gap: ordering across the 02:00–03:00 jump is monotonic", () => {
    // Wall times in the nonexistent 02:00–02:59 window don't occur, but the
    // guard's pure-wall arithmetic still orders them continuously, so a target
    // after the gap reads as future and one before reads as past — no flip in
    // the verdict direction.
    const now = { year: 2026, month: 3, day: 8, hour: 1, minute: 30 };
    expect(isPastWallTime({ ...now, hour: 3, minute: 30 }, now)).toBe(false); // after gap → future
    expect(isPastWallTime({ ...now, hour: 1, minute: 0 }, now)).toBe(true); // before now → past
  });

  it("fall-back repeated hour: the ambiguity is real (one wall, two instants)", () => {
    // The crux of the ≤1h caveat. 01:30 occurs twice on 2026-11-01: the first
    // (PDT, 08:30 UTC) and the second (PST, 09:30 UTC). nowWallInTimeZone maps
    // BOTH distinct instants to the SAME wall components — so wall arithmetic
    // alone cannot tell them apart.
    const firstOcc = nowWallInTimeZone(
      "America/Los_Angeles",
      new Date("2026-11-01T08:30:00.000Z"),
    );
    const secondOcc = nowWallInTimeZone(
      "America/Los_Angeles",
      new Date("2026-11-01T09:30:00.000Z"),
    );
    expect(firstOcc).toEqual(secondOcc); // identical wall: 01:30 — the ambiguity
    expect(secondOcc).toMatchObject({ day: 1, hour: 1, minute: 30 });
  });

  it("under next-future-occurrence semantics the guard never under-rejects", () => {
    // Given the ambiguity above, the guard compares the picked wall to now's
    // wall. A target whose wall is at/just-after now is the NEXT future
    // occurrence (what Gmail schedules), and is correctly accepted; a target
    // whose wall is before now is rejected. So the verdict tracks the future
    // occurrence — the direction that cannot cause a past send.
    const now = nowWallInTimeZone(
      "America/Los_Angeles",
      new Date("2026-11-01T09:30:00.000Z"), // 01:30, second (PST) occurrence
    );
    expect(isPastWallTime({ ...now, hour: 1, minute: 45 }, now)).toBe(false); // 01:45 → next future occ
    expect(isPastWallTime({ ...now, hour: 1, minute: 0 }, now)).toBe(true); // 01:00 → before now
    // FINDING (reported, not a defect): if one INSTEAD insists a picked 01:45
    // means its earlier PDT occurrence (08:45 UTC, already past), the wall guard
    // would "accept a past instant". That interpretation is never taken — neither
    // the user nor Gmail schedules a past occurrence — and Gmail is the backstop
    // that refuses past sends. The guard matches gmail-format.ts:68 exactly: a
    // best-effort, ≤1h-approximate, conservative wall pre-check.
  });
});
