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
