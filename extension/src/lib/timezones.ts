// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// IANA timezone list for the onboarding dropdown. Uses the runtime-provided
// list (no bundled data, keeps the extension small); falls back to a small
// curated set only if the engine lacks Intl.supportedValuesOf.

const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function getTimezoneList(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      const list = intl.supportedValuesOf("timeZone");
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      /* fall through to fallback */
    }
  }
  return FALLBACK_TIMEZONES;
}
