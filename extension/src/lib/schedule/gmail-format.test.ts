import { describe, it, expect } from "vitest";
import { formatForGmail, parsePickerInputs } from "./gmail-format";

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
