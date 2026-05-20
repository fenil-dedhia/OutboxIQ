import { describe, it, expect } from "vitest";
import {
  SORTED_CURATED_TIMEZONES,
  searchCuratedTimezones,
  resolveCuratedEntry,
  matchesEntry,
} from "./search";
import { CURATED_TIMEZONES, offsetToMinutes } from "./curated-timezones";

describe("searchCuratedTimezones", () => {
  it("empty query returns the whole list, sorted ascending by offset", () => {
    const all = searchCuratedTimezones("");
    expect(all.length).toBe(CURATED_TIMEZONES.length);
    for (let i = 1; i < all.length; i++) {
      expect(offsetToMinutes(all[i]!.offset)).toBeGreaterThanOrEqual(
        offsetToMinutes(all[i - 1]!.offset),
      );
    }
  });

  it("is case-insensitive and substring-based", () => {
    expect(searchCuratedTimezones("KOL")[0]?.ianaIdentifier).toBe(
      "Asia/Kolkata",
    );
    expect(searchCuratedTimezones("toky")[0]?.ianaIdentifier).toBe(
      "Asia/Tokyo",
    );
  });

  it("matches a familiar city absent from the IANA id (Mumbai/Delhi → Kolkata)", () => {
    expect(
      searchCuratedTimezones("mumbai").map((e) => e.ianaIdentifier),
    ).toEqual(["Asia/Kolkata"]);
    expect(
      searchCuratedTimezones("delhi").map((e) => e.ianaIdentifier),
    ).toEqual(["Asia/Kolkata"]);
  });

  it("matches a country name", () => {
    expect(searchCuratedTimezones("singapore")[0]?.ianaIdentifier).toBe(
      "Asia/Shanghai",
    );
    expect(searchCuratedTimezones("japan")[0]?.ianaIdentifier).toBe(
      "Asia/Tokyo",
    );
  });

  it("matches abbreviations, including the intentional IST ambiguity", () => {
    const ist = searchCuratedTimezones("ist").map((e) => e.ianaIdentifier);
    expect(ist).toContain("Asia/Kolkata");
    expect(ist).toContain("Asia/Jerusalem");
  });

  it("matches offset strings in several typed forms", () => {
    for (const q of [
      "+5:30",
      "5:30",
      "0530",
      "+5.5",
      "gmt+5:30",
      "utc+05:30",
    ]) {
      expect(
        searchCuratedTimezones(q).map((e) => e.ianaIdentifier),
        `query "${q}"`,
      ).toContain("Asia/Kolkata");
    }
    expect(searchCuratedTimezones("-8").map((e) => e.ianaIdentifier)).toContain(
      "America/Los_Angeles",
    );
  });

  it("does not treat a plain word as an offset query", () => {
    // "san" must not accidentally match offset tokens; only real city hits.
    const ids = searchCuratedTimezones("san").map((e) => e.ianaIdentifier);
    expect(ids).not.toContain("Etc/GMT+12");
  });

  it("returns empty for nonsense", () => {
    expect(searchCuratedTimezones("zzzzz")).toEqual([]);
  });
});

describe("resolveCuratedEntry (stored value → curated group, display only)", () => {
  it("resolves an exact canonical primary", () => {
    expect(resolveCuratedEntry("America/New_York")?.label).toContain(
      "Eastern Time",
    );
  });

  it("resolves a non-primary zone by matching offset + DST behaviour", () => {
    // Amsterdam isn't a primary (Berlin is) but shares +1 with DST → CET.
    expect(resolveCuratedEntry("Europe/Amsterdam")?.ianaIdentifier).toBe(
      "Europe/Berlin",
    );
    // Toronto isn't a primary (New York is) but shares -5 with DST → Eastern.
    expect(resolveCuratedEntry("America/Toronto")?.ianaIdentifier).toBe(
      "America/New_York",
    );
  });

  it("resolves deprecated IANA names via their leaf search term", () => {
    expect(resolveCuratedEntry("Asia/Calcutta")?.ianaIdentifier).toBe(
      "Asia/Kolkata",
    );
    expect(resolveCuratedEntry("America/Godthab")?.ianaIdentifier).toBe(
      "America/Nuuk",
    );
  });

  it("does NOT collapse a no-DST zone onto a DST zone at the same offset", () => {
    // Phoenix (-7 no DST) must resolve to Arizona, never Mountain (Denver, DST).
    expect(resolveCuratedEntry("America/Phoenix")?.ianaIdentifier).toBe(
      "America/Phoenix",
    );
    // A different -7-no-DST zone resolves to the no-DST entry, not Denver.
    expect(resolveCuratedEntry("America/Creston")?.observesDST).toBe(false);
  });

  it("returns undefined for an unrecognised identifier", () => {
    expect(resolveCuratedEntry("Not/AZone")).toBeUndefined();
  });
});

describe("matchesEntry", () => {
  it("matches against the rendered label too", () => {
    const india = SORTED_CURATED_TIMEZONES.find(
      (e) => e.ianaIdentifier === "Asia/Kolkata",
    )!;
    expect(matchesEntry(india, "bengaluru")).toBe(true);
    expect(matchesEntry(india, "tokyo")).toBe(false);
  });
});
