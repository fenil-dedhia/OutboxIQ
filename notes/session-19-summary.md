# Session 19 — §5.3 no-recipient Schedule guard (+ DST-correctness audit)

> Single-focus session: fix the owner-reported real-Gmail bug where Gmail's
> native "specify at least one recipient" error rendered *behind* our top-of-
> stack §5.3 modal, leaving the user with no visible reason nothing scheduled.
> Plus a piggy-backed DST-correctness test audit (no code change). Hot-path work
> (the §5.3 modal + the schedule hand-off), gated through owner hands-on.
> Test count **362 → 376**; `SCHEMA_VERSION` unchanged (**4**); version `1.0.0`.
> Primary owner decision: `owner-decisions-log.md` **Entry 59** ((b)+(c)).

## §a — What landed

1. **(b) No-recipient hard guard (`ScheduleModal.tsx`).** `hasRecipient` derived
   once from the existing open-time `readComposeRecipients()` snapshot (the
   `recipients` prop — no new read, no observer/poll). When zero tokenized To/CC
   chips: the **Schedule** button is natively `disabled` (blocks click AND Enter),
   `commit()` early-returns as belt-and-suspenders, and a one-line red hint
   **"Please add at least one recipient to continue."** sits in the action row,
   associated to the button via `aria-describedby` + `role="alert"`. The exit
   button reads **"Go back"** in this state, **"Cancel"** otherwise.
2. **(c) Dismiss-on-hand-off-failure backstop (`ScheduleModal.tsx`).** `run()`
   now reveals (tears down the modal) on a hand-off **throw** (before the native
   fallback, so Gmail's surface isn't occluded) and on a **stall**
   (`REVEAL_ON_STALL_MS = 2500`, above a normal ~1s success, below the recipe's
   4s failure timeout — so the happy path closes first with no native-menu flash).
   A failed hand-off is **not** persisted as "Last scheduled time."
3. **Hint styling (`styles.ts`).** `.actions-hint` in the existing `#c5221f`
   danger token (≈5.8:1 on the white card — AA); `.actions button { flex:0 0
   auto; white-space:nowrap }` so the hint absorbs wrapping and "Go back" stays
   one line.
4. **Settings copy (`CacheSection.tsx`).** Two "Optimize-for-X" → "the
   Optimize-for-X feature" wording fixes (owner-requested).
5. **DST-correctness test audit (test-only).** +8 logic tests across
   `optimize-time.test.ts` (+4) and `gmail-format.test.ts` (+4).

## §b — Confidence

- **(b) guard:** high. Unit-proven (disabled + Enter-inert + commit early-return;
  hint + `aria-describedby`; "Go back"/"Cancel" toggle) and owner-confirmed
  hands-on incl. the Enter-key guard.
- **(c) backstop:** medium-high. Success/failure/stall paths unit-proven (incl. a
  fake-timer stall test); the real occlusion behavior + 2500ms tuning are
  hands-on-confirmed for the happy path (no flash). The stall threshold is the
  one timing coupling (documented in code).
- **DST audit:** high at the **logic** level (see §f for the honest scope limit).

## §c — Flags for owner judgment

- **Gmail-tokenization coupling (the load-bearing assumption).** The hard block is
  safe only because Gmail tokenizes a typed To address into a chip before Schedule
  Send is reachable (owner-tested). If Gmail changes that, the guard could
  false-block a valid send. Documented at the `ScheduleModal.tsx` validation site,
  in Entry 59, and as a CLAUDE.md gotcha — **this is the thing to revisit** on a
  Gmail tokenization change. (c) is the always-safe net regardless.

## §d — Stale docs surfaced / handled

- None new. PRD §5.3 received the Entry-59 amendment (historical text preserved).

## §e — Deferred / owner-parallel

- Owner re-uploads the rebuilt store zip to the existing unpublished Web Store
  draft (version stays `1.0.0`). No spec/scope items deferred this session.

## §f — Honest gaps (programmatic vs hands-on split)

- **DST is verified at the LOGIC level, not on a live DST day.** The transition
  tests assert concrete UTC instants for the real **2026** US transition dates
  (spring-forward Sun Mar 8, fall-back Sun Nov 1) and a US-vs-EU different-flip-
  date cross-zone case (Mar 15, NY flipped / London not), each independently
  confirmed with Node's `Intl`. This proves the conversion pipeline
  (`momentAtTzWall`'s two-pass offset correction) against those dates; it is **not**
  a hands-on test in live Gmail on an actual transition day.
- **"Fails safe" past-time guard:** proven **over-reject-only** for the operative
  "next future occurrence" semantics + the 5-min buffer. The fall-back **repeated
  hour** (01:00–01:59 occurs twice) is a genuine one-wall-two-instants ambiguity —
  demonstrated in a test — but is **unreachable through the feature** (the only
  generated timings are 9 AM / 1 PM) and is backstopped by Gmail, which never
  schedules into the past. No defect; behavior matches the documented
  `gmail-format.ts:68` ≤1h-approximation contract.
- **(c) forced-failure reveal** could not be deliberately staged hands-on; covered
  by unit tests + reasoning.

## §g — Owner-decisions-log entries this session

- **Entry 59** — no-recipient Schedule guard: hard-disable (b) + reveal-on-failure
  (c), over force-native-error / soft-hint / reveal-only. Records the owner
  override (the tokenization hands-on test that made hard-(b) safe vs Claude's
  recommended (c)-only) and the two owner-approved divergences ("Go back"; the
  shipped hint copy). The DST test audit is verification of existing behavior, so
  **no separate entry** (noted in Entry 59).

## §h — Post-session: what's left before public launch

- Owner-parallel only (unchanged from S18): the 5 Web Store screenshots are now
  resized to 1280×800 (separate asset task) — listing copy + submission remain.
  Feature/code work for Free v1 is complete; this session was a bug fix + audit.
