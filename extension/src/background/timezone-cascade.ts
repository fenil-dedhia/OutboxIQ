// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.4.1 recipient-timezone resolution — FREE v1 (zero Google API).
//
// Free v1 makes **no Google API calls and holds no OAuth scopes** (owner
// decision, owner-decisions-log Entry 39): empirical testing proved the
// People `people/me`/`searchContacts` path could not reliably yield
// recipient timezones (single-digit hit rate; the PRD §5.4.1 amendment),
// while the recipient itself is readable from the Gmail compose DOM. So the
// cascade collapses to its two reliable, on-device steps:
//
//   1. Local cache (fresh ≤90d, §5.4.2)        → source "cache"
//   2. Nothing cached → ask the user (§5.3.7)   → source "manual_needed"
//
// The §5.3.5 "Optimize for recipient" UI (Session 10) reads the recipient
// from the compose DOM and, on "manual_needed", shows the §5.3.7 picker;
// the chosen zone is cached (recipient-cache `setManualRecipientTimezone`)
// so it returns "cache" forever after. Never throws, never blocks (§6.7).
//
// PREMIUM v1 is OUT OF SCOPE of this project (Entry 52): the API-backed
// cascade (cache → People → Workspace Directory → manual), the OAuth flow,
// and login_hint belong to a future Premium build that forks this repo into
// a separate private one. Premium re-introduces an automated step *before*
// "manual_needed"; this Free v1 contract is the exact shape it slots into.

import { getCachedRecipient } from "../lib/recipient-cache";

/** Free v1 outcomes only: a cache hit, or "ask the user" (§5.3.7). The
 * Premium API sources ("people_api"/"directory") are not produced here. */
export type RecipientTimezone =
  | { source: "cache"; timezone: string }
  | { source: "manual_needed"; timezone: null };

/**
 * Resolve a recipient's IANA timezone — Free v1 cache-or-manual (§5.4.1).
 *
 * `now` is injectable for deterministic cache-TTL tests (house pattern).
 * No network, no token, no service-worker-only constraint — pure local
 * storage; a cache miss is the normal first-contact case and simply
 * signals the §5.3.7 manual picker (not an error — §6.7).
 */
export async function resolveRecipientTimezone(
  email: string,
  now: number = Date.now(),
): Promise<RecipientTimezone> {
  const cached = await getCachedRecipient(email, now);
  if (cached) return { source: "cache", timezone: cached.timezone };
  return { source: "manual_needed", timezone: null };
}
