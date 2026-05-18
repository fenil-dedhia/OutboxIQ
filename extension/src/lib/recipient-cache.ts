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

/** PRD §5.4.1 step 1: cached timezones are reused for 90 days. After that a
 * lookup is re-resolved (people may move; cheap to refresh, cached again). */
export const CACHE_TTL_DAYS = 90;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Email match is case-insensitive (Gmail addresses are). */
function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isCacheEntryFresh(
  entry: Pick<RecipientCacheEntry, "resolvedAt">,
  now: number,
): boolean {
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
