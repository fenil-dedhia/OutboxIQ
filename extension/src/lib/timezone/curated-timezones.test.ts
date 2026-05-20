import { describe, it, expect } from "vitest";
import {
  CURATED_TIMEZONES,
  offsetToMinutes,
  type CuratedTimezone,
} from "./curated-timezones";

// ─── Helpers: derive the truth from Intl/ICU, then check the dataset ──────
//
// The curated dataset asserts a STANDARD-time offset and a DST flag for each
// IANA id. We don't trust the hand-authored values — we recompute them from
// the platform's tz data and compare. This is what catches a fat-fingered
// offset or a wrong observesDST.

/** Offset (in signed minutes) of `timeZone` at `date`, read from Intl's
 * longOffset name ("GMT+05:30", "GMT-08:00", "GMT"/"UTC" == +0). */
function offsetMinutesAt(timeZone: string, date: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  if (name === "GMT" || name === "UTC") return 0;
  const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(name);
  if (!m) throw new Error(`Unparseable offset "${name}" for ${timeZone}`);
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + (m[3] ? Number(m[3]) : 0));
}

// Four samples across a year catch DST in either hemisphere (Jan/Jul are the
// extremes for N/S; Apr/Oct guard odd transition windows). DST always *moves
// clocks forward* (a larger offset), so standard time is the MINIMUM offset.
const YEAR_SAMPLES = [0, 3, 6, 9].map(
  (mo) => new Date(Date.UTC(2025, mo, 15, 12, 0, 0)),
);

function yearOffsets(timeZone: string): number[] {
  return YEAR_SAMPLES.map((d) => offsetMinutesAt(timeZone, d));
}

function standardOffsetMinutes(timeZone: string): number {
  return Math.min(...yearOffsets(timeZone));
}

function actuallyObservesDST(timeZone: string): boolean {
  const offs = yearOffsets(timeZone);
  return Math.max(...offs) !== Math.min(...offs);
}

// Terms that legitimately appear in more than one entry's searchTerms. Each
// is a genuine real-world ambiguity (a recipient typing it could mean either
// region); this allowlist IS the registry of intended ambiguity, so a NEW
// accidental duplicate (e.g. a city pasted into two entries) fails the test.
const INTENTIONAL_SHARED_TERMS = new Set([
  "ist", // India Standard Time / Israel Standard Time
  "gmt", // United Kingdom / Iceland & West Africa
  "bst", // British Summer Time / Bangladesh Standard Time
  "eet", // EU Eastern European / Egypt
  "eest", // EU Eastern European (summer) / Egypt (summer)
  "mst", // Mountain Time / Arizona
  "aest", // Australia Eastern (Sydney) / Queensland (Brisbane)
  "ast", // Atlantic Time / Arabia Standard Time (Moscow bloc)
  "cst", // US Central / China Standard Time (shown in neither's label; D5)
]);

describe("curated-timezones dataset", () => {
  it("is a sensible curated size (40–50 entries), not the raw IANA list", () => {
    expect(CURATED_TIMEZONES.length).toBeGreaterThanOrEqual(40);
    expect(CURATED_TIMEZONES.length).toBeLessThanOrEqual(50);
  });

  it("every ianaIdentifier is a valid, Intl-recognised zone", () => {
    for (const tz of CURATED_TIMEZONES) {
      expect(
        () => new Intl.DateTimeFormat("en-US", { timeZone: tz.ianaIdentifier }),
        `invalid IANA id: ${tz.ianaIdentifier}`,
      ).not.toThrow();
    }
  });

  it("every entry's offset equals the zone's real standard-time offset (catches typos)", () => {
    for (const tz of CURATED_TIMEZONES) {
      const declared = offsetToMinutes(tz.offset);
      const actual = standardOffsetMinutes(tz.ianaIdentifier);
      expect(actual, `${tz.ianaIdentifier} (${tz.label})`).toBe(declared);
    }
  });

  it("every entry's observesDST matches the zone's real DST behaviour", () => {
    for (const tz of CURATED_TIMEZONES) {
      expect(
        actuallyObservesDST(tz.ianaIdentifier),
        `${tz.ianaIdentifier} (${tz.label})`,
      ).toBe(tz.observesDST);
    }
  });

  it("offsets are authored in non-decreasing (ascending) order", () => {
    CURATED_TIMEZONES.reduce((prevMin, tz) => {
      const cur = offsetToMinutes(tz.offset);
      expect(cur, tz.label).toBeGreaterThanOrEqual(prevMin);
      return cur;
    }, -Infinity);
  });

  it("ianaIdentifiers are unique (no zone is the canonical store for two groups)", () => {
    const ids = CURATED_TIMEZONES.map((t) => t.ianaIdentifier);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("labels begin with their offset in (UTC±H:MM …) form", () => {
    for (const tz of CURATED_TIMEZONES) {
      // e.g. "+05:30" → "(UTC+5:30)", "-08:00" → "(UTC-8:00)", "+00:00" → "(UTC+0:00)".
      const [, sign, hh, mm] = /^([+-])(\d{2}):(\d{2})$/.exec(tz.offset)!;
      const expected = `(UTC${sign}${Number(hh)}:${mm})`;
      expect(tz.label.startsWith(expected), `${tz.label} vs ${expected}`).toBe(
        true,
      );
    }
  });
});

describe("curated-timezones abbreviations", () => {
  it("every declared abbreviation appears verbatim in its label", () => {
    for (const tz of CURATED_TIMEZONES) {
      if (!tz.abbreviations) continue;
      for (const abbr of tz.abbreviations) {
        expect(
          tz.label.includes(abbr),
          `${abbr} missing from "${tz.label}"`,
        ).toBe(true);
      }
    }
  });

  it("DST entries that declare abbreviations declare the [standard, daylight] pair", () => {
    for (const tz of CURATED_TIMEZONES) {
      if (!tz.observesDST || !tz.abbreviations) continue;
      expect(tz.abbreviations.length, `${tz.label}`).toBe(2);
    }
  });

  it("every DST entry signals DST in its label (abbr pair or the word DST)", () => {
    for (const tz of CURATED_TIMEZONES) {
      if (!tz.observesDST) continue;
      const hasPair = (tz.abbreviations?.length ?? 0) === 2;
      const saysDst = tz.label.includes("DST");
      expect(hasPair || saysDst, `${tz.label} gives no DST signal`).toBe(true);
    }
  });
});

describe("curated-timezones searchTerms", () => {
  it("are all non-empty and lowercase (case-insensitive matching contract)", () => {
    for (const tz of CURATED_TIMEZONES) {
      expect(
        tz.searchTerms.length,
        `${tz.label} has no search terms`,
      ).toBeGreaterThan(0);
      for (const term of tz.searchTerms) {
        expect(term.length, `empty term in ${tz.label}`).toBeGreaterThan(0);
        expect(term, `non-lowercase term "${term}" in ${tz.label}`).toBe(
          term.toLowerCase(),
        );
      }
    }
  });

  it("contain no duplicates within a single entry", () => {
    for (const tz of CURATED_TIMEZONES) {
      expect(new Set(tz.searchTerms).size, `${tz.label}`).toBe(
        tz.searchTerms.length,
      );
    }
  });

  it("only share terms across entries when the ambiguity is intentional", () => {
    const counts = new Map<string, CuratedTimezone[]>();
    for (const tz of CURATED_TIMEZONES) {
      for (const term of tz.searchTerms) {
        (counts.get(term) ?? counts.set(term, []).get(term)!).push(tz);
      }
    }
    const unexpected: string[] = [];
    for (const [term, entries] of counts) {
      if (entries.length > 1 && !INTENTIONAL_SHARED_TERMS.has(term)) {
        unexpected.push(
          `"${term}" in ${entries.map((e) => e.ianaIdentifier).join(", ")}`,
        );
      }
    }
    expect(unexpected, "unintended cross-entry searchTerm overlaps").toEqual(
      [],
    );
  });

  it("declare every well-known ambiguity in the intentional allowlist (keeps it honest)", () => {
    // Each allowlisted term must actually be shared — so the allowlist can't
    // silently rot into permitting overlaps that no longer exist.
    for (const term of INTENTIONAL_SHARED_TERMS) {
      const n = CURATED_TIMEZONES.filter((t) =>
        t.searchTerms.includes(term),
      ).length;
      expect(
        n,
        `allowlisted "${term}" should appear in ≥2 entries`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("include the intentional IST collision in both India and Israel", () => {
    const withIst = CURATED_TIMEZONES.filter((t) =>
      t.searchTerms.includes("ist"),
    ).map((t) => t.ianaIdentifier);
    expect(withIst).toContain("Asia/Kolkata");
    expect(withIst).toContain("Asia/Jerusalem");
  });

  it("resolve key deprecated/alternative IANA names to the right group", () => {
    const find = (term: string) =>
      CURATED_TIMEZONES.find((t) => t.searchTerms.includes(term));
    expect(find("calcutta")?.ianaIdentifier).toBe("Asia/Kolkata");
    expect(find("saigon")?.ianaIdentifier).toBe("Asia/Bangkok"); // +7 group
    expect(find("rangoon")?.ianaIdentifier).toBe("Asia/Yangon");
    expect(find("godthab")?.ianaIdentifier).toBe("America/Nuuk");
    expect(find("buenos_aires")?.ianaIdentifier).toBe(
      "America/Argentina/Buenos_Aires",
    );
  });
});
