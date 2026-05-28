// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { resolveCuratedEntry } from "./search";

// Coverage regression guard (Session 11). Every IANA zone the runtime knows
// should resolve to a curated group, so a stored / browser-detected zone
// pre-selects its row instead of showing the "Unrecognised timezone — pick to
// update" fallback. A small set of very-low-population / remote zones is
// deliberately left UNMAPPED: adding a dropdown row for a 50-person territory
// would clutter the picker for everyone, and these still fall back gracefully
// (§6.7) and remain searchable.
//
// If a tzdb update (new zone) or a dataset edit opens a NEW gap, the first
// test fails — forcing a deliberate review: add a curated row for it, or, if
// it's genuinely negligible, add it to this allowlist on purpose.
const ACCEPTED_UNMAPPED = new Set([
  "Australia/Eucla", // +08:45, ~200 people
  "Australia/Lord_Howe", // +10:30 DST, ~380
  "Pacific/Norfolk", // +11:00 DST, Norfolk Island ~2k
  "America/Noronha", // -02:00, Fernando de Noronha ~3k
  "America/Miquelon", // -03:00 DST, St-Pierre & Miquelon ~6k
  "Pacific/Pitcairn", // -08:00, ~50
  "Pacific/Gambier", // -09:00, French Polynesia, tiny
  "Pacific/Marquesas", // -09:30, ~9k
  "America/Adak", // -10:00 DST, Aleutian Islands ~300
]);

function runtimeZones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (k: string) => string[];
  };
  return intl.supportedValuesOf ? intl.supportedValuesOf("timeZone") : [];
}

describe("curated dataset coverage (no unexpected mapping gaps)", () => {
  it("every runtime IANA zone resolves, except the documented edge allowlist", () => {
    const unresolved = runtimeZones().filter((z) => !resolveCuratedEntry(z));
    const unexpected = unresolved.filter((z) => !ACCEPTED_UNMAPPED.has(z));
    // Non-empty = a NEW gap to review (add a curated row, or allowlist it).
    expect(unexpected).toEqual([]);
  });

  it("the +12 no-DST bloc resolves (Fiji to its own row, not NZ/DST)", () => {
    for (const z of [
      "Pacific/Fiji",
      "Pacific/Majuro",
      "Pacific/Tarawa",
      "Asia/Kamchatka",
    ]) {
      expect(resolveCuratedEntry(z), z).toBeDefined();
    }
    expect(resolveCuratedEntry("Pacific/Fiji")?.ianaIdentifier).toBe(
      "Pacific/Fiji",
    );
  });
});
