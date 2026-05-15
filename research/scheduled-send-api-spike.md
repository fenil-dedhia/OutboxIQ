# Gmail Scheduled-Send API Spike

**Date:** 2026-05-15
**Status:** Desk research complete. Two hands-on verifications still required before any feature work begins (see Open Questions).
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

**Approach C, contingent on resolving Open Question 1 before any feature code begins.**

C is the only approach that satisfies all four hard architectural commitments — native Scheduled label, no separate dashboard, no backend scope expansion, no email content off-device. The cost (DOM fragility) is the tax we already accepted by building a Gmail extension.

If Open Question 1 answers "no" (we can't cancel scheduled sends via the API), Unschedule-on-Reply under approach C becomes infeasible. At that point we choose between:

- **Drop Unschedule-on-Reply from v1.** Defer to v2; keep approach C and the rest of the architecture intact.
- **Switch to approach A** and renegotiate §5.7 and §11.18 (we'd need to build our own scheduled-emails view and stop promising the native label).

I recommend deferring that decision until after Open Question 1 is answered. It's not worth pre-committing to a fallback.

---

## Trade-offs accepted

1. **DOM fragility on the scheduling action itself.** Gmail UI updates may periodically break the "schedule a send" flow. Mitigation: defensive selectors, a manual smoke test before each release, and a clear fallback to Gmail's own UI if our injection fails.
2. **DOM fragility is a permanent operational cost, not a one-time implementation cost.** Realistically, every few months Gmail will push a UI update that may break our injection, and we will need to fix it quickly — likely within days, since a broken Schedule Send button is a complete-feature outage for OutboxIQ users. This is an ongoing maintenance commitment, not a one-off. We accept it explicitly here so it doesn't come as a surprise post-launch.
3. **No standard API path.** We are building on undocumented surface area (Gmail's compose DOM and possibly the SCHEDULED system label). Google could break either at any time. We accept this as the price of the native-feel commitment.
4. **Unschedule-on-Reply remains conditional** until Open Question 1 is verified.

---

## Open Questions

### 1. (Critical, blocking) Can scheduled messages be canceled via the Gmail API?

Specifically: does `users.messages.list?labelIds=SCHEDULED` return native-scheduled messages, and does `users.messages.delete` (or `drafts.delete`) successfully cancel one? Desk research was inconclusive — the API reference does not document `SCHEDULED` as a queryable system label.

**How to answer:** half-hour hands-on test. Schedule an email via Gmail's UI in a test account, then call `messages.list?labelIds=SCHEDULED` from a console with a token bearing `gmail.modify`. If the message appears, try `messages.delete` and confirm it disappears from the Scheduled label.

**This must be answered before any Schedule Send or Unschedule-on-Reply code is written.**

### 2. (Critical, blocking) Is Gmail's Schedule Send UI stable enough to drive programmatically?

Specifically: from a content script running in the Gmail tab, can we (a) open the Schedule Send dialog, (b) set an arbitrary date/time, (c) confirm — reliably, on both consumer Gmail and Workspace accounts, in current Chrome?

**How to answer:** one-to-two hour hands-on exploration. Open Gmail's DOM inspector, identify the relevant elements/event sequence, write a throwaway content script that drives the flow end-to-end.

**This must be answered before any Schedule Send code is written.**

### 3. (Defer) Does the badge-overlay strategy in §5.7.2 work?

Once a scheduled message exists, we need to find it in the Scheduled label DOM and overlay our badge. Open question: is the rendered DOM stable enough, and do we have a reliable correlation key (probably the Gmail message ID) between our local metadata and the row in the Scheduled label? Investigate during §5.7 implementation, not now.

### 4. (Verify before public launch) Workspace vs. consumer differences

Workspace tenants sometimes have admin-disabled features. Verify that Schedule Send is present, DOM-driveable, and not admin-disabled on Google Workspace accounts before we promise it to Workspace users. Many of our target users (knowledge workers, salespeople, recruiters, consultants) are on Workspace, so a failure mode where OutboxIQ silently breaks on Workspace would hit a large share of the user base.

Tracked in `PRE_LAUNCH_CHECKLIST.md` under "Compatibility & Verification" — verification is not blocking for v1 feature work on consumer Gmail, but must be completed before Chrome Web Store submission.

### 5. (Defer) Confirmation prompts in the UI flow

If Gmail shows a confirmation dialog as part of its native Schedule Send (it currently doesn't, but this can change), the seamless UX promised in §5.3 breaks. Re-check at implementation time and at every Gmail UI update.

---

## Next session checklist

1. Run Open Question 1 (the `SCHEDULED` label test) — half hour, in a test Gmail account.
2. Run Open Question 2 (DOM-drive Schedule Send) — one to two hours.
3. Document the results inline in this file as a "Verification" section.
4. If both pass: proceed with approach C and begin §5.1 onboarding flow.
5. If 1 fails: choose between dropping Unschedule-on-Reply from v1 or switching to approach A with PRD §5.7 + §11.18 renegotiated. Bring the decision to Fenil before writing code.
6. If 2 fails: harder. Re-open the spike with `messages.send` + custom-storage approaches (A/B/D) as primary candidates and treat the native-Scheduled-label requirement as the constraint to renegotiate.

---

## Sources

- [Gmail API: users.drafts.send reference](https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/send)
- [Gmail API: users.messages.send reference](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send)
- [Google Issue Tracker #140922183 — Expose functionality for creating scheduled emails](https://issuetracker.google.com/issues/140922183)
- [RayBB/easy-gmail-scheduler — archived reference implementation using Apps Script](https://github.com/RayBB/easy-gmail-scheduler)
- [Gmail Community thread on scheduled-send API support](https://support.google.com/mail/thread/5594544/is-possible-to-send-a-schedule-email-using-the-gmail-api)
