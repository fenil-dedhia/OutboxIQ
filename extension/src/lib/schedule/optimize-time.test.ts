// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  computeOptimizeSendTime,
  OPTIMIZE_TIMING_HOURS,
} from "./optimize-time";

// Anchor moment for the tests: 2026-05-19, 08:00 UTC. Picked so concrete
// recipient-tz wall times are easy to verify by hand.
const T0 = new Date("2026-05-19T08:00:00.000Z");

describe("computeOptimizeSendTime (PRD §5.3.5)", () => {
  it("morning is 9 AM, midday is 1 PM (spec (f) — exactly two options)", () => {
    expect(OPTIMIZE_TIMING_HOURS.morning).toBe(9);
    expect(OPTIMIZE_TIMING_HOURS.midday).toBe(13);
  });

  it("morning target lands on 09:00 in recipient tz", () => {
    // Recipient in LA: at 2026-05-19 08:00 UTC, LA local is 01:00 PDT
    // (UTC-7). 9 AM LA is still in the future today → pick today.
    const r = computeOptimizeSendTime(
      T0,
      "America/New_York",
      "America/Los_Angeles",
      "morning",
    );
    expect(r.recipientWall.hour).toBe(9);
    expect(r.recipientWall.minute).toBe(0);
    expect(r.recipientWall.day).toBe(19);
  });

  it("midday target lands on 13:00 in recipient tz", () => {
    const r = computeOptimizeSendTime(
      T0,
      "America/New_York",
      "America/Los_Angeles",
      "midday",
    );
    expect(r.recipientWall.hour).toBe(13);
    expect(r.recipientWall.minute).toBe(0);
  });

  it("converts the recipient-tz wall back to a user-tz wall correctly", () => {
    // 9 AM Los Angeles (UTC-7 in May = PDT) = 12 PM New York (UTC-4 in May = EDT).
    const r = computeOptimizeSendTime(
      T0,
      "America/New_York",
      "America/Los_Angeles",
      "morning",
    );
    expect(r.userWall.hour).toBe(12);
    expect(r.userWall.minute).toBe(0);
    expect(r.userWall.day).toBe(19);
  });

  it("rolls forward to tomorrow when today's target is already past", () => {
    // At 2026-05-19 22:00 UTC, LA local is 15:00 PDT — 9 AM PDT today is
    // already in the past (06:00 PDT was hours ago) → roll to tomorrow.
    const late = new Date("2026-05-19T22:00:00.000Z");
    const r = computeOptimizeSendTime(
      late,
      "America/New_York",
      "America/Los_Angeles",
      "morning",
    );
    expect(r.recipientWall.day).toBe(20);
    expect(r.recipientWall.hour).toBe(9);
  });

  it("rolls forward when today's target is within the 5-minute buffer", () => {
    // 4 minutes before 9 AM Tokyo (UTC+9) on 2026-05-20:
    //   9 AM JST 2026-05-20 = 00:00 UTC 2026-05-20.
    //   `now` = 2026-05-19 23:56 UTC = 08:56 JST 2026-05-20.
    // So "today" in Tokyo is the 20th, target at 09:00 is 4 min ahead
    // (inside MIN_BUFFER_MS), forcing a roll to tomorrow (the 21st).
    const justBefore = new Date("2026-05-19T23:56:00.000Z");
    const r = computeOptimizeSendTime(
      justBefore,
      "Europe/London",
      "Asia/Tokyo",
      "morning",
    );
    expect(r.recipientWall.day).toBe(21);
    expect(r.recipientWall.hour).toBe(9);
  });

  it("handles same-tz user+recipient (no cross-tz conversion needed)", () => {
    // User and recipient both in NYC: 9 AM NYC for both. At 08:00 UTC =
    // 04:00 EDT, so 9 AM is still future today.
    const r = computeOptimizeSendTime(
      T0,
      "America/New_York",
      "America/New_York",
      "morning",
    );
    expect(r.recipientWall.hour).toBe(9);
    expect(r.userWall.hour).toBe(9);
    expect(r.userWall.day).toBe(r.recipientWall.day);
  });

  it("works across the IDL (Tokyo target, NYC user)", () => {
    // 1 PM Tokyo on 2026-05-20 (JST UTC+9) = 2026-05-20 04:00 UTC =
    // 2026-05-20 00:00 EDT (midnight NYC).
    const r = computeOptimizeSendTime(
      T0,
      "America/New_York",
      "Asia/Tokyo",
      "midday",
    );
    // At T0 (2026-05-19 08:00 UTC) it's already 17:00 in Tokyo on the
    // 19th, so 1 PM Tokyo today already passed → roll to 20th.
    expect(r.recipientWall.day).toBe(20);
    expect(r.recipientWall.hour).toBe(13);
    expect(r.userWall.day).toBe(20);
    expect(r.userWall.hour).toBe(0);
  });
});

// Session 19 — DST-transition correctness lock-in. The conversion pipeline
// (momentAtTzWall's two-pass offset correction) was unit-proven for summer
// offsets above; these pin behavior with a target landing ON a US DST
// transition day, and across a sender/recipient pair that flip on DIFFERENT
// dates. All expected UTC instants were independently confirmed with Node's
// Intl against the real 2026 transition dates (US spring-forward Sun Mar 8,
// US fall-back Sun Nov 1, EU spring-forward Sun Mar 29). These 2026 dates are
// DELIBERATE pinned fixtures (real transition days for that year), not magic
// numbers and not auto-updating — a different year needs its own dates.
describe("computeOptimizeSendTime — DST transitions (Session 19)", () => {
  it("spring-forward day: 9 AM LA on 2026-03-08 resolves to 16:00 UTC (PDT, UTC-7)", () => {
    // now = 00:00 PST that morning (before the 02:00→03:00 jump at 10:00 UTC),
    // so 9 AM today is still future and is NOT rolled.
    const now = new Date("2026-03-08T08:00:00.000Z");
    const r = computeOptimizeSendTime(
      now,
      "America/Los_Angeles",
      "America/Los_Angeles",
      "morning",
    );
    expect(r.recipientWall).toMatchObject({
      year: 2026,
      month: 3,
      day: 8,
      hour: 9,
      minute: 0,
    });
    // 9 AM is well clear of the 02:00–03:00 nonexistent-hour gap; the offset is
    // already PDT by 9 AM, so the instant is 16:00 UTC (not 17:00).
    expect(r.moment.toISOString()).toBe("2026-03-08T16:00:00.000Z");
    expect(r.userWall.hour).toBe(9); // same zone → 9 AM wall
  });

  it("fall-back day: 9 AM LA on 2026-11-01 resolves to 17:00 UTC (PST, UTC-8)", () => {
    // now = 01:00 PDT (before the 02:00→01:00 fall-back at 09:00 UTC).
    const now = new Date("2026-11-01T08:00:00.000Z");
    const r = computeOptimizeSendTime(
      now,
      "America/Los_Angeles",
      "America/Los_Angeles",
      "morning",
    );
    expect(r.recipientWall).toMatchObject({
      year: 2026,
      month: 11,
      day: 1,
      hour: 9,
      minute: 0,
    });
    // 9 AM is well clear of the 01:00–02:00 repeated-hour; by 9 AM the offset
    // is PST, so the instant is 17:00 UTC. The 1-hour difference vs the
    // spring-forward case above (16:00 UTC) for the *same* "9 AM LA" wall is
    // exactly the DST correction being applied.
    expect(r.moment.toISOString()).toBe("2026-11-01T17:00:00.000Z");
    expect(r.userWall.hour).toBe(9);
  });

  it("the two fixed timings never land in either DST edge hour (gap / repeat)", () => {
    // The nonexistent-hour (02:00–02:59 spring) and repeated-hour (01:00–01:59
    // fall) edges are structurally UNREACHABLE through Optimize-for-X: the only
    // targets the feature can produce are 9 AM and 1 PM (spec (f)). This pins
    // that invariant so a future "add a timing" change re-confronts DST edges.
    expect(OPTIMIZE_TIMING_HOURS.morning).toBe(9);
    expect(OPTIMIZE_TIMING_HOURS.midday).toBe(13);
    for (const h of Object.values(OPTIMIZE_TIMING_HOURS)) {
      expect(h === 1 || h === 2).toBe(false); // outside both edge hours
    }
  });

  it("cross-zone, different flip dates: NY (flipped Mar 8) vs London (flips Mar 29) on Mar 15", () => {
    // On 2026-03-15 the US is already on DST (NY = EDT, UTC-4) but the EU is
    // NOT yet (London = GMT, UTC+0) — they flip on different dates. A naive
    // fixed-offset implementation would mis-state the cross-zone display here;
    // the Intl-per-instant path must get it right.
    const now = new Date("2026-03-15T06:00:00.000Z"); // 06:00 GMT London — 9 AM still future
    const r = computeOptimizeSendTime(
      now,
      "America/New_York",
      "Europe/London",
      "morning",
    );
    // Recipient sees 9:00 AM (London); the same instant is 5:00 AM for the NY
    // sender (09:00 UTC − 4h EDT). This is the "their time = your time" display.
    expect(r.recipientWall).toMatchObject({ day: 15, hour: 9, minute: 0 });
    expect(r.userWall).toMatchObject({ day: 15, hour: 5, minute: 0 });
    expect(r.moment.toISOString()).toBe("2026-03-15T09:00:00.000Z");
  });
});
