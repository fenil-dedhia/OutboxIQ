# Gmail Scheduled-Send API Spike

**Date:** 2026-05-15
**Status:** ✅ Verified end-to-end on consumer Gmail (2026-05-15). Approach C confirmed. Schedule Send / Unschedule-on-Reply feature work is unblocked.
**Author:** Session 2 (Claude Code, reviewed by Fenil)

---

## Method

Desk research only. No live Gmail API calls were made. Findings are drawn from the current Gmail API reference, the Google Issue Tracker, and the publicly documented architectures of comparable third-party tools (Boomerang, easy-gmail-scheduler). Two questions in the Open Questions section require hands-on verification with a real Gmail account before any Schedule Send feature code begins.

---

## Foundational finding

**The Gmail API does not expose a way to *create* a native scheduled send.** Neither `users.messages.send` nor `users.drafts.send` accepts a `scheduledTime`, `sendAt`, or equivalent parameter. Both endpoints send immediately. This was verified against the current official API reference (May 2026).

Google has a public feature request open for this capability (Issue Tracker #140922183, "Expose functionality for creating scheduled emails") that has been open since 2019 and is still unresolved. Multiple 2026-dated third-party sources continue to describe the same gap, so we should plan as if this will not be addressed within the v1 timeline.

**Implication:** Every viable approach is a workaround. There is no "blessed" path.

---

## Candidate approaches

### A. Backend cron sends a draft at time T (Boomerang / Mixmax pattern)

Extension creates a Gmail draft via API, registers `{draft_id, scheduled_time, user_email}` with the backend; backend uses the encrypted refresh token to call `drafts.send` at T.

- **Reliability:** High. Works even if Chrome is closed.
- **Native Scheduled label (PRD §5.7):** ❌ Emails appear as regular sent messages at T, not in Gmail's native Scheduled label.
- **Backend scope (PRD §7.3.1):** ❌ **Expands** backend scope beyond the locked "two purposes only" rule. Backend now also "sends emails on the user's behalf at time T."
- **Separate scheduled-emails view (PRD §11.18):** ❌ Would force us to build a custom dashboard, which §11.18 explicitly forbids — Gmail's Scheduled label won't show these.
- **No email content stored (PRD §7.3.4):** ✅ Only `draft_id` is stored; content lives in the user's own Drafts.
- **Unschedule-on-Reply (PRD §5.6):** ✅ Trivially cancellable — backend just deletes its own record before T.

### B. Extension-only service-worker timer (`chrome.alarms`)

Extension creates a draft, registers an alarm at T, calls `drafts.send` when the alarm fires.

- **Reliability:** ❌ **Poor.** Chrome must be running at T. MV3 service workers can be unloaded but `chrome.alarms` survives across worker restarts — however, the browser process itself still has to be alive. If the user closes Chrome at 5 PM and the email is scheduled for 9 AM tomorrow, it sends late (whenever Chrome reopens).
- **Native Scheduled label (§5.7):** ❌ Same problem as A — regular sent message at T.
- **Separate scheduled-emails view (§11.18):** ❌ Same problem as A.
- **Backend scope:** ✅ No backend involvement.
- **Unschedule-on-Reply:** ❌ Backend would have to push to the extension to cancel a local alarm; round-trip is fragile.

### C. UI automation — trigger Gmail's *own* native Schedule Send

Extension content script programmatically drives Gmail's existing "Schedule send" UI: fills the compose window, opens the Schedule Send dialog, sets the target date/time, confirms. End state: a *real* Gmail-native scheduled message.

- **Reliability:** ✅ High once scheduled — Google's own infrastructure delivers it. The fragility moves to *creation time*, not delivery time.
- **Native Scheduled label (§5.7):** ✅ Free of charge — it's a real native scheduled send.
- **Separate scheduled-emails view (§11.18):** ✅ Not needed — Gmail's own works exactly as the PRD assumes.
- **Backend scope (§7.3.1):** ✅ No expansion.
- **No email content off-device (§7.3.4, §6.1.1):** ✅ Email never leaves the user's Gmail tab.
- **Unschedule-on-Reply (§5.6):** ⚠️ **Contingent on Open Question 1.** Plausible-but-unverified: the Gmail API may expose scheduled messages under the `SCHEDULED` system label and allow cancellation via `messages.delete`. If it does, Unschedule-on-Reply is feasible. If it doesn't, we have a hard fork (see "If Open Question 1 answers 'no'" below).
- **Cost:** ⚠️ DOM fragility — Gmail UI changes will periodically break this. This is the standard tax for being a Gmail extension and is consistent with the PRD's "enhance, don't replace" stance.

### D. Hybrid — pick A or B and renegotiate PRD §5.7 + §11.18

Not a separate technical approach; just an explicit acknowledgement that A/B require dropping the native-Scheduled-label commitment. Surfaced only so the fork is on the record.

---

## Recommendation

**Approach C — verified end-to-end on consumer Gmail (2026-05-15). Proceed.**

C is the only approach that satisfies all four hard architectural commitments — native Scheduled label, no separate dashboard, no backend scope expansion, no email content off-device. Both blocking open questions (OQ1, OQ2) passed hands-on verification — see the Verification section below for the confirmed mechanism and the working DOM-automation recipe. The cost (DOM fragility) is the tax we already accepted by building a Gmail extension.

The fallback forks (drop Unschedule-on-Reply, or switch to approach A) are no longer needed for consumer Gmail. They remain relevant only if the Workspace verification (Open Question 4, pre-launch) surfaces a blocker.

---

## Verification (2026-05-15, consumer Gmail — test account)

Both blocking open questions verified hands-on via OAuth Playground (API) and DevTools console (DOM). **Both pass.**

### OQ1 — Can the API find and cancel scheduled messages? ✅ YES

The cancellation pathway is *not* what desk research guessed:

- `messages.list?labelIds=SCHEDULED` → **400 INVALID_ARGUMENT** ("Invalid label: SCHEDULED"). No SCHEDULED system label exists.
- `drafts.list` → **empty**. Scheduled messages are not exposed as drafts while pending.
- `messages.list?q=in:scheduled` → **returns the scheduled message** (id + threadId). Undocumented search-query syntax; this is the working discovery path.
- `messages.trash` on that id → **cancels the scheduled send** (verified: it left the Scheduled label). The trashed item then carries `labelIds [DRAFT, IMPORTANT, TRASH]`, confirming scheduled messages are internally a hidden draft state.

**Unschedule-on-Reply backend flow (confirmed feasible):** on a reply push, `messages.list?q=in:scheduled` → match by `threadId` → `messages.trash`.

### OQ2 — Can the extension drive Gmail's native Schedule Send? ✅ YES, with a specific recipe

Gmail uses Google's `jsaction` event-delegation framework. The click handler is **not** on the menu items — it's ~3 ancestors up on a `<div class="M9">` container that resolves the clicked item by **coordinate hit-testing**. Naïve synthetic clicks fail silently. The recipe that works:

- **Chevron** (`div[role="button"][aria-label="More send options"]`): responds to plain `mousedown`+`mouseup`+`click` (has its own local handler).
- **"Schedule send" menuitem** (`div[role="menuitem"][selector="scheduledSend"]` — the `selector` attribute is locale-independent, unlike visible text) and **modal presets** (`[role="dialog"][aria-label="Schedule send"] [role="menuitem"].Az`) require the full recipe:
  1. dispatch on the **innermost content `div`**, not the `[role="menuitem"]` wrapper;
  2. include real `clientX`/`clientY` from `getBoundingClientRect()` — **this was the breakthrough**; the delegated handler needs coordinates;
  3. full sequence: `pointerover`→`pointerenter`→`mouseover`→`mouseenter`→`pointerdown`→`mousedown`→`pointerup`→`mouseup`→`click`;
  4. fresh page user activation (a real user click within ~5s) — recommended insurance; not proven strictly required.

End-to-end confirmed: chevron → menuitem → "Tomorrow morning" preset, with a real subject/body, produced a genuine native scheduled message in Gmail's Scheduled label.

**Implementation notes:**
- The user-activation requirement is *consistent with our UX* — the user always clicks Fashionably Late's own "Schedule Send" button first, supplying activation. Not a real constraint.
- Empty subject/body triggers Gmail's native `window.confirm()`. A content script can't easily suppress a native confirm, but real users always have a composed email, so this won't normally fire. Noted, not a blocker.
- The **"Pick date & time" custom path** (date/time inputs + confirm button) was **not** verified this session — only the preset path. Verify during §5.3 implementation (lower risk: same recipe plus form-field value setting).

---

## Trade-offs accepted

1. **DOM fragility on the scheduling action itself.** Gmail UI updates may periodically break the "schedule a send" flow. Mitigation: defensive selectors, a manual smoke test before each release, and a clear fallback to Gmail's own UI if our injection fails.
2. **DOM fragility is a permanent operational cost, not a one-time implementation cost.** Realistically, every few months Gmail will push a UI update that may break our injection, and we will need to fix it quickly — likely within days, since a broken Schedule Send button is a complete-feature outage for Fashionably Late users. This is an ongoing maintenance commitment, not a one-off. We accept it explicitly here so it doesn't come as a surprise post-launch.
3. **No standard API path.** We are building on undocumented surface area (Gmail's compose DOM and possibly the SCHEDULED system label). Google could break either at any time. We accept this as the price of the native-feel commitment.
4. **The DOM-automation recipe is fragile and non-obvious.** It depends on Gmail's `jsaction` delegation continuing to hit-test by coordinates, on dispatching to the inner content element, and on the full event sequence. A Gmail refactor of its *event layer* (not just visual CSS) could break it in ways harder to fix than a selector change. The working recipe is documented in the Verification section so it isn't lost. (Unschedule-on-Reply is no longer conditional — OQ1 verified the API cancel path.)

---

## Open Questions

### 1. ✅ RESOLVED (2026-05-15) — Can scheduled messages be canceled via the Gmail API?

**Answer: YES, via a different path than desk research guessed.** Not a label (`labelIds=SCHEDULED` → 400) and not in `drafts.list`. Working path: `messages.list?q=in:scheduled` to find, `messages.trash` to cancel. Verified end-to-end. Full detail in the Verification section.

### 2. ✅ RESOLVED (2026-05-15) — Is Gmail's Schedule Send UI stable enough to drive programmatically?

**Answer: YES, with a specific recipe** (inner-content target + real coordinates + full pointer/mouse sequence; Gmail uses `jsaction` coordinate-based delegation). Preset path verified end-to-end on consumer Gmail. Custom "Pick date & time" path still to be verified during §5.3 implementation. Full detail in the Verification section.

### 3. (Defer) Does the badge-overlay strategy in §5.7.2 work?

Once a scheduled message exists, we need to find it in the Scheduled label DOM and overlay our badge. Open question: is the rendered DOM stable enough, and do we have a reliable correlation key (probably the Gmail message ID) between our local metadata and the row in the Scheduled label? Investigate during §5.7 implementation, not now.

### 4. (Verify before public launch) Workspace vs. consumer differences

Workspace tenants sometimes have admin-disabled features. Verify that Schedule Send is present, DOM-driveable, and not admin-disabled on Google Workspace accounts before we promise it to Workspace users. Many of our target users (knowledge workers, salespeople, recruiters, consultants) are on Workspace, so a failure mode where Fashionably Late silently breaks on Workspace would hit a large share of the user base.

Tracked in `PRE_LAUNCH_CHECKLIST.md` under "Compatibility & Verification" — verification is not blocking for v1 feature work on consumer Gmail, but must be completed before Chrome Web Store submission.

### 5. (Defer) Confirmation prompts in the UI flow

If Gmail shows a confirmation dialog as part of its native Schedule Send (it currently doesn't, but this can change), the seamless UX promised in §5.3 breaks. Re-check at implementation time and at every Gmail UI update.

---

## Next session checklist

Verification complete (2026-05-15) — both blocking questions passed. Feature work is unblocked.

1. Begin **PRD §5.1 onboarding flow** — self-contained, doesn't depend on the scheduling mechanism, produces the local-storage state every other feature reads.
2. When Schedule Send implementation begins (§5.2/§5.3): verify the **"Pick date & time" custom path** (date/time form-field entry + confirm button) using the recipe in the Verification section — only the preset path was verified this session.
3. Build a **release smoke test** that exercises the full chevron→menuitem→preset chain against live Gmail, so the permanent DOM-fragility cost (see Trade-offs) is caught early when Gmail changes its UI.
4. Workspace verification (Open Question 4) remains a pre-launch obligation tracked in `PRE_LAUNCH_CHECKLIST.md`.

---

## Sources

- [Gmail API: users.drafts.send reference](https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/send)
- [Gmail API: users.messages.send reference](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send)
- [Google Issue Tracker #140922183 — Expose functionality for creating scheduled emails](https://issuetracker.google.com/issues/140922183)
- [RayBB/easy-gmail-scheduler — archived reference implementation using Apps Script](https://github.com/RayBB/easy-gmail-scheduler)
- [Gmail Community thread on scheduled-send API support](https://support.google.com/mail/thread/5594544/is-possible-to-send-a-schedule-email-using-the-gmail-api)
