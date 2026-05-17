# OutboxIQ — Product Requirements Document

**Version:** 1.0
**Status:** Draft
**Document Type:** Product Requirements Document for v1 development
**Intended Use:** Developer handoff for AI-assisted or manual implementation

---

## 1. Executive Summary

OutboxIQ is a browser extension for Gmail that enhances the native "Schedule Send" feature with intelligent, data-backed send-time recommendations. It helps users maximize email visibility by suggesting optimal delivery times based on the recipient's timezone, automatically prompts users when they attempt to send emails outside their working hours, and cancels scheduled emails when a reply is received before delivery.

The plugin extends Gmail's existing UX rather than replacing it. When installed, the native "Schedule send" dropdown is rebranded to "Schedule Send (powered by OutboxIQ)" and the modal that appears is enriched with new options, while preserving Gmail's familiar interaction patterns and the scheduled-emails view.

OutboxIQ is privacy-first, GDPR-compliant, and local-first by default. The only feature that requires a backend service is Unschedule-on-Reply, which is implemented as a lightweight EU-hosted relay for Gmail push notifications.

> **Tier-split amendment (2026-05-17, owner-directed — pre-Session-8,
> after Entry 31).** OutboxIQ ships as **two tiers of the same
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
**product-wide, in every tier**. These are distinct from **§13 (Premium
v1 Scope)**, which lists features that *are* part of the product but are
**tier-gated to Premium v1** (deferred from Free v1's launch, not
deleted). §11 = never build; §13 = build, but in the Premium tier.

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
- **Scheduled Email Badge:** A small OutboxIQ visual indicator that appears on scheduled emails in Gmail's native Scheduled label, distinguishing emails scheduled via OutboxIQ from emails scheduled via Gmail's default UI.

---

## 5. Functional Requirements

### 5.1 First-Time User Onboarding

#### 5.1.1 Purpose

Collect the user's timezone, working hours, and explicit GDPR consent. Communicate transparently why each piece of data is requested, how it is stored, and what value the user receives in return.

#### 5.1.2 Trigger

The onboarding flow opens automatically on install, and again on browser startup if it was never completed. It also opens when the user opens Gmail without having completed onboarding, and can be opened on demand from the OutboxIQ toolbar icon. (A manual relaunch entry point also belongs in the Settings panel — §5.8 — once that panel exists.) A completed-onboarding check guards every trigger, so an onboarded user is never re-prompted.

#### 5.1.3 Steps

> **Restructure note (2026-05-15):** the original five steps were consolidated to three. The former Step 1 (welcome), Step 4 (transparency screen), and Step 5 (consent + finish) overlapped and are merged into a single Step 1; the verbatim transparency and consent copy is preserved unchanged. The timezone and working-hours steps are unchanged (renumbered).

**Step 1: Welcome, transparency, and consent.**
- Title: "Welcome to OutboxIQ Onboarding".
- Brief explanation: "OutboxIQ helps your emails land at the right moment, in your recipients' time, not yours. To power our intelligent features, we'll require information about your timezone and working hours."
- A "Why do we need this information?" section presenting the transparency copy below.
- A required consent checkbox: "I understand how OutboxIQ uses my data and agree to the Privacy Policy." The "Privacy Policy" link opens the full policy in a new tab.
- A "Get Started" button that is **disabled until the consent checkbox is checked**. This is the consent gate: the flow cannot advance — and therefore onboarding cannot complete — without explicit consent.

> **Why does OutboxIQ need this information?**
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

**Step 2: Timezone confirmation.**
- The plugin attempts to read the user's timezone from the Google Calendar API endpoint `GET /calendar/v3/users/me/settings/timezone`. (Until OAuth/Calendar is wired in just-in-time, the browser timezone is used as the documented §6.7 fallback, labelled accordingly.)
- The detected timezone is pre-filled with a label indicating its source ("Detected from your Google Calendar settings" or "Detected from your browser").
- The user can confirm or override via a dropdown listing all IANA timezones.
- Copy: "This is the timezone we'll use when you don't specify one explicitly. You can change it any time in Settings."

**Step 3: Working hours.**
- The plugin presents an interface for configuring working days and per-day start/end times.
- Default values: Monday through Friday, 9:00 AM to 5:00 PM.
- The user can toggle individual days on or off and customize times per day.
- Two optional fields: "Earliest I'd ever send an email" (default 7:00 AM) and "Latest I'd ever send an email" (default 7:00 PM). These act as absolute floors and ceilings regardless of recipient timezone.
- A "Finish Setup" button completes onboarding. On completion the user is returned to their nearest open Gmail tab (the onboarding tab simply closes if no Gmail tab is open).

#### 5.1.4 Acceptance Criteria

- The user cannot complete onboarding without explicit consent. Enforced at Step 1: the "Get Started" button is disabled until the consent checkbox is checked, so the flow cannot proceed at all without consent.
- All collected data is stored in the browser's local extension storage, not transmitted to any server.
- Onboarding can be resumed mid-flow if interrupted.
- After onboarding, the user lands in Gmail with the plugin fully active; the success screen's "Return to Gmail" action focuses the nearest open Gmail tab.

---

### 5.2 Compose Window Integration

#### 5.2.1 Visual Changes

When the user opens a Gmail compose window with OutboxIQ installed, the plugin makes the following modifications:

1. The native "Send" button's dropdown caret continues to function, but the label inside the dropdown menu changes from "Schedule send" to "Schedule Send (powered by OutboxIQ)."
2. No other visual changes are made to the compose window itself.

#### 5.2.2 Click Behavior

When the user clicks "Schedule Send (powered by OutboxIQ)", the OutboxIQ-enhanced modal appears (Section 5.3) instead of Gmail's native scheduling modal.

#### 5.2.3 Fallback Behavior

If the OutboxIQ extension fails to load or encounters an error, Gmail's native Schedule Send must continue to function normally. The plugin must never block or interfere with native Gmail functionality.

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
> least once via OutboxIQ, the modal also shows a **"Last scheduled time"**
> row at the top (above the three presets), mirroring the equivalent row in
> Gmail's own native dialog (PRD §8.1 native feel). This was not in the
> original 3-preset spec; added so repeat users don't lose Gmail's
> "same time as last time" affordance. Implementation detail: OutboxIQ
> remembers the time **it** scheduled (stored locally per PRD §7.2 —
> `lastScheduled`, schema v2), rather than scraping Gmail's own value; this
> keeps it local-first and avoids extra Gmail interaction. It therefore
> reflects the last OutboxIQ-scheduled time, which can differ from Gmail's
> global memory (e.g., if the user also scheduled directly via Gmail).
> Clicking it schedules at that exact time via the §5.3.4 custom path.

#### 5.3.4 Pick Date & Time

A standard date and time picker for custom scheduling. Selected time is always in the user's timezone, clearly labeled.

> **Amendment (2026-05-16, owner-directed):** this section is labelled **"Pick custom"** in the UI (with the timezone abbreviation retained for the §5.3.4 "clearly labeled" requirement). Also, the modal's interaction model is **select-then-confirm**: choosing a Quick Option, the "Last scheduled time" row, or entering a custom date+time only *selects* it (visually highlighted; modal stays open). Nothing is scheduled until the user clicks the single primary **"Schedule"** button, which is disabled until a choice is made and which both schedules and closes the modal. This is consistent with §5.3.5's "Clicking 'Schedule' … submits" wording (it replaces an earlier click-a-row-fires-immediately behaviour).

#### 5.3.5 OutboxIQ Optimize Section

Below the standard options, a new section labeled "Optimize delivery for recipient" appears, containing:

**Recipient dropdown:**
- If exactly one email address is in the "To:" field, that recipient is auto-selected and the dropdown displays their name and email.
- If multiple recipients are in the "To:" field, the dropdown defaults to a placeholder value of "Choose" prompting the user to select one recipient to optimize for.
- The dropdown lists all recipients from the "To:" field. CC and BCC recipients are excluded for v1 to avoid clutter.

**Timing dropdown:**
- A second dropdown labeled "Optimize timing for" with three options:
  - "Morning peak (9:00 AM their time)"
  - "Midday engagement (1:00 PM their time)"
  - "End of day (4:00 PM their time)"
- Default: "Morning peak (9:00 AM their time)."
- A small info icon next to the label opens a tooltip explaining: "These windows are based on aggregated research across millions of email opens. Morning typically sees the highest open rate, midday catches recipients between meetings, and end-of-day captures the pre-departure inbox check."

**Recipient timezone display:**
- Below the timing dropdown, a small line of text confirms the recipient's detected timezone: "We'll send this at 9:00 AM in [Recipient's Timezone Abbreviation] ([City/Region]). That's [Time] your time."
- If the recipient's timezone could not be detected automatically, see Section 5.3.7.

**Schedule button:**
- Clicking "Schedule" computes the actual intended send time and then commits it as a **real, native Gmail scheduled send**. The user-facing behaviour is unchanged from the rest of this section; only the mechanism is specified here.
- **Mechanism (corrected 2026-05-16 — supersedes the original Gmail-API description):** the Gmail API does **not** expose any way to *create* a scheduled send (`messages.send`/`drafts.send` both send immediately; no `scheduledTime`/`sendAt` parameter exists). This was established and verified in `research/scheduled-send-api-spike.md` (the original text here predated that spike). OutboxIQ instead drives **Gmail's own native Schedule Send UI** via a verified DOM-automation recipe (the spike's "Verification" section is canonical; the live recipe lives in `extension/src/lib/schedule/gmail-recipe.ts`). Quick Options map onto Gmail's native preset rows; a custom time uses Gmail's native "Pick date & time" path. This is what preserves the native Scheduled label (§5.7) and keeps email content on-device (§13.2.4, was §7.3.4 — moved by the tier split) with no backend-scope expansion — see the spike's recommendation for why this approach was chosen over the API/cron alternatives.
- The Gmail API *is* still used for the **cancel** path (Unschedule-on-Reply, §5.6): `messages.list?q=in:scheduled` → `messages.trash` (also verified in the spike). Creation and cancellation use different mechanisms by necessity.

> **Design commitment (2026-05-16, owner-directed — Session 5.5):** the
> working hours collected at onboarding are an **informational input to
> §5.3.5 recipient-optimization recommendations** (a future session —
> recipient-optimization is not yet built; Session 6 built §5.5.1). When
> the recipient-optimal window allows latitude, the recommendation may
> prefer a candidate that also falls within the sender's working hours.
> This is **advisory only** — it never hard-blocks a recipient-optimized
> time; absolute limits remain the *only* hard constraint. This is why the
> §5.5 working-hours calculation is retained even though §5.5 Schedule
> Send no longer warns on working-hours violations (see §5.5 amendment).
> Captured now so Session 6 does not re-litigate whether working hours
> have a role here.

#### 5.3.6 Working Hours Check

If the computed send time falls outside the user's configured working hours, a secondary modal appears (Section 5.5) before the email is actually scheduled.

#### 5.3.7 Recipient Timezone Fallback

If the plugin cannot detect the recipient's timezone (see Section 5.4), an inline component appears asking the user to select it:

- Copy: "We couldn't automatically detect [Recipient Name]'s timezone. Pick one to continue, or we'll use yours."
- A dropdown lists all IANA timezones with the user's own timezone pre-selected.
- A note below: "We'll remember this for future emails to [Recipient Name]."

---

### 5.4 Recipient Timezone Detection (Technical Spec)

#### 5.4.1 Cascading Detection Logic

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
> percentage of recipient lookups in OutboxIQ's target use (knowledge
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

### 5.5 Auto-Reschedule on Outside Working Hours

> **Amendment (2026-05-16, owner-directed — Session 5.5):** §5.5 enforcement
> is **split by trigger**. **Schedule Send** raises the soft warning for
> **absolute-limit violations only** — warning a user for *scheduling*
> outside their working hours is warning them for OutboxIQ's core use case
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
> OutboxIQ already owns and carries a direct §5.2.3 ("never block native
> Gmail") risk. v1 §5.5 therefore enforces only the **second** trigger: a
> time the user explicitly picks via OutboxIQ's Schedule Send modal
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
> Free v1**. OutboxIQ now ships as two tiers of the same generation:
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

#### 5.7.1 Approach

OutboxIQ does **not** build a separate dashboard for scheduled emails. Instead, it leverages Gmail's native "Scheduled" label, which already provides:
- A list view of all scheduled emails.
- The ability to click into a scheduled email to view its content.
- A native "Cancel send" button on each scheduled email.
- The ability to edit a scheduled email and reschedule it.

#### 5.7.2 OutboxIQ Enhancements to the Native View

The plugin adds the following minimal enhancements:

1. **OutboxIQ badge:** A small icon (the OutboxIQ logo or a distinguishing visual marker) appears next to emails in the Scheduled label that were scheduled via OutboxIQ. Emails scheduled via Gmail's native UI do not show this badge.

2. **Hover tooltip on the badge:** When the user hovers over the badge, a tooltip displays the optimization details: "Optimized for [Recipient Name] — [Timing Option] in [Recipient Timezone]."

3. **No modification to native Cancel send and edit flows:** When the user cancels or edits a scheduled email, Gmail's native behavior applies. The plugin only listens for these events to clean up its local cache and (if applicable) deregister the scheduled message from the backend.

#### 5.7.3 Acceptance Criteria

- The native Scheduled label continues to function exactly as it does today.
- OutboxIQ-scheduled emails are visually distinguishable from Gmail-native scheduled emails.
- Canceling a scheduled email via the native UI properly notifies the OutboxIQ backend (if applicable) so the push notification subscription can be cleaned up.

---

### 5.8 Settings and Preferences Panel

#### 5.8.1 Access

Accessible via:
- An OutboxIQ icon in the Chrome toolbar (or browser action button).
- A "Settings" link inside the Schedule Send modal's overflow menu.
- A direct link from the onboarding completion screen.

#### 5.8.2 Sections

**Profile and Timezone**
- Display the user's email address (read-only).
- Display the user's current timezone with an option to override.
- A "Refresh from Google Calendar" button to re-fetch the timezone setting.

**Working Hours**
- Per-day toggle and time pickers.
- Earliest and latest absolute send times.
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

#### 5.9.1 Behavior

After the user successfully schedules an email via OutboxIQ, a toast notification appears at the bottom of the screen for 7 seconds:

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
>   OutboxIQ server (there is none). OAuth uses `access_type=online`
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
> - "**All secrets … never in source code**" is **binding without
>   exception for the Premium v1 backend's Client Secret and encryption
>   keys** (§13.3 — env vars only). For **Free v1** the Web-application
>   Client Secret used in the extension-side `access_type=online` exchange
>   is, by Google's documented installed-app model, **not a confidential
>   secret** (it is inherently visible in any installed client; the grant
>   is protected by the extension-ID-bound redirect URI, not by secret
>   confidentiality). Shipping it in the extension's typed config is a
>   **deliberate, documented exception** to this bullet for that one
>   non-confidential value only — see §7.5. Every *actually*-confidential
>   secret (the backend Client Secret, per-user encryption keys, any API
>   keys) stays env-var-only, unchanged.
> - "OAuth tokens must never be exposed to the page or to
>   web-accessible resources" is **unchanged and binding in both tiers**.

### 6.6 Minimum OAuth Scopes

Request only the following scopes:
- `https://www.googleapis.com/auth/gmail.compose` (to create and schedule drafts).
- `https://www.googleapis.com/auth/gmail.modify` (to cancel scheduled emails and manage labels).
- `https://www.googleapis.com/auth/calendar.settings.readonly` (to read the user's timezone).
- `https://www.googleapis.com/auth/contacts.readonly` (to look up recipient information).
- `https://www.googleapis.com/auth/directory.readonly` (only requested for Workspace users, only if needed for directory lookup).

Do **not** request `gmail.readonly` or any broader scope.

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
2. **Content script:** Injected into the Gmail tab. Detects compose windows, modifies the Schedule Send dropdown, renders the OutboxIQ modal, and listens for scheduling events.
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
    "absoluteEarliest": "07:00",
    "absoluteLatest": "19:00"
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

> **Implementation note:** the implemented `OutboxIQState` adds a top-level `schemaVersion` (currently **`2`**; `SCHEMA_VERSION` in `extension/src/lib/constants.ts`) and represents `consent` as **nullable** — it is `null` until the user completes onboarding (PRD §5.1), then set to the object shown above. The schema here describes the shape once consent exists.
>
> **Schema v2 (2026-05-16):** added a nullable top-level `lastScheduled` (`{ display, gmailDate, gmailTime } | null`) — supports the §5.3.3 "Last scheduled time" amendment. Purely additive; the v1→v2 "migration" is just `getState()`'s default-merge resolving an absent key to `null` (no explicit version branch yet, per the migration convention in `CLAUDE.md`). Stores only pre-formatted time strings — never email content (§13.2.4, was §7.3.4).

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
> #### Free v1 — `access_type=online`, no refresh token, no backend
>
> - The extension uses Google OAuth 2.0 with the scopes in §6.6, via the
>   **Session-7 Web-application OAuth client** (Entry 29), kept for Free
>   v1 — see "Why the Web-application client" below.
> - The extension runs `chrome.identity.launchWebAuthFlow()`, which opens
>   Google's consent screen and lets the user **pick which Google account
>   to authorize**, then redirects to
>   `https://<extension-id>.chromiumapp.org/…` with a one-time
>   authorization code.
> - The **extension itself** exchanges that code at Google's token
>   endpoint with Client ID + Client Secret **and `access_type=online`**.
>   Google returns an **access token only (≈1 h expiry); no refresh
>   token is issued.** There is **no backend and no server-side exchange**
>   in Free v1.
> - The access token is stored in `chrome.storage.local` with its expiry
>   timestamp and used for the Calendar API (user timezone, §5.1.3) and
>   the People / Workspace Directory APIs (recipient timezone, §5.4).
> - On expiry the extension re-runs `launchWebAuthFlow`; Chrome typically
>   re-issues silently if the user is still signed in and consent is
>   still valid (no refresh-token machinery needed). Schedule Send itself
>   needs no token — it drives Gmail's own UI (§5.3.5 mechanism).
> - Users revoke access at any time via Google account settings; with no
>   stored refresh token, revocation simply causes the next token fetch
>   to fail, degrading to the §6.7 fallbacks.
>
> **The Client Secret in Free v1 is *not* confidential — by Google's own
> installed-app model — and this is a deliberate, documented exception to
> §6.5's "secrets … never in source code".** For an extension OAuth flow
> with online access the Client Secret is publicly visible to anyone
> inspecting the extension; Google's security model binds the grant to
> the **redirect URI / extension ID**, not to Client-Secret
> confidentiality. This is the expected, Google-documented pattern for
> installed clients. (§6.5 carries a matching tier note. The *Client
> Secret that matters* — the one that must stay out of source — is the
> **Premium v1 backend's**, used for the §13.3 server-side exchange;
> §6.5's rule is binding there, unchanged.)
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

OutboxIQ should look like a natural extension of Gmail, not a third-party plugin. Use Google's Material Design language, system fonts, and Gmail's color palette. The only place OutboxIQ branding appears prominently is in the Settings panel and the onboarding flow. Inside the compose window and the Schedule Send modal, the visual treatment matches Gmail's native components as closely as possible.

### 8.2 Progressive Disclosure

Show the minimum interface needed for the task at hand. Advanced options (recipient timezone override, custom timing) appear only when relevant. The Schedule Send modal opens with quick presets visible and the optimization section collapsed by default, expanding only if the user has multiple recipients or wants to optimize.

### 8.3 Sensible Defaults, Easy Overrides

Pre-select the most likely choice (the single recipient in the To field, 9:00 AM morning peak, the user's detected timezone), but make every default a single click away from being changed. Never force the user to confirm a default that is statistically correct for 90 percent of cases.

### 8.4 Always Show Timezone

Anywhere a time is displayed, the timezone must appear immediately adjacent. No exceptions. This includes the Schedule Send modal header, the recipient optimization line, the confirmation toast, and the auto-reschedule prompt.

### 8.5 Explain the Why

Whenever the plugin asks for data or makes a recommendation, a one-line explanation accompanies it. This builds trust and aligns with GDPR's transparency principle. Examples: "We use this to send emails in your timezone by default," "These windows are based on aggregated research across millions of email opens."

### 8.6 Reversibility

Every action has an undo or cancel path. Scheduled emails can be canceled or edited via Gmail's native UI. The 7-second undo toast catches the most recent action. Destructive actions in Settings (clear cache, delete data) require explicit confirmation.

### 8.7 Minimal Cognitive Load

One decision per screen. The onboarding flow breaks setup into separate steps rather than presenting one overwhelming form. The Schedule Send modal does not pile recipient selection, timing, timezone, and working hours warnings into a single view. Each concern is presented sequentially and clearly.

### 8.8 Trust Signals

Privacy commitments are visible, not buried. The onboarding flow presents the privacy/transparency rationale prominently on its first screen, immediately above the consent gate (see §5.1.3). The Settings panel has a Privacy and Data section, not a single fine-print link. A small "Your data stays on your device" line appears near data inputs where appropriate.

### 8.9 Keyboard Accessibility

All interactive elements are keyboard reachable. The Schedule Send modal supports Tab for navigation, Enter to confirm, and Escape to cancel. Shortcut hints appear in tooltips for power users.

### 8.10 Empty States with Personality

First-time users see a friendly walkthrough, not a blank screen. The recipient timezone cache view, when empty, displays helpful copy like "No recipient timezones cached yet. They'll appear here as you optimize emails for specific recipients."

### 8.11 Visual Distinguishability Without Clutter

The OutboxIQ badge on scheduled emails is small, unobtrusive, and uses a single muted accent color. It signals "OutboxIQ-scheduled" without dominating the email row or competing with Gmail's existing UI elements.

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
2. Should the plugin track open rates of OutboxIQ-scheduled emails (opt-in only) to refine recommendations over time?
3. Should holiday awareness be added in v2 by reading from the user's Google Calendar?
4. Should multi-account support be added in v2?
5. Should the plugin extend to other email clients (Outlook, Apple Mail) as a cross-client product?

---

## 11. Out of Scope: Do Not Build (v1)

The following features and behaviors must **not** be implemented in v1. This list exists to prevent scope creep and to ensure downstream tools do not infer or add unrequested functionality.

> **Tier-split note (2026-05-17, owner-directed — pre-Session-8, after
> Entry 31).** **Items 1–20 below are out of scope for *all tiers* of
> OutboxIQ** — Free v1 *and* Premium v1. They are forbidden
> **product-wide and permanently**; "Premium" never reopens any of them.
> This is categorically different from **Unschedule-on-Reply and the
> backend service**, which are **in Premium v1 scope (§13), not out of
> scope** — tier-gated and deferred from Free v1, with their full design
> preserved for a future Premium build. The distinction is load-bearing:
> a §11 item = never build, in any tier; a §13 item = build, but in the
> Premium tier. Do not collapse the two (e.g. do not read
> "Unschedule-on-Reply is deferred" as "Unschedule-on-Reply is out of
> scope", and do not treat any §11 item as merely "Premium").

1. **Manual delivery approval** workflows where the user must approve each scheduled email before send.
2. **Email tracking, read receipts, or pixel-based open detection.** OutboxIQ does not track whether recipients have opened emails.
3. **Cross-user recipient behavior analytics** or any form of engagement scoring built from aggregated user data.
4. **AI-generated email content, subject line suggestions, tone analysis, or message rewriting** of any kind.
5. **CRM integrations** (Salesforce, HubSpot, Pipedrive, etc.).
6. **Mass email, newsletter, or campaign features.** OutboxIQ is for one-to-few personal and professional emails, not bulk outreach.
7. **Email templates or snippet management.**
8. **A/B testing of send times.**
9. **Cross-account simultaneous orchestration.** Each Gmail account is treated independently. No multi-account dashboards or unified inboxes.
10. **White-labeling or custom branding** for end users or third parties.
11. **Mobile app companion.** The Chrome extension is desktop-only in v1. No iOS or Android app.
12. **Custom domains or custom SMTP support.** Gmail accounts only.
13. **Analytics dashboards** showing open rates, click rates, engagement metrics, or recipient profiles.
14. **Reading email body content** beyond what is required for compose-window injection. The plugin must not parse, store, or transmit email body text.
15. **Notification preferences panel** with granular per-event notification toggles. A single global toggle for the schedule confirmation toast is sufficient.
16. **Multi-account support** within a single Chrome profile. If users want to use OutboxIQ on multiple Gmail accounts, they can use separate Chrome profiles.
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

---

## 13. Premium v1 Scope (Tier-Gated — Deferred from Free v1, Not Out of Scope)

> **Added 2026-05-17 (owner-directed — pre-Session-8, after Entry 31).
> Tier-split decision; `notes/owner-decisions-log.md` Entry 32.**
>
> **What this section is.** OutboxIQ ships as **two tiers of the same
> generation** (see the §1 amendment): **Free v1** (extension-only, no
> backend, free — the public-launch target) and **Premium v1**
> (extension + backend, paid — built *after* Free v1 launches and
> validates demand). This section collects the features that are
> **in Premium v1 scope and therefore deferred from Free v1's launch**.
>
> **These are NOT deleted, and NOT §11 "Do Not Build" items.** The PRD
> originally specified every item here as a v1 feature; the tier split
> is a deliberate, owner-driven scope decision made because
> implementation work across Sessions 5–7 surfaced that the
> cost-to-ship of the full scope (CASA Tier 2 — several-thousand-USD,
> 4–8 weeks; backend infra; per-user encryption; ongoing hosting; EU
> compliance posture) is substantial, while the PRD's **core value
> proposition — recipient-aware Schedule Send with
> Optimize-for-recipient — is fully deliverable with no backend**
> (People / Workspace Directory / Calendar APIs are all callable
> directly from the extension). Unschedule-on-Reply is the *only*
> PRD-specified feature requiring backend-initiated Gmail calls, so it
> (and the backend it needs) tier-gates cleanly to Premium v1.
> Contrast the Maps removal (Entry 26), which was a **permanent
> deletion**: this is the opposite — a **preservation** for a later
> tier. **The content below is the verbatim, intact prior design** so a
> future Premium v1 build can implement it without reconstruction.
> Prior locked decisions (Entry 26 single-purpose / Maps-removal;
> Entry 31 Option-B token architecture) are **not rewritten or
> reopened** — they remain accurate historical records and remain the
> binding design **for the Premium v1 backend** (Entry-4 discipline: a
> locked decision is locked against drift, not against the new fact
> that Unschedule-on-Reply is now tier-gated).

### 13.1 Unschedule on Reply (was §5.6)

> Moved verbatim from §5.6 by the tier-split amendment. This is the
> Premium v1 design; §5.6 now stubs to here.

#### 13.1.1 Behavior

When a user schedules an email via OutboxIQ and a recipient replies before the scheduled send time, the scheduled email is automatically canceled. The user receives a notification:

> "Your scheduled email to [Recipient Name] was canceled because they replied. View the reply and decide what to send next."

This applies to emails with multiple recipients as well. If any one recipient replies, the email is canceled for everyone (matching the behavior described in the reference PDF).

#### 13.1.2 Technical Spec

This is the only feature requiring a backend service.

**Architecture:**
1. When the user schedules an email via OutboxIQ, the extension registers the scheduled message ID and thread ID with the OutboxIQ backend.
2. The backend subscribes to Gmail push notifications for the user's inbox via Google Cloud Pub/Sub.
3. When a new message arrives in a watched thread, Google publishes a notification to the backend.
4. The backend checks whether the new message is from a recipient of any pending scheduled email.
5. If a match is found, the backend calls the Gmail API to cancel the scheduled email (delete the draft or revoke the scheduled send).
6. The backend pushes a notification to the extension via WebSocket or short polling.
7. The extension displays the cancellation toast to the user.

**Required Gmail API endpoints:**
- `users.watch` to subscribe to inbox push notifications.
- `users.messages.list` and `users.messages.get` to fetch the new message metadata.
- `users.drafts.delete` or `users.messages.delete` to cancel the scheduled message.

**Backend data stored:**
- User's OAuth refresh token (encrypted at rest).
- User's email address.
- Active scheduled message IDs and their thread IDs.
- No email content is stored. Only metadata required for the matching logic.

**Backend hosting:**
- Must be hosted in an EU region (for example, Frankfurt, Dublin, or Amsterdam) for GDPR compliance.
- Stateless except for the data above.
- All stored data must be deletable on user request.

### 13.2 Backend Service (was §7.3)

> Moved verbatim from §7.3 by the tier-split amendment, **including the
> Entry-26 (Maps-removal / single-purpose) and Entry-31 (OAuth token
> management) amendments unchanged**. This is the Premium v1 backend
> design; §7.3 now stubs to here. The one-purpose discipline and the
> Maps-removal narrowing carry forward to the Premium v1 backend intact.

#### 13.2.1 Purpose

The backend serves **exactly one purpose**:

1. **Unschedule-on-Reply relay.** Subscribes to Gmail push notifications via Google Cloud Pub/Sub, detects when a recipient replies to a thread that has a pending OutboxIQ-scheduled email, and cancels the scheduled send. See Section 13.1 (formerly §5.6).

> **Amendment (2026-05-16 — owner-directed):** the former second purpose
> ("Maps API proxy for recipient timezone resolution") is **removed from
> product scope, not deferred** — the Google Maps Geocoding and Time Zone
> APIs are gone entirely (see the §5.4.1 amendment for the hit-rate-versus-
> cost-and-complexity reasoning). The backend is now single-purpose. No
> Maps API key, billing, OAuth scope, or proxy endpoint exists or will.
> Recorded in `notes/owner-decisions-log.md` (Entry 26).

The backend is not used for any other feature. In particular: no analytics, no telemetry, no user profile or social features, no content storage of any kind. Any future proposal to expand the backend's role must be reviewed against this **one-purpose** scope boundary.

> **Amendment (2026-05-17, owner-directed — pre-Session-8):** the
> **one-purpose** discipline is **unchanged and still binding** — but the
> honest framing is: the backend's purpose is **Unschedule-on-Reply *and*
> the OAuth token management that enables it**. Per the §13.3 (Premium v1)
> OAuth amendment, refresh tokens live only on the backend (server-side
> code exchange, per-user encryption); the backend therefore owns the
> OAuth `exchange`/`token`/`revoke` flow (§13.2.3). This is **not a second
> purpose** and is **not** a reversal of the Entry-26 Maps-removal /
> single-purpose narrowing: token management is the **infrastructure that
> the one purpose structurally requires** (§13.1 needs backend-initiated
> Gmail calls when the extension is not running ⇒ a backend refresh token
> ⇒ the backend must run the OAuth exchange). Because there is exactly one
> Google OAuth grant per user, that same backend-managed access-token path
> is **necessarily reused** by the extension's other Google API calls
> (Calendar/People in §5.4; the §13.1 cancel path) — reuse of the one
> purpose's infrastructure, not scope creep. The scope test is unchanged:
> anything that is **not** Unschedule-on-Reply or the OAuth/token plumbing
> that enables it does **not** belong on the backend (still no analytics,
> telemetry, profiles, or content storage). Recorded in
> `notes/owner-decisions-log.md` (Entry 31).

#### 13.2.2 Hosting

- Region: EU (Frankfurt, Dublin, Amsterdam, or equivalent).
- Database: Encrypted at rest. Suggested: a managed Postgres or equivalent.
- Encryption: All sensitive fields (OAuth refresh tokens) encrypted with per-user keys.

#### 13.2.3 Endpoints

- `POST /subscribe` — Register a scheduled email for monitoring. Body includes user email, message ID, thread ID, recipient emails.
- `POST /unsubscribe` — Deregister a scheduled email (called when the user cancels or sends manually).
- `POST /push/gmail` — Webhook endpoint that receives Gmail push notifications from Google Cloud Pub/Sub.
- `WS /events` — WebSocket endpoint for the extension to receive real-time cancellation events.
- `GET /export` — Returns all user data as JSON (right of access).
- `DELETE /user` — Deletes all user data (right of erasure).

> **Amendment (2026-05-17, owner-directed — pre-Session-8):** the
> Option-B OAuth flow (§13.3 amendment) adds three authentication
> endpoints:
> - `POST /auth/exchange` — the extension POSTs the one-time
>   authorization code; the backend exchanges it with Google (Client
>   Secret in backend env only), stores the per-user-encrypted refresh
>   token (§13.2.4), and returns a short-lived access token.
> - `POST /auth/token` — the extension requests a fresh access token; the
>   backend mints one from the stored refresh token.
> - `POST /auth/revoke` — user-initiated revocation; the backend revokes
>   the grant with Google and deletes the stored refresh token.
>
> These are the OAuth plumbing for the single purpose (§13.2.1 amendment),
> not new product surface. Endpoint names are the working spec; the
> Premium v1 implementation may refine exact paths but not this contract.

#### 13.2.4 Data Stored

- User email address (hashed where possible).
- Encrypted OAuth refresh token.
- Active scheduled message records: `{ user_email, message_id, thread_id, recipient_emails[], scheduled_send_time, created_at }`.

No email content, no recipient profiles, no usage analytics.

> **Amendment (2026-05-17, owner-directed — pre-Session-8): confirmation,
> not a change.** This section's "Encrypted OAuth refresh token" is the
> **single, authoritative** location for a user's refresh token (the
> §13.3 amendment supersedes the old client/backend split). Concretely:
> the stored refresh token is encrypted at rest with the user's **per-user
> key**; the extension persists **no refresh token at all** and holds only
> short-lived access tokens (in service-worker memory / transient storage),
> fetched on demand via `POST /auth/token`. The existing wording already
> covers this — recorded explicitly so the Premium v1 build implements it
> without re-deciding.

### 13.3 Premium v1 OAuth — Option B (backend-held refresh tokens)

> Moved verbatim from the §7.5 Entry-31 amendment by the tier-split
> amendment. **This is the locked, binding OAuth design for Premium v1.**
> §7.5 (now Free-v1-authoritative) points here for the Premium model.
> Per Entry-4 discipline this design is **not reopened** by the tier
> split — it was correct given the then-true assumption that
> Unschedule-on-Reply was in v1's only tier; it remains correct *for
> Premium v1*.

> **Amendment (2026-05-17, owner-directed — pre-Session-8, Entry 19
> "lock the design in calm"):** the original §7.5 third bullet's
> "**locally** for client-only features, on the backend for
> Unschedule-on-Reply" split is **superseded**. **Refresh tokens live
> ONLY on the backend, encrypted with per-user keys (Option B —
> server-side authorization-code exchange).** The extension **never**
> stores a refresh token and never performs the code→token exchange
> itself (PKCE-in-extension, "Option A", is explicitly rejected).
>
> **Flow:** the extension runs the user-facing OAuth dance
> (`chrome.identity.launchWebAuthFlow`, the Session-7 Web-application
> client), receives a **one-time authorization code**, and POSTs it to the
> backend (`POST /auth/exchange`, §13.2.3). The backend exchanges the code
> with Google (the **Client Secret lives only in backend env vars** — never
> in the extension; satisfies §6.5), encrypts the **refresh** token with
> the user's per-user key (§13.2.4), stores it, and returns a **short-lived
> access token**. When the extension needs a fresh access token it requests
> one from the backend (`POST /auth/token`), which mints it from the stored
> refresh token. Revocation (`POST /auth/revoke`) revokes with Google and
> deletes the stored refresh token.
>
> **Why (recorded for future architectural reference — CASA prep,
> enterprise security reviews):** (1) Unschedule-on-Reply (§13.1) requires
> backend-initiated Gmail calls when the extension is not running — that
> *structurally* requires a backend refresh token; the Session-7
> Web-application client (Entry 29) was chosen precisely to enable this.
> (2) §13.2.4 already specifies backend per-user-encrypted refresh tokens —
> Option B *is* the spec; Option A would have needed an Entry-6 PRD
> amendment. (3) Privacy story stays clean ("on-device, except the minimal
> EU relay, encrypted per-user"). (4) Keeps the CASA Tier-2 audited surface
> in one place. (5) Enterprise/GDPR posture (per-user-encrypted, EU
> region) is what security reviews expect; tokens in `chrome.storage.local`
> would not survive that scrutiny.
>
> **Graceful-degradation consequence (an implication this decision
> surfaces, not previously named):** because every access token is now
> minted via the backend, a backend outage degrades **not only**
> Unschedule-on-Reply (§6.7) **but also** the client-only Calendar/People
> features. This does **not** weaken §6.7's "never block the user" rule —
> it degrades to the **already-specified §6.7 fallbacks** (Calendar
> unavailable → browser timezone; People unavailable → manual recipient
> timezone selection) and Schedule Send itself is unaffected (it drives
> Gmail's own UI, no token). The newly broadened trigger of those existing
> fallbacks is the only change; §6.7's fallback *behaviour* already covers
> it. **This consequence is Premium-v1-only** (Free v1 fetches tokens
> directly from Google with no backend — see the §7.5 Free v1 model).
> Recorded in `notes/owner-decisions-log.md` (Entry 31).

### 13.4 Premium v1 launch gates

Premium v1 has its own launch checklist — see **`PREMIUM_LAUNCH_CHECKLIST.md`**
— covering: CASA **Tier 2** assessment (backend + restricted scopes);
backend infrastructure (Fly.io EU app, Supabase EU project, the per-user
encryption-key strategy, custom backend domain, backup/DR); the OAuth
switch from `access_type=online` to `access_type=offline` (this §13.3
Option-B flow); the backend-processing addendum to the Privacy Policy and
Terms of Service; the Free→Premium upgrade/migration story
(re-authorization for the offline grant + backend refresh-token storage);
and subscription/billing infrastructure. Free v1's launch gates remain in
`PRE_LAUNCH_CHECKLIST.md`.

---

**End of Document**
