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
