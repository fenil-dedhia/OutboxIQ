# Fashionably Late — Pre-Launch Checklist (Free v1)

Items that must be completed **before Fashionably Late Free v1 can be made publicly available** (e.g., listed on the Chrome Web Store, or made available to users beyond an explicitly-allowlisted test group). This file is intentionally a living document — items get added as decisions are made during development.

> **Status:** Free v1 is in active development. None of the items below are blocking day-to-day feature work, but several have multi-week lead times, so they must be tracked.

> **Tier split (2026-05-17, owner-directed — `notes/owner-decisions-log.md` Entry 32).** Fashionably Late ships as two tiers of the same generation: **Free v1** (extension-only, no backend, the public-launch target — *this checklist*) and **Premium v1** (extension + backend, paid, built later — **`PREMIUM_LAUNCH_CHECKLIST.md`**). **This file now tracks Free v1 launch gates only.** Backend-dependent gates (CASA **Tier 2**, all Infrastructure, the online→offline OAuth switch, backend-processing legal language, Free→Premium migration, billing) moved to the Premium checklist. Two important non-obvious carry-overs that stay **here** because they still gate Free v1:
> - **A CASA assessment is still Free-v1-blocking.** Only *Tier 2* moved. Free v1 keeps the **restricted** Gmail scopes (`gmail.compose`, `gmail.modify`), so it still needs *a* CASA assessment before public OAuth Production — plausibly **Tier 1** without a backend, tier-to-confirm. "No backend" ≠ "no assessment". (See "Google / OAuth" below.)
> - **Premium v1 is a paid tier, not "v2".** The existing "v1 vs. v2 decisions" section is about *post-launch additive* directions (a later generation) — a distinct concept from the Premium tier. Don't conflate them.

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

- **Privacy Policy (Free v1 version).** Draft is intentionally deferred until Free v1 is feature-complete, and must accurately describe what Free v1 actually does: **local-first only — `chrome.storage.local`, no Fashionably Late server, no backend, no refresh token** (OAuth `access_type=online`, access tokens held transiently in the extension). There is **no backend data flow** to describe for Free v1, and **no Maps data flow** (Google Maps was removed from product scope — PRD §5.4.1 / §13.2). Per Entry 32 / PRD §6.1 amendment this is **correct legal framing for the data Free v1 touches, not a tiering of compliance** — Free v1 is fully GDPR-compliant on a naturally lighter posture. When drafted, host as `docs/privacy.md` on **GitHub Pages** from this same repository (rename-proof URL caveat under "Naming / rebrand readiness"). The OAuth consent screen, onboarding flow, and Settings panel hard-code the resulting stable URL.
- **Terms of Service (Free v1 version).** Same deferral and hosting plan: `docs/terms.md` on GitHub Pages.
- **Premium v1 legal addendum.** The heavier Privacy Policy / ToS language covering **backend processing** (per-user-encrypted refresh tokens, active scheduled-message records, EU data residency, the Unschedule-on-Reply data flow) is a **Premium v1** gate — tracked in `PREMIUM_LAUNCH_CHECKLIST.md`. It is an addition layered on the Free v1 docs, not a rewrite.
- **License review.** During development the repo is **all-rights-reserved / proprietary** (see `LICENSE` at repo root) — public for portfolio/evaluation visibility, but no reuse rights granted (changed from MIT on 2026-05-15). The long-term intent is a **royalty-on-commercial-use** model — free for personal/non-commercial use, paid for commercial use. Before public launch, pick the actual mechanism: custom license, dual-licensing, source-available license (Elastic v2, BUSL), or a paid hosted SaaS layer. If the project ever accepts outside contributions, settle inbound contribution terms (CLA or explicit license grant) *before* accepting them — all-rights-reserved gives contributors no default basis to contribute, so this can't be left implicit.
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

- Chrome Web Store developer account created and verified.
- Store listing prepared: description, screenshots, promotional images, support links.
- Submission and review. Extensions requesting sensitive permissions typically take 1–3 weeks to review.
- Justify the `https://mail.google.com/*` host permission for review (it drives the install-time "read and change your data on mail.google.com" warning users see). Keep permissions minimal — currently `storage` + that one host permission only; no `tabs`, no `identity`/OAuth yet.

---

## Infrastructure — moved to Premium v1

> **Moved (2026-05-17, owner-directed — tier split, Entry 32).** All
> backend infrastructure (Fly.io EU app, Supabase EU project, per-user
> encryption-key strategy, backup/DR, backend custom domain) is **Premium
> v1 scope** and is tracked in **`PREMIUM_LAUNCH_CHECKLIST.md`**. **Free
> v1 has no backend**, so none of it gates Free v1's launch. This
> **supersedes the 2026-05-17/Entry-31 "Status shift" note** that made a
> working backend a "Session-8 prerequisite for OAuth": that was correct
> under the pre-tier-split assumption (Option B / refresh tokens on the
> backend in the only tier). Under the tier split, **Free v1's Session 8
> is extension-side `access_type=online` OAuth with no backend**, so the
> prerequisite framing now belongs to the Premium v1 build, not Free v1.
> Entry 31 is **not rewritten** — it remains accurate for Premium v1; the
> per-user-key item is still **central to CASA Tier 2** (the Premium
> audited surface — PRD §13.2.4).
>
> One distinction worth keeping straight: the **backend custom domain**
> (Premium) is *separate* from the **owned domain Free v1 needs for the
> consent-screen Privacy/ToS URLs** — the latter is a Free v1 concern
> tracked under "Naming / rebrand readiness" below (no backend required
> for it).

---

## Settings panel (PRD §5.8) — Free v1 feature build, still a stub

The Settings panel is still a placeholder (`src/pages/settings/App.tsx`). It
must be built before launch because it is the **only** surface for two pieces
of user data that onboarding can set but not later edit:

- **Recipient Timezone Cache (§5.8.2).** View / edit / delete cached manual
  recipient timezones and a "Clear all" bulk action. The list/clear APIs
  already exist (`recipient-cache.ts`: `listCachedRecipients`,
  `clearRecipientCache`); the panel is the missing UI. Manual entries are
  cached **indefinitely** (PRD §5.3.5 (j)), so without this surface the user
  can never correct a wrong pin.
- **Pinned Timezones (§5.1.3 Step 2 — Session 11).** View / reorder / add /
  remove the user's pinned zones (`state.pinnedTimezones`). Onboarding is
  currently the only place to set them; an onboarded user (or an upgraded
  user, who starts with **no** pins by migration design) needs Settings to
  manage them. Reuse the onboarding Step-2 chips + add-picker pattern; the
  shared `TimezonePicker` already renders the "Pinned" section from this field,
  and the `MAX_PINNED_TIMEZONES` cap is a UI concern to re-apply here.

Both also need the §5.8.2 Profile/Working-Hours/Feature-Toggles/Privacy
sections. Tracked as a single Free-v1 build (Session 12 candidate).

---

## Compatibility & Verification

### Google Workspace compatibility — Schedule Send

Verify that Fashionably Late's UI-automated Schedule Send works on Google Workspace accounts, not only on consumer Gmail.

- **Why this matters:** a large share of Fashionably Late's target users (knowledge workers, salespeople, recruiters, consultants) are on Workspace, often inside admin-controlled tenants. A failure mode where the extension silently breaks on Workspace would hit a meaningful slice of the user base.
- **What to verify:** that Gmail's Schedule Send UI is present, functional, and DOM-driveable on Workspace accounts; that Workspace admins cannot disable scheduled sending in a way that breaks Fashionably Late without a clear error; that the `SCHEDULED` label and `messages.delete` cancellation pathway (per `research/scheduled-send-api-spike.md` Open Question 1) behave identically on Workspace.
- **How to verify:** hands-on test on a Workspace account in a controlled domain. Re-test after any major Gmail UI update.
- **Trigger:** before Chrome Web Store submission, and after any major Gmail UI change.
- **Reference:** `research/scheduled-send-api-spike.md` Open Question 4.

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

---

## v1 vs. v2 decisions

Product directions deliberately scoped **out of v1**, recorded so they are not
re-litigated mid-build and are revisited intentionally post-launch.

> **"v2" ≠ "Premium v1" (2026-05-17 — tier split, Entry 32).** The
> deferrals in this section are **post-launch *additive* directions — a
> later generation** (network effects, the multi-compose full fix). That
> is a **different concept** from **Premium v1**, which is a **paid tier
> of the *same* generation** (extension + backend, PRD §13 /
> `PREMIUM_LAUNCH_CHECKLIST.md`), built after Free v1 but *not* "v2".
> Both items below remain **Free-v1-non-blocking and unaffected by the
> tier split** — the multi-compose safety net is tier-orthogonal (it
> guards the Schedule Send / regular-Send paths, which are Free v1). Do
> not fold these into the Premium tier or vice versa.

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
> **GCP project + OAuth client name rename — DEFERRED to Premium v1
> kickoff (owner-directed).** The GCP project (`outboxiq-dev`), OAuth
> client display name, and consent-screen app name still say
> "OutboxIQ". Free v1 makes no OAuth call (Entry 39), so the GCP-side
> name is internal-only and does not gate Free v1's launch. **Premium
> v1's first task when it begins is the GCP-side rename** (project
> rename or new project + client/consent-screen rebranding). Tracked
> here so it isn't forgotten when Premium v1 work starts. (The
> Premium-v1-isolated code in `extension/src/premium-v1/` was renamed
> with the rest of the codebase — only the GCP-side identifiers
> remain.)
>
> **GitHub repo name rename — owner's separate call** (likely with
> public-launch announcement). Not done in this rename pass to avoid
> requiring local-clone reconfig + cross-reference URL updates.
> Consequence: `github.com/fenil-dedhia/OutboxIQ` URLs (in
> `extension/src/lib/constants.ts` `PRIVACY_POLICY_URL`, this file's
> footnotes, and a handful of doc references) intentionally still use
> the old name until the repo gets renamed — they are accurate to the
> current repo path.

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

**Launch-blocking item surfaced here:** the Privacy/ToS/Pages URLs are
currently brand-named (`github.com/fenil-dedhia/OutboxIQ/…`), hard-coded in
`constants.ts` **and** entered into the GCP OAuth consent screen. When the
real legal docs are drafted (deferred, see "Legal" above), host them on a
**rename-proof, brand-neutral or guaranteed-stable URL** so a later repo /
product rename does not break the consent screen or the in-extension link.
Pick this URL at the same time as the legal-doc hosting decision.

**Lead-time + trademark dimension (surfaced 2026-05-17, owner question at
Session-7 close — previously only mentioned in passing):** this is not a
same-day task. It has procurement and naming lead time that must start
well before the public-OAuth (Production) switch:

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

PRD §6.3 mandates WCAG AA: keyboard-navigable controls, labelled fields, AA contrast, ARIA roles/labels/live regions, and visible focus indicators. No dedicated accessibility pass has been run. The onboarding flow (the first shipped UI, PRD §5.1) has **known gaps** to fix before public launch:

- **Step-change focus & announcements.** Advancing between onboarding steps does not move keyboard focus to the new step and there is no `aria-live` region announcing the change, so a keyboard/screen-reader user is left on a removed control. (PRD §6.3 live regions, §8.9 keyboard accessibility.)
- ~~**Consent control markup.** The consent `<label>` wrapped the Privacy Policy `<a>`; nesting an interactive element inside a label is invalid and let a link click also toggle consent.~~ **RESOLVED in Session 3 (commit `a5fa897`)** — the link was pulled out of the label into a separate element; consent now registers only via the checkbox's own `onChange` (see `Welcome.tsx`, with an explicit guard comment). Kept here struck-through rather than deleted so the consent-gate concern and its resolution remain on the record. (Stale "currently wraps" wording corrected at Session 5 close-out — it had been flagged stale but never fixed earlier in Session 5.)
- **Contrast / focus indicators.** Spot-check muted text (`#5f6368` on white) and the disabled-button treatment against AA; confirm a visible focus ring on every custom control.
- **Keyboard-only + screen-reader walkthrough** of the full onboarding flow (and every subsequent UI) before submission.

- **Trigger:** before Chrome Web Store submission; re-run after any significant UI change.
- **Reference:** PRD §6.3, §8.9.

---

*Items get added to this file as development surfaces new launch requirements. If you're reading this years from now and something feels missing — it probably is.*
