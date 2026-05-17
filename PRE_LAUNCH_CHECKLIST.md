# OutboxIQ — Pre-Launch Checklist

Items that must be completed **before** OutboxIQ can be made publicly available (e.g., listed on the Chrome Web Store, or made available to users beyond an explicitly-allowlisted test group). This file is intentionally a living document — items get added as decisions are made during development.

> **Status:** v1 is in early development. None of the items below are blocking day-to-day feature work, but several have multi-week lead times, so they must be tracked.

---

## Google / OAuth

### CASA security assessment (Tier 2) — required, deferred

Google classifies the Gmail scopes OutboxIQ uses (`gmail.compose`, `gmail.modify`) as **restricted scopes**. Any app requesting restricted scopes from users outside the test-user list must pass a **CASA Tier 2** security assessment, which is conducted by a Google-approved third-party auditor (e.g., Bishop Fox, NCC Group, Leviathan).

- **Why Tier 2 specifically:** OutboxIQ both (a) uses restricted scopes and (b) operates a backend (the Unschedule-on-Reply relay) that handles user data and OAuth refresh tokens. That combination places it in Tier 2, not Tier 1.
- **Typical cost:** several thousand USD.
- **Typical turnaround:** 4–8 weeks.
- **Trigger to begin:** when v1 is feature-complete and we are ready to invite real users beyond the OAuth test-user allowlist.
- **Until then:** we operate in **OAuth Testing mode** with a small set of explicitly-added test users. This is fully functional for development; it just can't be used by the general public.
- **Reference:** https://support.google.com/cloud/answer/13465431

### OAuth consent screen — Production status

- Currently in **Testing mode**.
- Switching to **Production** requires Google verification of the app's homepage, Privacy Policy URL, Terms of Service URL, and authorized domains.

### App branding for OAuth consent screen

- Verified app name, logo, support email, and authorized domains.

---

## Legal

- **Privacy Policy.** Draft is intentionally deferred until v1 is feature-complete — the exact data flows (Maps proxy specifics, refresh-token encryption scheme, backend storage shape) may still shift, and the policy must accurately describe what the software actually does. When drafted, host as `docs/privacy.md` on **GitHub Pages** from this same repository. The OAuth consent screen, the extension's onboarding flow, and the Settings panel will hard-code the resulting stable URL.
- **Terms of Service.** Same deferral and same hosting plan: `docs/terms.md` on GitHub Pages.
- **License review.** During development the repo is **all-rights-reserved / proprietary** (see `LICENSE` at repo root) — public for portfolio/evaluation visibility, but no reuse rights granted (changed from MIT on 2026-05-15). The long-term intent is a **royalty-on-commercial-use** model — free for personal/non-commercial use, paid for commercial use. Before public launch, pick the actual mechanism: custom license, dual-licensing, source-available license (Elastic v2, BUSL), or a paid hosted SaaS layer. If the project ever accepts outside contributions, settle inbound contribution terms (CLA or explicit license grant) *before* accepting them — all-rights-reserved gives contributors no default basis to contribute, so this can't be left implicit.
- Privacy Policy and Terms of Service are linked from the extension's onboarding flow and the Settings panel, per PRD §5.1.3 and §5.8.2.

---

## Brand & Design

- **Brand identity finalized.** Logo, color palette, typography direction. v1 development uses **placeholder icons** (a colored square with "OQ" text or similar minimal mark). PRD §8.1 ("native feel over branded feel") means OutboxIQ's in-Gmail surface intentionally does not lean on brand — brand mainly shows up in the Chrome Web Store listing, the OAuth consent screen, and the onboarding flow.
- **Extension icons (16, 48, 128 PNG).** Production-quality artwork, replacing the placeholders in `extension/public/icons/`.
- **Scheduled-email badge artwork.** The small indicator on OutboxIQ-scheduled emails in Gmail's Scheduled label (PRD §5.7.2). Final, polished version.
- **OAuth consent screen logo.** 120×120 minimum, follows Google's OAuth branding requirements.
- **Chrome Web Store listing assets.** Promotional images (440×280 small tile, 920×680 marquee), screenshots (1280×800 or 640×400, up to 5), short description, detailed description, support email.
- **Trigger:** before Chrome Web Store submission. Fenil intends to commission or design these assets — does not need to happen during feature development.

---

## Chrome Web Store

- Chrome Web Store developer account created and verified.
- Store listing prepared: description, screenshots, promotional images, support links.
- Submission and review. Extensions requesting sensitive permissions typically take 1–3 weeks to review.
- Justify the `https://mail.google.com/*` host permission for review (it drives the install-time "read and change your data on mail.google.com" warning users see). Keep permissions minimal — currently `storage` + that one host permission only; no `tabs`, no `identity`/OAuth yet.

---

## Infrastructure

- Production Fly.io app deployed in confirmed EU region (Frankfurt or Amsterdam).
- Production Supabase project in EU region.
- Per-user encryption-key strategy for OAuth refresh tokens reviewed and documented.
- Backup and disaster-recovery plan for the backend database documented.
- Custom domain configured for the backend and listed in Google OAuth authorized domains.

---

## Compatibility & Verification

### Google Workspace compatibility — Schedule Send

Verify that OutboxIQ's UI-automated Schedule Send works on Google Workspace accounts, not only on consumer Gmail.

- **Why this matters:** a large share of OutboxIQ's target users (knowledge workers, salespeople, recruiters, consultants) are on Workspace, often inside admin-controlled tenants. A failure mode where the extension silently breaks on Workspace would hit a meaningful slice of the user base.
- **What to verify:** that Gmail's Schedule Send UI is present, functional, and DOM-driveable on Workspace accounts; that Workspace admins cannot disable scheduled sending in a way that breaks OutboxIQ without a clear error; that the `SCHEDULED` label and `messages.delete` cancellation pathway (per `research/scheduled-send-api-spike.md` Open Question 1) behave identically on Workspace.
- **How to verify:** hands-on test on a Workspace account in a controlled domain. Re-test after any major Gmail UI update.
- **Trigger:** before Chrome Web Store submission, and after any major Gmail UI change.
- **Reference:** `research/scheduled-send-api-spike.md` Open Question 4.

### Multi-compose targeting — full fix (launch-blocking)

OutboxIQ's scheduling path cannot currently tell which compose window the user acted on when **two or more compose windows are open in the same Gmail tab**. The native driver in `extension/src/lib/schedule/schedule-actions.ts` resolves the Send chevron via a global `document.querySelector(SEL_CHEVRON)`, which deterministically targets the **leftmost** compose — i.e., it would silently schedule the *wrong email*. Confirmed by hands-on smoke test (Session 5, Scenario 4).

- **v1 status — interim safety net only (not the end state).** As of Session 5 there is a safety net (`extension/src/content/compose/compose-integration.ts`, `multipleComposeWindows()`): when ≥2 compose chevrons are detected, OutboxIQ does **not** open its modal and instead hands off to Gmail's native Schedule Send on the real (compose-scoped) menuItem, so Gmail schedules the correct email. This converts a silent wrong-email bug into graceful degradation, but it means **multi-compose users do not get OutboxIQ's enhanced modal at all**. That is acceptable for development/test users; it is **not** acceptable as the public-launch behaviour.
- **What the full fix needs (its own focused session — scope it properly there):** thread a compose context from the intercepted `menuItem` through `compose-integration.ts → content-script.ts → mount.tsx → schedule-actions.ts`, and re-scope every global Gmail DOM query (chevron, dialog) to that compose. **Known hard part — the detached-popup anchor problem:** Gmail's Schedule menu is a popup it (re)creates near `<body>`, likely *not* inside the originating compose's DOM subtree, so `menuItem.closest(composeSelector)` will not reach it. A reliable "which compose owns this menu" anchor must be found first (a mini-probe, like the Session 4 pick-date-time probe). This touches `gmail-recipe.ts` (the single point of failure), so it must be re-verified via the probe in new / inline-reply / pop-out / multi-compose contexts.
- **Trigger:** before inviting users beyond the test allowlist / Chrome Web Store submission.
- **Reference:** `notes/session-5-summary.md` (Scenario 4 result), `notes/owner-decisions-log.md` (the silent-vs-visible-bug decision).

---

## v1 vs. v2 decisions

Product directions deliberately scoped **out of v1**, recorded so they are not
re-litigated mid-build and are revisited intentionally post-launch.

### Network-effect features — deferred to v2 (decided Session 5.5)

Working-hours sharing between OutboxIQ users, reply-time prediction, and
cross-user send-time coordination are **not v1**. Gating single-user
optimization on mutual adoption would compromise the single-user experience
for a sharing incentive — poor B2B SaaS design (the product must be fully
valuable to the very first user, with zero other users present). v1's
single-user experience stays fully featured and self-contained. Revisit only
post-launch, with real usage signal, as an explicit additive decision — never
as a precondition that degrades the solo experience.

---

## Accessibility

PRD §6.3 mandates WCAG AA: keyboard-navigable controls, labelled fields, AA contrast, ARIA roles/labels/live regions, and visible focus indicators. No dedicated accessibility pass has been run. The onboarding flow (the first shipped UI, PRD §5.1) has **known gaps** to fix before public launch:

- **Step-change focus & announcements.** Advancing between onboarding steps does not move keyboard focus to the new step and there is no `aria-live` region announcing the change, so a keyboard/screen-reader user is left on a removed control. (PRD §6.3 live regions, §8.9 keyboard accessibility.)
- ~~**Consent control markup.** The consent `<label>` wrapped the Privacy Policy `<a>`; nesting an interactive element inside a label is invalid and let a link click also toggle consent.~~ **RESOLVED in Session 3 (commit `a5fa897`)** — the link was pulled out of the label into a separate element; consent now registers only via the checkbox's own `onChange` (see `Welcome.tsx`, with an explicit guard comment). Kept here struck-through rather than deleted so the consent-gate concern and its resolution remain on the record. (Stale "currently wraps" wording corrected at Session 5 close-out — it had been flagged stale but never fixed earlier in Session 5.)
- **Contrast / focus indicators.** Spot-check muted text (`#5f6368` on white) and the disabled-button treatment against AA; confirm a visible focus ring on every custom control.
- **Keyboard-only + screen-reader walkthrough** of the full onboarding flow (and every subsequent UI) before submission.

- **Trigger:** before Chrome Web Store submission; re-run after any significant UI change.
- **Reference:** PRD §6.3, §8.9.

---

*Items get added to this file as development surfaces new launch requirements. If you're reading this years from now and something feels missing — it probably is.*
