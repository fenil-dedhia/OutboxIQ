import { describe, it, expect } from "vitest";
import {
  CACHE_TTL_DAYS,
  clearRecipientCache,
  getCachedRecipient,
  isCacheEntryFresh,
  listCachedRecipients,
  removeCachedRecipient,
  setCachedRecipient,
  setManualRecipientTimezone,
} from "./recipient-cache";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-05-17T12:00:00.000Z");

describe("recipient-cache (PRD §5.4.1/§5.4.2)", () => {
  it("returns null for an unknown recipient", async () => {
    expect(await getCachedRecipient("nobody@example.com", T0)).toBeNull();
  });

  it("set then get round-trips; email match is case-insensitive", async () => {
    await setCachedRecipient({
      email: "Alice@Example.com",
      name: "Alice",
      timezone: "America/New_York",
      source: "people_api",
      resolvedAt: new Date(T0).toISOString(),
    });
    const hit = await getCachedRecipient("alice@example.com", T0 + DAY);
    expect(hit?.timezone).toBe("America/New_York");
    expect(hit?.source).toBe("people_api");
  });

  it("honours the 90-day TTL", async () => {
    const resolvedAt = new Date(T0).toISOString();
    await setCachedRecipient({
      email: "bob@example.com",
      name: null,
      timezone: "Europe/Berlin",
      source: "people_api",
      resolvedAt,
    });
    // 1 day short of TTL → fresh
    expect(
      await getCachedRecipient(
        "bob@example.com",
        T0 + (CACHE_TTL_DAYS - 1) * DAY,
      ),
    ).not.toBeNull();
    // past TTL → treated as absent (re-resolve)
    expect(
      await getCachedRecipient(
        "bob@example.com",
        T0 + (CACHE_TTL_DAYS + 1) * DAY,
      ),
    ).toBeNull();
  });

  it("isCacheEntryFresh: unparseable timestamp on a non-manual entry is stale", () => {
    expect(
      isCacheEntryFresh({ resolvedAt: "not-a-date", source: "people_api" }, T0),
    ).toBe(false);
  });

  it("manual entries are indefinitely fresh (PRD §5.3.5 (j))", async () => {
    // Way past the 90-day TTL: a manual entry must still resolve.
    await setManualRecipientTimezone("forever@example.com", "Asia/Tokyo");
    const hit = await getCachedRecipient(
      "forever@example.com",
      T0 + 10 * 365 * DAY,
    );
    expect(hit?.timezone).toBe("Asia/Tokyo");
    expect(hit?.source).toBe("manual");
  });

  it("isCacheEntryFresh: a manual entry with an unparseable timestamp is still fresh", () => {
    // Spec §5.3.5 (j) treats manual entries as user-entered data; honour
    // their intent even if the timestamp string is malformed.
    expect(
      isCacheEntryFresh({ resolvedAt: "not-a-date", source: "manual" }, T0),
    ).toBe(true);
  });

  it("upsert replaces the prior entry for that email", async () => {
    await setCachedRecipient({
      email: "c@example.com",
      name: null,
      timezone: "America/Chicago",
      source: "people_api",
      resolvedAt: new Date(T0).toISOString(),
    });
    await setManualRecipientTimezone("c@example.com", "Asia/Tokyo", "Cee");
    const all = await listCachedRecipients();
    const forC = all.filter((e) => e.email.toLowerCase() === "c@example.com");
    expect(forC).toHaveLength(1);
    expect(forC[0]!.timezone).toBe("Asia/Tokyo");
    expect(forC[0]!.source).toBe("manual");
    expect(forC[0]!.name).toBe("Cee");
  });

  it("clear empties the cache", async () => {
    await setManualRecipientTimezone("d@example.com", "UTC");
    expect((await listCachedRecipients()).length).toBeGreaterThan(0);
    await clearRecipientCache();
    expect(await listCachedRecipients()).toEqual([]);
  });

  // PRD §5.8.2 per-row delete (Session 12).
  it("removeCachedRecipient deletes one entry (case-insensitive), keeps others", async () => {
    await setManualRecipientTimezone("Keep@example.com", "UTC", "Keep");
    await setManualRecipientTimezone("drop@example.com", "Asia/Tokyo", "Drop");
    await removeCachedRecipient("DROP@example.com"); // different case
    const all = await listCachedRecipients();
    expect(all).toHaveLength(1);
    expect(all[0]!.email).toBe("Keep@example.com");
  });

  it("removeCachedRecipient is a no-op for an unknown email", async () => {
    await setManualRecipientTimezone("only@example.com", "UTC");
    await removeCachedRecipient("ghost@example.com");
    expect(await listCachedRecipients()).toHaveLength(1);
  });

  // PRD §5.8.2 "edit timezone" semantics (Session 12): the Settings edit is an
  // upsert that KEEPS the email + original resolvedAt (a correction, not a
  // re-resolution) and forces source "manual".
  it("edit-timezone upsert preserves email + resolvedAt and forces manual", async () => {
    const resolvedAt = new Date(T0).toISOString();
    await setCachedRecipient({
      email: "edit@example.com",
      name: "Edna",
      timezone: "America/New_York",
      source: "people_api", // simulate a legacy/leaked non-manual source
      resolvedAt,
    });
    // The hook's editCacheTimezone re-adds with the SAME resolvedAt + manual.
    await setCachedRecipient({
      email: "edit@example.com",
      name: "Edna",
      timezone: "Europe/Berlin",
      source: "manual",
      resolvedAt,
    });
    const all = await listCachedRecipients();
    const forEdit = all.filter((e) => e.email === "edit@example.com");
    expect(forEdit).toHaveLength(1); // not duplicated
    expect(forEdit[0]!.timezone).toBe("Europe/Berlin"); // new tz
    expect(forEdit[0]!.resolvedAt).toBe(resolvedAt); // date preserved
    expect(forEdit[0]!.source).toBe("manual"); // normalised
    expect(forEdit[0]!.name).toBe("Edna"); // identity kept
  });
});
