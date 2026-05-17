# Session 6 — Summary

**Date:** 2026-05-16

> The probe-gated §5.5.1 session: build + run the Send-button DOM probe
> first, clear the gate against live Gmail, then implement the regular-Send
> trigger. One mid-probe sharpening (a false-alarm "sent anyway" that the
> gate correctly caught and disambiguated) — no design change, no code
> written before the gate cleared.

## a. What this session accomplished

**Plan (owner-fixed, Entry-2/23 discipline):** DOM probe FIRST, probe-gate
checkpoint, then §5.5.1 implementation gated by it. Stop and re-clear if the
probe invalidated the design.

- **Probe built + committed** (`research/send-button-probe.{js,md}`,
  Entry-9: single-source runnable + how-to + result log a non-technical
  owner can re-run). Recipe primitives mirror `gmail-recipe.ts` 1:1.
- **Probe run hands-on against live Gmail** (Fenil, English UI, macOS), 4
  contexts: new-compose, 2-compose, inline-reply, pop-out.
- **Probe-gate cleared.** Both load-bearing assumptions verified:
  capture-phase suppresses Gmail's Send (mouse *and* ⌘/Ctrl+Enter) when the
  whole gesture is blocked; replaying the Send re-sends (plain *and* full
  recipe). Send is compose-scoped/distinct per pane (not the §5.2
  detached-popup problem). The structural anchor (Send = the non-chevron
  role=button sibling of the verified chevron) AGREED with an independent
  attribute heuristic in all 4 contexts.
- **§5.5.1 implemented**, gated by the cleared probe.
- Doc/PRD/CLAUDE propagation for all of the above.

Net feature state: §5.2/§5.3 complete; §5.5 Schedule-Send enforcement
(narrowed, Session 5); **§5.5.1 regular-Send trigger implemented and
probe-gate cleared**. §5.3.5/§5.4 (OAuth + People/Maps) still deferred.

## b. The probe arc (honest, including the false alarm)

1. `discover()` ×(1-compose, 2-compose, inline-reply, pop-out) — Send
   located, both heuristics AGREE 4/4, multi-compose **DISTINCT**.
2. `watch()` — capture-phase document listener fires *before* Gmail's
   handler for both the click and ⌘/⌘Enter; Gmail reacts at mousedown
   (bubble) — predicts, doesn't prove, suppression.
3. `armSuppress()` (one-shot) — `SUPPRESSED at mousedown`, **yet the email
   sent.** Ambiguous: B (capture-phase can't stop Gmail → design-
   invalidating) vs C (one-shot disarmed before Gmail's pointerup/click
   finalise — probe too blunt). **I did not conclude or write code on the
   ambiguity** — sharpened the diagnostic.
4. `armBlockGesture()` (whole-gesture, added mid-session) ×2 — **no email
   sent** either time. **C confirmed; design holds.** This is the gate's
   make-or-break result.
5. `testReplay()` — real email sent via firePlain *and* fireFull. Replay
   path realisable.

The mid-probe sharpening was a **diagnostic** change (Entry-9 re-runnable-
probe discipline; mirrors the pick-date-time probe's mid-session `live()`
fix), not a design change. The probe-gate held throughout.

## c. Commits shipped (chronological)

1. `cf8c452` docs(§5.5.1): Session 6 Send-button probe — gates impl
2. `4036cc4` docs(§5.5.1): sharpen probe — armBlockGesture (B vs C)
3. `c57882f` docs(§5.5.1): result log — gesture-block ✅ C, design holds
4. `66e51fb` docs(§5.5.1): probe GATE CLEARED — requirements crystallised
5. `d2922bd` feat(§5.5.1): regular-Send working-hours/absolute guard
6. *(this close-out)* docs: PRD §5.5.1 amend + CLAUDE.md + summary + log

## d. The implementation (what shipped)

- `gmail-recipe.ts`: `composeCount()` (single source of truth for
  multi-compose, now shared with the §5.2 safety net),
  `regularSendButtonFor()`, `singleComposeSendButton()` — the
  probe-verified structural Send anchor.
- `regular-send/config-cache.ts`: synchronous working-hours/timezone
  snapshot (seed at install + `chrome.storage.onChanged` refresh).
  Fail-OPEN if unloaded.
- `regular-send/regular-send-guard.ts`: capture-phase, compose-scoped,
  **whole-gesture** interceptor on the FULL verdict (working-hours OR
  absolute — locked split). Per-install closure state (no module globals)
  + a 30s watchdog so a vanished modal can never permanently wedge Send.
  Choices: Reschedule (snap → native Schedule Send), Send now anyway
  (replay via `fireFull`), Cancel. Snap-fail → native scheduler (never
  fail toward sending what the user asked to delay); mount/render throw →
  fail-toward-send.
- `regular-send/{RegularSendWarning.tsx,warning-mount.tsx}`: reuse the
  locked `WorkingHoursWarning` (new optional `context="send"` →
  present-tense copy + "Send now anyway"; §5.3 callsite byte-for-byte
  unchanged) in the verified Shadow-DOM/ErrorBoundary mount pattern.
- `content-script.ts`: install after onboarding from one `getState()`
  read; shared `persistLastScheduled` with the §5.3 path.
- Tests: 17 guard cases (the §5.2.3 invariant hardest) + a send-context
  `WorkingHoursWarning` case. **85 pass (was 67).**

## e. In-session design decisions worth noting

- **Closure-local guard state + watchdog** (caught while greening tests):
  a module-global "modal open" latch leaked across tests *and* — the real
  reason — a latch that must be perfectly reset is itself the §5.2.3
  hazard (one missed reset = Send wedged forever). Fixed to per-install
  closure state plus a 30s self-reset. The failing test surfaced a genuine
  robustness flaw, not just a test-isolation nit.
- **Multi-compose deliberately not intercepted.** "Reschedule" reuses the
  Schedule recipe whose global chevron query mis-targets ≥2 composes (the
  launch-blocking §5.2 problem). §5.5.1 inherits that safety net by
  falling through to native Send on ≥2 composes — documented v1 interim,
  not a regression.
- **Snap-fail does NOT fail toward sending.** Everywhere else §5.5.1 fails
  toward send (the user clicked Send). But once the user chose *Reschedule*,
  failing toward an immediate send would deliver exactly what they asked
  to delay — so snap-fail falls back to Gmail's own scheduler instead.

## f. Confidence and gaps

**Confidence: 4.5 / 5.** The gate's make-or-break unknowns are
**hands-on verified against real Gmail** (not just jsdom-green), which is
the load-bearing check this repo trusts. Held below 5 by honest residuals:

- **No real-extension smoke test yet.** The probe verified the *primitives*
  (suppress, replay) hands-on, and 85 jsdom tests prove the guard's
  decision/scoping/fail-safe logic — but the assembled extension (load
  unpacked → set working hours → click Send off-hours → see the modal →
  each of the 3 choices end-to-end) has **not** been hand-run. jsdom
  proves logic, not that the wired whole works against live Gmail. This is
  the Entry-10 lesson; it is the first thing Session 7 should do.
- **The probe's `armSuppress` false alarm** is a flagged process residual:
  my initial one-shot diagnostic was too blunt and produced a scary
  "design might be invalid" signal. The gate discipline caught it (no code
  on the ambiguity), but a sharper first probe would have saved a
  round-trip. Captured so the next probe is designed whole-gesture-aware
  from the start.
- **Watchdog is unit-tested only.** 30s self-reset is exercised by the
  per-install state model but not hand-triggered (no clean way to force a
  vanished-host in jsdom). Confidence rests on the closure model + the
  shared fail-toward-send path.
- **Content-script bundle 20→25.6 kB** (the regular-send modules pull
  React, already loaded for §5.3). The lazy-load-modal optimisation is now
  a little more worthwhile; still flagged, not done.
- **`onboardingCompletedAt` inline check** replaced `isOnboardingComplete()`
  in bootstrap (one `getState()` instead of two). `isOnboardingComplete`
  is now unused by the content script but kept (used elsewhere / API
  stability) — intentional, not dead-code drift.

## g. Owner-decisions-log

`Session 6 — no entries this session.` The session executed the
already-locked Entry-2/Entry-23 probe-gating discipline; no new owner
judgment redirected the build. The owner's faithful hands-on probe runs
(including reporting the alarming intermediate "it sent" rather than
mislabelling it) is what let the gate function — but that is executing the
locked protocol, not a trajectory change. The `armSuppress`-too-blunt
near-miss is a *Claude*-side process residual (logged in §f above), not an
owner-decisions entry per that file's defined purpose.

## Repo state at session end

All work committed. typecheck / lint / `format:check` / **85 tests** /
build / sw-loader all green. `backend/` still untouched. **Session 7
should open with a hands-on real-extension smoke test of §5.5.1** (Entry-10
discipline — green jsdom ≠ verified), then §5.3.5/§5.4 (OAuth + People API
+ Maps proxy) or the multi-compose full fix (launch-blocking).
