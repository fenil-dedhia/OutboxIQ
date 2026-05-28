# Fashionably Late — Pre-Launch Checklist (Free v1)

Items that must be completed **before Fashionably Late Free v1 can be made publicly available** (e.g., listed on the Chrome Web Store, or made available to users beyond an explicitly-allowlisted test group). This file is intentionally a living document — items get added as decisions are made during development.

> **Status:** Free v1 is in active development. None of the items below are blocking day-to-day feature work, but several have multi-week lead times, so they must be tracked.

> **Tier split (2026-05-17, owner-directed — `notes/owner-decisions-log.md` Entry 32).** Fashionably Late ships as two tiers of the same generation: **Free v1** (extension-only, no backend, the public-launch target — *this checklist*) and **Premium v1** (extension + backend, paid, built later — **`PREMIUM_LAUNCH_CHECKLIST.md`**). **This file now tracks Free v1 launch gates only.** Backend-dependent gates (CASA **Tier 2**, all Infrastructure, the online→offline OAuth switch, backend-processing legal language, Free→Premium migration, billing) moved to the Premium checklist. Two important non-obvious carry-overs that stay **here** because they still gate Free v1:
> - **A CASA assessment is still Free-v1-blocking.** Only *Tier 2* moved. Free v1 keeps the **restricted** Gmail scopes (`gmail.compose`, `gmail.modify`), so it still needs *a* CASA assessment before public OAuth Production — plausibly **Tier 1** without a backend, tier-to-confirm. "No backend" ≠ "no assessment". (See "Google / OAuth" below.)
> - **Premium v1 is a paid tier, not "v2".** The existing "v1 vs. v2 decisions" section is about *post-launch additive* directions (a later generation) — a distinct concept from the Premium tier. Don't conflate them.

> **SUPERSEDING NOTE (2026-05-27, owner-directed — Entry 52, with Entries 53–54).** Premium v1 is now **out of scope of this project entirely.** If/when Premium is built, it will be a fork of this (Apache-2.0) Free v1 repo into a separate private repo, with its own Chrome Web Store listing (Pattern Y) and its own launch checklist. Consequences for *this* document: (1) `PREMIUM_LAUNCH_CHECKLIST.md` no longer exists in this repo — its content went away with the Premium directories; references below should be read as "out of scope of this project (Entry 52)". (2) The "CASA assessment still Free-v1-blocking" carry-over above was already superseded by the Entry-39 pivot (Free v1 makes no Google API call, holds no OAuth scope — no CASA, no consent-screen verification gate). (3) The Free-v1 launch surface is now narrower and clearer: legal docs (dated 2026-05-27), brand/icons, Chrome Web Store listing & submission, accessibility, Workspace compatibility, security audit, comprehensive hands-on testing. No OAuth or CASA work remains for Free v1 in this repo.

---

## Google / OAuth

### CASA security assessment — NOT required for Free v1 (RESOLVED, Entry 39)

> **DEFINITIVE 2026-05-19 (owner-decisions-log Entry 39 — supersedes all
> "verify whether…" framing below).** Free v1 requests **zero OAuth
> scopes and makes no Google API call** (cascade is cache→manual,
> recipient is DOM-read). CASA is triggered by *restricted* scopes and
> the consent-screen verification by *sensitive* scopes — Free v1 has
> **neither, nor any consent screen at all**. So **no CASA and no
> sensitive-scope consent-screen verification gate apply to Free v1's
> launch.** This removes the single largest pre-launch OAuth cost/lead
> item. The OAuth stack (and therefore CASA Tier-2, consent
> verification, etc.) is **Premium v1** scope — `PREMIUM_LAUNCH_CHECKLIST.md`
> + `extension/src/premium-v1/`. The reframed-but-now-moot Session-8/9
> analysis below is retained as Premium-v1 history (Entry-4 discipline).

> **Materially reframed 2026-05-17 (Session 8 scope trim, Entry 36 —
> supersedes the Entry-32 "Free v1 still needs *a* CASA assessment"
> framing).** That earlier framing was correct *while Free v1 requested
> the restricted Gmail scopes*. **Session 8 trimmed Free v1's OAuth ask
> to `contacts.readonly` only** (PRD §6.6 amendment) — a Google
> **"sensitive"** scope, **not "restricted."** CASA is triggered by
> **restricted** scopes. So Free v1 may now require **no CASA assessment
> at all**, which would make the Testing→Production path materially
> simpler and remove the single biggest pre-launch cost/lead-time item
> from Free v1.
>
> **Session-9 update (2026-05-19, Entry 38 + CORRECTION) — no change to
> this reframe; one HIGH-LEVERAGE open question added.** Free v1's scope
> set is now **three**: `contacts.readonly` (sensitive) **+**
> `userinfo.email` **+** `openid` (the latter two non-sensitive, added
> for the `login_hint` id_token — PRD §6.6 / §7.5). Non-sensitive scopes
> add **nothing** to CASA or the sensitive-scope consent-screen
> verification (both driven solely by `contacts.readonly`) — so the
> "possibly no CASA, otherwise just standard consent-screen
> verification" conclusion above stands **unchanged**.
>
> **Open Session-10 question with direct pre-launch leverage
> (owner-surfaced 2026-05-19):** `contacts.readonly` is the **only
> sensitive scope**, and its real-world recipient-timezone hit-rate is
> near-zero (§5.4.1 amendment — Google stores no usable IANA tz). If the
> §5.3.5 build concludes it doesn't earn its place and it is dropped,
> Free v1 becomes an **all-non-sensitive-scope app** — which may remove
> the **consent-screen verification gate itself**, not just CASA (the
> single largest remaining pre-launch OAuth item). This is **not decided
> here** — it is the tracked headline decision for Session 10, to be made
> *with* the feature build, not before. Flagged here because the answer
> materially reshapes this checklist's OAuth section.

- **The actual pre-launch task is now a verification, not an
  assessment:** confirm against Google's current OAuth-verification /
  CASA documentation whether an app requesting **only
  `contacts.readonly`** (sensitive, no restricted scopes, no backend)
  needs **any** CASA tier, or only standard OAuth-consent
  verification. **Do not assume "none"** — verify and record the
  finding; the answer drives the Production timeline.
- If verification says **no CASA**: Free v1's Production gate is just
  the standard consent-screen verification (homepage / Privacy / ToS /
  authorized domain) — see "OAuth consent screen — Production status".
- If verification says **some CASA still applies** to a lone sensitive
  scope: budget that lead time; it is still far lighter than Tier 2.
- **Premium v1** still faces the full **CASA Tier 2** (restricted Gmail
  scopes **+** backend) — tracked in `PREMIUM_LAUNCH_CHECKLIST.md`,
  unchanged by this reframe.
- **Trigger:** when Free v1 is feature-complete and ready for users
  beyond the test allowlist. Until then we stay in **OAuth Testing
  mode** (fully functional for dev; not public).
- **Reference:** https://support.google.com/cloud/answer/13465431

### OAuth consent screen — Production status

- **Now concretely active (Session 7):** GCP project `outboxiq-dev`, OAuth
  consent screen configured **External / Testing mode**, explicit test-user
  allowlist, the 4 restricted/sensitive scopes requested, Web-application
  OAuth client live. This item is therefore no longer abstract — the
  Testing→Production gate (and the restricted-scope CASA item above) is the
  next real OAuth milestone once **Free v1** is feature-complete.
- **Free v1 OAuth model (tier split — Entry 32):** the Web-application
  client is **retained for Free v1** and used with
  **`access_type=online`** (access tokens only, no refresh token, no
  backend; multi-Google-account UX is why the Web-app client over a
  Chrome-extension client — PRD §7.5). The Testing→Production switch and
  the restricted-scope CASA assessment are the only Free-v1 OAuth gates.
  The online→**offline** switch (Premium Option-B, backend refresh tokens)
  is a **Premium v1** gate — `PREMIUM_LAUNCH_CHECKLIST.md`.
- Switching to **Production** requires Google verification of the app's homepage, Privacy Policy URL, Terms of Service URL, and authorized domains.
- The Privacy/ToS/authorized-domain fields were **deliberately left blank**
  in Testing mode: Google requires an *owned* authorized domain even for
  the Branding URL fields, so the raw-GitHub placeholder stubs cannot be
  used there. Hosting the real docs on a rename-proof, owned/brand-neutral
  URL is tracked under "Naming / rebrand readiness" below — settle it
  together with the Production switch.

### App branding for OAuth consent screen

- Verified app name, logo, support email, and authorized domains.

---

## Legal

> **Session-13 update.** Free v1 is feature-complete, so the legal docs were
> drafted and are **live**: `docs/legal/privacy.md` + `docs/legal/terms.md`,
> hosted on GitHub Pages at the custom apex domain
> `https://fashionablylate.app/legal/privacy` + `/legal/terms` (note: NO hyphen
> — distinct from the repo `fashionably-late`), and linked from onboarding +
> Settings. The detailed bullets below describe the *content requirements* the
> drafts already satisfy.
>
> **Update 2026-05-27 — date placeholders RESOLVED.** The `[DATE TBD — set on
> publication]` placeholders in both docs have been filled with **May 27,
> 2026** (Last-updated *and* Effective date in each file). A top-of-file HTML
> comment encodes the forward convention: future edits update only
> "Last updated:"; "Effective date:" stays at May 27, 2026 unless a future
> change is significant enough to warrant a new effective version. The
> **license review** below is also now RESOLVED — see Entry 53 (Apache 2.0).

- **Privacy Policy (Free v1 version).** Draft is intentionally deferred until Free v1 is feature-complete, and must accurately describe what Free v1 actually does: **local-first only — `chrome.storage.local`, no Fashionably Late server, no backend, no refresh token** (OAuth `access_type=online`, access tokens held transiently in the extension). There is **no backend data flow** to describe for Free v1, and **no Maps data flow** (Google Maps was removed from product scope — PRD §5.4.1 / §13.2). Per Entry 32 / PRD §6.1 amendment this is **correct legal framing for the data Free v1 touches, not a tiering of compliance** — Free v1 is fully GDPR-compliant on a naturally lighter posture. When drafted, host as `docs/privacy.md` on **GitHub Pages** from this same repository (rename-proof URL caveat under "Naming / rebrand readiness"). The OAuth consent screen, onboarding flow, and Settings panel hard-code the resulting stable URL.
- **Terms of Service (Free v1 version).** Same deferral and hosting plan: `docs/terms.md` on GitHub Pages.
- ~~**Premium v1 legal addendum.**~~ **Out of scope of this project (Entry 52, 2026-05-27).** A future Premium build (in a separate private fork — Pattern Y) will ship its own Chrome Web Store listing with its own privacy policy + ToS covering whatever backend processing it actually does. The Free v1 docs in this repo are not affected and do not need a Premium addendum here. (Original item struck-through, not deleted, so the historical scope is on the record.)
- ~~**License review.**~~ **RESOLVED 2026-05-27 (owner-decisions-log Entry 53): Apache License, Version 2.0** (see `LICENSE` + `NOTICE` at repo root), with a `COMMERCIAL.md` companion document signalling that commercial-licensing inquiries are welcome (posture only — Apache 2.0 already permits commercial use, so `COMMERCIAL.md` is signal, not legal restriction). The Terms of Service §4 and the README License section were updated to match. Apache 2.0 makes inbound contributions clean (contributors grant a license to the project on the same terms as the outbound license, per the Apache 2.0 §5 inbound-= outbound principle); a separate CLA is not required for v1. The earlier exploration of a "royalty-on-commercial-use" / source-available direction (Elastic v2, BUSL) was rejected: the owner chose contributor-friendliness and OSS norms over commercial protection — anyone may use, modify, and commercialize the Free v1 code freely. *Original item retained struck-through above per Entry-4 discipline.*
- Privacy Policy and Terms of Service are linked from the extension's onboarding flow and the Settings panel, per PRD §5.1.3 and §5.8.2.

---

## Brand & Design

- **Brand identity finalized.** Logo, color palette, typography direction. v1 development uses **placeholder icons** (a colored square with "OQ" text or similar minimal mark). PRD §8.1 ("native feel over branded feel") means Fashionably Late's in-Gmail surface intentionally does not lean on brand — brand mainly shows up in the Chrome Web Store listing, the OAuth consent screen, and the onboarding flow.
- **Extension icons (16, 48, 128 PNG).** Production-quality artwork, replacing the placeholders in `extension/public/icons/`.
- ~~**Scheduled-email badge artwork.**~~ **Removed (2026-05-17, Session 8):** the §5.7.2 Fashionably Late badge was removed from product scope (see the PRD §5.7 amendment / owner-decisions-log Entry 37) — post-install it differentiates against an empty set. No badge artwork is needed. (Struck through, not deleted, so the scope-change is on the record.)
- **OAuth consent screen logo.** 120×120 minimum, follows Google's OAuth branding requirements.
- **Chrome Web Store listing assets.** Promotional images (440×280 small tile, 920×680 marquee), screenshots (1280×800 or 640×400, up to 5), short description, detailed description, support email.
- **Trigger:** before Chrome Web Store submission. Fenil intends to commission or design these assets — does not need to happen during feature development.

---

## Chrome Web Store

The expanded list below replaces the prior four-bullet sketch as the
authoritative pre-submission checklist. Items are roughly ordered from
hard-blocking to polish.

### Developer account + submission mechanics

- **Chrome Web Store developer account.** $5 one-time registration fee.
  Tie it to a long-term-stable Google account the owner controls (not a
  workplace account that could be deactivated).
- **`extension/manifest.config.ts` completeness.** Confirm pre-submission:
  `name` (`Fashionably Late`), `version` (currently `1.0.0` — bump on each
  resubmission), `description` (≤132 chars), `icons` (16 / 48 / 128 — real
  brand artwork, not the dev placeholders), `permissions` declared and
  justified (`storage`, `scripting`), `host_permissions`
  (`https://mail.google.com/*`).
- **Single-purpose declaration.** "Schedule sending emails in Gmail with
  timezone-aware suggestions." Must match the actual extension behavior or
  Chrome's automated review will flag.
- **Support contact.** Public support email (`fenil.h.dedhia@gmail.com`),
  matching the privacy policy contact.
- **Realistic review timeline.** Plan **2–4 weeks** between submission and
  live listing. Gmail-touching extensions face stricter review than average
  (`mail.google.com` host permission triggers extra scrutiny). Re-submission
  after fixes is faster but still days, not hours.

### Listing assets

- **128 × 128 icon** that matches the manifest icon.
- **At least one screenshot** at **1280 × 800** (preferred) or 640 × 400 —
  the actual extension working inside Gmail, not a marketing illustration.
- *(Optional polish)* Small promo tile **440 × 280**; marquee tile
  **1400 × 560**. Not required for submission; raise the listing's appeal.

### Listing copy

- **Title** ≤ 75 chars.
- **Short description** ≤ 132 chars (the search-results blurb).
- **Detailed description** 200–600 words covering what it does, key
  features, and the privacy promise (no Google API calls, no telemetry,
  no backend — see `docs/legal/privacy.md`).
- **Category:** Productivity.
- **Language:** English.

### Permission justifications (Chrome reviewers scrutinize these)

- **`storage`:** "Saves user preferences (timezone, working hours, pinned
  timezones, recipient cache, feature toggles) locally on the user's
  device. No data is transmitted off the device."
- **`scripting`:** "Used only on install to inject the content script into
  Gmail tabs that are already open at install time. Chrome MV3's static
  `content_scripts` manifest declaration only fires on subsequent page
  loads; without this, a user who installs while Gmail is open would have
  to manually refresh."
- **`https://mail.google.com/*` host permission:** "Injects the Schedule
  Send enhancement UI into Gmail's compose window and reads recipient
  email addresses from the compose form so the extension can suggest
  scheduling times in their timezones. The extension does not read message
  content, does not access the Gmail API, and does not transmit any data."

### Pre-submission verification

- Install on a **fresh Chrome profile** with a **different Gmail account**
  (not the developer's) — confirms the dev environment isn't masking a
  first-run-only bug.
- **No console errors** on a clean run (open the service-worker DevTools
  + a Gmail tab; observe through onboarding → Schedule Send → Settings).
- Every requested permission is **actually used by code** (Chrome's
  automated review flags unused permissions).
- The single-purpose declaration **matches actual behavior** — anything
  the extension does that isn't covered by the declaration is a review
  risk.

---

## Infrastructure — out of scope of this project

> **Out of scope of this project (2026-05-27, owner-directed — Entry 52;
> supersedes the 2026-05-17 "moved to Premium v1" framing).** Free v1 has
> **no backend** and there is **no Premium v1 in this repo**. Any backend
> infrastructure (Fly.io EU app, Supabase EU project, per-user encryption,
> backup/DR, backend custom domain) is a concern of the future Premium fork
> (a separate private repo — Pattern Y, Entry 54), not of this checklist.
> No Free-v1 launch gate sits here.
>
> One related Free-v1 concern that does remain: the **owned domain
> required for the OAuth consent-screen Privacy/ToS URLs** was historically
> tracked under "Naming / rebrand readiness" below. With Entry 39 (Free v1
> uses no OAuth and shows no consent screen), even *that* requirement is
> moot for Free v1 — the live legal-doc URLs at `fashionablylate.app/legal/*`
> are now hosted purely for the Chrome Web Store listing and the in-extension
> Settings panel links, not for any Google consent screen.

---

## Settings panel (PRD §5.8) — BUILT (Session 12); two pre-launch wiring tasks remain

> **Session-12 update.** The Settings panel is **built** — all seven §5.8.2
> sections ship (`src/pages/settings/`): Profile/Timezone, Pinned Timezones
> (drag-and-drop + keyboard reorder), Working Hours (+ Default boundaries +
> reset), Feature Toggles (the two Free-v1 toggles, **wired to their
> consumers**), Recipient Timezone Cache (view / edit / delete / clear-all),
> Privacy & Data (structure-only), About. Reached via the three §5.8.1 access
> points (toolbar icon, onboarding completion link, modal gear). The two pieces
> of user data that previously only onboarding could set — Pinned Timezones and
> the manual recipient-tz cache — are now fully manageable. See
> `notes/session-12-summary.md`.
>
> **Session-13 update — all three DONE:**
> - **Export / Delete My Data — WIRED (§6.1.1).** Export downloads the full
>   local state (anti-omission; minus the 3 non-Free-v1 toggles — Entry 50) as
>   JSON, fully on-device. Delete is a typed-"delete" confirmation → irreversible
>   wipe of the owned `outboxiq*` keys → terminal "deleted" screen / re-onboard.
>   Copy is local-only (no backend/revoke language — §6.1.2). Owner hands-on
>   verified.
> - **Privacy Policy / Terms of Service links — LIVE.** Now real new-tab links to
>   `https://fashionablylate.app/legal/privacy` + `/legal/terms` (custom apex
>   domain, GitHub Pages from `docs/legal/`). Constants in `src/lib/constants.ts`.
>   Remaining: the docs still carry `[DATE TBD]` placeholders (see "Legal").
> - **Feedback / support channel — DECIDED.** About links to a `mailto:` support
>   email (the founder's address); a "Built by" row links to LinkedIn. Version
>   bumped to **1.0.0** (first public release).

---

## Compatibility & Verification

### Google Workspace compatibility — Schedule Send — VERIFIED (Session 15, 2026-05-28)

> **VERIFIED 2026-05-28 (Session 15, owner hands-on).** Fashionably Late's
> UI-automated Schedule Send works on Google Workspace accounts identically
> to consumer Gmail. The owner drove a real Workspace account (not the
> tenant admin) across six paths — §5.2 chevron relabel + modal injection,
> §5.3.5 Optimize-for-X end-to-end with a cache-miss → real scheduled send
> landing in the Scheduled folder, §5.5.1 outside-hours three-choice soft
> warning, SCHEDULED label + native cancel pathway, admin-policy
> availability (Schedule Send was present and functional on this tenant —
> the owner is not the tenant admin so admin-disabled-policy could not be
> exercised; honestly noted), and visual/DOM sanity (modal renders
> correctly, TimezonePicker styled correctly inside the Shadow DOM, DOM
> structure around the Send chevron is indistinguishable from consumer
> Gmail). All six verdicts: **identical**. DevTools console showed zero
> errors attributable to Fashionably Late — the captured output was
> entirely Gmail's own service worker, Gmail's `m=base` bundle, Google
> Workspace sub-product frames (Meet/Chat/Studio), or an unrelated
> third-party extension (the CSP-violating `contentScript.bundle.js`
> reported a different extension ID, `869c32d0-…`, not ours
> `dicnmcmhapcfceodecocnkaacjdpplnm`). No selector divergence, so the
> `gmail-recipe.ts` single-point-of-failure layer needs **no Workspace
> fork or shared-selector rewrite** — the consumer Gmail recipe is the
> Workspace recipe. No code changed in Session 15. Detail:
> `notes/session-15-summary.md`. Items below preserved per Entry 4
> discipline so the original verification framing remains on the record.

- **Why this matters:** a large share of Fashionably Late's target users (knowledge workers, salespeople, recruiters, consultants) are on Workspace, often inside admin-controlled tenants. A failure mode where the extension silently breaks on Workspace would hit a meaningful slice of the user base.
- **What to verify:** that Gmail's Schedule Send UI is present, functional, and DOM-driveable on Workspace accounts; that Workspace admins cannot disable scheduled sending in a way that breaks Fashionably Late without a clear error; that the `SCHEDULED` label and `messages.delete` cancellation pathway (per `research/scheduled-send-api-spike.md` Open Question 1) behave identically on Workspace.
- **How to verify:** hands-on test on a Workspace account in a controlled domain. Re-test after any major Gmail UI update.
- **Trigger:** ~~before Chrome Web Store submission, and after any major Gmail UI change.~~ **Initial verification DONE 2026-05-28**; the post-Gmail-UI-change re-verification trigger remains (re-run if Gmail materially changes the Schedule Send UI).
- **Honest gap (carry to Session 16/17 or post-launch):** the
  admin-disabled-Schedule-Send graceful-degradation path (§6.7) was not
  exercised — the owner isn't the tenant admin on the account used here,
  so admin policy could not be toggled. Logged in
  `notes/session-15-summary.md` rather than swept under "verified". If
  Session 16 (security) or 17 (comprehensive hands-on) has access to a
  tenant where Schedule Send is disabled by policy, drive it through there;
  otherwise accept the gap for Free-v1 launch (Free v1 falls back to
  Gmail's native Schedule Send path when our chain breaks, per the
  multi-compose safety-net pattern — same shape of graceful degradation).
- **Reference:** `research/scheduled-send-api-spike.md` Open Question 4;
  `notes/session-15-summary.md`.

### Multi-compose targeting — full fix (v2 deferral — NOT launch-blocking)

> **Reframed 2026-05-16 (owner-directed, Session 6): no longer
> launch-blocking.** Session 5 framed this as launch-blocking, which was a
> defensible call then. With more context it is a **v2 deferral**, argued
> in the "v1 vs. v2 decisions" section below (the canonical place for
> argued deferrals, per Entry 22). The Session 5 framing was correct given
> what was known then; this is a refined product decision with more
> context, **not** a correction of that judgment. The safety net below is
> the accepted v1 behaviour.

Fashionably Late's scheduling path cannot currently tell which compose window the user acted on when **two or more compose windows are open in the same Gmail tab**. The native driver in `extension/src/lib/schedule/schedule-actions.ts` resolves the Send chevron via a global `document.querySelector(SEL_CHEVRON)`, which deterministically targets the **leftmost** compose — i.e., it would silently schedule the *wrong email*. Confirmed by hands-on smoke test (Session 5, Scenario 4).

- **v1 status — accepted behaviour (graceful degradation), not just an interim.** The safety net (`extension/src/content/compose/compose-integration.ts`, `multipleComposeWindows()`; shared `composeCount()` in `gmail-recipe.ts`): when ≥2 compose chevrons are detected, Fashionably Late does **not** open its modal and hands off to Gmail's native Schedule Send on the real (compose-scoped) menuItem, so Gmail schedules the correct email. §5.5.1's regular-Send guard inherits the same net (≥2 composes → fall through to native Send). Multi-compose users do not get Fashionably Late's enhanced modal — they get **native Gmail, working correctly**. Given how uncommon multi-compose is in the target use, that is **acceptable public-launch behaviour for v1** (reasoning in the v1-vs-v2 entry below), not merely a dev/test stopgap.
- **What the full fix would need (a v2 session — scope it properly there):** thread a compose context from the intercepted `menuItem` through `compose-integration.ts → content-script.ts → mount.tsx → schedule-actions.ts`, and re-scope every global Gmail DOM query (chevron, dialog) to that compose. **Known hard part — the detached-popup anchor problem:** Gmail's Schedule menu is a popup it (re)creates near `<body>`, likely *not* inside the originating compose's DOM subtree, so `menuItem.closest(composeSelector)` will not reach it. A reliable "which compose owns this menu" anchor must be found first (a mini-probe, like the Session 4 pick-date-time probe). This touches `gmail-recipe.ts` (the single point of failure), so it must be re-verified via the probe in new / inline-reply / pop-out / multi-compose contexts.
- **Trigger:** v2 / post-launch — revisit with real usage signal, as an explicit additive decision. **Not** a Chrome-Web-Store-submission gate.
- **Reference:** the "v1 vs. v2 decisions" entry below; `notes/owner-decisions-log.md` Entry 27 (reframing) and Entry 18 (the original silent-vs-visible-bug decision); `notes/session-5-summary.md` (Scenario 4 result).

### Duplicate-instance regression (Session 17 hands-on test plan)

The Session-13 page-ownership fix (commits `d7c54f7` + `3c74e55`,
owner-decisions-log Entry 51) is reasoned + unit-tested at the **logic
level only** — the real orphan-state failure mode is single-world-impossible
to reproduce in jsdom (the two isolated worlds the bug needs cannot coexist
in one Node process). Per `notes/session-13-summary.md` §f, the blocking
symptom was owner-confirmed resolved after a clean reload, but the precise
"newest live copy takes over with no Gmail refresh; orphaned copy goes
inert" was **not exhaustively re-driven across all three symptoms** in the
orphan state. Session 17 (final comprehensive hands-on testing) must close
this gap.

Concrete test plan:

1. Open Gmail in a tab; observe Fashionably Late installs cleanly (the
   §5.2 chevron item is relabeled "Schedule Send (powered by Fashionably
   Late)"; the §5.5.1 send guard is armed).
2. Reload the extension from `chrome://extensions` ("Reload" button on the
   extension card). This is the trigger: it leaves the previous content
   script ORPHANED (listeners alive, but its `chrome.runtime.id` context
   severed) while a fresh instance loads into the same tab.
3. **In the same Gmail tab, with no manual refresh,** verify all three
   symptoms from the bug saga are resolved:
   - **Schedule Send → our modal.** Click the relabeled Schedule Send
     item; Fashionably Late's enhanced modal opens (not Gmail's native
     modal — the orphan-wins-fallback bug).
   - **"Send now anyway" works.** Trigger the §5.5.1 outside-hours
     warning (set working hours to a future-only window or send late at
     night), choose "Send now anyway", confirm the email actually sends
     (not the orphan-replay-cancel bug).
   - **No duplicate modals.** The §5.2 modal opens exactly once; the
     §5.5.1 warning fires exactly once. No relabel/chevron churn (no
     flicker).
4. Repeat across **at least 3 reload cycles** to confirm the
   newest-live-owns-the-page model holds when ownership tokens change
   hands multiple times.

If any symptom recurs: read `extension/src/content/page-install-latch.ts`
+ Entry 51 + the gotcha in `CLAUDE.md` ("Duplicate content-script
instances → use PAGE OWNERSHIP"). The fix's invariant is *last-writer
wins, orphan goes inert* — verify the `<html>` ownership-token attribute
and the `contextAlive()` (`chrome.runtime?.id`) check are both being
consulted at the top of the §5.2 interceptor, the relabel observer, and
the §5.5.1 send guard.

- **Trigger:** Session 17 (final comprehensive hands-on testing pass).
- **Reference:** `notes/owner-decisions-log.md` Entry 51;
  `notes/session-13-summary.md` §f.

---

## v1 vs. v2 decisions

Product directions deliberately scoped **out of v1**, recorded so they are not
re-litigated mid-build and are revisited intentionally post-launch.

> **"v2" ≠ "Premium v1" (2026-05-17 — tier split, Entry 32).** The
> deferrals in this section are **post-launch *additive* directions — a
> later generation** (network effects, the multi-compose full fix). That
> is a **different concept** from **Premium v1**, which was a **paid tier
> of the *same* generation** (extension + backend). With Premium v1 now
> out of scope of this project (Entry 52, 2026-05-27), "Premium" is also
> out of *this* repo's pre-launch concerns entirely; the items below remain
> v2 / post-launch additive directions, neither Free-v1-blocking nor
> Premium-fork concerns.

### Network-effect features — deferred to v2 (decided Session 5.5)

Working-hours sharing between Fashionably Late users, reply-time prediction, and
cross-user send-time coordination are **not v1**. Gating single-user
optimization on mutual adoption would compromise the single-user experience
for a sharing incentive — poor B2B SaaS design (the product must be fully
valuable to the very first user, with zero other users present). v1's
single-user experience stays fully featured and self-contained. Revisit only
post-launch, with real usage signal, as an explicit additive decision — never
as a precondition that degrades the solo experience.

### Multi-compose enhanced modal — deferred to v2 (decided Session 6)

The "full fix" for multi-compose targeting (the detached-popup anchor
problem; see the section above for the engineering shape) is **deferred to
v2, not launch-blocking**. Reasoning, argued so a future session does not
feel compelled to relitigate it (Entry 22 discipline):

- The Session 5 safety net already converts the only dangerous failure (a
  *silent wrong-email* send) into graceful degradation: with ≥2 composes
  open, Fashionably Late steps aside and Gmail's **native** Schedule Send / Send
  handles the correct email. Users still act on the right email; they just
  don't get Fashionably Late's enhanced modal in that case.
- Multi-compose is **uncommon** in Fashionably Late's target use — the vast
  majority of compose interactions are single-compose, where Fashionably Late
  works fully. The full fix is a substantial engineering investment
  (re-scoping every global Gmail DOM query, plus a fresh mini-probe of the
  single-point-of-failure `gmail-recipe.ts`) for a small UX improvement on
  an uncommon pattern. Not justified for v1.
- This is **not** a reversal of the Session 5 launch-blocking call — that
  was correct given what was known then. It is a refined product decision
  made in calm review with more context (the §5.5.1 work clarified how
  broadly the safety-net pattern applies, and the cost/benefit is now
  clearer). Revisit only post-launch, with real usage signal, as an
  explicit additive decision. (`notes/owner-decisions-log.md` Entry 27.)

---

## Pre-launch probes (run after Free v1 feature work, before naming/positioning is finalized)

> **Added 2026-05-17 (owner-directed — tier split close-out, Entry 32,
> sub-decision).** Two **informational** Gmail-API probes. They are
> **NOT a commitment to build an inbox-organization feature** — they
> validate whether such a feature *would be technically feasible without
> backend infrastructure or restricted-scope OAuth*. The reasoning chain:
> probe results inform whether inbox-organization is a technically clean
> addition → which informs what the eventual **positioning and product
> naming** should accommodate. Same shape and discipline as the
> scheduled-send-API spike (Entry 2): the API is documented, but this
> project's standing rule is to **verify against live Gmail behaviour
> before designing on top of it**. The product-direction decision is made
> **after** the probes complete — not before, and not by these probes.

**Sequencing (do not reorder):** Free v1's agreed feature work
completes → **these probes run** → naming / positioning is finalized →
Free v1 pre-launch hardening (CASA, consent-screen Production, legal
docs, brand, Web Store). The probes sit deliberately *after* feature
work (they don't block it) and *before* naming (they inform it).

1. **Gmail API filter-creation probe.** Verify that
   `users.settings.filters.create` produces filters that behave
   **identically** to filters a user creates by hand in Gmail's Settings
   UI (matching, actions, ordering, interaction with categories/labels).
   The API is well-documented, but design must rest on verified live
   behaviour, not docs alone. ~Half-day probe session; same structure as
   `research/scheduled-send-api-spike.md` (write a committed, re-runnable
   probe — Entry 9 discipline).

2. **Gmail inbox-settings API-limits probe.** Verify what can and cannot
   be **programmatically** configured in Gmail's "Inbox" settings tab
   (inbox type, category tabs, reading pane, etc.). The Gmail API covers
   filters and labels comprehensively but does **not** appear to expose
   inbox-type / category-tab settings — confirm this against the live
   API. The result determines what an inbox-organization feature could
   *promise* users vs. what must remain **manual-with-instructions**.
   ~Half-day probe session.

- **Trigger:** after Free v1's agreed feature work is complete, before
  naming/positioning is finalized.
- **Reference:** `notes/owner-decisions-log.md` Entry 32 (the
  probe-additions sub-decision and its sequencing rationale).

---

## Naming / rebrand readiness

> **Entry-41 update (2026-05-19, owner-directed) — the rename CONTEMPLATED
> in Session 7 HAPPENED.** The product was renamed from **"OutboxIQ"**
> (Sessions 1–9) to **"Fashionably Late"** before public launch. The
> Entry-30 brand-independent-identifier framework — set up in Session 7
> specifically to make this rename clean — did exactly what it was for:
> the rename touched display copy, brand assets, and locked-copy PRD
> spec text (verbatim onboarding copy + `SCHEDULE_SEND_LABEL`); it
> touched **none** of the load-bearing identities below. They remain
> the OutboxIQ-era values **and stay frozen** — see Entry 41 and
> `CLAUDE.md` top-of-file brand-and-naming-history note.
>
> **GCP project + OAuth client name rename — out of scope of this
> project (2026-05-27, Entry 52).** The GCP project (`outboxiq-dev`),
> OAuth client display name, and consent-screen app name still say
> "OutboxIQ". Free v1 makes no OAuth call and shows no consent screen
> (Entry 39), so the GCP-side name is internal-only and does not gate
> Free v1's launch in this repo. With Premium v1 now out of scope of this
> project, the GCP-side rename is **whatever the future Premium fork
> decides to do** (rename the existing project, stand up a new one, etc.)
> — not tracked here anymore. The `outboxiq-dev` project ID itself
> remains a frozen brand-independent identifier per Entry 30 either way.
>
> **GitHub repo name rename — DONE (Session 12, owner-directed).** The
> repo was renamed `OutboxIQ` → **`fashionably-late`**
> (`github.com/fenil-dedhia/fashionably-late`). GitHub auto-redirects the
> old URL, so existing links/clones keep working. The local git remote was
> re-pointed.
>
> **Privacy/ToS hosting URL — RESOLVED (Session 13).** The
> `PRIVACY_POLICY_URL` / `TERMS_OF_SERVICE_URL` constants now point at the
> custom apex domain `https://fashionablylate.app/legal/privacy` +
> `/legal/terms` (note: no hyphen — distinct from the repo name
> `fashionably-late`), served by GitHub Pages from `docs/legal/`. This
> settles the "rename-proof host" launch-blocker the next paragraph
> originally raised; with Entry 39 (no OAuth consent screen) and the
> custom apex domain in place, the historic concern is moot for Free v1.
> The remaining paragraph below is preserved for the brand-independent-
> identifier framework it documents (still binding).

The product brand name ("Fashionably Late") may change before launch. The
rename-impact analysis (Session 7, owner-prompted) established that the
**load-bearing technical identities are deliberately brand-independent and
must stay frozen across any rebrand** — renaming them would buy nothing and
break identity/data/tokens:

- **Extension ID** (`dicnmcmhapcfceodecocnkaacjdpplnm`) — derived from the
  manifest `key`, not the product `name`. Never regenerate on a rebrand.
- **OAuth Client ID** + **redirect URI** — opaque / extension-ID-derived;
  the consent-screen *App name* is editable display text (changing it does
  not invalidate tokens or force re-consent).
- **GCP project ID** (`outboxiq-dev`), and any future **Fly.io / Supabase**
  resource names — internal infra, never user-visible; do not rename on a
  rebrand (name new infra neutrally).
- **Storage keys** (`outboxiqState`, `outboxiqOnboardingDraft` in
  `extension/src/lib/constants.ts`) — opaque internal keys; renaming them
  would orphan existing users' local data. Treat as permanently frozen,
  brand-independent identifiers regardless of the product name.

A rebrand is therefore: **display copy + brand assets + a deliberate PRD /
locked-copy amendment** (the verbatim `"…powered by Fashionably Late"` label and
the verbatim onboarding privacy copy are product-locked spec text — changed
via PRD amendment, not a find/replace), and nothing more.

~~**Launch-blocking item surfaced here:** the Privacy/ToS/Pages URLs are
currently repo-named (`github.com/fenil-dedhia/fashionably-late/…`), hard-coded
in `constants.ts` **and** (for Premium v1) entered into the GCP OAuth consent
screen. When the
real legal docs are drafted (deferred, see "Legal" above), host them on a
**rename-proof, brand-neutral or guaranteed-stable URL** so a later repo /
product rename does not break the consent screen or the in-extension link.
Pick this URL at the same time as the legal-doc hosting decision.~~

**RESOLVED Session 13 + Entry 52 (2026-05-27):** the legal docs are live at
the custom apex domain `https://fashionablylate.app/legal/{privacy,terms}`,
which is rename-proof (the *apex domain* survives any repo or product
rename), with the constants in `extension/src/lib/constants.ts` pointing
there. The "GCP OAuth consent screen" half of the original concern is also
moot — Free v1 has no consent screen (Entry 39), and any future Premium
fork that brings OAuth back will set its own URLs.

**Lead-time + trademark dimension (surfaced 2026-05-17, owner question at
Session-7 close — preserved as historical context).** With the apex domain
already acquired and the live URLs in place, the lead-time argument below
is **already executed** for Free v1. Preserved for the trademark / branded-
vs-neutral discussion, which a future Premium fork (or post-launch
marketing) might revisit:

- **Domain acquisition is a lead-time item.** Google's consent screen
  requires an *owned, verified* authorized domain (this is exactly why the
  Session-7 raw-GitHub stubs could not be used even as Testing
  placeholders). Registering a domain, verifying ownership in Google
  Search Console, and wiring it into the consent screen + `constants.ts`
  takes calendar time — schedule it ahead of the Testing→Production gate,
  not at it.
- **The branded-vs-neutral choice interacts with the open rename
  question.** "Rename-proof" does **not** force committing to "Fashionably Late"
  publicly — that is the point of choosing a **brand-neutral / stable**
  host (e.g. a name-independent domain, or GitHub Pages on a permanently
  named repo): it survives a rebrand precisely *because* it is not the
  brand. Choosing a **branded** domain (e.g. `outboxiq.com`) is the
  opposite — it *does* commit to the brand and additionally warrants a
  **trademark / name-availability check** before purchase (and before any
  public marketing leans on the name). Decide *brand-neutral vs branded*
  consciously; only the branded path carries the trademark dependency.
- This sits upstream of the legal-doc *drafting* deferral: the **hosting
  URL / domain decision** can (and given lead time, should) be settled
  before the docs themselves are written.

A future *optional* code task (deliberately **not** done in Session 7 to
keep it focused, owner-directed): centralise the brand display name into a
single `PRODUCT_NAME` constant so incidental UI copy routes through it.
Low-value-now / low-cost-later; tracked so it is not forgotten.

- **Reference:** `notes/owner-decisions-log.md` (Session 7 entry);
  `CLAUDE.md` "Locked tech decisions" (brand-independent identifiers).

---

## Accessibility

PRD §6.3 mandates WCAG AA: keyboard-navigable controls, labelled fields, AA contrast, ARIA roles/labels/live regions, and visible focus indicators. **The Session-14 dedicated accessibility pass landed (commits `5295e00` / `60c6343` / `15fab3b`, 2026-05-28); the remaining items are owner-parallel screen-reader verification and a brand-touching contrast call.**

- ~~**Step-change focus & announcements.** Advancing between onboarding steps does not move keyboard focus to the new step and there is no `aria-live` region announcing the change, so a keyboard/screen-reader user is left on a removed control.~~ **RESOLVED in Session 14 Phase 1 (commit `5295e00`)** — each step heading is now programmatically focusable (`tabIndex={-1}`) and receives focus on mount; a page-level `role="status" aria-live="polite"` region announces `Step N of 3: <title>` on advance/Back (silent on initial mount). Owner-verified by Test 3 keyboard pass that the keyboard focus moves through the page correctly (it exits to the browser chrome at the end of the form, which is correct page behavior — onboarding is a page, not a modal). (PRD §6.3 live regions, §8.9 keyboard accessibility.)
- ~~**Consent control markup.** The consent `<label>` wrapped the Privacy Policy `<a>`; nesting an interactive element inside a label is invalid and let a link click also toggle consent.~~ **RESOLVED in Session 3 (commit `a5fa897`)** — the link was pulled out of the label into a separate element; consent now registers only via the checkbox's own `onChange` (see `Welcome.tsx`, with an explicit guard comment). Kept here struck-through rather than deleted so the consent-gate concern and its resolution remain on the record. (Stale "currently wraps" wording corrected at Session 5 close-out — it had been flagged stale but never fixed earlier in Session 5.)
- **Contrast / focus indicators.** **Partially resolved in Session 14 Phase 2 (commit `60c6343`).** AA contrast spot-checks were computed by hand against the AA threshold formulas and all current text/background combinations pass: muted `#5f6368` on white (5.74:1), on `#f1f3f4` hover/focus background (~5.2:1), on `#e8f0fe` active-nav background (~5.4:1); accent `#1a73e8` on white (~4.55:1, scrapes AA); danger `#c5221f` on white (5.94:1). Disabled controls (`opacity: 0.5`) are WCAG 1.4.3 exempt. **Remaining (open, owner call):** the `.fl-set-btn` / `.fl-set-nav-item` `:focus-visible` style is a background swap (`#f1f3f4`), which is technically visible (passes 2.4.7) but subtle — flagged as a brand-touching change not shipped silently. The TimezonePicker, the in-Gmail modal buttons, and native inputs all have clearer focus indicators (blue ring / browser-default outline).
- ~~**Modal focus traps.** The Delete-confirmation modal (Settings → Privacy & data, Session 13) and the §5.3 Schedule Send modal need a proper focus trap + restore-focus-on-close. The delete modal currently has focus-on-open + Escape only (no trap) — a known Session-13 gap to close in the Session-14 accessibility pass.~~ **RESOLVED in Session 14 Phases 1 + 3 (commits `5295e00` / `15fab3b`).** Delete-confirmation modal: Tab/Shift-Tab cycle within the dialog; focus moves to the typed-delete input on open; focus restores to the triggering button on close (cancel/Escape/confirm). Schedule Send modal: React-level `onKeyDown` Tab trap on the dialog card (boundary-only re-route, so Gmail's compose focus is untouched); `openScheduleModal` captures and restores `document.activeElement` (incl. through open shadow roots) on close. Owner-verified by Test 2 (delete modal: Tab stayed inside, Escape restored focus to the Delete button) and Test 3 (Schedule modal: Tab stayed inside, Escape closed cleanly — a stray Space/Enter press during Tab testing activated the Schedule button and surfaced the §5.5 working-hours warning, which is the safety net working as designed).
- **Keyboard-only + screen-reader walkthrough.** **Keyboard pass: DONE** (owner Session-14 hands-on — Tests 1/2/3 above). **Screen-reader pass: deferred** (owner is not familiar with VoiceOver / NVDA; the programmatic verification covers the role/aria-attribute structure but cannot verify what a real screen reader actually announces). Acceptable as a Free-v1-launch gap given Free v1 is local-only with no critical-safety surface; revisit if a user reports an SR issue post-launch, or before any tier with a higher-stakes surface ships.

- **Trigger:** before Chrome Web Store submission; re-run after any significant UI change.
- **Reference:** PRD §6.3, §8.9.

---

*Items get added to this file as development surfaces new launch requirements. If you're reading this years from now and something feels missing — it probably is.*
