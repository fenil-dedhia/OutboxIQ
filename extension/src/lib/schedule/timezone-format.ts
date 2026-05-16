// PRD §5.3.2 — the modal subtitle: "Times shown in [Abbr] ([City/Region])."
// e.g. "Times shown in EDT (New York)."
//
// Abbreviation comes from Intl (DST-correct for the given instant); the
// city/region is the IANA id's last segment, humanised. Both depend only on
// the platform's Intl/ICU data — same approach as src/lib/timezones.ts.

export interface TimezoneLabel {
  /** e.g. "EDT", or "GMT-4" if the platform has no short name. */
  abbr: string;
  /** e.g. "New York" (from "America/New_York"). */
  city: string;
  /** PRD §5.3.2 sentence, ready to render. */
  text: string;
}

function abbrOf(timeZone: string, at: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(at);
    const v = parts.find((p) => p.type === "timeZoneName")?.value;
    if (v) return v;
  } catch {
    /* invalid tz → fall through */
  }
  return timeZone;
}

function cityOf(timeZone: string): string {
  const seg = timeZone.split("/").pop() ?? timeZone;
  return seg.replace(/_/g, " ");
}

/** Build the §5.3.2 timezone label for `timeZone` at instant `at` (the
 * instant matters so the abbreviation reflects DST correctly). */
export function formatTimezoneLabel(timeZone: string, at: Date): TimezoneLabel {
  const abbr = abbrOf(timeZone, at);
  const city = cityOf(timeZone);
  return { abbr, city, text: `Times shown in ${abbr} (${city}).` };
}
