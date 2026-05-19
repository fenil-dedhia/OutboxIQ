# `src/premium-v1/` — preserved, INERT Premium v1 infrastructure

> **Status: built, tested, and intentionally NOT wired into Free v1.**
> Nothing in this directory is imported by any Free v1 entry point
> (`src/background/service-worker.ts`, `src/content/*`, `src/pages/*`).
> It is kept compilable and unit-tested so Premium v1 can wire it up
> without rebuilding it. Do **not** import from here in Free v1 code.

## Why this exists (owner-decisions-log Entry 39)

Sessions 7–9 built and hands-on-verified a full client-side OAuth +
Google-People recipient-timezone stack for Free v1. Empirical testing
then established that the API path could not reliably deliver recipient
timezones (single-digit hit rate — PRD §5.4.1 amendment) **and** that
the recipient is readable directly from the Gmail compose DOM. The
owner therefore removed **all** Google API / OAuth dependencies from
**Free v1** (zero scopes, no `chrome.identity`, cascade = cache →
manual). That work is not wasted: **Premium v1 needs exactly this
infrastructure** (backend Unschedule-on-Reply, Option-B refresh
tokens — PRD §13.3), so it is _preserved here intact_, not deleted.

## Contents

| File                  | What it is                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `oauth.ts`            | `launchWebAuthFlow` implicit grant + OpenID `id_token` `login_hint` (multi-account silent renewal, verified live Session 9) + the `__oqAuth` smoke harness.                                |
| `oauth-config.ts`     | OAuth client ID / endpoint / scope set (`contacts.readonly` + `userinfo.email` + `openid`).                                                                                                |
| `auth-token.ts`       | `chrome.storage.local` access-token store (`outboxiqAuth`).                                                                                                                                |
| `google-api.ts`       | People `searchContacts` recipient lookup (§5.4.1 step 2).                                                                                                                                  |
| `timezone-cascade.ts` | The **full** API-backed cascade (cache → People → [Directory seam] → manual). Free v1's `src/background/timezone-cascade.ts` is the simplified cache→manual contract this slots back into. |
| `*.test.ts`           | Their unit tests — still run in the suite (inert ≠ untested).                                                                                                                              |

## Wiring it up for Premium v1 (future)

1. Premium switches OAuth to `access_type=offline` (Option B, PRD
   §13.3); the Client _Secret_ lives on the backend, never here.
2. Re-introduce an automated step before `manual_needed` in the Free
   v1 cascade contract (or call this `timezone-cascade.ts` from the
   Premium path) and re-add the GCP scopes + the
   `identity`/`people.googleapis.com` manifest entries.
3. `npm run build:smoke` / `smoke:check` and `research/oauth-smoke.md`
   are the (now Premium-scoped) OAuth verification tooling — currently
   inert because no entry point imports `oauth.ts`.

Audit that Free v1 stays API-free (import-specific — plain `grep premium-v1` false-positives on doc comments): `grep -rn 'from "[^"]*premium-v1' src --include=*.ts --include=*.tsx | grep -v src/premium-v1/` must return nothing.
