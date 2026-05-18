import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Google API boundary; the cascade + real recipient-cache
// (chrome-mock storage) are exercised for real.
vi.mock("./google-api", () => ({
  searchContactTimezone: vi.fn(),
}));

import { resolveRecipientTimezone } from "./timezone-cascade";
import { searchContactTimezone } from "./google-api";
import { getCachedRecipient, setCachedRecipient } from "../lib/recipient-cache";

const mockSearch = vi.mocked(searchContactTimezone);
const NOW = Date.parse("2026-05-17T12:00:00.000Z");

beforeEach(() => {
  mockSearch.mockReset();
});

describe("resolveRecipientTimezone — §5.4.1 cascade (Session-9 contract)", () => {
  it("step 1: a fresh cache entry wins; People is never called", async () => {
    await setCachedRecipient({
      email: "a@x.com",
      name: "A",
      timezone: "America/New_York",
      source: "people_api",
      resolvedAt: new Date(NOW).toISOString(),
    });
    const r = await resolveRecipientTimezone("a@x.com", NOW + 1000);
    expect(r).toEqual({ source: "cache", timezone: "America/New_York" });
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("step 2: People returns a tz → people_api + writes through to cache", async () => {
    mockSearch.mockResolvedValue({
      ok: true,
      timezone: "Europe/Berlin",
      name: "Boban",
    });
    const r = await resolveRecipientTimezone("new@x.com", NOW);
    expect(r).toEqual({ source: "people_api", timezone: "Europe/Berlin" });
    // Cached now → a second call is a cache hit, no second People call.
    mockSearch.mockClear();
    const again = await resolveRecipientTimezone("new@x.com", NOW + 1000);
    expect(again).toEqual({ source: "cache", timezone: "Europe/Berlin" });
    expect(mockSearch).not.toHaveBeenCalled();
    const cached = await getCachedRecipient("new@x.com", NOW + 1000);
    expect(cached?.source).toBe("people_api");
    expect(cached?.name).toBe("Boban");
  });

  it("step 4: People found a contact but NO timezone → manual_needed", async () => {
    mockSearch.mockResolvedValue({ ok: true, timezone: null, name: "NoTz" });
    const r = await resolveRecipientTimezone("notz@x.com", NOW);
    expect(r).toEqual({ source: "manual_needed", timezone: null });
  });

  it("step 4: People failed (needs_auth) → manual_needed, never throws", async () => {
    mockSearch.mockResolvedValue({ ok: false, reason: "needs_auth" });
    const r = await resolveRecipientTimezone("err@x.com", NOW);
    expect(r).toEqual({ source: "manual_needed", timezone: null });
  });

  it("People is called NON-interactively (no consent screen mid-compose)", async () => {
    mockSearch.mockResolvedValue({ ok: false, reason: "network" });
    await resolveRecipientTimezone("z@x.com", NOW);
    expect(mockSearch).toHaveBeenCalledWith("z@x.com", false);
  });

  it("a stale cache entry falls through to People (not returned as a hit)", async () => {
    const ninetyOneDays = 91 * 24 * 60 * 60 * 1000;
    await setCachedRecipient({
      email: "old@x.com",
      name: null,
      timezone: "America/Chicago",
      source: "people_api",
      resolvedAt: new Date(NOW - ninetyOneDays).toISOString(),
    });
    mockSearch.mockResolvedValue({ ok: true, timezone: null, name: null });
    const r = await resolveRecipientTimezone("old@x.com", NOW);
    expect(r).toEqual({ source: "manual_needed", timezone: null });
    expect(mockSearch).toHaveBeenCalledOnce();
  });
});
