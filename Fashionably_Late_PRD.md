# Fashionably Late — Product Requirements Document

**Version:** 1.0
**Status:** Draft
**Document Type:** Product Requirements Document for v1 development
**Intended Use:** Developer handoff for AI-assisted or manual implementation

---

## 1. Executive Summary

Fashionably Late is a browser extension for Gmail that enhances the native "Schedule Send" feature with intelligent, data-backed send-time recommendations. It helps users maximize email visibility by suggesting optimal delivery times based on the recipient's timezone, automatically prompts users when they attempt to send emails outside their working hours, and cancels scheduled emails when a reply is received before delivery.

The plugin extends Gmail's existing UX rather than replacing it. When installed, the native "Schedule send" dropdown is rebranded to "Schedule Send (powered by Fashionably Late)" and the modal that appears is enriched with new options, while preserving Gmail's familiar interaction patterns and the scheduled-emails view.

Fashionably Late is privacy-first, GDPR-compliant, and local-first by default. The only feature that requires a backend service is Unschedule-on-Reply, which is implemented as a lightweight EU-hosted relay for Gmail push notifications.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** Fashionably Late ships as **two tiers of the same
> generation**: **Free v1** — extension-only, no backend, free, the
> **public-launch target** — and **Premium v1** — extension + backend,
> paid, built *after* Free v1 launches and validates demand. They are
> parallel tiers, **not sequential versions** (a Free v1 user *upgrades*;
> there is no forced migration), and Premium v1 is **not** "v2" (which in
> this repo means a later generation / post-launch additive direction —
> see `PRE_LAUNCH_CHECKLIST.md` "v1 vs. v2 decisions"). The
> backend-dependent feature named in the paragraph above
> (Unschedule-on-Reply) is **Premium v1 scope** — its full design is
> deferred, not deleted, to **§13 (Premium v1 Scope)**. Free v1 still
> delivers the PRD's core value (recipient-aware Schedule Send with
> Optimize-for-recipient) entirely on-device. Wherever the body of this
> PRD asserts backend / refresh-token behaviour as present-tense product
> fact, read it as **Premium v1**; each such section carries a matching
> dated tier note. Rationale and counterfactual: `notes/owner-decisions-log.md`
> Entry 32.

> **SUPERSEDING NOTE (2026-05-27, owner-directed — Entry 52, with Entries
> 53–54).** Premium v1 is now **out of scope of this project entirely.** This
> sharpens the tier split above (Entry 32) from "a later track in this repo" to
> "not part of *this* repo at all." If/when Premium is built, the owner forks
> this **Apache-2.0-licensed** Free v1 repo into a **separate private repo** and
> develops Premium there; the two ship as **two independent Chrome Web Store
> listings** (Pattern Y), with independent version numbers and release notes.
> Consequences for this document: **§13 (Premium v1 Scope) has been removed**
> from this PRD, and the **`backend/` directory and `extension/src/premium-v1/`
> have been deleted** from the repo. The inline `§13` / backend / refresh-token
> / `src/premium-v1/` / Option-B pointers that remain elsewhere in the body
> below are **historical** — they describe a design that now lives outside this
> project, not present-tense product fact for this repo. Free v1 (the only
> product this repo builds) is unchanged: recipient-aware Schedule Send with
> Optimize-for-recipient, entirely on-device, no OAuth, no Google API, no
> backend. See `notes/owner-decisions-log.md` Entries 52 / 53 / 54.

---

## 2. Goals and Non-Goals

### 2.1 Goals

1. Increase email open rates and reply rates by recommending statistically optimal send times in the recipient's local timezone.
2. Reduce after-hours email sending that can hurt the sender's professional perception.
3. Provide a frictionless, native-feeling extension of Gmail's existing Schedule Send.
4. Maintain GDPR-grade privacy through data minimization and local-first storage.
5. Cancel scheduled emails automatically when a recipient replies before delivery, preventing redundant or out-of-context messages.

### 2.2 Non-Goals (Explicitly Out of Scope)

See Section 11 for the complete "Do Not Build" list — features forbidden
**product-wide, in every tier**. (The former §13 "Premium v1 Scope" listed
backend-dependent features that *were* part of the product but tier-gated to
Premium; **Premium v1 is now out of scope of this project** and §13 has been
removed — see the §1 superseding note and `notes/owner-decisions-log.md`
Entry 52. §11 items remain forbidden in any tier, including a future Premium.)

---

## 3. Target Users

**Primary persona:** Knowledge workers, salespeople, recruiters, executives, and consultants who use Gmail as their primary email client, communicate across time zones, care about how their email cadence is perceived, and send a moderate-to-high volume of outbound emails per day.

**Secondary persona:** Individual contributors and freelancers who work non-standard hours and want their emails to land during recipients' working hours regardless of when they were drafted.

---

## 4. Key Concepts and Definitions

- **Optimized Send Time:** One of three pre-defined time slots (9:00 AM, 1:00 PM, 4:00 PM) in the recipient's local timezone, based on open-rate and engagement research.
- **Recipient Timezone:** The timezone associated with a specific email recipient, inferred via Google APIs or manually set by the user, then cached locally.
- **Working Hours:** User-defined start and end times (per day of week) during which the user is comfortable sending emails, configured during onboarding.
- **Auto-Reschedule Prompt:** A modal that appears when the user attempts to send an email outside their configured working hours, offering to delay delivery until the next working window.
- **Unschedule-on-Reply:** A feature that automatically cancels a scheduled email if any recipient replies to the user before the scheduled send time.
- **Scheduled Email Badge:** A small Fashionably Late visual indicator that appears on scheduled emails in Gmail's native Scheduled label, distinguishing emails scheduled via Fashionably Late from emails scheduled via Gmail's default UI.

---

## 5. Functional Requirements

### 5.1 First-Time User Onboarding

#### 5.1.1 Purpose

Collect the user's timezone, working hours, and explicit GDPR consent. Communicate transparently why each piece of data is requested, how it is stored, and what value the user receives in return.

#### 5.1.2 Trigger

The onboarding flow opens automatically on install, and again on browser startup if it was never completed. It also opens when the user opens Gmail without having completed onboarding, and can be opened on demand from the Fashionably Late toolbar icon. (A manual relaunch entry point also belongs in the Settings panel — §5.8 — once that panel exists.) A completed-onboarding check guards every trigger, so an onboarded user is never re-prompted.

#### 5.1.3 Steps

> **Restructure note (2026-05-15):** the original five steps were consolidated to three. The former Step 1 (welcome), Step 4 (transparency screen), and Step 5 (consent + finish) overlapped and are merged into a single Step 1; the verbatim transparency and consent copy is preserved unchanged. The timezone and working-hours steps are unchanged (renumbered).

**Step 1: Welcome, transparency, and consent.**
- Title: "Welcome to Fashionably Late". (Was "Welcome to Fashionably Late Onboarding" through Entry 41; "Onboarding" trimmed 2026-05-19 — owner-directed; the "Step 1 of 3" progress indicator already conveys the onboarding context, so "Onboarding" in the H1 was bureaucratic ceremony.)
- Brief explanation: "Fashionably Late helps your emails land at the right moment, in your recipients' time, not yours. To power our intelligent features, we'll require information about your timezone and working hours."
- A "Why do we need this information?" section presenting the transparency copy below.
- A required consent checkbox: "I understand how Fashionably Late uses my data and agree to the Privacy Policy." The "Privacy Policy" link opens the full policy in a new tab.
- A "Get Started" button that is **disabled until the consent checkbox is checked**. This is the consent gate: the flow cannot advance — and therefore onboarding cannot complete — without explicit consent.

> **Amendment (2026-05-28, Session 17 follow-up — combined Privacy + ToS consent).** The single-document consent text above is superseded to satisfy §6.1 ("Both [Privacy Policy and Terms of Service] are linked at install time, during onboarding, and in the Settings panel") — onboarding previously linked only the Privacy Policy. Pattern 1 (one combined checkbox, owner-chosen): the checkbox label now reads exactly **"I agree to the Privacy Policy and Terms of Service, and understand how Fashionably Late uses my data."**, where "Privacy Policy" and "Terms of Service" are inline links (to `PRIVACY_POLICY_URL` / `TERMS_OF_SERVICE_URL`) opening in new tabs, with a helper line below surfacing both as "Read the …" links. The Get-Started gate is unchanged (still disabled until the combined checkbox is checked). No storage-schema change: the stored consent record's `privacyPolicyVersion` field name is retained (no SCHEMA_VERSION bump) — it records the legal-docs version sentinel at consent time, now covering both documents.

> **Why does Fashionably Late need this information?**
>
> Google's APIs don't expose your working hours to third-party plugins, and we can't always determine a recipient's timezone automatically. To power our smart scheduling features, we need to ask you directly.
>
> **Your data, your control:**
> - This information is stored locally on your device, not on our servers.
> - We never share your data with third parties.
> - You can edit, export, or delete everything in Settings at any time.
>
> **What you get in return:**
> - Send emails at the optimal moment for each recipient, automatically.
> - Avoid sending after-hours emails that hurt your professional brand.
> - Cancel scheduled emails when someone replies, so you never send a stale message.

> **Entry-41 amendment (2026-05-19, owner-directed — product rename;
> Entry-30 discipline: verbatim locked-copy changed via amendment, NOT
> silent find/replace).** The §5.1.3 Step-1 verbatim copy above —
> Title, brief explanation, the "Why does …" transparency block, the
> consent-checkbox label — references **"Fashionably Late"** (was
> **"OutboxIQ"** through Session 9). The product was renamed from
> OutboxIQ → Fashionably Late before public launch
> (owner-decisions-log Entry 41; `notes/naming-history.md` /
> `CLAUDE.md` top). All other locked-copy properties are unchanged.

> **Step-1 copy refresh (2026-05-28, Session 17, owner-directed).** Tightens
> the Welcome step's verbatim copy above; supersedes the corresponding lines:
> - **Brief explanation** (line ~114) is reworded to: *"Fashionably Late helps
>   your emails land at the right moment, in your recipients' time, not yours.
>   We'll need your timezone and working hours to make that happen."*
> - **The "Why do we need this information?" section is removed entirely** —
>   both the heading (line ~115) and the transparency paragraph (the "Why does
>   Fashionably Late need this information?" block, lines ~121–123). The step
>   now goes straight from the brief explanation to "Your data, your control".
> - **"Your data, your control" bullet 1** is reworded to: *"This information
>   stays on your device, we don't have servers."* (bullets 2–3 unchanged).
> - **"What you get in return" bullets** are replaced with exactly: *"Send
>   emails at the right moment for each recipient, learned once and remembered."
>   / "Avoid sending after-hours emails that hurt your professional brand." /
>   "Your data stays on your device, no account, no tracking."* — the prior
>   third bullet ("Cancel scheduled emails when someone replies…") is dropped
>   (it described the Premium Unschedule-on-Reply feature, out of scope of this
>   project — Entry 52). Layout, headings, and the consent gesture are
>   unchanged.

**Step 2: Timezone confirmation.**
- The plugin pre-fills the user's timezone from the **browser** (`Intl.DateTimeFormat().resolvedOptions().timeZone`), labelled "Detected from your browser".
- The user can confirm or override via a dropdown listing all IANA timezones (override is recorded as source `manual`).
- Copy: "This is the timezone we'll use when you don't specify one explicitly. You can change it any time in Settings."

> **Amendment (2026-05-17, owner-directed — Session 8; Entry-6
> discipline; this is an ASSUMPTION CORRECTION, not a deferral —
> Entry-11 shape).** The original spec (above, pre-amendment) had the
> plugin read the user's timezone from the Google Calendar API
> (`GET /calendar/v3/users/me/settings/timezone`) and treated the browser
> timezone only as a §6.7 *fallback*. **For v1 there is no Calendar API
> call in onboarding at all — the browser timezone is THE source, full
> stop.** Honest rationale: the original PRD assumed Calendar was the more
> *authoritative* source; on reflection it is not, for Fashionably Late's use
> case. The browser reads the **OS timezone, which auto-updates as the
> user travels** — exactly the "current working context" Fashionably Late
> schedules against. Google Calendar's timezone is a **manually
> configured preference that does not auto-update with location**, so it
> is *stale* precisely for the travelling-user cases Fashionably Late exists to
> serve. Calendar is only arguably-better for edge users who deliberately
> pin a laptop timezone regardless of travel (VPN/power users) — and those
> users are the ones most likely to set an explicit override anyway. So
> the corrected default is browser-tz; manual override covers the rest.
> Consequences: (1) the "Detected from your Google Calendar settings"
> label is removed from v1; (2) **OAuth consent is no longer requested
> during onboarding** — it is requested later, in context, the first time
> the user invokes an action that needs it (§5.3.5 Optimize-for-recipient,
> Session 9); (3) a *future* §5.8 Settings option — "Override with your
> Google Calendar timezone (requires Google sign-in)" — could serve the
> edge users; **explicitly not v1 scope**, recorded so it is not lost;
> (4) `calendar.settings.readonly` now has **no v1 consumer** — whether to
> drop it from the default OAuth scope set (vs. request it incrementally
> only if that future Setting is built) is an open scope-minimisation
> decision flagged at §6.6. The `calendar_api` value stays in the §7.2
> `timezoneSource` type (schema stability + that future Setting). Recorded
> in `notes/owner-decisions-log.md` (Session 8); discharges the CLAUDE.md
> "§5.1.3 Calendar-amendment tracking marker" (resolved by correction, not
> by wiring).

> **Session-11 amendment (2026-05-20, owner-directed) — Step 2 becomes "Set
> up your timezones" (user tz + Pinned Timezones).** Step 2 now covers BOTH
> the user's own timezone (above) AND **Pinned Timezones**: the user picks up
> to **5** timezones to surface first in every timezone picker (a "Pinned"
> section above "All timezones"). Onboarding **pre-selects 5 defaults**
> (PST/EST/GMT/CET/IST → `America/Los_Angeles`, `America/New_York`,
> `Europe/London`, `Europe/Berlin`, `Asia/Kolkata`), shown as removable chips
> with an add-picker. The 5-pin cap is enforced in the UI; at the cap the
> message reads "Maximum 5 pinned timezones. Remove one to add another, or
> **remove all**" ("remove all" clears to empty — it replaced the earlier
> standalone "Skip" link; owner UX 2026-05-20). The user's-own timezone is the
> **visually primary** block (tinted card + emphasised label); pinned is the
> optional secondary block. **Back-reverts edits:** a step's settings commit
> only on **Continue** — **Back** restores the step's on-entry state, so
> accidentally clearing the pre-selected pins then going Back does not lose
> them (`useOnboarding` `stepEntrySnapshot`, all steps; memory-only — a hard
> refresh resumes from the persisted draft per §5.1.4 as an implicit commit).
> Stored as
> `pinnedTimezones: string[]` (canonical IANA ids) on the §7.2 state
> (SCHEMA_VERSION 2→3, additive default-merge migration → `[]`). **Migration
> discipline:** existing/upgraded users are **NOT** silently pinned — the
> defaults pre-check only in the onboarding *draft*; committed state defaults
> to empty; pinning is always an explicit act. The picker dropdown is now a
> **searchable combobox over a curated timezone dataset** (see §5.3.5 (k)
> Session-11 amendment), not a raw IANA list. Editing pins post-onboarding is
> the §5.8.2 Settings surface (not yet built — `PRE_LAUNCH_CHECKLIST.md`).
> `notes/owner-decisions-log.md` Entries 44–45; `notes/session-11-summary.md`.

**Step 3: Working hours.**
- The plugin presents an interface for configuring working days and per-day start/end times.
- Default values: Monday through Friday, 9:00 AM to 5:00 PM.
- The user can toggle individual days on or off and customize times per day.
- Two optional fields under a **"Default boundaries"** group: **"Default boundaries — Earliest send"** (default 7:00 AM) and **"Default boundaries — Latest send"** (default 7:00 PM). Helper text: *"Times when you usually don't want emails going out. We'll check in if you schedule outside these hours — unless you're using Optimize-for-X, where we respect your choice to reach recipients in their working hours."* (Replaces the prior "absolute floors and ceilings" framing — see the Entry-40 amendment below; `notes/owner-decisions-log.md` Entry 40.) **[REMOVED in v4 — see Entry-56 amendment below: the onboarding Working Hours step no longer captures Default boundaries; per-day working days/times only.]**
- A "Finish Setup" button completes onboarding. On completion the user is returned to their nearest open Gmail tab (the onboarding tab simply closes if no Gmail tab is open).

> **Entry-56 amendment (2026-05-28, Session 17).** The "Default boundaries" group above is **removed** (SCHEMA_VERSION v3→v4) — see the §5.5 Entry-56 amendment for the full rationale. The onboarding Working Hours step now collects per-day working days/times only; it stays Step 3 of 3 (the boundaries were inputs *within* the step, not a separate step).

> **Entry-40 amendment (2026-05-19, owner-directed).** The fields previously specified as "Earliest I'd ever send an email" / "Latest I'd ever send an email" — described as "absolute floors and ceilings" — are **renamed product-wide to "Default boundaries"** to honestly reflect their behaviour: they are *defaults* the product nudges around, **not** absolute hard rules. The §5.5 soft-warning trigger fires on Default-boundaries violations from Quick Options, Pick Custom, "Last scheduled time", and §5.5.1 regular Send — **but NOT when the violating time was computed by §5.3.5 Optimize-for-X** (the four-step engagement = explicit feature-mediated intent; Case 1 / Case 2 in `notes/owner-decisions-log.md` Entry 40). The §7.2 storage field names `absoluteEarliest`/`absoluteLatest` are kept as **stable internal identifiers** (CLAUDE.md "Locked tech decisions" / Entry-30 pattern: opaque internal names don't follow user-facing renames; renaming them would force a `SCHEMA_VERSION` bump with no user-facing benefit). The locked-copy onboarding strings (above) are spec text — the running UI implementation in `WorkingHoursStep.tsx` is tracked as a Session-10 spec-code alignment task (Phase G close-out).

#### 5.1.4 Acceptance Criteria

- The user cannot complete onboarding without explicit consent. Enforced at Step 1: the "Get Started" button is disabled until the consent checkbox is checked, so the flow cannot proceed at all without consent.
- All collected data is stored in the browser's local extension storage, not transmitted to any server.
- Onboarding can be resumed mid-flow if interrupted.
- After onboarding, the user lands in Gmail with the plugin fully active; the success screen's "Return to Gmail" action focuses the nearest open Gmail tab.

---

### 5.2 Compose Window Integration

#### 5.2.1 Visual Changes

When the user opens a Gmail compose window with Fashionably Late installed, the plugin makes the following modifications:

1. The native "Send" button's dropdown caret continues to function, but the label inside the dropdown menu changes from "Schedule send" to "Schedule Send (powered by Fashionably Late)."
2. No other visual changes are made to the compose window itself.

> **Entry-41 amendment (2026-05-19, owner-directed — product rename;
> Entry-30 discipline).** The §5.2.1 verbatim relabel string — the
> single branded surface in compose per §8.1 — reads **"Schedule Send
> (powered by Fashionably Late)"** (was "powered by OutboxIQ" through
> Session 9). Implemented as `SCHEDULE_SEND_LABEL` in
> `extension/src/lib/constants.ts`. Same locked-copy contract, new
> brand. Owner-decisions-log Entry 41.

#### 5.2.2 Click Behavior

When the user clicks "Schedule Send (powered by Fashionably Late)", the Fashionably Late-enhanced modal appears (Section 5.3) instead of Gmail's native scheduling modal.

#### 5.2.3 Fallback Behavior

If the Fashionably Late extension fails to load or encounters an error, Gmail's native Schedule Send must continue to function normally. The plugin must never block or interfere with native Gmail functionality.

---

### 5.3 Enhanced Schedule Send Modal

#### 5.3.1 Layout

The modal preserves the visual style and dimensions of Gmail's native scheduling modal but adds the following enhancements.

#### 5.3.2 Header

- Title: "When do you want to send this email?"
- A subtitle below the title displays the user's currently applied timezone: "Times shown in [Timezone Abbreviation] ([City/Region])." For example, "Times shown in EDT (New York)."

#### 5.3.3 Quick Options

Three preset options matching Gmail's native pattern:
- Tomorrow morning (8:00 AM, user's timezone)
- Tomorrow afternoon (1:00 PM, user's timezone)
- Next Monday morning (8:00 AM, user's timezone)

These dates and times update dynamically based on the current day of the week.

> **Amendment (2026-05-16, owner-directed):** when the user has scheduled at
> least once via Fashionably Late, the modal also shows a **"Last scheduled time"**
> row at the top (above the three presets), mirroring the equivalent row in
> Gmail's own native dialog (PRD §8.1 native feel). This was not in the
> original 3-preset spec; added so repeat users don't lose Gmail's
> "same time as last time" affordance. Implementation detail: Fashionably Late
> remembers the time **it** scheduled (stored locally per PRD §7.2 —
> `lastScheduled`, schema v2), rather than scraping Gmail's own value; this
> keeps it local-first and avoids extra Gmail interaction. It therefore
> reflects the last Fashionably Late-scheduled time, which can differ from Gmail's
> global memory (e.g., if the user also scheduled directly via Gmail).
> Clicking it schedules at that exact time via the §5.3.4 custom path.

#### 5.3.4 Pick Date & Time

A standard date and time picker for custom scheduling. Selected time is always in the user's timezone, clearly labeled.

> **Amendment (2026-05-16, owner-directed):** this section is labelled **"Pick custom"** in the UI (with the timezone abbreviation retained for the §5.3.4 "clearly labeled" requirement). Also, the modal's interaction model is **select-then-confirm**: choosing a Quick Option, the "Last scheduled time" row, or entering a custom date+time only *selects* it (visually highlighted; modal stays open). Nothing is scheduled until the user clicks the single primary **"Schedule"** button, which is disabled until a choice is made and which both schedules and closes the modal. This is consistent with §5.3.5's "Clicking 'Schedule' … submits" wording (it replaces an earlier click-a-row-fires-immediately behaviour).

#### 5.3.5 Fashionably Late Optimize Section

> **REWRITTEN 2026-05-19 (Session-9 close-out — Entry 39 OAuth removal +
> Entry 40 spec lock; `notes/owner-decisions-log.md` Entries 38, 39, 40).**
> The original §5.3.5 described an API-driven recipient/timezone cascade;
> the implemented Free v1 design is **DOM-read recipient + manual timezone
> picker, cached**. No OAuth, no People API, no network call in this path.
> The locked UX below is the authoritative §5.3.5 for Session 10's build
> — the prior body (preset+three-timings+API-detected timezone display +
> the Session-5.5 "absolute limits remain the only hard constraint" design
> commitment) is superseded in full. Items (a)–(n) below are owner-locked.

**(a) Section presence and initial state.** Inside Fashionably Late's enhanced Schedule Send modal, below the standard options, an **"Optimize delivery for [recipient dropdown]"** section is visible whenever a compose has at least one To/CC recipient. The leading **checkbox starts UNCHECKED** on modal open — Optimize-for-X is opt-in per send.

**(b) Recipient dropdown — population from compose DOM.** Auto-populated from the Gmail compose **To: and CC:** fields. **BCC is excluded** (preserves the BCC privacy contract; §11). No People API, no autocomplete enrichment beyond what Gmail already rendered in the compose chips.

**(c) Per-entry labelling.** Each entry shows the recipient's display name (or email when never-emailed, per (e)).

> **Amendment (2026-05-20, owner UX call — Session 10 hands-on).** The original spec labelled each entry with its field of origin — **"Sarah Chen (To)"**, **"Mike Johnson (CC)"**. In the built UI this read as unnecessary visual noise: the To-vs-CC distinction is not information worth surfacing in the dropdown. The **"(To)"/"(CC)" suffix is dropped** — each entry is just the name (or email). The `field` value is still read from the compose DOM and carried internally (it is load-bearing for the BCC-exclusion contract in (b)); it simply isn't rendered.

**(d) Default selection.**
- **Single recipient across To+CC:** that recipient is pre-selected; the Optimize **checkbox still starts unchecked** (engagement is explicit).
- **Multiple recipients:** the dropdown shows the placeholder **"Choose recipient…"**; the modal's **Schedule button stays disabled** until the user explicitly selects one recipient to optimize for. Checkbox starts unchecked.

**(e) Display names.** Display names come **from Gmail's compose DOM** (whatever Gmail's own autocomplete rendered into the chip). Recipients with Gmail history: name appears. **Never-emailed recipients: only the email appears.** There is **NO fallback name resolution** via People API or any other source — the email-as-display-name is the carried representation when a name isn't available. (Workspace directory autocomplete *may* surface a colleague's directory name into the chip; that is Gmail's behaviour, not Fashionably Late's lookup, and is tenant-config-dependent — `notes/session-9-summary.md` Phase A.)

**(f) Timing dropdown — two options.** Labelled **"Optimize timing for"**, with **exactly two** options (the original three narrowed to two — the "End of day (4:00 PM)" option is **dropped from product scope**, not deferred):
- **"Morning peak (9:00 AM their time)"** — default.
- **"Midday engagement (1:00 PM their time)"**.

**(g) Timing tooltip.** A small info icon opens the tooltip: *"Morning typically sees the highest open rate. Midday catches recipients between meetings."*

> **Amendment (2026-05-20, owner UX call — Session 10 hands-on).** The original spec appended **"Based on general research, not Fashionably Late tracking."** to the tooltip. In the built UI this read as awkward, defensive over-justification, so it is **dropped**. This is a copy decision only — §11 items 2 / 3 / 13 / 20 (no email tracking, no analytics, no telemetry) remain **fully binding on behaviour**: Fashionably Late does not measure recipient behaviour. The constraint was never a requirement to *say so* in this tooltip.

**(h) Timezone resolution — Case A (recipient already in cache).** Below the timing dropdown a confirmation line appears dynamically:

> *"We'll send this at 9:00 AM in PDT (Los Angeles). That's 12:00 PM your time."*

User reviews → clicks **Schedule** → the native Gmail Schedule Send mechanism (DOM-automation recipe in `extension/src/lib/schedule/gmail-recipe.ts`) fires at the resolved time. The Gmail-API impossibility of programmatic scheduled-send creation (verified in `research/scheduled-send-api-spike.md`) and the DOM-automation mechanism it forced remain binding for §5.3.5 — the locked spec changes the *inputs* to that mechanism, not the mechanism.

**(i) Timezone resolution — Case B (cache miss → inline timezone picker).** When the user checks the Optimize checkbox and the recipient is not in the cache, an inline timezone picker appears within the Optimize section:
- Picker text: *"What timezone is [Sarah Chen / email] in?"* (name where available per (e); else email.)
- Timezone dropdown placeholder: **"Choose their timezone"**.
- **Default selection: NONE** (placeholder only — explicitly **NOT** pre-selected to the user's own timezone, because the feature exists for cross-timezone optimization and a same-timezone default would let users click through with a meaningless optimization).
- The **Schedule button stays disabled** until a timezone is explicitly selected.
- When the user picks a timezone, the **(h) confirmation line updates in real time** showing both recipient time and user time.
- A **"Remember for future emails to [name/email]"** checkbox sits directly below the timezone dropdown, **default checked** — cache persistence is the normal path.

**(j) Cache TTL for manual selections — indefinite.** Manual timezone selections are explicit user-entered data and **do not expire**. (Contrast with the original §5.4.2 90-day TTL, which was framed for *auto-detected* data. With auto-detection removed in Session 9, there is no auto-detected data in Free v1, and the TTL framing changes: **manual entries persist until the user clears them via the Settings panel** — §5.8.2 "Recipient Timezone Cache" bulk action.)

**(k) Shared timezone picker component (binding architectural constraint).** The IANA timezone dropdown used in this Optimize-for-X inline picker (item i) **MUST be the same component implementation** used by onboarding (§5.1.3, Step 2). Both pickers share UI, behaviour, search interface, and content. Any improvement to one applies to the other automatically. This is a **binding architectural constraint, not guidance** — to prevent silent drift between the two pickers over the lifetime of the product. Session-10 implementation note: factor the timezone picker into a shared component on first use rather than duplicating.

> **Session-11 amendment (2026-05-20, owner-directed).** The shared picker is
> now a **searchable combobox over a curated timezone dataset**
> (`src/lib/timezone/curated-timezones.ts`), NOT the raw ~600-entry IANA list.
> It shows friendly offset-labelled groups ("(UTC+5:30) India, Sri Lanka —
> Mumbai, Delhi, Bengaluru, Colombo (IST)"), matches a typed
> city/country/abbreviation/legacy-IANA-name/offset, and **emits a canonical
> IANA id** on selection (stored data unchanged; legacy/browser ids resolve to
> their group for display only, never silently migrated). All-caps queries
> match abbreviations case-sensitively ("IST" → India/Israel, not "Istanbul").
> It also renders the user's **Pinned Timezones** (§5.1.3 Step 2) in a "Pinned"
> section above "All timezones" via a `pinnedIanaIds` prop — in this §5.3.5 (i)
> inline picker the pins are threaded from the user's stored `pinnedTimezones`.
> The component is self-styled (co-located scoped `<style>`) so it renders
> identically on the onboarding page and inside this modal's Shadow DOM, and
> its popup is a fixed overlay (no modal scrollbar, no clipping). The spec-(k)
> single-component lock is unchanged and still holds (one chunk, both
> consumers). `notes/owner-decisions-log.md` Entry 44.

**(l) No "I don't know" hint or fallback heuristic.** If the user doesn't know the recipient's timezone, the correct product behaviour is to **not use Optimize-for-X for this send** — uncheck the Optimize checkbox and use Quick Options instead. The product does **not** engineer a workaround (an "I don't know" default, a "use my timezone" hint, or any heuristic guess) that would pollute the cache with low-quality timezone data and silently degrade future optimizations for that recipient.

**(m) Multi-recipient unselected state.** When multiple recipients exist in To+CC and none is selected from the dropdown, the Optimize section shows the **"Choose recipient…"** placeholder and the checkbox is unchecked. If the user checks the checkbox without selecting a recipient, **Schedule stays disabled** (per (d)). No additional prompt copy is added — the inert state of the section is itself the gentle prompt; adding nudge copy would clutter §8.1's "native feel over branded feel" surface.

> **Amendment (2026-05-20, owner UX call — Session 10 hands-on).** The **"Optimize timing for" sub-panel** (timing dropdown + tooltip + cache-miss timezone picker + confirmation line) is **gated on a selected recipient**: it does not appear on checkbox-engage alone — the user must pick the person first, *then* the timing controls are revealed (enforces a clear "who → when" order). Single-recipient composes auto-select (per (d)), so the panel appears immediately on engage in that case; multi-recipient composes show the engage row only until a recipient is chosen.

**(n) Default-boundaries interaction — explicit exception (§5.5 / Entry 40).** A time computed by §5.3.5 Optimize-for-X is **exempt from the §5.5 Default-boundaries soft-warning** (Case 1 in the Entry-40 analysis). The user's four-step engagement — opened modal → engaged Optimize → picked recipient → picked timing — constitutes explicit feature-mediated intent; surfacing a "but you're sending outside your hours" warning at the *result* of that engagement is paternalistic and would train users to dismiss the modal (extending the Entry-21 line of reasoning). The §5.5 warning **still fires** for boundary violations from Quick Options, Pick Custom, "Last scheduled time", and §5.5.1 regular Send (Case 2) — the exception is **precisely scoped to the algorithmic, Optimize-for-X-mediated case**. See §5.5 (Entry-40 amendment) and `notes/owner-decisions-log.md` Entry 40.

**Schedule button mechanism (unchanged — binding).** Clicking Schedule on an Optimize-for-X-computed time commits it as a **real, native Gmail scheduled send** via the same DOM-automation recipe used elsewhere in §5.3 (`extension/src/lib/schedule/gmail-recipe.ts`; Quick Options ride Gmail's preset rows, custom times ride Gmail's "Pick date & time" path). This preserves the native Scheduled label (§5.7) and keeps email content on-device. The Gmail API does **not** expose programmatic scheduled-send creation (verified in `research/scheduled-send-api-spike.md`). The Unschedule-on-Reply cancel path that *does* use the Gmail API (`messages.list?q=in:scheduled` → `messages.trash`) is **Premium v1** (§13.2 / §5.6) — Free v1 does not call the Gmail API at all (Entry 39).

> **Design commitment — Default boundaries as informational input (refines the 2026-05-16/Session-5.5 commitment).** The user's working hours (§5.1.3) remain an **informational input** to §5.3.5 recipient recommendations: when the recipient-optimal window allows latitude, a candidate that also falls within the sender's working hours may be preferred. This is **advisory only** — it never hard-blocks a recipient-optimized time. The original 2026-05-16 statement that "*absolute limits remain the only hard constraint*" is **superseded by Entry 40**: under the rename + (n) exception, Default boundaries are also *not* a hard constraint for §5.3.5-computed times. The §5.5 calc still computes both rule types unconditionally; only the trigger predicate decides what to surface to the user (Entry 40 Case 1 vs Case 2).

#### 5.3.6 Working Hours Check (Default-boundaries routing)

If the computed send time falls outside the user's **Default boundaries** (§5.1.3 / §5.5), a §5.5 soft-warning modal may appear before the email is scheduled — **unless** the time was produced by §5.3.5 Optimize-for-X, in which case the warning is suppressed by design (item (n) above; Entry-40 Case 1). The §5.5 calculation runs unconditionally; only the trigger predicate is narrowed. **[Entry-56 (v4): Default boundaries removed AND the §5.3 Schedule Send modal now raises no §5.5 warning at all — so this paragraph is moot for Optimize-for-X, which already schedules directly. See the §5.5 Entry-56 amendment.]**

#### 5.3.7 Recipient Timezone Picker (primary path in Free v1)

> **REWRITTEN 2026-05-19 (Entries 39 + 40) — supersedes "Fallback"
> framing.** The manual picker is the **primary** path for any
> first-contact recipient in Free v1 (no API detection exists; §5.4.1
> Free-v1 cascade is cache → manual). The locked UX is **§5.3.5 item
> (i)** — inline picker within the Optimize-for-X section, "Choose
> their timezone" placeholder with **no default pre-selection** (NOT
> the user's own timezone — that would let users click through with a
> meaningless optimization, item (l)), "Remember for future emails to
> [name/email]" checkbox default-checked, manual selections cached
> **indefinitely** per item (j). The original Free-v1 copy below
> ("we couldn't automatically detect…", user's own timezone
> pre-selected) is **explicitly superseded** by §5.3.5 (i)/(l) — it is
> retained only as the **Premium-v1 wording** for the API-detection-
> fails case (§13 / `src/premium-v1/`). For Free v1 there is no
> "couldn't detect" — there is simply the normal first-contact picker.

**Premium v1 fallback wording (historical / preserved for §13 wire-up):** if the API cannot detect the recipient's timezone (Premium-v1 cascade — §13), an inline component appears asking the user to select it. Copy: "We couldn't automatically detect [Recipient Name]'s timezone. Pick one to continue, or we'll use yours." Dropdown lists all IANA timezones with the user's own timezone pre-selected. Note: "We'll remember this for future emails to [Recipient Name]." (Free v1 uses the §5.3.5 (i) picker instead.)

---

### 5.4 Recipient Timezone Detection (Technical Spec)

#### 5.4.1 Cascading Detection Logic

> **Entry-39 amendment (2026-05-19, owner-directed — supersedes the
> cascade below FOR FREE v1).** Empirical Session-9 testing established
> the People-API timezone hit-rate is effectively zero (Google exposes
> no usable IANA tz; the single-digit estimate the Maps-removal
> amendment relied on was, in practice, ~nil), while the recipient is
> readable from the compose DOM. **Free v1's cascade is therefore just:
> Step 1 local cache (≤90d) → Step 4 manual picker (§5.3.7), cached
> forever.** No People API, no Workspace Directory, no OAuth, no Google
> API of any kind. Steps 2–3 below (People `searchContacts`, Workspace
> Directory) and all OAuth are **Premium v1** — built and preserved
> inert in `extension/src/premium-v1/` (see its README; §13). The
> `resolveRecipientTimezone()` contract Free v1 ships:
> `{source:"cache"|"manual_needed"}`, purely on-device. The steps below
> document the **Premium v1** full cascade (kept intact for wire-up).

When a recipient is selected for optimization, the plugin executes the following cascade in order. The first method to return a valid IANA timezone wins.

**Step 1: Local cache lookup.**
- Query the local extension storage for a record matching the recipient's email address.
- If found and not stale (cache TTL: 90 days), return the cached timezone.

**Step 2: Google People API lookup.**
- Endpoint: `GET https://people.googleapis.com/v1/people:searchContacts?query={email}&readMask=locations,addresses,emailAddresses`
- Required OAuth scope: `https://www.googleapis.com/auth/contacts.readonly`
- If the contact record yields a usable IANA timezone, return it. If it returns only a structured address with **no usable timezone**, continue to Step 3 — paid address→timezone geocoding was **removed from product scope** (see the amendment note below).

**Step 3: Google Workspace Directory fallback.**
- If the user is on a Google Workspace account, query the Directory API for org-wide contacts.
- Endpoint: `GET https://people.googleapis.com/v1/people:searchDirectoryPeople?query={email}&readMask=locations`
- Required OAuth scope: `https://www.googleapis.com/auth/directory.readonly`

**Step 4: Manual selection.**
- If all automated methods fail, present the inline timezone picker described in Section 5.3.7.
- Once the user selects a timezone, persist it in the local cache (Step 1) so this prompt does not appear again for this recipient.

> **Amendment (2026-05-16 — owner-directed): Google Maps APIs removed from
> product scope (removed, not deferred).** The original Steps 3 and 4
> (Google Maps Geocoding API + Google Maps Time Zone API, backend-proxied)
> are deleted; old Step 5 (Workspace Directory) becomes Step 3 and old
> Step 6 (manual) becomes Step 4. Reasoning, recorded accurately: the
> geocode/timezone steps only fired when the People API returned a contact
> with a structured address but **no usable timezone** — a single-digit
> percentage of recipient lookups in Fashionably Late's target use (knowledge
> workers emailing colleagues, clients, recruits, acquaintances). For that
> small case, manual selection **cached forever per recipient** (Step 1)
> is a fine one-time UX cost. The free Workspace Directory step already
> covers the highest-value case (internal cross-timezone email) with no
> Maps dependency. The hit-rate-versus-cost-and-complexity tradeoff does
> **not** improve with time, so this is a **permanent product decision,
> not a v2 deferral**: no Maps OAuth scopes, no Maps API key, no Maps
> billing, no Maps proxy endpoint, ever. Consequently the backend is now a
> **single-purpose** service — Unschedule-on-Reply only (see §13.2.1,
> was §7.3.1 — moved by the tier split; the backend is Premium v1).
> Recorded in `notes/owner-decisions-log.md` (Entry 26).

#### 5.4.2 Caching

- All resolved timezones are cached in the browser's local extension storage with the schema: `{ email: string, timezone: string, source: "cache" | "people_api" | "directory" | "manual", resolvedAt: timestamp }`.
- The user can view, edit, and clear cached recipient timezones in the Settings panel.

#### 5.4.3 Rate Limiting and Cost Control

- **No paid Maps calls exist in the product** — the Geocoding and Time Zone APIs were removed from scope (see the §5.4.1 amendment). The remaining lookups (Google People API, Workspace Directory API) are **free**; the only cost-control concern is staying within their request quotas. The plugin still minimizes calls by:
  - Always checking the local cache first (resolved timezones are cached per recipient, effectively permanently — see §5.4.2).
  - Debouncing recipient field changes (only triggering lookup when the user explicitly opens the Schedule modal, not on every keystroke).
  - Failing gracefully if a quota is exhausted (fall back to manual selection, then cache the choice).

---

### 5.5 Working Hours Warning (was: "Default Boundaries Warning"; orig. "Auto-Reschedule on Outside Working Hours")

> **Entry-56 amendment (2026-05-28, Session 17, owner-directed — DEFAULT
> BOUNDARIES REMOVED ENTIRELY; SCHEMA_VERSION v3→v4; `notes/owner-decisions-log.md`
> Entry 56).** This SUPERSEDES the Entry-40 amendment below and all
> "Default boundaries" / "absolute limits" / "hard limits" / "earliest I'd
> ever send" / "latest I'd ever send" spec text product-wide (this section,
> §5.1.3, §5.3.5, §5.8.2, §7.2, and the warning copy). The two-rule model
> (per-day working hours + a global earliest/latest pair) produced **two
> functionally redundant warnings** on regular Send; the owner consolidated
> to **per-day working hours as the single send-time window**. Binding new
> behaviour:
>
> - **The global "Default boundaries" (`absoluteEarliest`/`absoluteLatest`)
>   are removed** from the schema (v3→v4 migration drops them), Settings, and
>   onboarding. The §5.5 calc has ONE rule type: the per-day working-hours
>   window.
> - **The §5.5 soft warning now fires ONLY on §5.5.1 regular Send** (an
>   immediate off-hours send is plausibly unintended). The §5.3 **Schedule
>   Send modal raises no warning at all** — its only prior trigger was the
>   absolute-boundary violation (the locked Entry-21 split already exempted
>   working-hours violations there, since deliberate off-hours *scheduling* is
>   the core use case). With the absolute rule gone, Schedule Send schedules
>   directly.
> - **The Optimize-for-X exemption is preserved** and unchanged: Optimize-
>   computed times never raise the warning. (It was always architectural —
>   Optimize bypasses the warning gate — not bound to which boundary type, so
>   nothing about it changed.)
> - **Warning copy:** the after-hours line reads *"…past your working
>   hours."* (was "…after your working hours end").
> - The three-choice soft-warning pattern (Proceed / Reschedule / Cancel),
>   the next-working-day snap algorithm (§5.5.3), and inclusivity of day
>   start/end are **unchanged**. Every working-hours snap is strictly future,
>   so the former absolute-`after-latest` forward-roll (`ensureFutureSnap`) is
>   removed as no-longer-reachable.
>
> The Entry-40 amendment and the original §5.5 body below are retained
> verbatim per Entry-4 discipline as the historical record of the two-rule
> era — read them as superseded by this amendment, not as current spec.

> **Entry-40 amendment (2026-05-19, owner-directed — RENAME + new
> Optimize-for-X exception; refines, does NOT invalidate, Entries 19, 20,
> 21, 28; `notes/owner-decisions-log.md` Entry 40).** Two linked changes:
>
> **1. Rename.** What were specified as **"absolute limits"** / **"hard
> limits"** throughout this section, §5.1.3, §5.8.2, and the warning
> copy — labelled "the only hard constraint" in the prior §5.3.5 design
> commitment — are renamed product-wide to **"Default boundaries"**.
> Reason: feature should serve the mental model. They are *defaults the
> product nudges around*, not absolute hard rules — exactly because the
> Optimize-for-X feature **overrides them by design** for explicit
> feature-mediated intent (item 2 below). "Absolute" / "hard" was
> misleading labelling for a value that an explicit feature is built to
> override. The new framing for **Default boundaries**: *times when the
> user usually doesn't want emails going out; the product warns when
> scheduling outside them; **exception:** Optimize-for-X-computed times
> are automatically respected as overridden because the user's intent
> there is explicit and feature-mediated.*
>
> **2. §5.5 trigger narrows to exclude Optimize-for-X-computed times.**
> The soft-warning modal continues to fire on Default-boundaries
> violations from: Quick Options, Pick Custom, the "Last scheduled
> time" row, and §5.5.1 regular Send (**Case 2 — manual selection**).
> The modal does **NOT** fire when the violating time was computed by
> §5.3.5 Optimize-for-X (**Case 1 — algorithmic, feature-mediated**).
> The exception is **precisely scoped** to the Optimize-for-X case:
> if a user manually picks a Pick-Custom time that happens to cross
> Default boundaries, the warning fires normally — only the
> algorithmic case is exempted. This extends Entry 21's line of
> reasoning (warnings fire for unintended actions, not the core use
> case) to Default-boundaries violations specifically when they are a
> consequence of using Optimize-for-X — the feature designed for
> deliberate off-hours scheduling.
>
> **What is preserved (binding, do not re-litigate):** the locked
> three-choice soft-warning pattern (Entry 19), the snap-target rules
> (Entry 19/28), the `ensureFutureSnap` forward-roll (Entry 28), the
> §5.5.1 split (Entry 21 — Schedule Send: Default-boundaries only;
> regular Send: working-hours + Default-boundaries), the §5.5.3
> calculation logic (unchanged — only the *consumer's* trigger
> predicate narrows). The historical amendments below ("absolute
> limits" / "hard" terminology) remain accurate-at-the-time records
> per Entry-4; **read "absolute-limit violation" in them as
> "Default-boundaries violation" going forward**, with the Case-1
> Optimize-for-X exception layered on top.

> **Amendment (2026-05-16, owner-directed — Session 5.5):** §5.5 enforcement
> is **split by trigger**. **Schedule Send** raises the soft warning for
> **absolute-limit violations only** — warning a user for *scheduling*
> outside their working hours is warning them for Fashionably Late's core use case
> (e.g. scheduling 3 AM local to land in a recipient's 9 AM window). Doing
> so trains users to dismiss the modal and destroys its value for the
> absolute-limit cases where it actually matters. **Regular Send (§5.5.1)**
> raises the soft warning for **working-hours *and* absolute-limit**
> violations: an *immediate* off-hours send is unintended, whereas a
> deliberate off-hours *schedule* is the point. The §5.5 calc still
> computes both rule types unconditionally; only the Schedule Send
> consumer's predicate is narrowed (the working-hours branch stays — it is
> consumed by §5.5.1 and, later, §5.3.5). Locked: see `CLAUDE.md` "Locked
> product decisions".

#### 5.5.1 Trigger

This modal appears when:
- The user clicks the regular "Send" button (not Schedule Send) and the current time is outside their configured working hours, OR
- The user attempts to schedule an email for a time outside their working hours.

> **Amendment (2026-05-16, owner-directed — Session 5):** the **first**
> trigger (intercepting the regular "Send" button when the current time is
> outside working hours) is **deferred to its own future session** and is
> *not* implemented in v1's first §5.5 pass. Intercepting Gmail's primary
> Send action is materially more invasive than the Schedule Send hook
> Fashionably Late already owns and carries a direct §5.2.3 ("never block native
> Gmail") risk. v1 §5.5 therefore enforces only the **second** trigger: a
> time the user explicitly picks via Fashionably Late's Schedule Send modal
> (preset, custom, or "Last scheduled time"). This bullet remains spec; it
> is simply not yet built. Tracked in `notes/session-5-summary.md`.

> **Amendment (2026-05-16 — Session 6): the first trigger is now
> IMPLEMENTED**, gated by a DOM probe verified hands-on against live Gmail
> (`research/send-button-probe.{js,md}` — the Entry-2/Entry-23
> spike-gating discipline; the probe is the canonical reference, re-run it
> when Gmail breaks Send). Behaviour: a capture-phase, compose-scoped
> interceptor watches the **whole Send gesture** (pointer/mouse events on
> the Send button *and* ⌘/Ctrl+Enter) and only ever blocks it when the
> §5.5 calc returns a **real violation** for the current time; an in-hours
> Send is never touched (§5.2.3). It acts on the **FULL verdict —
> working-hours OR absolute** (the locked split: an *immediate* off-hours
> send is plausibly unintended, unlike a deliberate off-hours *schedule*,
> which Schedule Send still warns on for absolute only). On a violation it
> raises the **same locked soft-warning modal** with present-tense copy
> ("It's 3:33 AM — before 7:00 AM…") and the three locked choices:
> **Reschedule to [boundary]** (converts the immediate Send into a native
> Schedule Send at the snapped time), **Send now anyway** (replays the
> native Send), **Cancel** (compose untouched, nothing sent). Every
> non-violation, ambiguous, or failure path **falls toward sending** (no
> cached config, calc throw, modal mount/render throw → the email sends;
> a 30s watchdog guarantees the guard can never permanently wedge Send).
> **Multi-compose (≥2 composes) deliberately does NOT intercept** —
> "Reschedule" reuses the Schedule recipe whose global chevron query
> mis-targets multi-compose (the same §5.2 safety-net case — a documented
> **v1-acceptable** behaviour, **not** launch-blocking; the full fix is a
> v2 deferral, see `notes/owner-decisions-log.md` Entry 27 and the
> `PRE_LAUNCH_CHECKLIST.md` "v1 vs. v2 decisions" section), so §5.5.1
> falls through to native Send there; documented v1 interim, not a
> regression. Tracked in `notes/session-6-summary.md`.

#### 5.5.2 Modal Content

The modal mirrors the visual style of Gmail's native modals (rounded corners, white background, system fonts). The copy reads as follows:

**Title:** "Send this email later?"

**Body:**
> You're currently outside your configured working hours.
>
> Emails sent late at night or on weekends are statistically less likely to be opened or replied to, and may signal poor work-life boundaries to your recipients. Scheduling delivery for your next working window helps maximize visibility and protects your professional brand.

**Suggested send time:**
> Recommended: Send on [Next Working Day, e.g., "Monday"] at [Working Hours Start Time, e.g., "9:00 AM EDT"].

**Action buttons:**
- Primary action: "Schedule for [Next Working Day, Time]"
- Secondary action: "Send Now Anyway"
- Tertiary action: "Cancel"

**Footer option:**
- Checkbox: "Always schedule for next working day when outside hours" (unchecked by default).
- If checked, the modal is suppressed in future and the recommended action is taken automatically.

> **Amendment (2026-05-16, owner-directed — Session 5; supersedes the
> "Action buttons" and "Footer option" above for v1):** §5.5 enforcement is
> a **soft warning**, not a hard block and not a silent auto-snap (locked
> decision; see `CLAUDE.md` "Locked product decisions"). The modal names
> the *specific* violation in plain language (e.g. "This email is scheduled
> for Sun, May 17, 3:33 AM EDT — before 7:00 AM EDT, the earliest you said
> you'd ever send an email.") and offers **exactly three explicit choices**:
> **(1) Reschedule to [boundary]** — the recommended/primary action,
> schedules the corrected time; **(2) Send … anyway** — schedules the
> user's chosen time, overriding the rule just this once; **(3) Cancel** —
> dismiss the warning and return to the schedule modal to adjust. Nothing
> is ever auto-applied. The same pattern covers both working-hours (soft)
> and absolute-limit (hard) violations; when **both** are violated the
> **absolute-limit** one is surfaced (the harder constraint). The
> **"Footer option" suppression checkbox is dropped for v1** — an always-
> explicit choice is the whole point of the locked pattern, so a "do this
> silently from now on" toggle is contradictory. Consequence: the
> `alwaysScheduleOutsideHours` field in the §7.2 schema and its planned
> §5.8 Settings toggle are **inert in v1 by design** (kept for schema
> stability, not wired). The verbatim "Body" rationale above is retained
> (§8.5 explain-the-why); the "Title" is unchanged. Every time shown
> carries its timezone abbreviation adjacent (§8.4).

#### 5.5.3 Calculation Logic

"Next working day" is calculated by:
1. Checking the next 24 hours for a configured working day.
2. If found, scheduling for that day's working hours start time.
3. If the current day is a working day but it's before working hours start, scheduling for the same day at working hours start.

> **Amendment (2026-05-16, owner-directed — Session 5):** the snap target
> resolves **by rule type**:
> - **Working-hours (soft) violation** → the next-working-day calculation
>   above, interpreted concretely as: *if the chosen day is itself a
>   configured working day and the chosen time is before that day's start,
>   snap to the same day at its start (step 3); otherwise snap to the
>   soonest upcoming configured working day (search the chosen date +1…+7),
>   at that day's start.* (Step 1's terse "next 24 hours" is read as
>   "soonest upcoming configured working day", which is what the
>   "Recommended: Send on [Next Working Day]…" copy describes.)
> - **Absolute-limit (hard) violation** → snap to the violated absolute
>   boundary (`absoluteEarliest`/`absoluteLatest`) **on the same calendar
>   day the user originally picked** — *not* next-working-day. Absolute
>   limits are clock-time rules in the user's local time, not day-of-week
>   rules; the user chose their day deliberately, so the snap fixes only
>   the clock-time violation and honours the chosen day. **An absolute snap
>   may therefore land on a non-working day (e.g. Saturday 7:00 AM) — this
>   is intentionally permitted in v1** (the explicit day choice overrides
>   the working-hours *soft* preference). A v2 enhancement *could* add a
>   secondary informational note for that case; deferred, not v1 scope.
> - **Zero configured working days** is a legitimate "absolute-limits-only"
>   configuration: the working-hours soft constraint is then inactive
>   (never fires), so the next-working-day search is never invoked; only
>   absolute limits apply. Rule boundaries are inclusive (scheduling
>   exactly at the floor/start/end/ceiling is allowed).

> **Amendment (2026-05-17, owner-directed — Session 7; refines, does not
> overturn, the 2026-05-16 absolute-snap rule above):** the "absolute snap
> = the violated boundary on the **same calendar day**" rule is correct
> only when that day is a **future day the user picked** (§5.3 Schedule
> Send). For an **`after-latest`** violation it is **in the past** when
> there is no picked future day — i.e. the §5.5.1 *regular Send* trigger,
> where the requested time *is* "now", so "now is after today's ceiling"
> means today's ceiling is already behind us — or when a Schedule-Send pick
> is later-today while the clock is already past the ceiling. Gmail rejects
> a past scheduled time ("Invalid time"); this was found by the Session 7
> Phase 1 hands-on smoke test (Test G) and is **default-reachable** (Send
> after the default 7:00 PM `absoluteLatest`). Resolution: an `after-latest`
> snap that is not safely in the future is **rolled forward to the next
> working morning** — the soonest configured working day strictly after
> "now", at that day's working-hours start; **falling back to the next
> calendar day at `absoluteEarliest`** when zero working days are
> configured. This is scoped to `after-latest` **only** — every other snap
> (`before-earliest`; all working-hours snaps) is provably already strictly
> in the future, so their locked behaviour (including the intentional
> non-working-day landing of a *future* picked absolute day, above) is
> untouched whenever it remains a valid future time. Owner chose
> "next working morning" over "tomorrow at `absoluteEarliest`" for
> consistency with this modal's own "next working window" copy (§5.5.2) and
> with the working-hours `after-end` behaviour, so the two "too late today"
> cases (soft end vs hard ceiling) resolve identically. Implemented as a
> pure, time-aware `ensureFutureSnap()` layer applied by both the §5.5.1
> and §5.3 consumers; `checkWorkingHours` itself stays unchanged and
> Date.now-free. Recorded in `notes/owner-decisions-log.md` (Entry 28).

---

### 5.6 Unschedule on Reply

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** Unschedule-on-Reply is **in Premium v1 scope, not
> Free v1**. Fashionably Late now ships as two tiers of the same generation:
> **Free v1** (extension-only, no backend, the public-launch target) and
> **Premium v1** (extension + backend, paid, built after Free v1
> validates demand). Unschedule-on-Reply is the only PRD-specified
> feature that requires backend-initiated Gmail API calls, so it moves
> wholesale into Premium v1.
>
> **The full §5.6 design is preserved verbatim in §13.1 (Premium v1
> Scope) — it is deferred, not deleted.** The PRD originally specified
> this as a v1 feature; the tier split is a deliberate scope decision
> (`notes/owner-decisions-log.md` Entry 32), not a removal from the
> product (contrast the Maps removal, Entry 26, which *was* permanent).
> A future Premium v1 build reads §13.1 for the complete design.
>
> See **§13.1** for the full behaviour, technical architecture, Gmail API
> endpoints, backend data, and hosting requirements.

---

### 5.7 Scheduled Emails View (Native Gmail Integration)

> **Amendment (2026-05-17, owner-directed — Session 8; PRD-vs-architecture
> correction, Entry-26-shaped REMOVAL, not a deferral).** The **Fashionably Late
> badge** (§5.7.2.1) and its **hover tooltip** (§5.7.2.2) are **removed
> from product scope entirely — all tiers**. Reasoning: once Fashionably Late is
> installed, the Schedule Send chevron is rebranded and the user's natural
> scheduling path *is* Fashionably Late's modal, so the set of "post-install
> scheduled emails NOT created via Fashionably Late" is effectively empty — the
> badge differentiates against nothing, and building it would add a
> Gmail-DOM surface for no user value (and lean on brand inside Gmail,
> against §8.1). This is the same shape as the Maps removal (Entry 26):
> the native-architecture choice (Session 2 spike) silently rendered this
> moot; the spec simply hadn't caught up. The **§5.7.2.3
> cleanup-listening** behaviour is **not a separate Free v1 concern**:
> Free v1 keeps **no local scheduled-message records** (it drives Gmail's
> native UI; Gmail tracks the scheduled email itself), and the backend
> deregistration is **Premium v1's Unschedule-on-Reply** concern, already
> fully captured in §13.1/§13.2 — so it is absorbed there, with no
> separate Free v1 tracking. §5.7.1 (use the native Scheduled label, build
> no dashboard — reinforcing §11.18) is **unchanged and still binding**.
> §5.7.2/§5.7.3 below are superseded by this note. Recorded in
> `notes/owner-decisions-log.md` (Session 8, Entry 37).

#### 5.7.1 Approach

Fashionably Late does **not** build a separate dashboard for scheduled emails. Instead, it leverages Gmail's native "Scheduled" label, which already provides:
- A list view of all scheduled emails.
- The ability to click into a scheduled email to view its content.
- A native "Cancel send" button on each scheduled email.
- The ability to edit a scheduled email and reschedule it.

#### 5.7.2 Fashionably Late Enhancements to the Native View

The plugin adds the following minimal enhancements:

1. **Fashionably Late badge:** A small icon (the Fashionably Late logo or a distinguishing visual marker) appears next to emails in the Scheduled label that were scheduled via Fashionably Late. Emails scheduled via Gmail's native UI do not show this badge.

2. **Hover tooltip on the badge:** When the user hovers over the badge, a tooltip displays the optimization details: "Optimized for [Recipient Name] — [Timing Option] in [Recipient Timezone]."

3. **No modification to native Cancel send and edit flows:** When the user cancels or edits a scheduled email, Gmail's native behavior applies. The plugin only listens for these events to clean up its local cache and (if applicable) deregister the scheduled message from the backend.

#### 5.7.3 Acceptance Criteria

- The native Scheduled label continues to function exactly as it does today.
- Fashionably Late-scheduled emails are visually distinguishable from Gmail-native scheduled emails.
- Canceling a scheduled email via the native UI properly notifies the Fashionably Late backend (if applicable) so the push notification subscription can be cleaned up.

---

### 5.8 Settings and Preferences Panel

#### 5.8.1 Access

Accessible via:
- A Fashionably Late icon in the Chrome toolbar (or browser action button).
- A "Settings" link inside the Schedule Send modal's overflow menu.
- A direct link from the onboarding completion screen.

#### 5.8.2 Sections

> **Session-12 amendment (2026-05-20, owner-directed) — the Settings panel is
> BUILT (Free v1).** All seven sections ship in `src/pages/settings/`. The
> Free-v1 carve-outs below are explicit and deliberate (not omissions to
> "finish later"):
> - **Profile and Timezone** — own-timezone override via the shared
>   `TimezonePicker`. The "Display the user's email address" field and the
>   "Refresh from Google Calendar" button are **Premium-only** (Free v1 has no
>   OAuth / no Calendar API — Entry 39) and are **omitted entirely, not
>   stubbed**.
> - **Pinned Timezones** (§5.1.3 Step-2 amendment) — view / add / remove /
>   **reorder**. Reorder is **drag-and-drop + a grip handle**, with arrow-key
>   reordering for accessibility (owner UX call, Entry 46 — replaced the
>   originally-built up/down arrows). Reuses the shared `PinnedTimezonesEditor`
>   (same control as onboarding Step 2). Pinned **order is authoritative** and
>   surfaces in that order in every picker. A reorder in Settings live-updates
>   an already-open Schedule Send modal (Entry 47).
> - **Working Hours** — per-day toggle + times + "Reset to defaults" (with
>   confirm). Edits **autosave only when valid**. This section edits state
>   only. **[Entry-56 (v4): the "Default boundaries" sub-block is removed —
>   per-day working hours only; see the §5.5 Entry-56 amendment. The section
>   stays one of the seven §5.8.2 sections.]**
> - **Feature Toggles** — **exactly two** in Free v1: "Recipient optimized
>   scheduling" (`recipientOptimization`) and "Auto-reschedule prompt outside
>   working hours" (`autoRescheduleOnOutsideHours`, scoped to the **regular Send
>   button**, not Schedule Send). "Unschedule on Reply" is **Premium-only** and
>   "Schedule confirmation toast" is **moot** (§5.9 removed, Entry 37) — both
>   **omitted, not stubbed**. Both shipped toggles are **wired to their
>   consumers**: off → the §5.3.5 Optimize section is hidden / the §5.5.1 guard
>   does not intercept.
> - **Recipient Timezone Cache** — searchable list, per-row edit (preserves
>   resolvedAt) + delete, bulk clear (with confirm), empty state. Free v1's only
>   `source` is `manual`; a non-manual entry would be a premium-v1 leak and is
>   surfaced loudly.
> - **Privacy and Data** — **structure-only for Session 12.** Export/Delete
>   buttons render and show a "coming soon" treatment (real impl deferred —
>   §6.1.1); Privacy/ToS are **inert placeholder links**, NOT real URLs (the
>   hosted URL is a rename-proof pre-launch decision). The Free-v1 "Delete My
>   Data" copy must **not** mention "revoking backend access" (no backend).
> - **About** — plugin version (from the live manifest), GitHub repo link, and a
>   **placeholder** feedback/support link (channel undecided — GitHub Issues the
>   candidate).
>
> Recorded in `notes/session-12-summary.md`; owner-decisions-log Entries 46–48.

**Profile and Timezone**
- Display the user's email address (read-only).
- Display the user's current timezone with an option to override.
- A "Refresh from Google Calendar" button to re-fetch the timezone setting.
- **Pinned Timezones (Session-11 amendment, 2026-05-20).** View / add / remove
  the user's pinned zones (`state.pinnedTimezones`, up to `MAX_PINNED_TIMEZONES`
  = 5; PRD §5.1.3 Step 2). Onboarding is currently the ONLY place to set them,
  so this surface is needed for any later edit (and for upgraded users, who
  start with none by migration design). Reuse the onboarding Step-2 chips +
  add-picker pattern. **Not yet built** — tracked in `PRE_LAUNCH_CHECKLIST.md`.

**Working Hours**
- Per-day toggle and time pickers.
- **Default boundaries** — earliest and latest send times outside which the product warns (overridable per §5.5; auto-overridden for §5.3.5 Optimize-for-X — see §5.5 Entry-40 amendment). **[REMOVED in v4 — Entry-56 amendment (§5.5): consolidated into per-day working hours.]**
- A "Reset to defaults" button.

**Feature Toggles**
- Toggle: "Recipient Optimized Scheduling" (default on).
- Toggle: "Auto-reschedule prompt outside working hours" (default on).
- Toggle: "Unschedule on Reply" (default on).
- Toggle: "Schedule confirmation toast" (default on).

**Recipient Timezone Cache**
- A searchable list of all recipients whose timezones have been cached.
- For each entry: email, name (if known), timezone, source (auto-detected or manual), date resolved.
- Per-row actions: edit timezone, delete entry.
- Bulk action: "Clear all cached recipient timezones."

**Privacy and Data**
- "Export My Data" button: downloads a JSON file containing all locally stored data.
- "Delete My Data" button: clears all local storage and revokes backend access (if applicable). A confirmation dialog explains the consequences.
- Link to the Privacy Policy.
- Link to the Terms of Service.

**About**
- Plugin version.
- Link to GitHub repository.
- Link to feedback or support channel.

---

### 5.9 Undo Window

> **Amendment (2026-05-17, owner-directed — Session 8; Entry-26-shaped
> REMOVAL, not a deferral — all tiers).** §5.9 is **removed from product
> scope**. Because Fashionably Late schedules by driving **Gmail's own native
> Schedule Send** (Session 2 spike architecture), Gmail's **own
> scheduled-send confirmation toast already appears** and already carries
> the native undo affordance. Building Fashionably Late's own 7-second toast on
> top of it would **duplicate native functionality and violate §8.1
> ("native feel over branded feel")** — the §9.2 "schedule confirmation
> toast" success metric and the §5.8.2 "Schedule confirmation toast"
> feature toggle are likewise moot (the native toast is not ours to
> toggle; the toggle field stays inert in the §7.2 schema like
> `alwaysScheduleOutsideHours`, kept for schema stability, not wired).
> This holds for **both tiers** (the native toast appears regardless of
> tier). §5.9.1/§5.9.2 below are superseded. Recorded in
> `notes/owner-decisions-log.md` (Session 8, Entry 37).

#### 5.9.1 Behavior

After the user successfully schedules an email via Fashionably Late, a toast notification appears at the bottom of the screen for 7 seconds:

> "Email scheduled for [Date, Time, Timezone]. **Undo** | View"

Clicking "Undo" within the 7-second window cancels the scheduled email and reopens the compose window with the original draft restored. Clicking "View" navigates to the Scheduled label in Gmail.

#### 5.9.2 Implementation Notes

- The toast must not overlap or interfere with Gmail's own undo-send toast that may appear concurrently.
- After the 7-second window expires, the toast fades out and the scheduling becomes final (still cancelable via the Scheduled label, but no longer via the toast).

---

## 6. Non-Functional Requirements

### 6.1 Privacy and GDPR Compliance

#### 6.1.1 Principles

- **Data minimization:** Collect only what is necessary to power a feature. No behavioral analytics, no email content scraping, no recipient profiling.
- **Local-first storage:** All user preferences, working hours, timezone, recipient cache, and feature toggles are stored in the browser's local extension storage. Nothing is transmitted to any server unless absolutely required. The **only exception** is Unschedule-on-Reply (Section 5.6 → §13.1; **Premium v1 only** — Free v1 has *no* such exception, see the §6.1 tier amendment below). (Recipient timezone resolution is fully on-device — the Google Maps APIs were removed from product scope; see the §5.4.1 amendment and §13.2.1, was §7.3.1.)
- **Explicit consent:** Users must check a consent box during onboarding before any data is collected. Users must explicitly enable Unschedule-on-Reply before any data is sent to the backend.
- **Right to access:** Users can export all their data as a JSON file from the Settings panel.
- **Right to erasure:** Users can delete all their data (local and backend) from the Settings panel. The action is irreversible and is confirmed with a modal.
- **No third-party data sharing:** No analytics services (Google Analytics, Mixpanel, etc.), no advertising trackers, no third-party CDNs that could leak data.
- **EU data residency:** The backend is hosted in an EU region. All data at rest is encrypted. OAuth refresh tokens are encrypted with a per-user key.
- **Privacy Policy and Terms of Service:** Both documents are linked at install time, during onboarding, and in the Settings panel. Both are written in plain language.

#### 6.1.2 Lawful Basis for Processing

- Local data: legitimate interest (the user installed the plugin to receive its features).
- Backend data (Unschedule-on-Reply): explicit consent during feature opt-in.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** **GDPR compliance is a regulatory obligation, not a
> Premium feature** — both tiers are GDPR-compliant. What differs is the
> *amount of personal data each tier processes*, so the compliance
> posture differs naturally:
>
> - **Free v1** processes **minimal personal data, fully local-first**:
>   preferences, working hours, timezone, recipient cache, feature
>   toggles — all in `chrome.storage.local`, nothing transmitted to any
>   Fashionably Late server (there is none). OAuth uses `access_type=online`
>   (§7.5) so **no refresh token exists anywhere** and there is **no
>   backend storage**. §6.1.1's "EU data residency / backend / per-user
>   refresh-token encryption" bullet and §6.1.2's "Backend data … explicit
>   consent" bullet describe **Premium v1** and do not apply to Free v1.
>   Free v1's "only exception" to local-first storage is **none** (the
>   §6.1.1 Unschedule-on-Reply exception is Premium v1).
> - **Premium v1** adds backend processing (per-user-encrypted refresh
>   token, active scheduled-message records) under explicit feature
>   opt-in — exactly as §6.1.1/§6.1.2 already describe and as §13.2/§13.3
>   specify.
>
> The Privacy Policy and Terms of Service therefore have **a Free v1
> version describing local-first-only processing** and **a Premium v1
> version additionally describing the backend processing** — this is
> correct legal framing per the data each tier touches, **not a tiering
> of compliance itself**. (Drafting deferred — `PRE_LAUNCH_CHECKLIST.md`
> Free v1 "Legal"; `PREMIUM_LAUNCH_CHECKLIST.md` for the Premium
> addendum.) Recorded in `notes/owner-decisions-log.md` Entry 32.

### 6.2 Performance

- The extension must not increase Gmail's initial load time by more than 200 milliseconds (measured at the 95th percentile).
- All extension code must lazy-load. The Schedule Send modal logic should only execute when the user opens a compose window.
- API calls to Google services must be batched and cached aggressively.
- The Settings panel must render within 100 milliseconds of being opened.

### 6.3 Accessibility

- All UI components must comply with WCAG 2.1 Level AA.
- All interactive elements must be keyboard navigable.
- All form fields must have associated labels.
- Color contrast ratios must meet WCAG AA thresholds.
- Screen reader support: all custom UI components must include appropriate ARIA roles, labels, and live regions where applicable.
- Focus indicators must be clearly visible.

### 6.4 Browser Compatibility

- Primary target: Google Chrome (latest stable and one version prior).
- Secondary targets: Microsoft Edge and Brave (both Chromium-based, should work without modification).
- Firefox is not supported in v1 due to different extension APIs.
- Safari is not supported in v1.

### 6.5 Security

- The extension must use Manifest V3.
- All API calls must use HTTPS.
- OAuth tokens must never be exposed to the page or to web-accessible resources.
- Content Security Policy must restrict inline scripts and external resource loads.
- The backend service must use OAuth 2.0 with refresh token rotation.
- All secrets (API keys, encryption keys) must be stored in environment variables, never in source code.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** Two of these bullets are tier-scoped by the §7.5
> amendment:
> - "**The backend service must use OAuth 2.0 with refresh token
>   rotation**" is **Premium v1** (Free v1 has no backend and no refresh
>   token; it uses `access_type=online`). It remains binding for the
>   Premium v1 backend (§13.2/§13.3).
> - "**All secrets … never in source code**" holds **with no exception in
>   either tier** (updated by the Session-8 Entry-6 §7.5 amendment):
>   **Free v1 ships no Client Secret at all** — the implicit grant
>   (`response_type=token`) has none. (The earlier tier-split draft
>   carved a "non-confidential installed-client secret" exception here;
>   that applied only to the rejected code+secret approach and is
>   **withdrawn** — there is no secret in the extension to except.) The
>   Client ID is public-by-design (not a secret). The *only* Client
>   Secret in the product — the **Premium v1 backend's** (§13.3) — and
>   the per-user encryption keys stay **env-var-only**, binding.
> - "OAuth tokens must never be exposed to the page or to
>   web-accessible resources" is **unchanged and binding in both tiers**.

### 6.6 Minimum OAuth Scopes

> **Entry-39 amendment (2026-05-19, owner-directed — RESOLVES the
> "Open Session-10 question" the Entry-38 text below raised; supersedes
> the scope list for Free v1).** **Free v1 requests ZERO OAuth scopes
> and performs NO OAuth flow.** The empirical near-zero People hit-rate
> made `contacts.readonly` not worth its sensitive-scope cost, and DOM
> recipient-read removed the only reason to call People at all — so the
> owner dropped *all* Google API dependency from Free v1. Net effect
> (the upside the question flagged, now banked): Free v1 is an
> **all-on-device, no-OAuth, no-API** extension — **no CASA, no
> sensitive-scope consent-screen verification gate** (a major
> pre-launch simplification). The three-scope set described below is
> **Premium v1's** (`contacts.readonly` + `userinfo.email` + `openid`);
> the OAuth implementation is built and preserved inert in
> `extension/src/premium-v1/` (§13 / §7.5 Premium). The Session-8/9
> amendments below are retained as accurate **Premium-v1** history
> (Entry-4 discipline).

**Premium v1 requests three scopes** (Free v1: none — see the Entry-39 amendment above):

- `https://www.googleapis.com/auth/contacts.readonly` (recipient contact lookup for timezone optimization — §5.4.1 Premium step 2). Google **"sensitive"**, **not** "restricted".
- `https://www.googleapis.com/auth/userinfo.email` **and** `openid` (standard minimal OpenID identity set: the **ID token** `email` claim → `login_hint` so multi-account *silent* token renewal is invisible — §7.5 Premium). Both Google **"non-sensitive"**.

Conditionally, **only** if/when the deferred Workspace Directory path (§5.4.1 step 3) is built, for Workspace users only:

- `https://www.googleapis.com/auth/directory.readonly` (org directory lookup; incrementally requested, not in the default set).

Do **not** request `gmail.readonly` or any broader scope. Premium v1's backend (§13) requests the Gmail scopes its server-side Unschedule-on-Reply needs (`gmail.modify` etc.) — that is Premium-tier scope, not Free v1.

> **Amendment (2026-05-17, owner-directed — Session 8; Entry-6; RESOLVES
> the scope-minimisation question previously flagged here).** The
> original list also requested `gmail.compose`, `gmail.modify`, and
> `calendar.settings.readonly`. Code inspection this session established
> these have **no Free v1 consumer**: Schedule Send is DOM automation (no
> Gmail API token), the Gmail cancel path is Premium v1 (§13), and the
> §5.1.3 amendment removed the only `calendar.settings.readonly`
> consumer. They are **removed from the Free v1 request**. The
> load-bearing reason is **activation/trust, not only the locked §6.1.1
> data-minimisation principle**: the consent screen appears at the
> moment the user clicks "Optimize for [recipient]" — asking there to
> "read and modify all your email" for a *scheduling* action creates
> cognitive dissonance that drives consent-screen abandonment and
> erodes trust even among users who approve; "see your contacts" for an
> "optimize for recipient" action matches intent exactly (§8.5). The
> trim is **unconditionally safe**: §5.9 and §5.7 (the only future Free
> v1 features that could have wanted `gmail.modify`) were **removed from
> product scope this session** (see their amendments / Entry 37), so no
> DOM-vs-API probe is needed. Because `gmail.compose`/`gmail.modify` are
> Google **restricted** scopes, dropping them may **remove the CASA
> assessment from Free v1's launch path entirely** (now only a sensitive
> scope remains — `PRE_LAUNCH_CHECKLIST.md` reframed accordingly). Any
> future Free v1 feature needing a restricted scope triggers an
> **explicit re-evaluation** (consent-screen reconfig + a forced
> re-consent for all users) before the scope is added back — it is not
> to be re-added speculatively. The GCP consent screen must be
> reconfigured to this trimmed set (a Session-9 first-item owner task;
> the OAuth *client* is unchanged). Recorded in
> `notes/owner-decisions-log.md` (Session 8, Entry 36).

> **Entry-6 amendment (2026-05-19 — Session 9, owner-directed; spec
> follows an evidence-driven owner decision — refines, does NOT reverse,
> Entry 36 above).** Session-9 hands-on verification (the committed
> `__oqAuth.testPeopleMe` probe) established that a
> `contacts.readonly`-**only** token receives **HTTP 403** from
> `people/me?personFields=emailAddresses` — i.e. it **cannot** read the
> authenticated user's own email. Google's `people.get` documentation
> had listed `contacts.readonly` as sufficient; **live behaviour
> contradicted the docs** (Entry-10 discipline — the reason the probe
> exists, and why the clean full-revoke test mattered: the result is
> trustworthy because the token was genuinely contacts-only). With no
> contacts-only path to the user's own email, the `login_hint`
> multi-account fix (§7.5; Entry 34→Entry 38) could not function. The
> owner decided to **add one minimal scope**,
> `https://www.googleapis.com/auth/userinfo.email`, rather than ship the
> permanent multi-account re-prompt. This is **not a reversal of the
> Entry-36 minimisation principle** — that principle forbids
> *speculative / over-asking* scope; this is a **single, justified,
> evidence-required** addition matching user intent ("know which account
> you signed in with, to keep you signed in", §8.5). It is a Google
> **non-sensitive** scope: it does **not** trigger CASA and does **not**
> change the consent-verification tier (already set by the sensitive
> `contacts.readonly`); the Entry-36 CASA reframe in
> `PRE_LAUNCH_CHECKLIST.md` is **unaffected**. Cost: this amendment + a
> one-time forced re-consent for all users (a scope *addition*, unlike
> the Entry-36 removal, does require re-consent — `isAuthValid` already
> enforces this). The GCP consent screen must have `userinfo.email`
> **added** (a Session-9 owner task — the reverse of the Entry-36
> removal; the OAuth *client* is still unchanged). Recorded in
> `notes/owner-decisions-log.md` (Session 9, Entry 38).

### 6.7 Graceful Degradation

- If the People API fails or returns no result, fall back to manual timezone selection.
- If the Calendar API fails to return a timezone, fall back to the browser's timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- If the backend is unreachable, Unschedule-on-Reply is silently disabled for the current session. The user is notified non-intrusively the next time they open Settings.
- The plugin must never block, break, or visually disrupt native Gmail functionality.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** The "**If the backend is unreachable**" bullet is
> **Premium v1 only** — **Free v1 has no backend**, so there is nothing
> to be unreachable and Unschedule-on-Reply does not exist in Free v1.
> The Entry-31 §7.5 "backend outage *also* degrades Calendar/People"
> implication is likewise **Premium-v1-only**: in Free v1 the extension
> fetches access tokens **directly from Google** (no backend mints
> them), so the *first two* bullets here (People → manual; Calendar →
> browser timezone) are triggered only by Google API failure, exactly as
> originally written. The first, second, and fourth bullets apply
> unchanged in **both** tiers.

---

## 7. Technical Architecture

### 7.1 Client-Side Components

The extension consists of:

1. **Service worker:** Handles long-lived tasks like API calls, OAuth token management, and message passing between the content script and the backend.
2. **Content script:** Injected into the Gmail tab. Detects compose windows, modifies the Schedule Send dropdown, renders the Fashionably Late modal, and listens for scheduling events.
3. **Settings page:** A standalone HTML page accessible via the extension's options page or browser action popup.
4. **Onboarding page:** A standalone HTML page shown on first install.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** In **Free v1** the service worker's "OAuth token
> management" is the `access_type=online` flow of §7.5 (run
> `launchWebAuthFlow`, exchange the code with Google directly, cache the
> access token), and **"message passing … with the backend" does not
> apply** — Free v1 has no backend. Backend message passing is **Premium
> v1** (§13.1/§13.2). All four components otherwise apply to Free v1
> unchanged.

### 7.2 Local Storage Schema

All local data is stored in the browser's extension storage. Suggested schema:

```
{
  "user": {
    "email": "string",
    "timezone": "string (IANA)",
    "timezoneSource": "calendar_api | browser | manual",
    "onboardingCompletedAt": "timestamp"
  },
  "workingHours": {
    "monday": { "enabled": true, "start": "09:00", "end": "17:00" },
    "tuesday": { ... },
    ...
    // absoluteEarliest / absoluteLatest REMOVED in SCHEMA_VERSION 4
    // (Session 17, Entry 56) — see the §5.5 Entry-56 amendment.
  },
  "featureToggles": {
    "recipientOptimization": true,
    "autoRescheduleOnOutsideHours": true,
    "unscheduleOnReply": true,
    "scheduleConfirmationToast": true,
    "alwaysScheduleOutsideHours": false
  },
  "recipientCache": [
    {
      "email": "string",
      "name": "string | null",
      "timezone": "string (IANA)",
      "source": "people_api | directory | manual | cache",
      "resolvedAt": "timestamp"
    }
  ],
  "consent": {
    "privacyPolicyVersion": "string",
    "consentedAt": "timestamp"
  }
}
```

> **Implementation note:** the implemented `OutboxIQState` (a **frozen internal
> type name** — Entry 30; deliberately *not* renamed with the brand) adds a
> top-level `schemaVersion` (**currently `4`** as of Session 17 — the v3→v4
> bump removed `absoluteEarliest`/`absoluteLatest`, Entry 56; `SCHEMA_VERSION` in
> `extension/src/lib/constants.ts`) and represents `consent` as **nullable** —
> it is `null` until the user completes onboarding (PRD §5.1), then set to the
> object shown above. The schema here describes the shape once consent exists.
>
> **Schema v2 (2026-05-16):** added a nullable top-level `lastScheduled` (`{ display, gmailDate, gmailTime } | null`) — supports the §5.3.3 "Last scheduled time" amendment. Purely additive; the v1→v2 "migration" is just `getState()`'s default-merge resolving an absent key to `null` (no explicit version branch yet, per the migration convention in `CLAUDE.md`). Stores only pre-formatted time strings — never email content (§13.2.4, was §7.3.4).
>
> **Schema v3 (2026-05-20, Session 11):** added `pinnedTimezones: string[]` (PRD §5.1.3 Step 2). Purely additive (defaults to `[]`), same default-merge migration — and deliberately **no silent default-pinning** of existing/upgraded users (the onboarding *draft* pre-checks the defaults; committed state stays empty until the user pins explicitly). Session 12's §5.8 Settings build added **no** new §7.2 fields (no version bump).

### 7.3 Backend Service

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** The backend service is **Premium v1 scope, not Free
> v1**. Free v1 ships extension-only with **no backend at all** (its OAuth
> model is §7.5 below — `access_type=online`, access tokens only, no
> refresh token, no server-side exchange). The backend exists solely to
> enable Unschedule-on-Reply (§5.6), which is now a Premium v1 feature.
>
> **The full §7.3 design — purpose (incl. the Entry-26 single-purpose and
> Entry-31 OAuth-token-management framings, preserved verbatim), hosting,
> endpoints (incl. the Option-B `/auth/*` plumbing), and data stored — is
> moved intact to §13.2.** It is deferred to the Premium v1 track, **not
> deleted**: Entry 31's locked Option-B token architecture remains the
> correct, binding design **for Premium v1** and is *not* reopened
> (Entry-4 discipline: a locked decision is locked against drift, not
> against the new fact that Unschedule-on-Reply is now tier-gated). The
> Maps-removal narrowing (Entry 26) and the one-purpose boundary are
> unchanged and carry forward to the Premium v1 backend intact.
>
> See **§13.2** for the complete backend specification.

### 7.4 Third-Party API Dependencies

- **Gmail API:** for composing, scheduling, canceling, and watching messages.
- **Google Calendar API:** for reading the user's timezone setting only.
- **Google People API:** for recipient contact lookup.
- **Google Cloud Pub/Sub:** for receiving Gmail push notifications.

Each API has its own quota and pricing. The plugin must respect rate limits and implement exponential backoff on 429 and 5xx responses.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** **Google Cloud Pub/Sub is Premium v1 only** — it is
> used solely by the Unschedule-on-Reply backend (§13.1/§13.2). **Free v1
> uses only the Gmail, Calendar, and People APIs, all called directly
> from the extension** (no Pub/Sub, no backend). The Gmail API's use in
> Free v1 is "composing/scheduling/canceling" via the Schedule Send DOM
> recipe and the recipient/timezone lookups; "watching messages" is the
> Premium v1 Unschedule-on-Reply path.

### 7.5 Authentication and Authorization

> **Entry-39 amendment (2026-05-19, owner-directed — authoritative for
> Free v1; supersedes every Free-v1 statement in this section).**
> **Free v1 has NO authentication and NO authorization flow** — no
> OAuth, no `chrome.identity`, no token, no Google API. Everything is
> on-device (`chrome.storage.local`). The entire OAuth design in this
> section (implicit grant, `id_token` `login_hint`, silent renewal,
> scopes, CSRF/nonce, §6.5 token-handling) is now **Premium v1**: it
> was fully built and hands-on-verified in Sessions 7–9 and is
> **preserved intact, inert** in `extension/src/premium-v1/` (see that
> README + §13.3), ready for Premium wire-up — *not deleted*. The
> Session-7→9 amendments below are retained as accurate **Premium-v1**
> design history (Entry-4 discipline); read every "the extension does
> X with the token" as **Premium v1**, never Free v1.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31; supersedes the original bullets below and *scopes* —
> does not rewrite — the 2026-05-17/Entry-31 amendment that previously
> sat here).** OAuth now has **two distinct models, one per tier**. This
> amendment is the **authoritative §7.5 for Free v1**. The Entry-31
> Option-B design (backend-only, per-user-encrypted refresh tokens,
> `access_type=offline`, server-side code exchange) is **preserved
> verbatim, unchanged, and still the locked binding design — for Premium
> v1 — in §13.3.** Entry-4 discipline applies: Entry 31 was correct given
> the then-true assumption that Unschedule-on-Reply was in v1's only
> tier; with Unschedule-on-Reply now tier-gated to Premium v1, Entry 31
> stays correct *for Premium v1* and is *inoperative for Free v1*. It is
> **not reopened, not rewritten, not a reversal** — it is scoped.
>
> #### Free v1 — implicit grant, `response_type=token`, no secret, no backend
>
> > **Entry-6 amendment (2026-05-17 — Session 8, owner-directed at the
> > Entry-19 pre-implementation architecture review; refines, does NOT
> > reverse, the tier-split §7.5 above; Premium §13.3 is untouched).** The
> > tier-split draft of this subsection specified an authorization-code +
> > **Client Secret** exchange performed in the extension. At the Session-8
> > architecture review the owner chose the **OAuth 2.0 implicit grant**
> > (`response_type=token`) instead — it is the standard installed-client
> > online pattern, has fewer failure modes, and **ships zero confidential
> > material**. Spec amended here to match the code (Entry-6 discipline);
> > recorded in `notes/owner-decisions-log.md` (Session 8 entry).
>
> - The extension uses Google OAuth 2.0 with the scopes in §6.6, via the
>   **Session-7 Web-application OAuth client** (Entry 29), kept for Free
>   v1 — see "Why the Web-application client" below.
> - The extension runs `chrome.identity.launchWebAuthFlow()` against
>   Google's authorization endpoint with **`response_type=token`** (the
>   implicit grant). The user picks which Google account to authorize
>   (`prompt=select_account` on the interactive attempt); Google redirects
>   to `https://<extension-id>.chromiumapp.org/…` with the **access token
>   in the URL fragment**.
> - There is **no authorization code, no token-endpoint call, no Client
>   Secret anywhere in the extension, no backend, no server-side
>   exchange**. The implicit grant inherently issues an **access token
>   only (≈1 h expiry) and *no refresh token*** — which *is* the Free v1
>   contract, achieved structurally rather than by configuration.
> - The access token is stored in `chrome.storage.local` (extension-
>   private, not web-accessible — §6.5) with its expiry timestamp, and
>   used for the Calendar API (user timezone, §5.1.3) and the People /
>   Workspace Directory APIs (recipient timezone, §5.4). A CSRF `state`
>   parameter is round-tripped and verified; a mismatch discards the
>   response.
> - On expiry the extension re-runs `launchWebAuthFlow` **silently**
>   (`interactive:false`, `prompt=none`); Chrome re-issues with no UI if
>   the Google session + consent still hold, else it escalates to the
>   interactive screen. Schedule Send itself needs no token — it drives
>   Gmail's own UI (§5.3.5 mechanism).
>
> > **Entry-6 amendment (2026-05-17 — Session 8, owner-directed; from
> > Phase-2 hands-on smoke, Entry-10 discipline).** Silent renewal works
> > **invisibly for a user with a single Google account** signed into
> > Chrome. For a user with **multiple Google accounts**, access-token
> > expiry (~1 h) triggers an **account-chooser re-prompt** instead of a
> > silent renewal: with several accounts and no `login_hint`, Google
> > refuses to pick one without UI and returns an interaction-required
> > error, which the extension maps to a clean interactive escalation.
> > **This is graceful degradation, not a failure mode** — nothing
> > breaks or blocks; full functionality continues; the user simply
> > re-picks their account on expiry (and Schedule Send, the core
> > feature, is unaffected — it uses no token). The user's authorized-
> > account email — the value needed to pass `login_hint` and make
> > renewal invisible for multi-account users too — becomes available
> > through the **People API integration in §5.4 (Phase 3)**; the silent
> > path incorporates it at that point. Recorded in
> > `notes/owner-decisions-log.md` (Session 8).
> >
> > **Entry-6 amendment (2026-05-19 — Session 9; spec follows code,
> > Entry-6/Entry-4 discipline — refines, does NOT reverse, the Session-8
> > amendment above).** The `login_hint` incorporation is now
> > **implemented**: `src/background/user-identity.ts` resolves the
> > authenticated account's email from People `people/me`
> > (`personFields=emailAddresses`) immediately after a grant, persists
> > it to `StoredAuth.grantedEmail`, carries it across silent renewals,
> > and the silent-only request sends it as `login_hint` (the
> > interactive request still uses `prompt=select_account` with no hint —
> > the multi-account *choice* guarantee is unchanged). **No OAuth scope
> > was added** (§6.6 holds): Google's documented `people.get`
> > authorization list includes `contacts.readonly`. One item remains
> > **owner-run and empirical** (Entry-10 discipline — verify against
> > live Google, not docs): whether a `contacts.readonly`-only token
> > returns the `Source.type:ACCOUNT` login email. The implementation is
> > **robust under both outcomes** — if it does not, `login_hint` is
> > omitted and behaviour is *exactly* the Session-8 graceful re-prompt
> > documented above (zero regression), and the contingent decision
> > (adding the non-sensitive `openid`+`userinfo.email` identity scopes
> > vs. accepting the permanent re-prompt) is **surfaced for an owner
> > decision, not taken under build pressure** (Entry 15). Confirmed via
> > the committed `__oqAuth.testPeopleMe` probe
> > (`research/oauth-smoke.md` Phase 3). Recorded in
> > `notes/session-9-summary.md`.
> >
> > **Entry-6 CORRECTION (2026-05-19, same session — supersedes the
> > mechanism described in the amendment immediately above; that text is
> > kept as the accurate-at-the-time record per Entry-4, but the
> > `people/me` mechanism it describes was falsified hands-on and is NOT
> > what shipped).** The empirical check it called for was run and
> > **failed**: a token carrying `contacts.readonly` **and**
> > `userinfo.email` + `openid` still received **HTTP 403** from People
> > `people/me` — Google's `people.get` docs were wrong (third time this
> > session; Entry-10). The **authoritative shipped mechanism** for Free
> > v1 `login_hint`: the extension requests
> > **`response_type=token id_token`** with a mandatory **`nonce`**;
> > Google returns an OpenID **ID token in the same sign-in redirect**;
> > its `email` claim — after `nonce`/`aud`/`iss` validation
> > (proportionate, non-signature; rationale in `oauth.ts`) — is
> > persisted to `StoredAuth.grantedEmail` and sent as `login_hint` on
> > the silent-only renewal. The OAuth scope set is **three**:
> > `contacts.readonly` + `userinfo.email` + **`openid`** (the last so
> > the id_token is requested OIDC-correctly — same Entry-38 intent).
> > **No People `people/me` call, no extra network round-trip, no new
> > host permission;** the dead People-based `src/background/
> > user-identity.ts` was **removed**. **Verified live, owner hands-on
> > (Entry-10 satisfied):** account email resolved from the id_token;
> > token expiry → **silent renewal with no account chooser** on a
> > multi-account profile. The Entry-34 multi-account limitation is
> > **closed**. Recorded in `notes/owner-decisions-log.md` Entry 38
> > (resolution addendum) and `notes/session-9-summary.md`.
> - Users revoke access at any time via Google account settings; with no
>   stored refresh token, revocation simply causes the next token fetch
>   to fail, degrading to the §6.7 fallbacks.
>
> **Free v1 ships NO Client Secret at all** (the implicit grant has none),
> so §6.5's "secrets … never in source code" holds for Free v1 **with no
> exception** — the earlier tier-split caveat about a non-confidential
> installed-client secret applied only to the rejected code+secret
> approach and no longer applies. The *only* Client Secret in the product
> is the **Premium v1 backend's** (§13.3 server-side exchange), which
> stays a backend env var — §6.5 binding there, unchanged.
>
> **Why the Web-application client (not a Chrome-extension client) for
> Free v1.** A Chrome-extension OAuth client drives
> `chrome.identity.getAuthToken()`, which (a) **cannot let the user
> choose among multiple signed-in Google accounts** — it silently uses
> the profile's primary account, a real correctness bug for the many
> target users with several Google accounts — and (b) cannot issue the
> offline/refresh-token grant Premium v1 will need.
> `launchWebAuthFlow()` on the Web-application client fixes the
> multi-account UX *and* is the same client Premium v1 reuses (switching
> only `access_type` online→offline), so no client swap or re-registration
> is needed at the Free→Premium transition. (Entry 29 created this client
> for the Premium reason; the multi-account UX is the load-bearing reason
> it is also correct for Free v1 — see Entry 32's credit split.)
>
> #### Premium v1 — `access_type=offline`, backend-held refresh tokens
>
> When Premium v1 ships, the **same** Web-application client switches to
> `access_type=offline` and the **Entry-31 Option-B** flow takes over:
> the extension passes the one-time code to the backend
> (`POST /auth/exchange`), which exchanges it (Client Secret in backend
> env only), stores a per-user-encrypted refresh token, and mints
> short-lived access tokens (`POST /auth/token`; revoke via
> `POST /auth/revoke`). **The full Option-B specification and its
> five-point rationale are preserved verbatim in §13.3.** The
> Entry-31 graceful-degradation consequence (a backend outage degrades
> Calendar/People to their §6.7 fallbacks because tokens are
> backend-minted) is a **Premium-v1-only** property — it does not apply
> to Free v1, where the extension fetches tokens directly from Google and
> there is no backend to be unreachable.
>
> Recorded in `notes/owner-decisions-log.md` (Entry 32; Entry 31 for the
> preserved Premium design).

---

## 8. UX Principles and Design Guidelines

### 8.1 Native Feel Over Branded Feel

Fashionably Late should look like a natural extension of Gmail, not a third-party plugin. Use Google's Material Design language, system fonts, and Gmail's color palette. The only place Fashionably Late branding appears prominently is in the Settings panel and the onboarding flow. Inside the compose window and the Schedule Send modal, the visual treatment matches Gmail's native components as closely as possible.

### 8.2 Progressive Disclosure

Show the minimum interface needed for the task at hand. Advanced options (recipient timezone override, custom timing) appear only when relevant. The Schedule Send modal opens with quick presets visible and the optimization section collapsed by default, expanding only if the user has multiple recipients or wants to optimize.

### 8.3 Sensible Defaults, Easy Overrides

Pre-select the most likely choice (the single recipient in the To field, 9:00 AM morning peak, the user's detected timezone), but make every default a single click away from being changed. Never force the user to confirm a default that is statistically correct for 90 percent of cases.

### 8.4 Always Show Timezone

Anywhere a time is displayed, the timezone must appear immediately adjacent. No exceptions. This includes the Schedule Send modal header, the recipient optimization line, the confirmation toast, and the auto-reschedule prompt.

### 8.5 Explain the Why

Whenever the plugin asks for data or makes a recommendation, a one-line explanation accompanies it. This builds trust and aligns with GDPR's transparency principle. Examples: "We use this to send emails in your timezone by default," "These windows are based on aggregated research across millions of email opens."

### 8.6 Reversibility

Every action has an undo or cancel path. Scheduled emails can be canceled or edited via Gmail's native UI (and **Gmail's own native scheduled-send toast** provides the immediate undo affordance — Fashionably Late's own 7-second toast was removed, see the §5.9 amendment). Destructive actions in Settings (clear cache, delete data) require explicit confirmation.

### 8.7 Minimal Cognitive Load

One decision per screen. The onboarding flow breaks setup into separate steps rather than presenting one overwhelming form. The Schedule Send modal does not pile recipient selection, timing, timezone, and working hours warnings into a single view. Each concern is presented sequentially and clearly.

### 8.8 Trust Signals

Privacy commitments are visible, not buried. The onboarding flow presents the privacy/transparency rationale prominently on its first screen, immediately above the consent gate (see §5.1.3). The Settings panel has a Privacy and Data section, not a single fine-print link. A small "Your data stays on your device" line appears near data inputs where appropriate.

### 8.9 Keyboard Accessibility

All interactive elements are keyboard reachable. The Schedule Send modal supports Tab for navigation, Enter to confirm, and Escape to cancel. Shortcut hints appear in tooltips for power users.

### 8.10 Empty States with Personality

First-time users see a friendly walkthrough, not a blank screen. The recipient timezone cache view, when empty, displays helpful copy like "No recipient timezones cached yet. They'll appear here as you optimize emails for specific recipients."

### 8.11 Visual Distinguishability Without Clutter

> **Superseded (2026-05-17, owner-directed — Session 8).** This section
> described **only** the §5.7.2 Fashionably Late badge, which is **removed from
> product scope** (see the §5.7 amendment, Entry 37). No other visual
> element depended on it, so the section is retired (heading kept for
> stable §8 numbering / cross-references). The surviving "native feel,
> don't clutter Gmail" intent lives in §8.1 and is unaffected.

---

## 9. Success Metrics

Success metrics for v1 are tracked **qualitatively** through user feedback from the developer and a small set of test users. **No telemetry is collected.** The targets below are aspirational benchmarks for what a successful v1 looks like — they are not measured by instrumented analytics.

- **Activation rate:** Percentage of installs that complete onboarding within 7 days. Target: 70 percent or higher.
- **Feature adoption:** Percentage of activated users who schedule at least one email per week. Target: 50 percent or higher.
- **Optimization usage:** Percentage of scheduled emails that use the Recipient Optimized Scheduling feature (vs. just preset times). Target: 30 percent or higher.
- **Auto-reschedule acceptance:** Percentage of users who accept the auto-reschedule prompt (vs. send anyway) when triggered. Target: 60 percent or higher.
- **Retention:** Percentage of installs still active after 30 days. Target: 40 percent or higher.

---

## 10. Open Questions for Future Versions

These are intentionally deferred and should not be addressed in v1:

1. Should the three time slots become user-configurable in v2?
2. Should the plugin track open rates of Fashionably Late-scheduled emails (opt-in only) to refine recommendations over time?
3. Should holiday awareness be added in v2 by reading from the user's Google Calendar?
4. Should multi-account support be added in v2?
5. Should the plugin extend to other email clients (Outlook, Apple Mail) as a cross-client product?

---

## 11. Out of Scope: Do Not Build (v1)

The following features and behaviors must **not** be implemented in v1. This list exists to prevent scope creep and to ensure downstream tools do not infer or add unrequested functionality.

> **Tier-split note (2026-05-17, owner-directed — pre-Session-8, after
> Entry 31).** **Items 1–20 below are out of scope for *all tiers* of
> Fashionably Late** — Free v1 *and* any future Premium. They are forbidden
> **product-wide and permanently**; "Premium" never reopens any of them.
> This is categorically different from **Unschedule-on-Reply and the
> backend service**, which were *deferred* features (a build, not a ban) —
> historically captured in the now-removed §13.
>
> **Update (2026-05-27, Entry 52):** Premium v1 (and therefore
> Unschedule-on-Reply + the backend) is now **out of scope of this project**
> and lives in a separate future private repo (§1 superseding note). That does
> **not** move it onto this §11 list — a deferred-to-another-project feature is
> still a build, not a ban. Items 1–20 here remain forbidden in **every** tier,
> including a future Premium. Do not collapse the two (do not read
> "Premium is out of this project" as "the §11 items are now Premium", and do
> not treat any §11 item as merely "Premium").

1. **Manual delivery approval** workflows where the user must approve each scheduled email before send.
2. **Email tracking, read receipts, or pixel-based open detection.** Fashionably Late does not track whether recipients have opened emails.
3. **Cross-user recipient behavior analytics** or any form of engagement scoring built from aggregated user data.
4. **AI-generated email content, subject line suggestions, tone analysis, or message rewriting** of any kind.
5. **CRM integrations** (Salesforce, HubSpot, Pipedrive, etc.).
6. **Mass email, newsletter, or campaign features.** Fashionably Late is for one-to-few personal and professional emails, not bulk outreach.
7. **Email templates or snippet management.**
8. **A/B testing of send times.**
9. **Cross-account simultaneous orchestration.** Each Gmail account is treated independently. No multi-account dashboards or unified inboxes.
10. **White-labeling or custom branding** for end users or third parties.
11. **Mobile app companion.** The Chrome extension is desktop-only in v1. No iOS or Android app.
12. **Custom domains or custom SMTP support.** Gmail accounts only.
13. **Analytics dashboards** showing open rates, click rates, engagement metrics, or recipient profiles.
14. **Reading email body content** beyond what is required for compose-window injection. The plugin must not parse, store, or transmit email body text.
15. **Notification preferences panel** with granular per-event notification toggles. A single global toggle for the schedule confirmation toast is sufficient.
16. **Multi-account support** within a single Chrome profile. If users want to use Fashionably Late on multiple Gmail accounts, they can use separate Chrome profiles.
17. **Holiday awareness** that detects public holidays or out-of-office events on the target send date.
18. **Separate scheduled emails dashboard.** Use Gmail's native Scheduled label, do not build a parallel view.
19. **Firefox, Safari, or non-Chromium browser support.**
20. **Behavioral analytics, usage telemetry, or any data collection beyond what is strictly required for features the user has opted into.**

---

## 12. Glossary

- **Compose window:** The Gmail interface for drafting a new email.
- **IANA timezone:** Standard timezone identifier (e.g., `America/New_York`, `Europe/Berlin`).
- **OAuth scope:** A permission a user grants to the plugin to access specific Google data.
- **Push notification:** A real-time message from Google Cloud Pub/Sub to the backend, used to detect inbox changes.
- **Service worker:** A background script that runs independently of any visible Gmail tab, used for long-lived tasks in a Manifest V3 extension.
- **Scheduled label:** Gmail's native label that lists all emails scheduled to send in the future.
