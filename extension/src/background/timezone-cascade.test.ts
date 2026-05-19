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

  it("stale cache entry (> TTL) → manual_needed (re-ask)", async () => {
    await setManualRecipientTimezone("old@example.com", "Europe/Berlin");
    const future = Date.now() + (CACHE_TTL_DAYS + 1) * 24 * 60 * 60 * 1000;
    expect(await resolveRecipientTimezone("old@example.com", future)).toEqual({
      source: "manual_needed",
      timezone: null,
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
