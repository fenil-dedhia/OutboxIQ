# Session 15 — Google Workspace compatibility verification (Branch 1 / clean)

> **State at close (2026-05-28):** Free v1 remains feature-complete and
> a11y-passed (Session 14 close). This session was the **second** of the
> four pre-launch hardening sessions (14 a11y → **15 Workspace** → 16
> security → 17 comprehensive hands-on) and is **verification-only** —
> the prompt explicitly framed it as a probe-and-fix session that
> branches on owner findings: Branch 1 (everything identical / works)
> = no code, doc updates only; Branch 2 (Workspace DOM differs) =
> probe-verified selector/recipe change in `gmail-recipe.ts`;
> Branch 3 (other failure) = scoped fix or document-the-gap.
>
> **Outcome: Branch 1.** All six Part-A checks on a real Workspace
> account came back **identical** to consumer Gmail; the DevTools console
> dump contained zero errors attributable to Fashionably Late. **No code
> changed.** Test count unchanged (354); `SCHEMA_VERSION` unchanged at 3;
> manifest permissions unchanged; no new dependencies. Per the Branch-1
> instruction, this summary is short (no `§a–§h` feature template).

## What the owner verified

The owner ran the Part-A six-check checklist on a real Google Workspace
account (not the tenant admin), with DevTools Console open throughout.
Reported verdicts (`identical` / `different` / `broken`):

1. **§5.2 — chevron relabel + modal injection** → identical. The
   "Schedule Send (powered by Fashionably Late)" relabel appears on
   Workspace; clicking it opens our enhanced modal, not Gmail's native
   one.
2. **§5.3 / §5.3.5 — Optimize-for-X end-to-end → real scheduled send**
   → identical. The full flow worked: pick recipient (cache-miss), inline
   timezone picker, pick timezone with "Remember…" checked, pick a
   Morning/Midday timing, click Schedule Send, email landed in the
   Scheduled folder at the expected time.
3. **§5.5.1 — outside-hours soft warning on regular Send** → identical.
   The three-choice modal (Proceed anyway / Snap to … / Cancel) fired as
   designed when the regular blue Send button was clicked outside the
   configured working hours.
4. **SCHEDULED label + native cancel pathway** → identical. The scheduled
   email shows Gmail's normal SCHEDULED state; Gmail's native "Cancel
   send" moves it back to Drafts. (Resolves Open Question 1 of
   `research/scheduled-send-api-spike.md` *for the consumer-equivalent
   path on Workspace* — the API cancel via `messages.trash` was not
   re-exercised since Free v1 doesn't use it; Gmail's native cancel was
   the path verified.)
5. **Admin-policy edge case** → not exercised (owner is not the tenant
   admin). Reported observation: Schedule Send was **available and
   functional** on this tenant, so no admin-disabled scenario surfaced.
   The graceful-degradation path (§6.7) when an admin disables scheduled
   sending was therefore **not driven**. See §"Honest gap" below.
6. **Visual / DOM sanity** → identical. Modal renders correctly,
   TimezonePicker is styled correctly inside the Shadow DOM, and an
   Inspect-element pass on the Schedule Send chevron showed structure
   that looked the same as consumer Gmail (no visible class-name or
   element-tree divergence around the SOS-injection points).

## Console-error triage (zero attributable to Fashionably Late)

The owner's DevTools dump contained the following lines — each diagnosed
against the build output to confirm none originate from Fashionably Late:

- `service worker navigation preload request was cancelled` /
  `FetchEvent for "https://mail.google.com/…" resulted in a network
  error response` / `sw.js?offline_allowed=1: Uncaught (in promise) Af`
  → **Gmail's own service worker (`sw.js`)**, not ours. Our SW chunk is
  `service-worker.ts-BKgdC8aN.js` (loaded via
  `service-worker-loader.js`).
- `Deprecated API for given entry type.` (×7) /
  `Unrecognized feature: 'speaker'` / `m=base:567 Uncaught (in promise)
  TypeError: Failed to fetch` (×2) → **Gmail's own bundle (`m=base`)**.
- `Framing 'https://accounts.google.com/' … frame-ancestors
  https://studio.workspace.google.com` /
  `Framing 'https://ogs.google.com/' …` /
  `Unsafe attempt to load URL https://ogs.google.com/… from frame with
  URL chrome-error://chromewebdata/` /
  `Unsafe attempt to load URL https://accounts.google.com/
  RotateCookiesPage … from frame with URL chrome-error://chromewebdata/`
  → **a separate `studio.workspace.google.com` browser tab / iframe**,
  not Fashionably Late.
- `<link rel=preload> uses an unsupported 'as' value` /
  `An iframe which has both allow-scripts and allow-same-origin … can
  escape its sandboxing` → **Gmail's own HTML**, not our markup.
- `chat.google.com/u/0/api/get_group?c=146:1 Failed to load resource:
  the server responded with a status of 404 ()` (×6) → **Gmail's
  embedded Chat panel**, not ours.
- `meet.google.com/call?… resulted in a network error response` /
  `meet.google.com/_/frame?… resulted in a network error response` →
  **Google Meet's pip frame**, not ours.
- `contentScript.bundle.js:1 Executing inline script violates the
  following Content Security Policy directive 'script-src 'self'
  'wasm-unsafe-eval' 'inline-speculation-rules'
  chrome-extension://869c32d0-49a7-4163-afed-e16233a5599e/'.` →
  **A third-party extension installed in the owner's Chrome profile.**
  The extension ID in the CSP message (`869c32d0-49a7-4163-afed-
  e16233a5599e`) is **not ours** (`dicnmcmhapcfceodecocnkaacjdpplnm`),
  and our content script chunk is `content-script.ts-DiNBTc-_.js`, not
  `contentScript.bundle.js`. Confirmed not Fashionably Late.

Verdict: zero red errors attributable to Fashionably Late on Workspace.

## Doc updates

This commit:

- `PRE_LAUNCH_CHECKLIST.md` "Google Workspace compatibility — Schedule
  Send" → renamed `… — VERIFIED (Session 15, 2026-05-28)` with a
  prominent verification block citing the owner's hands-on, the
  six-check verdicts, the console-error triage, and the explicit
  "no Workspace fork needed in `gmail-recipe.ts`" finding. Original
  bullets preserved per Entry-4 discipline; the Trigger bullet
  struck-through for the initial-verification leg and kept open for
  the post-Gmail-UI-change re-verification leg.
- `CLAUDE.md` "Current state" prelude → bumped header to **Session 15
  close, 2026-05-28**; added a new Session-15 paragraph at the top (with
  the Branch-1 outcome and the honest admin-policy gap); preserved the
  Session-14 paragraph immediately below it.
- `CLAUDE.md` "Remaining sessions to public launch" → Session 15 entry
  struck through with `**DONE (2026-05-28; documentation-only, Branch 1
  / clean — no code changed).**` and a one-paragraph result line citing
  this summary file.
- `notes/owner-decisions-log.md` → appended `Session 15 — no entries
  this session.` with a short rationale paragraph (Branch 1 / clean
  verification is a confirm-the-design-holds outcome, not a
  trajectory-changing owner decision; gates a real entry only if it
  surfaces a divergence the owner adjudicates).

PRD §11 unchanged; PRD §6.3 / §8.9 unchanged; manifest unchanged.

## Honest gap (carry forward)

The **admin-disabled Schedule Send graceful-degradation path (§6.7)** was
not exercised in this session. The Workspace account used was a regular
member account where the admin had Schedule Send enabled, so there was
no "Schedule Send is unavailable" state to drive Fashionably Late into.
This is logged explicitly rather than wrapped into the "verified"
language because Free-v1 launch shouldn't quietly imply coverage we
don't have. Three reasonable next moves, in priority order:

1. **Session 17 (comprehensive hands-on)** — if the owner has access to
   a tenant where Schedule Send is admin-disabled (a different
   Workspace, a friend's tenant, a sandbox), drive Fashionably Late
   through it and confirm graceful fallback to native Gmail (the
   multi-compose safety-net pattern is the analogous shape — when our
   chain breaks, we fall through cleanly to whatever Gmail itself would
   do, which here is "Schedule Send unavailable, regular Send only").
2. **Session 16 (security audit)** — if the audit happens to surface a
   tenant configuration that disables related Gmail features, note the
   degradation behavior then.
3. **Accept as Free-v1-launch gap** — Free v1 already fails toward
   native Gmail on every ambiguous schedule path (the
   `compose-integration.ts` multi-compose safety net + the §5.5.1
   30-second watchdog + the `gmail-recipe.ts` step-failure paths), so
   if admin-disabled Schedule Send manifests as "the relabeled menu
   item simply doesn't appear" (most likely shape), the existing
   handling is structurally correct.

## What was NOT verified

To stay honest about the verification surface:

- **Workspace tenants with sensitive admin policies** (data loss
  prevention, third-party app restrictions, content compliance scanning
  on Send). These can intercept or modify Send-button gestures; whether
  they interact with the §5.5.1 capture-phase guard or the §5.2
  intercepted-menuItem replay is not known. Free v1 makes no Google API
  calls (Entry 39), so it shouldn't trip data-perimeter alerts on that
  axis — but UI-automation gestures are a separate matter and could
  conceivably collide with a tenant policy that hooks Send events.
  Flagged for Session 16 (the security audit is the natural place to
  reason about admin-policy interaction surfaces) or post-launch user
  reports.
- **Different Workspace UI variants** (the experimental rolled-out UIs
  Google sometimes A/B tests on tenants). The owner's account showed
  the standard Gmail UI; if Google ships a Workspace-specific layout
  later, the post-Gmail-UI-change re-verification trigger
  (`PRE_LAUNCH_CHECKLIST.md` Workspace item) catches it.
- **Workspace-specific delegation / mailbox-sharing scenarios.** Not in
  scope for a single-account verification; deferred.

## Test status / build / lint

- `npm run build` → clean (only the documented benign CRXJS-on-Vite-8
  warning).
- `dist/service-worker-loader.js` correctly imports the `service-worker.ts-*`
  chunk (the MV3 entry-basename gotcha holds).
- Test count: **354** (no change; nothing in this session adds or
  removes coverage — Workspace verification is hands-on by nature, not
  jsdom-testable).
- `SCHEMA_VERSION`: 3 (unchanged).
- Manifest permissions: `storage` + `scripting` + `host_permissions:
  https://mail.google.com/*` (unchanged).

## Handoff to Session 16

**Next: Session 16 — Security audit** (owner-locked). End-to-end review
for security holes per the CLAUDE.md "Remaining sessions" line: input
handling, message-passing surfaces, storage hygiene, content-script
isolation, no inadvertent data exfiltration. Carry forward from this
session: the admin-policy interaction surface (above §"Honest gap" /
§"What was NOT verified") is a natural item for the security audit to
reason about — Workspace tenants are where heavy admin policies live,
and a security-pass framing is the right lens for "what could an
admin-controlled environment do to our gesture-replay guarantees".

After Session 16: **Session 17 — Comprehensive hands-on testing** (the
final pre-submission gate, including the duplicate-instance regression
test plan documented in `PRE_LAUNCH_CHECKLIST.md`).
