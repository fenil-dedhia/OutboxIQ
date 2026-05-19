# Session 9 — Summary

**Date:** 2026-05-19

> **🔻 FINAL STATE — Entry-39 architectural pivot (authoritative; supersedes
> every "Free v1 OAuth/cascade" statement below, which is retained as
> accurate Session-7→9 history = now Premium-v1 infra).** After the
> multi-account fix landed verified-live, the owner acted on the question
> it surfaced: the People timezone hit-rate is ≈nil and the recipient is
> DOM-readable, so **Free v1 drops ALL Google API/OAuth.** Executed in
> disciplined phases (A verify → B isolate → C unwire → D docs → E log →
> F close), each green-checkpointed, no stop-and-split triggered:
> - **Sessions 7–9 OAuth/People/`login_hint` stack → `extension/src/premium-v1/`**
>   (history-preserving `git mv`; oauth, oauth-config, auth-token,
>   google-api, full API cascade, all tests, + a wire-up README).
>   **Inert: compilable, unit-tested, imported by NO Free v1 entry**
>   (audited). Not deleted, not commented-out.
> - **Free v1 cascade → cache→manual** (`src/background/timezone-cascade.ts`
>   rewritten, `{source:"cache"|"manual_needed"}`, no token/network/SW-need);
>   `service-worker.ts` de-OAuthed; **manifest → `permissions:["storage"]`
>   + `host_permissions:["https://mail.google.com/*"]`, no `oauth2` key.**
> - **Payoff banked:** no OAuth, no CASA, no sensitive-scope
>   consent-screen verification gate for Free v1 launch.
> - **Free v1 features (Schedule Send, §5.5/§5.5.1, modal) verified
>   intact** (never imported OAuth; test suite green — 143 tests).
> - Phase A: Workspace directory-autocomplete is tenant-config-dependent;
>   §5.3.5 must DOM-read the rendered chip name + fall back, never depend
>   on directory data. Non-gating; flagged.
> - Docs: PRD §5.3.5/§5.3.7/§5.4.1/§6.6/§7.5/§13 Entry-39 amendments;
>   CLAUDE.md **−5.8k** (net trim); owner-decisions-log **Entry 39**.
> - **Session 10:** build §5.3.5 Optimize-for-recipient UI on the
>   on-device foundation (DOM recipient + §5.3.7 manual + 90-day cache).
>   No OAuth/CASA/consent work remains for Free v1.
> - **Commits: staged, NOT pushed** — owner OK required (Phase F).

> Free v1 foundation-completion: the `login_hint` multi-account fix +
> the §6.6 scope-tension resolution + making the recipient cascade
> hands-on-runnable. **Structurally an owner-run verification session**
> — Phases 1, 2, and the Phase-3 *confirmation* require a browser +
> live Google + GCP Console, which the agent cannot drive. What the
> agent could own end-to-end was done: the design blocker resolved, the
> code implemented robustly, and the owner runbook + harness built so
> the hands-on is a scripted sequence, not an investigation. No
> owner/PM trajectory input this session (see owner-decisions-log).

> **⚠️ CLOSE-OUT ADDENDUM — AUTHORITATIVE FINAL RECORD (§a–§i below were
> written mid-session and are superseded where they conflict; kept as the
> accurate-at-the-time draft per repo discipline).**
> - **Phase 1 — DONE & live-verified.** GCP trimmed to contacts-only;
>   confirmed via the GCP Data Access screen *and* the live consent
>   screen on a **full-revoke clean token**. The owner's "why didn't it
>   ask me?" surfaced a lingering-grant risk → full-revoke re-test →
>   trustworthy results throughout the rest of the session.
> - **Multi-account silent renewal (Entry-34) — RESOLVED & VERIFIED
>   LIVE.** Three-step arc, all owner-hands-on (Entry-10, three times the
>   People docs were wrong): (1) `contacts.readonly`-only → **403** from
>   `people/me`; (2) owner added `userinfo.email` (Entry 38) — still
>   **403** even with `userinfo.email`+`openid`+`email` in the token
>   (proven via `getStored().scopes`); (3) reworked to read the email
>   from an **OpenID id_token in the sign-in redirect**
>   (`response_type=token id_token`+`nonce`, +`openid` scope; nonce/aud/
>   iss validated; **no people/me, no extra call, no new host**). Dead
>   `user-identity.ts` (+tests) **removed**. **Owner confirmed live:**
>   `whoami` → `grantedEmail` resolved; `expireNow`+`silent` →
>   multi-account renewal **with no account chooser**. **139 tests.**
> - **Harness `window is not defined`** (owner's screenshot) — diagnosed
>   to my Phase-2 probes' dynamic `import()` in the SW (Vite DOM-preload
>   helper); **product cascade code was always clean** (static import).
>   Fixed (dynamic→static); no INEFFECTIVE_DYNAMIC_IMPORT; ship build
>   still strips the harness.
> - **Owner-decisions-log:** Entry 38 + its **resolution addendum** (NOT
>   a "no entries" session).
> - **NEW headline open question (owner-surfaced, NOT decided —
>   Session-10 input):** `contacts.readonly` is the only *sensitive*
>   scope and its tz hit-rate is near-zero — keep it vs. drop it for an
>   **all-non-sensitive app** (possible removal of the consent-screen
>   verification gate). Deliberately deferred to be decided *with* the
>   §5.3.5 build, not on end-of-session momentum. Tracked in PRD §6.6,
>   PRE_LAUNCH (OAuth section), CLAUDE.md, §i below.
> - **Optional, non-blocking:** Phase-2 cascade Test-4 scenarios
>   (`resolveTz`/`cache`) — harness now works; owner can run anytime;
>   does not gate Session 10.

## a. What this session accomplished

- **Phase 1 (GCP consent reconfig) — PREPARED, owner-executed.** Cannot
  be done by the agent (no GCP Console access). A precise step-by-step
  walkthrough is now `research/oauth-smoke.md` "Phase 1", including the
  **"if GCP demands app-verification re-submission, STOP and surface"**
  guard (prompt instruction; Entry 15) and the re-consent expectation.
- **Phase 2 (cascade hands-on) — MADE RUNNABLE, owner-executed.** The
  Session-8 harness (`__oqAuth.testPeople`) only did a *raw* People
  fetch; it could not reach `resolveRecipientTimezone` or the cache, so
  Phase 2 was literally not executable. Added smoke-only console probes
  `__oqAuth.resolveTz(email)` and `__oqAuth.cache.{list,clear,setManual}`
  (dynamic-imported so they widen no static module cycle and are
  **dead-code-eliminated from the ship build** — re-verified). Wrote
  the full a–h scenario matrix into the runbook, **with the honest
  caveat that scenario (a) (`people_api` success) is essentially
  un-observable against live Google** because People has no IANA-tz
  field — the mechanism is unit-tested; its live absence is expected.
- **Phase 3 (`login_hint`) — IMPLEMENTED, code-complete + 145 tests.**
  Researched the §6.6 scope tension first (the prompt's "verify before
  building"): Google's authoritative `people.get` authorization list
  **includes `contacts.readonly`**, and `emailAddresses` is a valid
  `personField` — so **no scope addition is needed at the documented
  authorization level**. The residual is purely *empirical* (does a
  `contacts.readonly`-only token return the `Source.type:ACCOUNT` login
  email?), which this project's discipline (Entry 10) says to verify
  live, owner-run. Built `src/background/user-identity.ts`
  (`getAuthenticatedUserEmail` + pure `extractAccountEmail`); wired
  `oauth.ts` to resolve-and-persist `StoredAuth.grantedEmail`
  post-grant, carry it across silent renewals, and set `login_hint` on
  the **silent-only** request (interactive keeps `prompt=select_account`
  — Entry 29 multi-account choice preserved). Added the
  `__oqAuth.testPeopleMe` scope-tension probe. The implementation is
  **correct under both empirical outcomes** (Entry 25): on any failure
  `login_hint` is omitted → behaviour is *exactly* the Session-8
  documented graceful re-prompt → **zero regression, zero scope added**.
- **Phase 4 (Workspace Directory) — ASSESSED → DEFERRED.** Requires the
  `directory.readonly` scope (PRD §5.4.1 step 3 / §6.6). That triggers
  the prompt's own Phase-4 defer criterion *and* the
  no-unilateral-scope rule, and is un-verifiable without a Workspace
  account. The cascade seam is already in place (documented, not
  stubbed). Not implemented — a clear-cut defer, not a judgment call.
- **Docs synced (Entry-6):** CLAUDE.md (multi-account state, cascade
  test count 130→145, Session-9 close state, roadmap), PRD §7.5
  (Session-9 Entry-6 amendment — spec follows code, appended not
  rewritten per Entry-4), `research/oauth-smoke.md` (rewritten as the
  single Session-9 owner runbook; fixed the **stale "4 scopes" consent
  text** → Contacts-only). PRE_LAUNCH unchanged (justified in §d).

## b. Confidence (Entry 16) — per phase, they differ materially

- **Phase 1 prep: 4/5.** Steps are standard GCP and the
  stop-and-surface guard is in place, but GCP's consent UI shifts and
  the agent cannot see the owner's exact console — the runbook is
  correct in substance; exact button labels may vary.
- **Phase 2: 3.5/5 — UNCHANGED from Session 8, and that is the honest
  finding.** The prompt's load-bearing ask was to move this toward
  4.5–5 via hands-on. **It could not be moved this session because the
  hands-on is structurally owner-run and was not run within the
  session.** What changed is *runnability* (no harness → harness;
  no runbook → scripted matrix) and *honesty* (the people_api caveat),
  which is real and necessary progress — but it is not verification.
  Calling Phase 2 "more verified" would be false. The number moves when
  the owner runs the runbook, not before.
- **Phase 3 implementation: 4.5/5.** Code is complete, typed,
  non-throwing, 145 tests including the carry-forward / omit / resolve
  paths; robust under both scope-tension outcomes; no scope added.
- **Phase 3 *outcome* (will multi-account renewal actually go
  invisible?): 3/5 — honestly contingent.** Depends entirely on the
  empirical `testPeopleMe` result, which is unknown until the owner
  runs it. The *code* is 4.5/5 *regardless of that answer*; the
  *feature payoff* is genuinely unknown until the probe runs.

## c. Shortcuts / things to flag to a senior reviewer

- **Hands-on-only, not yet done (the central one):** every load-bearing
  verification in this session's prompt (Phases 1, 2, Phase-3
  confirmation) is owner-executed and **was not executed** — the agent
  has no browser/GCP/live-Google. This session de-risked and scripted
  them; it did not perform them. Do not read "implemented + 145 tests"
  as "verified against Google."
- **§6.6 scope-tension residual is empirical and unresolved.** Docs say
  `contacts.readonly` is authorization-sufficient for
  `people/me?personFields=emailAddresses`; whether the *response* carries
  the `ACCOUNT` login email under that scope alone is contested in
  community reports and is exactly what `testPeopleMe` exists to settle.
  The robust-either-way design means this is not blocking, but the
  contingent scope decision is real and deferred to the owner.
- **`extractAccountEmail` fallback chain (ACCOUNT+primary → ACCOUNT →
  primary → sourcePrimary → first)** is a deliberate soft-degrade
  (Entry 25): a slightly-imperfect `login_hint` still aids account
  disambiguation and Google ignores an unrecognised hint, so a wrong
  guess is harmless, whereas `null` silently disables the fix. A
  reviewer may prefer "ACCOUNT-only or null" — flagged as a conscious
  call, validated against the real `body` by the probe.
- **Module-cycle avoidance:** `user-identity.ts` takes the token as a
  param (no `oauth.ts` import) specifically to avoid an
  oauth↔google-api↔oauth cycle; consequence is no 401-retry there
  (acceptable — token is fresh by construction; a 401 just means "no
  hint", the safe default).
- **Phase-2 harness probes use dynamic `import()`** inside the
  DEV/smoke-only block. Verified DCE'd from `npm run build` (ship), but
  this rests on Vite/Rolldown statically eliminating the
  `import.meta.env.DEV || __OQ_SMOKE__`-false block — re-assert with
  `smoke:check` if the bundler is upgraded.

## d. Stale docs surfaced (and handled)

- **`research/oauth-smoke.md` "consent screen lists the 4 scopes"** —
  stale since the Session-8 trim (Entry 36). Fixed: rewritten to
  Contacts-only, with the Phase-1 reconfig as the thing that makes it
  true and a re-consent note.
- CLAUDE.md "Session 9 opens with", roadmap, "130 tests", the Entry-34
  "limitation … `TODO(Phase 3)`" framing — all updated to Session-9
  close state.
- **PRE_LAUNCH_CHECKLIST — deliberately NOT changed.** Nothing was
  hands-on-cleared (owner-run pending) and no new launch-blocker
  surfaced (zero scope added → the CASA-reframe is untouched; the
  consent reconfig was already a tracked owner task, now scripted).
  Editing it would be manufacturing change, which the close-out rule
  forbids as much as manufacturing log entries.

## e. Deferred into Session 10+ (and what's genuinely new)

- **Session 10 (by design):** §5.3.5 Optimize-for-X UI in the §5.3
  modal, consuming `resolveRecipientTimezone` via
  `MSG_RESOLVE_RECIPIENT_TZ`. Its prompt comes separately. **Precondition
  the owner must clear first:** run `research/oauth-smoke.md` Phases
  1–3 — Session 10 builds on a verified cascade, not a contested one.
- **New this session — the contingent §6.6 scope decision.** *Only if*
  `testPeopleMe.extracted` is null: owner chooses between adding the
  non-sensitive `openid`+`userinfo.email` identity scopes (PRD §6.6
  amendment + one-time re-consent) vs. accepting the permanent
  multi-account re-prompt. Teed up, not taken.
- **Workspace Directory (§5.4.1 step 3)** — deferred; needs the
  `directory.readonly` scope decision. Seam ready.

## f. Honest gaps — hands-on covered vs not

- **Covered (agent, statically/locally):** typecheck, lint, **145 unit
  tests** (130 prior + 15 new: `extractAccountEmail` precedence/degrade,
  `getAuthenticatedUserEmail` typed failures, `login_hint`
  present/absent/carried-forward, post-grant resolve+persist,
  failed-resolve-no-block); API-host consistency
  (`people.googleapis.com` everywhere, no stray `www.`); manifest host
  fix present; smoke build OK **and ship build strips the whole
  harness** (re-verified).
- **NOT covered (owner-run, pending — unchanged from Session 8 on this
  axis):** the GCP consent reconfig and its round-trip; the trimmed
  consent screen showing Contacts-only; the entire cascade against live
  People (`resolveTz` → real `searchContacts`, cache persistence across
  SW restarts, the offline/expiry scenarios); **the §6.6 empirical
  question** (`testPeopleMe` — does `contacts.readonly` return the
  ACCOUNT email); multi-account silent renewal actually going invisible.
  Edge cases needing account types not available to the owner (true
  Workspace tenant for Directory; a clean single-account profile for
  the single-account silent-renewal success Session 8 also could not
  observe) remain out of reach until such accounts exist.

## g. Tier-split code discipline — confirmed

Free-v1-only. `user-identity.ts` carries a `PREMIUM_NOTES` block
stating Premium's backend refresh-token path makes silent renewal a
server concern and nothing here is shared/pre-built for it. No
refresh-token or backend scaffolding added. Workspace Directory left as
a documented seam (no speculative stub — Entry 22). The Phase-2 probes
are smoke-only and DCE-verified out of the ship artifact.

## h. Commits

Held — not pushed, awaiting owner OK (house pattern). This close-out
covers: `user-identity.ts` + tests; `oauth.ts` login_hint wiring +
`testPeopleMe`/cascade probes + `oauth.test.ts` additions; CLAUDE.md /
PRD §7.5 / `research/oauth-smoke.md` doc sync; this summary +
owner-decisions-log line.

## i. Session 10 opening sequence (handoff)

1. **Owner runs `research/oauth-smoke.md` Phases 1–3** (the open Free-v1
   gate). Phase 3's `testPeopleMe.extracted`:
   - **non-null** → scope tension resolved; `login_hint` payoff
     confirmed; CLAUDE.md §7.5 "hands-on-pending" → "verified".
   - **null** → surface the contingent §6.6 scope decision to the owner
     (do not add scope unilaterally — Entry 15).
2. **§5.3.5 Optimize-for-X UI** in the §5.3 modal, on the verified
   cascade. (Session 10 prompt arrives separately.)
3. Workspace Directory if/when the `directory.readonly` decision is
   made; then Free v1 pre-launch hardening + the two Gmail-API probes.
