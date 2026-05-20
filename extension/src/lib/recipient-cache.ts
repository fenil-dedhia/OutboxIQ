// Recipient-timezone cache (PRD §5.4.1 step 1, §5.4.2). A typed layer over
// the `recipientCache` array already in OutboxIQState (§7.2) — no schema
// bump (the field has existed since the original schema). Pure storage +
// staleness logic; the cascade orchestration lives in
// `src/background/timezone-cascade.ts`. Nothing here needs the network or
// the service worker, so it is unit-testable like storage.ts.
//
// PREMIUM_NOTES: cache is fully local-first in BOTH tiers — Premium adds
// nothing here (no backend recipient store; §11/§7.3.4). Do not add
// server-sync fields speculatively.

import { getState, setState, type RecipientCacheEntry } from "./storage";

/** PRD §5.4.1 step 1: auto-detected cached timezones are reused for 90 days
 * (people may move; cheap to refresh, cached again). MANUAL entries are
 * user-entered data and never expire — spec §5.3.5 (j), Entry 40: with
 * auto-detection removed in Free v1 (Entry 39), the cache holds only
 * user-typed timezones, which persist until the user clears them via the
 * Settings panel (§5.8.2). The 90-day TTL is retained for "people_api" /
 * "directory" / "cache" sources so Premium v1 ships with the original
 * staleness semantics unchanged. */
export const CACHE_TTL_DAYS = 90;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Email match is case-insensitive (Gmail addresses are). */
function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isCacheEntryFresh(
  entry: Pick<RecipientCacheEntry, "resolvedAt" | "source">,
  now: number,
): boolean {
  // §5.3.5 (j): manual entries never expire — user-entered data, only
  // cleared by the user (Settings §5.8.2). Treat a parseable timestamp
  // as authoritative; `manual` entries with unparseable timestamps are
  // still treated as fresh (the user's intent stands).
  if (entry.source === "manual") return true;
  const t = Date.parse(entry.resolvedAt);
  if (Number.isNaN(t)) return false; // unparseable → treat as stale, re-resolve
  return now - t < CACHE_TTL_MS;
}

/**
 * Fresh cached entry for `email`, or null if absent/stale. `now` is passed
 * in (no hidden Date.now) so this stays deterministic in tests — same
 * discipline as working-hours.ts.
 */
export async function getCachedRecipient(
  email: string,
  now: number = Date.now(),
): Promise<RecipientCacheEntry | null> {
  const { recipientCache } = await getState();
  const hit = recipientCache.find((e) => sameEmail(e.email, email));
  if (!hit) return null;
  return isCacheEntryFresh(hit, now) ? hit : null;
}

/**
 * Upsert a resolved recipient (replaces any prior entry for that email,
 * stale or not). `resolvedAt` is stamped now unless caller provides it.
 */
export async function setCachedRecipient(
  entry: Omit<RecipientCacheEntry, "resolvedAt"> &
    Partial<Pick<RecipientCacheEntry, "resolvedAt">>,
): Promise<void> {
  const state = await getState();
  const resolvedAt = entry.resolvedAt ?? new Date().toISOString();
  const next: RecipientCacheEntry = {
    email: entry.email,
    name: entry.name,
    timezone: entry.timezone,
    source: entry.source,
    resolvedAt,
  };
  const recipientCache = [
    ...state.recipientCache.filter((e) => !sameEmail(e.email, entry.email)),
    next,
  ];
  await setState({ ...state, recipientCache });
}

/** PRD §5.4.1 step 4 / §5.3.7: persist a user-picked timezone so the manual
 * prompt never reappears for this recipient. Same as setCachedRecipient with
 * source "manual"; named for the call site's intent. */
export async function setManualRecipientTimezone(
  email: string,
  timezone: string,
  name: string | null = null,
): Promise<void> {
  await setCachedRecipient({ email, name, timezone, source: "manual" });
}

/** PRD §5.8.2 "Recipient Timezone Cache": the full list (Settings UI, later). */
export async function listCachedRecipients(): Promise<RecipientCacheEntry[]> {
  const { recipientCache } = await getState();
  return recipientCache;
}

/** PRD §5.8.2 bulk action "Clear all cached recipient timezones". */
export async function clearRecipientCache(): Promise<void> {
  const state = await getState();
  await setState({ ...state, recipientCache: [] });
}

/** PRD §5.8.2 per-row "delete entry": atomically remove the cache record for
 * `email` (case-insensitive). The single-row sibling of clearRecipientCache —
 * the Settings cache list (Session 12) needs it and there is no existing
 * single-delete primitive. No-op if the recipient isn't cached.
 *
 * (Edit-timezone deliberately does NOT use this — it is a delete-then-re-add
 * upsert via setCachedRecipient, preserving the original resolvedAt; see the
 * Settings cache section. Only an actual row removal goes through here.) */
export async function removeCachedRecipient(email: string): Promise<void> {
  const state = await getState();
  const recipientCache = state.recipientCache.filter(
    (e) => !sameEmail(e.email, email),
  );
  await setState({ ...state, recipientCache });
}
