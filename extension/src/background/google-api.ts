// Google API calls — SERVICE WORKER ONLY (PRD §6.5: the access token never
// leaves the SW; callers get *data* back over the message bridge, never the
// token). Every function is typed and non-throwing: on missing token / 401
// / network / quota it returns a typed failure so callers degrade per §6.7
// and never block the user or Gmail (§5.2.3).
//
// PREMIUM_NOTES: these are the Free v1 client-side calls. The §13 Premium
// backend does its own Gmail calls server-side; nothing here is shared or
// pre-built for it (tier-split discipline).

import { getAccessToken, invalidateStoredToken } from "./oauth";

// NOTE: there is intentionally NO Calendar call here. PRD §5.1.3 was
// amended (2026-05-17) — browser timezone is the v1 source (it auto-updates
// with travel; Calendar's manual setting does not), so onboarding does not
// read Google Calendar. A `getCalendarTimezone()` existed briefly in the
// Phase-3 core commit; removed as dead v1 code (YAGNI / Entry 22). If the
// future §5.8 "override with Google Calendar timezone" Setting is ever
// built it re-adds a ~12-line GET of
// `…/calendar/v3/users/me/settings/timezone` — trivial; not v1.
const PEOPLE_SEARCH_URL =
  "https://people.googleapis.com/v1/people:searchContacts";

export type ApiFailure =
  | "needs_auth" // no usable token and silent re-auth not possible
  | "network" // fetch threw / offline
  | "http_error" // non-2xx that isn't 401 (quota, 5xx, …)
  | "bad_response"; // 2xx but the body wasn't the expected shape

/**
 * One authenticated GET returning parsed JSON, with the §6.7 contract baked
 * in. A 401 invalidates the cached token and retries ONCE (covers an
 * externally-revoked/expired token); any second failure is terminal.
 * `interactive` is threaded to getAccessToken (onboarding can prompt; a
 * background lookup cannot).
 */
async function authedGetJson(
  url: string,
  interactive: boolean,
  retriedAfter401 = false,
): Promise<{ ok: true; json: unknown } | { ok: false; reason: ApiFailure }> {
  const tok = await getAccessToken({ interactive });
  if (!tok.ok) return { ok: false, reason: "needs_auth" };

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${tok.token}` },
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (res.status === 401 && !retriedAfter401) {
    await invalidateStoredToken();
    return authedGetJson(url, interactive, true);
  }
  if (!res.ok) return { ok: false, reason: "http_error" };

  try {
    return { ok: true, json: (await res.json()) as unknown };
  } catch {
    return { ok: false, reason: "bad_response" };
  }
}

/**
 * PRD §5.4.1 step 2 — Google People API contact lookup by email.
 * `people:searchContacts?query={email}&readMask=locations,emailAddresses`.
 *
 * People rarely exposes a usable IANA timezone (the PRD acknowledges this —
 * single-digit hit rate; that is why manual-cached-forever and the removed
 * Maps step). We return the recipient's display name when present (useful
 * for the cache/UI) and a timezone ONLY if the response actually carries a
 * usable IANA string. Anything else → `no_timezone`, and the cascade moves
 * on (Directory later / manual). We never invent a timezone.
 */
export async function searchContactTimezone(
  email: string,
  interactive = false,
): Promise<
  | { ok: true; timezone: string; name: string | null }
  | { ok: true; timezone: null; name: string | null } // found contact, no tz
  | { ok: false; reason: ApiFailure }
> {
  const url =
    `${PEOPLE_SEARCH_URL}?query=${encodeURIComponent(email)}` +
    `&readMask=names,emailAddresses,locations`;
  const r = await authedGetJson(url, interactive);
  if (!r.ok) return r;

  const results =
    (r.json as { results?: { person?: PeoplePerson }[] } | null)?.results ?? [];
  const person = results[0]?.person;
  const name =
    person?.names?.find((n) => typeof n.displayName === "string")
      ?.displayName ?? null;

  // People has no first-class IANA timezone field; only accept a value that
  // is plausibly an IANA zone if some future field ever carries one. Today
  // this almost always yields null → cascade continues. Honest by design.
  const tz = extractIanaTimezone(person);
  return tz
    ? { ok: true, timezone: tz, name }
    : { ok: true, timezone: null, name };
}

interface PeoplePerson {
  names?: { displayName?: string }[];
  emailAddresses?: { value?: string }[];
  locations?: { value?: string; current?: boolean }[];
}

/** Looks like an IANA zone, e.g. "America/New_York" / "Europe/Berlin". */
function looksLikeIana(s: unknown): s is string {
  return typeof s === "string" && /^[A-Za-z]+\/[A-Za-z0-9_+\-/]+$/.test(s);
}

function extractIanaTimezone(person: PeoplePerson | undefined): string | null {
  if (!person) return null;
  for (const loc of person.locations ?? []) {
    if (looksLikeIana(loc.value)) return loc.value;
  }
  return null;
}
