# Session 7 — Summary

**Date:** 2026-05-17

> Planned as a three-phase gated session: §5.5.1 hands-on smoke (gate zero)
> → GCP setup → §5.3.5/§5.4 OAuth+cascade. Gate zero caught a real,
> default-reachable §5.5.1 bug; the owner re-scoped to **fix §5.5.1 + keep
> Phase 2 (GCP), defer Phase 3 (OAuth code) to its own session**. Net:
> §5.5.1 corrected and re-verified hands-on; the GCP/OAuth foundation
> stands (Testing mode, verified end-to-end short of in-extension code);
> Phase 3 cleanly deferred.

## a. What this session accomplished

- **Phase 1 — gate zero (DONE).** Built a committed, re-runnable smoke
  harness (`research/regular-send-smoke.{js,md}`, Entry-9 discipline,
  self-calibrating off the machine clock so the owner does no time math).
  Owner ran the full matrix hands-on against live Gmail. A–F passed in all
  three compose contexts (new / inline reply / pop-out), all three modal
  choices + Esc + backdrop, working-hours and absolute violations.
  **Test G failed** — see §b.
- **Phase 1 fix (DONE, re-verified).** A pure, time-aware
  `ensureFutureSnap()` layer; surgical (scoped to the one provably
  past-prone case). +7 unit tests incl. an explicit Test-G regression; 92
  green; re-verified hands-on (G1 valid future schedule, G2/G3 regression
  unchanged). PRD §5.5.3 + CLAUDE.md "Locked product decisions" amended
  (refine, not overturn).
- **Phase 2 — GCP setup (DONE).** GCP project `outboxiq-dev`; Gmail +
  People + Calendar APIs enabled; OAuth consent screen (External, Testing
  mode); 4 scopes (`gmail.compose`, `gmail.modify`,
  `calendar.settings.readonly`, `contacts.readonly` — **no**
  `directory.readonly`, Session 8); 2 test users
  (`fenil.h.dedhia@gmail.com` + a throwaway `anonymoustiel@gmail.com`).
  Stable extension ID **pinned** via a manifest `key`
  (`dicnmcmhapcfceodecocnkaacjdpplnm`). **Web-application** OAuth client
  created (owner override of the prompt's "Chrome extension" instruction —
  §b / Entry 29). Client ID captured into a typed
  `src/lib/oauth-config.ts`. Verified hands-on with a zero-code Google
  authorize URL: both test accounts reached the consent screen, saw all 4
  scopes, returned `?code=` (redirect URI matched).
- **Phase 3 — DEFERRED to Session 8** (owner re-scope). The OAuth *flow*,
  token storage/refresh, Calendar-into-onboarding, and the §5.4
  cache→People→Directory→manual cascade + `resolveRecipientTimezone()`
  contract are untouched and remain a dedicated session with its own
  pre-implementation architecture review (Entry 19).
- **Brand/rename decoupling logged** (owner question — Entry 30):
  PRE_LAUNCH "Naming / rebrand readiness" + a CLAUDE.md
  brand-independent-identifiers lock. No code churn (owner-directed).

## b. The Test G bug (honest)

`absAfterLatest`: it was 11:36 AM, "latest" set to 10:36 AM. The modal
correctly named the violation but its primary action said *"Reschedule to
Sun, May 17, 10:36 AM"* — an hour in the **past** — and Gmail rejected it
("Invalid time"). **Root cause:** the locked "absolute snap = the violated
boundary on the **same calendar day**" rule is correct only when the day
is a *future day the user picked* (§5.3 Schedule Send). For an
`after-latest` violation via the **regular Send** trigger the requested
time *is* "now", so "now is past the ceiling" ⇒ today's ceiling is already
behind us ⇒ the snap is always past. **Default-reachable** (Send after the
default 7 PM `absoluteLatest`). A narrower latent sibling exists in §5.3
(pick a later-today time while already past the ceiling). Not a §5.2.3
safety failure (graceful degradation held — it lands in Gmail's native
picker, nothing wrong is sent, Send is never wedged), but the headline
recommended action was broken in the most common evening case. This is
the Entry-10 / Entry-21 / Entry-25 pattern: jsdom is green because the
unit matches the locked spec; the spec was miscalibrated for §5.5.1's
reuse. **Fix:** `ensureFutureSnap()` rolls only a past `after-latest` snap
to the **next working morning** (owner decision; fallback "next day at
`absoluteEarliest`" if zero working days). Scoped to `after-latest` only —
every other snap is provably already strictly future and untouched.

## c. Commits shipped

1. `f673e5b` fix(§5.5.1): forward-roll past after-latest snap → next
   working morning (+ tests, PRD §5.5.3 + CLAUDE.md, smoke harness)
2. `dda59e0` chore(oauth): pin stable extension ID + Privacy/ToS
   placeholder stubs
3. *(this close-out)* docs: Session 7 summary + owner-decisions-log
   28–30 + CLAUDE.md "Google Cloud / OAuth" + PRE_LAUNCH + oauth-config

(1) and (2) pushed to `origin/main` (`ac84384..dda59e0`).

## d. Confidence and gaps (Entry 16)

**Confidence — Phase 1: 5/5.** The bug was found hands-on and the fix
re-verified hands-on with regression checks (G2/G3), against live Gmail —
the load-bearing check this repo trusts. The fix is surgical and provably
scoped (every non-`after-latest` snap is shown future); 92 green incl. an
explicit Test-G regression.

**Confidence — Phase 2: 4/5.** The consent screen, 4 scopes, redirect URI,
and the test-user allowlist are verified end-to-end short of in-extension
code, for both accounts. Held below 5 by honest residuals:

- **No in-extension OAuth call yet.** Verification used a hand-built
  authorize URL in a browser tab; `chrome.identity.launchWebAuthFlow` from
  the service worker is unexercised (it is Phase 3 by design). The redirect
  *registration* is proven (`?code=`, no mismatch); the in-extension
  *round-trip* is not.
- **`oauth-config.ts` is currently unused** (pure config; Phase 3
  consumes it). Typecheck/lint/build green, but it has no runtime exercise.
- **Privacy/ToS consent-screen URLs left blank.** Google's console
  requires an *owned* authorized domain even for the Branding URL fields,
  so the committed raw-GitHub stubs cannot be used there in Testing mode
  (optional in Testing). Honest deviation from the prompt's "use the raw
  URLs" step, forced by Google's behaviour; the real fix is the tracked
  pre-launch rename-proof-URL item (Entry 30 / PRE_LAUNCH).
- **Client secret** is held by the owner outside the repo. Whether the
  extension uses PKCE (no secret) or a backend-side exchange is an
  explicit Phase 3 decision — not yet made.

**Shortcuts to flag to a senior reviewer:**

- The **§5.3 sibling fix has no component test.** `ensureFutureSnap()` is
  unit-tested in isolation and wired into `ScheduleModal.gate()`, but
  there is no `ScheduleModal.test.tsx` at all (pre-existing — the modal
  has never had a component harness). The §5.3 latent path is covered only
  by the pure-function tests + reasoning, not an integration test. Not
  expanded here (mid-bugfix scope discipline); flagged.
- The guard test mocks `working-hours` and now stubs `ensureFutureSnap`
  as **identity** — correct (the guard deliberately mocks the verdict
  math; real forward-roll is covered in `working-hours.test.ts`), but it
  means the guard suite does not exercise the *real* roll end-to-end.
- **OAuth-specific:** the entire token lifecycle (acquisition, encrypted
  storage trade-off, refresh, revoked/expired handling, scope-upgrade) is
  Phase 3 and **completely unbuilt**. The Phase 2 foundation is solid but
  shallow — it proves the consent/redirect plumbing, nothing about token
  handling robustness (Entry 25 applies hard there next session).
- The smoke harness reconfigures working hours via the service-worker
  console rather than re-running onboarding per scenario — deliberate
  (onboarding tested once; Settings is a stub), documented in the harness,
  but it does mean the onboarding *form* path was exercised once, not per
  scenario.

**Stale docs surfaced:** none material. CLAUDE.md repo-status "85 tests"
is updated to 92 here. PRD §5.1.3 (Calendar timezone source) is
**deliberately unchanged** — the Calendar API path is Phase-3 deferred and
not yet implemented, so the spec does not yet diverge (Entry-6 discipline:
amend only on real divergence; re-checked, none).

**Deferred items:** Phase 3 whole (OAuth flow + §5.4 cascade +
Calendar-into-onboarding + Session-8 `resolveRecipientTimezone()`
contract); Workspace `directory.readonly` scope + directory path (Session
8 additive); the `PRODUCT_NAME` copy centralisation (optional, logged);
real legal docs + rename-proof hosting URL (pre-launch); the §5.3
component-test gap.

**Honest gaps — what hands-on covered vs not.** Covered: §5.5.1 across 3
compose contexts, all modal choices, both violation classes, the bug and
its fix + regressions; the OAuth consent screen / scopes / redirect /
allowlist for 2 accounts. **Not** covered: any in-extension OAuth call;
token handling of any kind; Workspace/Directory; a non-consumer (Workspace)
account type; multi-compose (intentionally out of §5.5.1 scope — v1
safety-net). OAuth code rests on assumptions to be validated in Phase 3:
Chrome `identity.launchWebAuthFlow` behaviour, Google's API stability,
that a Web-app client + chromiumapp redirect round-trips in-extension as
it does in a browser tab.

## e. Owner-decisions-log

Entries **28** (smoke caught a default-reachable bug → re-scope + the
snap-target product call), **29** (overriding the prompt's own
"Chrome extension" OAuth-client instruction), **30** (a rename question
that hardened an implicit property into a guardrail). All three carry
honest credit splits per the Entry-17 rule.

## f. Repo state at session end

Commits `f673e5b`, `dda59e0` on `origin/main`; close-out doc commit to
follow. typecheck / lint / Prettier / **92 tests** / build / sw-loader
green. GCP `outboxiq-dev` live in Testing mode (2 test users, 4 scopes,
Web-app client). `backend/` still untouched (single-purpose,
Unschedule-on-Reply only). **Session 8 = Phase 3**: the OAuth flow +
§5.4 cascade + Calendar-into-onboarding, opening with the
pre-implementation architecture review (Entry 19) the prompt requires —
token storage/refresh design, where the cascade lives, the
`resolveRecipientTimezone()` contract Session 9's §5.3.5 UI consumes.
`extension-key.pem` (the extension's signing identity) is `*.pem`-gitignored
on the owner's machine — required to be kept; losing it only matters if a
signed `.crx` with this identity is ever needed.

## g. Post-close-out addendum — OAuth token architecture locked (Entry 31)

> A documents-only owner-directed lock made **after** the Session-7
> close-out above, before Session 8. The historical sections a–f are left
> intact (accurate record of Session-7-end state); this addendum is the
> **superseding forward-looking record** for the deferred scope (the
> session-6-summary precedent).

- **Decision:** refresh tokens live **only on the backend**,
  per-user-encrypted, via **server-side authorization-code exchange
  (Option B)**; the extension never stores a refresh token;
  PKCE-in-extension (Option A) is **rejected** — Session 8's review does
  **not** reopen it. Rationale + counterfactual: owner-decisions-log
  **Entry 31**. Encoded in PRD §7.5/§7.3.1/§7.3.3/§7.3.4, CLAUDE.md,
  PRE_LAUNCH, `backend/README.md`.
- **Roadmap re-split (supersedes §a/§d/§f "Session 8 = Phase 3 / cascade"
  for the forward record):**
  - **Session 8** — backend skeleton (Fly.io EU + Hono + Supabase EU +
    per-user-key encryption) **+** OAuth server-side exchange **+**
    refresh-token storage. End state: OAuth works end-to-end through the
    backend. **The backend must stand up before OAuth can be tested E2E.**
  - **Session 9** — Calendar (user timezone) + People + Workspace
    Directory + recipient cache + the `resolveRecipientTimezone()`
    contract. **Must amend PRD §5.1.3** when the Calendar source is wired
    (Entry-6 marker, also in CLAUDE.md — answers the owner's Session-7
    "will the §5.1.3 amendment be forgotten?" concern with a durable
    marker, not summary memory).
  - **Session 10** — Optimize-for-recipient UI in the §5.3 modal.
- **Q1 residual resolved (2026-05-17):** the §5.3 sibling fix was
  subsequently **hands-on verified** via the Schedule Send modal
  (later-today pick → §5.5 warning fires → "Reschedule to…" proposes a
  future time → valid native scheduled send, no "Invalid time"). The §d
  "honest gaps" note that it was reasoning-only is left intact as the
  accurate Session-7-end record; this supersedes it forward. Session 7
  is fully closed.
- **Implications surfaced in this lock (not in the owner's directive):**
  (1) a backend outage now also degrades client-only Calendar/People to
  their existing §6.7 fallbacks (browser tz / manual) — §7.5 amendment;
  (2) `extension/src/lib/oauth-config.ts` comments still float
  "PKCE … Phase 3 decision" — a **stale code comment** (no logic, not
  launch-affecting) to correct when Session 8 first touches that file
  (out of scope for this documents-only lock); (3) `backend/README.md`
  was refined for consistency though the directive didn't name it.
