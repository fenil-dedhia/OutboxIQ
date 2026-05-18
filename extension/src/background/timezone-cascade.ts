// PRD §5.4.1 cascading recipient-timezone detection. SERVICE WORKER side
// (People needs the token — §6.5). This is THE contract Session 9's
// §5.3.5 "Optimize for recipient" UI consumes; the prompt is explicit that
// cascade logic must not leak into UI code, so it lives here and is reached
// only via the message bridge (MSG_RESOLVE_RECIPIENT_TZ).
//
// Cascade (first hit wins), per the §5.4.1 amendment (no Maps; Directory is
// step 3):
//   1. Local cache (fresh ≤90d)            → source "cache"
//   2. Google People searchContacts        → source "people_api" (cached)
//   3. Workspace Directory                 → source "directory"  (cached)
//   4. Nothing → ask the user (§5.3.7)     → source "manual_needed"
//
// Every automated step degrades on failure to the NEXT step, never throws,
// never blocks (§6.7). A returned "manual_needed" is the signal for the
// §5.3.7 inline picker; once the user picks, setManualRecipientTimezone
// caches it so this returns "cache" forever after (§5.4.1 step 4).

import { getCachedRecipient, setCachedRecipient } from "../lib/recipient-cache";
import { searchContactTimezone } from "./google-api";

export type RecipientTimezone =
  | { source: "cache" | "people_api" | "directory"; timezone: string }
  | { source: "manual_needed"; timezone: null };

/**
 * Resolve a recipient's IANA timezone via the §5.4.1 cascade.
 *
 * `now` is injectable for deterministic cache-TTL tests (house pattern).
 * Recipient lookups run NON-interactively by design: they happen when the
 * user opens Schedule Send mid-compose, where popping a Google consent
 * screen would be hostile (§8 / §5.2.3). No token ⇒ People is skipped ⇒
 * "manual_needed" (the §6.7-correct degradation), not a blocked flow.
 */
export async function resolveRecipientTimezone(
  email: string,
  now: number = Date.now(),
): Promise<RecipientTimezone> {
  // Step 1 — local cache.
  const cached = await getCachedRecipient(email, now);
  if (cached) return { source: "cache", timezone: cached.timezone };

  // Step 2 — Google People API.
  const people = await searchContactTimezone(email, false);
  if (people.ok && people.timezone) {
    await setCachedRecipient({
      email,
      name: people.name,
      timezone: people.timezone,
      source: "people_api",
    });
    return { source: "people_api", timezone: people.timezone };
  }

  // Step 3 — Workspace Directory.
  // DEFERRED this session (owner: "include only if it lands with margin";
  // it did not — Phase 2 consumed the budget). The cascade's seam is here:
  // a future `searchDirectoryTimezone(email)` slots in exactly at this
  // point, caching with source "directory", before falling through. Not
  // stubbed (YAGNI / no speculative dead code — Entry 22). Tracked as a
  // small additive follow-up; PRD §5.4.1 step 3 remains spec, unbuilt.

  // Step 4 — nothing automated resolved it: signal the §5.3.7 manual picker.
  return { source: "manual_needed", timezone: null };
}
