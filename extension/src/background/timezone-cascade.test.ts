import { describe, it, expect, beforeEach } from "vitest";
import { resolveRecipientTimezone } from "./timezone-cascade";
import {
  setManualRecipientTimezone,
  CACHE_TTL_DAYS,
} from "../lib/recipient-cache";
import { getState, setState } from "../lib/storage";

// Free v1 cascade = cache → manual_needed, zero Google API (Entry 39).
beforeEach(async () => {
  const s = await getState();
  await setState({ ...s, recipientCache: [] });
});

describe("resolveRecipientTimezone — Free v1 (cache → manual, no API)", () => {
  it("cache miss → manual_needed (the §5.3.7 picker signal)", async () => {
    expect(await resolveRecipientTimezone("nobody@example.com")).toEqual({
      source: "manual_needed",
      timezone: null,
    });
  });

  it("cache hit → returns the cached zone, no API", async () => {
    await setManualRecipientTimezone("ann@example.com", "America/New_York");
    expect(await resolveRecipientTimezone("ann@example.com")).toEqual({
      source: "cache",
      timezone: "America/New_York",
    });
  });

  it("manual entries persist indefinitely (PRD §5.3.5 (j) / Entry 40)", async () => {
    // Manual entries are user-entered data — they don't expire (§5.3.5
    // (j)). The 90-day TTL is retained for "people_api" / "directory" /
    // "cache" sources (Premium v1's automated cascade). Pre-Entry-40 the
    // test asserted "manual_needed" past TTL; that expectation was
    // implementation-aligned but spec-misaligned (PRD §5.4.1 has always
    // said "cached forever per recipient" for manual selections).
    await setManualRecipientTimezone("old@example.com", "Europe/Berlin");
    const future = Date.now() + (CACHE_TTL_DAYS + 1) * 24 * 60 * 60 * 1000;
    expect(await resolveRecipientTimezone("old@example.com", future)).toEqual({
      source: "cache",
      timezone: "Europe/Berlin",
    });
  });

  it("email match is case-insensitive (Gmail addresses)", async () => {
    await setManualRecipientTimezone("Mixed@Example.com", "Asia/Tokyo");
    expect(await resolveRecipientTimezone("mixed@example.com")).toEqual({
      source: "cache",
      timezone: "Asia/Tokyo",
    });
  });
});
