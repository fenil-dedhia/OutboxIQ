import { describe, it, expect } from "vitest";
import { computePresets } from "./presets";
import { formatTimezoneLabel } from "./timezone-format";

// All fixed-instant so they're deterministic. America/New_York at these
// May-2026 instants is EDT (UTC-4); the listed wall times follow from that.
const NY = "America/New_York";

describe("computePresets (PRD §5.3.3)", () => {
  it("Sat → tomorrow is Sun; next Monday is the coming Mon", () => {
    // 2026-05-16T12:00Z = Sat 08:00 EDT.
    const p = computePresets(new Date("2026-05-16T12:00:00Z"), NY);
    expect(p.map((x) => x.id)).toEqual([
      "tomorrow_morning",
      "tomorrow_afternoon",
      "next_monday_morning",
    ]);
    const [morning, afternoon, monday] = p;
    expect(morning).toMatchObject({
      label: "Tomorrow morning",
      wall: { year: 2026, month: 5, day: 17, hour: 8, minute: 0 },
      display: "Sun, May 17, 8:00 AM",
    });
    expect(afternoon.display).toBe("Sun, May 17, 1:00 PM");
    expect(monday).toMatchObject({
      label: "Next Monday morning",
      wall: { year: 2026, month: 5, day: 18, hour: 8, minute: 0 },
      display: "Mon, May 18, 8:00 AM",
    });
  });

  it("Sunday → next Monday is tomorrow (mirrors Gmail)", () => {
    // 2026-05-17T12:00Z = Sun 08:00 EDT.
    const [, , monday] = computePresets(new Date("2026-05-17T12:00:00Z"), NY);
    expect(monday.wall).toMatchObject({ month: 5, day: 18 }); // Mon 18th
  });

  it("Monday → next Monday is +7 (never today)", () => {
    // 2026-05-18T12:00Z = Mon 08:00 EDT.
    const [, , monday] = computePresets(new Date("2026-05-18T12:00:00Z"), NY);
    expect(monday.wall).toMatchObject({ month: 5, day: 25 });
  });

  it("rolls over month boundaries", () => {
    // 2026-05-31T12:00Z = Sun 08:00 EDT → tomorrow = Jun 1.
    const [morning] = computePresets(new Date("2026-05-31T12:00:00Z"), NY);
    expect(morning).toMatchObject({
      wall: { year: 2026, month: 6, day: 1 },
      display: "Mon, Jun 1, 8:00 AM",
    });
  });

  it("respects the configured timezone, not the runtime zone", () => {
    // 2026-05-16T20:00Z = 2026-05-17 01:30 IST (Kolkata, UTC+5:30). "Today"
    // there is the 17th, so "tomorrow" is the 18th — and crucially this is
    // driven by the configured zone, not the test runner's local zone.
    const [morning] = computePresets(
      new Date("2026-05-16T20:00:00Z"),
      "Asia/Kolkata",
    );
    expect(morning.wall).toMatchObject({ month: 5, day: 18 });
  });
});

describe("formatTimezoneLabel (PRD §5.3.2)", () => {
  it("renders the §5.3.2 sentence with abbreviation and city", () => {
    const l = formatTimezoneLabel(NY, new Date("2026-05-16T12:00:00Z"));
    expect(l.abbr).toBe("EDT");
    expect(l.city).toBe("New York");
    expect(l.text).toBe("Times shown in EDT (New York).");
  });

  it("humanises multi-segment IANA ids", () => {
    const l = formatTimezoneLabel(
      "America/Argentina/Buenos_Aires",
      new Date("2026-05-16T12:00:00Z"),
    );
    expect(l.city).toBe("Buenos Aires");
    expect(l.text).toContain("(Buenos Aires)");
  });

  it("degrades gracefully for an invalid timezone", () => {
    const l = formatTimezoneLabel("Not/AZone", new Date());
    expect(l.text).toContain("(AZone)");
  });
});
