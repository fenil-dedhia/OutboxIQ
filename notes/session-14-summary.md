# Session 14 — Accessibility pass (WCAG 2.1 AA, PRD §6.3 + §8.9)

> **State at close (2026-05-28):** Free v1 is feature-complete (Session
> 13 close); this session was the first of four pre-launch hardening
> sessions and is **purely remediation** — no features added, no schema
> changes (`SCHEMA_VERSION` stays at 3), no Premium-v1 imports. The three
> phases pushed to `origin/main` as separate commits per the
> per-phase-gate instruction; owner did a **keyboard-only hands-on pass**
> on all three surfaces (delete modal, in-Gmail Schedule modal,
> onboarding) which confirmed the focus traps + focus management work
> as designed. **Screen-reader pass was deferred** (the owner is not
> familiar with VoiceOver / NVDA) — programmatic verification covers the
> role/aria-attribute structure but not what an SR actually announces,
> and the gap is documented honestly in §f and `PRE_LAUNCH_CHECKLIST.md`
> as a deferred (not launch-blocking) item.

## §a — What landed (per commit)

**Phase 1 (`5295e00`) — onboarding focus mgmt + delete-modal focus trap:**
- **Gap A.** Each onboarding step heading (`Welcome`, `TimezoneStep`,
  `WorkingHoursStep`) becomes programmatically focusable (`tabIndex={-1}`)
  and receives focus on mount, so a keyboard/SR user advancing via
  Continue or Back lands on the new step's `h1` rather than a removed
  control. A page-level `role="status" aria-live="polite"` region announces
  `Step N of 3: <title>` on advance/Back — silent on initial mount
  (a user just arriving at step 1 already sees it; an announcement at load
  is redundant noise) and on the "done" screen the announcement + heading
  focus both fire.
- **Gap B.** The Session-13 typed-delete confirmation modal gains a proper
  focus trap. Tab/Shift-Tab cycle within the dialog so AT can't escape to
  the page behind it; focus moves to the typed-delete input on open and
  restores to the triggering button on close (cancel / Escape / confirm; a
  silent no-op when the trigger is detached — e.g. the post-erasure
  terminal state, where the whole section unmounts). `role=dialog` /
  `aria-modal` / `aria-labelledby` / `aria-describedby` and the labeled
  input were already in place; destructive behavior is unchanged.

**Phase 2 (`60c6343`) — Settings reorder announce + post-erase heading focus + broad audit:**
- **Gap D, part 1.** `PinnedTimezonesEditor` (Settings reorderable mode) now
  has a polite aria-live region announcing reorder results: "Moved <zone>
  to position N of M." Announcements fire from the handlers themselves
  (arrow-keys + drop) so the correct entry is named — a prior diff-based
  approach was ambiguous (couldn't tell "moved A down" from "moved B up",
  both look identical in the array swap). Scoped to reorderable mode only
  (onboarding's horizontal-chip view is unchanged) and to true reorders
  (add / remove don't announce — would be noisy).
- **Gap D, part 2.** Settings App focuses the "Your data has been deleted"
  heading on the post-erasure transition. The delete-modal's
  focus-restore-on-close is a no-op there because the trigger button is
  unmounted with the `PrivacyDataSection` — this is the substitute so a
  keyboard/SR user is notified of the irreversible state change.
- **Broad WCAG 2.1 AA audit (onboarding + Settings)** — findings sweep:
  - Labels, keyboard reachability, landmarks (`<main>`, `<nav aria-label>`,
    `<section aria-labelledby>`), ARIA roles all clean.
  - AA contrast spot-checks pass: muted `#5f6368` on white (5.74:1), on
    `#f1f3f4` hover/focus background (~5.2:1), on `#e8f0fe` active-nav
    background (~5.4:1); accent `#1a73e8` on white (~4.55:1, scrapes AA);
    danger `#c5221f` on white (5.94:1). Disabled controls (`opacity: 0.5`)
    are exempt per WCAG 1.4.3.
  - Focus indicators present everywhere — TimezonePicker uses a clear blue
    ring + box-shadow on `:focus-visible`; the `.fl-set-*` buttons / nav
    items use background swaps (`#f1f3f4` / `#e8f0fe`) on `:focus-visible`
    which are *technically* visible but subtle. **Flagged for owner
    hands-on** (§c) — no brand-color change shipped silently.

**Phase 3 (`15fab3b`) — TimezonePicker empty-state announce + Schedule modal focus trap/restore:**
- **Gap C (TimezonePicker SR pass).** The "No timezones found" empty state
  moves OUT of the listbox (was `<li role="presentation">` inside
  `<ul role="listbox">`, which a screen reader could read as a phantom
  option in the option count) and into a sibling `<p role="status"
  aria-live="polite">`. A screen reader now announces it when a search
  filters all results away. The trigger / listbox / option /
  `aria-activedescendant` ARIA structure was already APG-compliant —
  verified, no other structural changes.
- **Gap E (Schedule Send modal in Shadow DOM).** `ScheduleModal` gains a
  focus trap on the dialog card. Tab / Shift-Tab cycle within the modal
  so AT can't escape into Gmail's compose behind it. Implemented as a
  React-level `onKeyDown` on the card (not a document-level capture
  listener), so it doesn't intercept anything outside our shadow root —
  Gmail's own focus handling stays untouched, and only the boundary Tabs
  (last → first, first → last) are re-routed. Interior Tab presses fall
  through to the browser default (verified by test).
- **Focus restore on close** (`mount.tsx`). Captures the deeply-active
  element (including inside open shadow roots, so an in-modal picker
  doesn't disrupt restore) before mount; restores it on close
  (`{ preventScroll: true }`). Wrapped in `try`/`catch` — if the trigger
  has been torn down by Gmail under us, the restore is a silent no-op
  rather than throwing.
- **Hot paths untouched:** the §5.2 compose interceptor, the §5.5.1 send
  guard, and the Session-13 page-ownership checks (`isCurrentOwner()`)
  are NOT modified. Phase-3 changes are entirely within the modal contents
  + its mount wrapper.
- `test/setup.ts` sets `IS_REACT_ACT_ENVIRONMENT = true` so the new
  Shadow-DOM mount tests can wrap `createRoot` calls in `React.act()`
  without a noisy console warning.

**Totals at Phase 3 push:** 354 tests green (was 329 at S13 close → +25);
typecheck / lint / format:check / production build all clean;
`SCHEMA_VERSION` unchanged at 3; manifest permissions unchanged.

## §b — Confidence per phase

- **Phase 1 — High (tests) + owner keyboard hands-on (delete modal).** All
  five new tests cover the focus targets, the `tabIndex=-1` wiring, the
  aria-live initial-silence + announcement-on-advance + done-state
  announcement, the modal focus trap wrap behavior, and the focus restore
  on cancel/Escape. **Owner Test 2 passed cleanly:** Tab stayed inside the
  delete modal across repeated presses, Escape closed it, and focus
  restored to the original "Delete my data" trigger button. SR-announces
  part remains deferred (§f).
- **Phase 2 — High (tests).** Reorder announcement proved out via a
  controlled wrapper (the announcement is set from the source handler, so
  the test sees the exact entry moved — neither arrow-key nor drag-drop is
  ambiguous). Post-erase heading focus tested. Contrast spot-checks
  computed by hand; the picker focus ring is clearly visible, the button
  focus backgrounds less so — **flagged for the owner's call** (§c),
  not blocking.
- **Phase 3 — Medium-High (tests + owner keyboard hands-on in live
  Gmail).** **Owner Test 3 passed:** with the modal open in real Gmail,
  Tab stayed inside the modal across repeated presses, Escape closed it
  cleanly without disrupting compose. **One observation:** at one point a
  stray Space/Enter while focus was on a preset or the Schedule button
  fired the §5.5 working-hours warning (the safety net) — that's the
  intended behavior of the keyboard activation, NOT a trap regression.
  Owner Test 1 also confirmed onboarding Tab order is correct (it exits
  to browser chrome at the end, which is the right behavior for a page
  vs a modal). The id-referenced ARIA inside the shadow root
  (aria-controls / aria-activedescendant / aria-labelledby) is correct
  by spec; only a real SR can confirm resolution across the shadow
  boundary — deferred per §f.

## §c — Flags for a senior reviewer

- **Focus-indicator visibility (Phase 2).** The Settings sidebar nav items
  and `.fl-set-btn` buttons use a background swap (`#f1f3f4`) on
  `:focus-visible` rather than a thick outline. Technically visible
  (passes WCAG 2.4.7 "the indicator is visible"), and `:focus-visible` only
  fires on keyboard navigation so it wouldn't affect mouse users — but
  could legitimately be stronger (e.g., `outline: 2px solid var(--fl-accent);
  outline-offset: 2px;`). Held back as a brand-touching change; owner
  decides whether to ship a more visible ring after Phase-2 hands-on.
- **Section grouping in the TimezonePicker (Phase 3).** The dropdown has
  visual "Pinned" / "All timezones" section labels (`<li
  role="presentation">`), so the listbox option count is correct (the
  labels aren't counted as options). But a screen reader navigating by
  arrow keys doesn't hear which section an option belongs to — the
  context is visual-only. The clean APG fix is `role="group"` +
  `aria-label="Pinned"` wrappers, but the structural change (group
  wrappers nested inside `role="listbox"`) is non-trivial and the right
  HTML pattern depends on whether AT announces the group correctly inside
  a listbox — exactly the thing real-AT hands-on would tell us. **Held
  back, flagged for Session 15+ if Phase-3 verification surfaces it.**
- **Schedule-modal focus trap in live Gmail.** The trap is React-level on
  the card and only re-routes the boundary Tabs, so by construction it
  shouldn't fight Gmail's compose focus. But Gmail does unusual things
  with focus (the rich text editor, the send menu, the chips area), and
  this is the place where a "looks right in jsdom, wrong in browser" gap
  could appear. If the owner's hands-on reveals any compose-focus weirdness
  after opening + closing the modal, the trap is the first thing to
  remove (revert the `onKeyDown={onCardKeyDown}` line on the dialog card —
  the rest of the ARIA is unaffected).
- **Focus restore lands on something useful.** The mount captures
  `document.activeElement` at the moment the §5.2 interceptor calls
  `openScheduleModal`. By then Gmail has already closed its Send menu, so
  the trigger menuItem is gone; the active element is typically the
  chevron / Send button. That's a reasonable restore target but the owner
  should sanity-check on real Gmail that "Cancel modal" leaves keyboard
  focus somewhere sensible, not on `<body>` (which would be a regression).

## §d — Stale docs surfaced / handled

Done in this close-out commit:

- `PRE_LAUNCH_CHECKLIST.md` "Accessibility" — Step-change focus &
  announcements (Gap A), Modal focus traps (Gap B + §5.3 Gap E), and
  Keyboard-only walkthrough flipped to **RESOLVED** with the owner's
  Test 1/2/3 hands-on observations cited inline. Contrast / focus
  indicators marked **partially resolved** (spot-checks pass; the
  `:focus-visible` background-swap subtlety flagged as a brand-touching
  open call — §c). Screen-reader walkthrough marked **deferred** with
  the rationale documented (owner non-SR-familiar, Free v1 local-only
  with no critical-safety surface — acceptable Free-v1-launch gap).
- `CLAUDE.md` "Current state" — bumped to Session 14 close (Phase-1/2/3
  commits, owner hands-on confirmation, +25 test count to 354, Next →
  Session 15 Workspace compatibility).

PRD §6.3 + §8.9: no text changes — the spec was already correct; this
session brought the code up to it.

## §e — Deferred into Session 15+

- **Owner hands-on screen-reader walkthrough** of onboarding + Settings +
  in-Gmail modal — the last `PRE_LAUNCH` Accessibility item.
- **Section-grouping in the TimezonePicker** (`role="group"` + aria-label)
  if Phase-3 real-AT reveals AT misnaming the section context. Flagged
  in §c.
- **Stronger focus-ring on `.fl-set-btn` / nav items** if owner's
  keyboard pass finds the background swap too subtle. Flagged in §c.
- **`role="tablist"` / `role="tab"` arrow-key navigation for the
  sidebar.** Considered but not adopted — the current `<nav> + <ul> +
  <button aria-current>` pattern is a valid Settings navigation pattern
  per WAI-ARIA, and switching to tablist would be a behavior change
  (arrow keys would activate tabs rather than the standard Tab-to-next).
  Listed for completeness only.
- **`jest-axe` / `vitest-axe` automated a11y assertion in tests.** Not
  installed — would add a dev dependency for an automated belt-and-braces
  check (axe-core covers a subset of WCAG, not the whole AA standard).
  Worth proposing post-launch if maintenance overhead is acceptable.

## §f — Honest gaps

The split that matters for this session:

**Verified programmatically (jsdom + Vitest):**
- The `tabIndex=-1` is on each step heading; on mount, `document.activeElement`
  is the heading.
- The aria-live region exists with `role="status"` and `aria-live="polite"`;
  it's empty on initial mount; its content updates to the expected
  step/done announcement on advance/Back/done.
- The delete-modal focus trap wraps Tab at the last focusable and
  Shift-Tab at the first; focus restores to the trigger on cancel/Escape;
  the no-op-when-trigger-detached path doesn't throw.
- The pinned-reorder announcement fires with the correct entry name +
  position on both arrow-key and drag-drop reorders; doesn't fire on
  add/remove; doesn't render at all in non-reorderable (onboarding) mode.
- The TimezonePicker empty state is OUTSIDE the listbox + has
  `role="status"`.
- The Schedule modal exposes `role="dialog"` + `aria-modal="true"`;
  Tab/Shift-Tab from boundaries wraps; interior Tab is not intercepted.
- The Schedule modal mounts into a Shadow DOM with exactly one host at a
  time; close() restores focus to the previously-focused element;
  a torn-down trigger doesn't throw.

**Owner-verified by keyboard hands-on (Tests 1/2/3 above):**
- Delete-confirmation modal Tab trap + Escape close + focus restore on the
  triggering button.
- Schedule Send modal Tab trap stays inside the modal in live Gmail across
  repeated Tab presses.
- Schedule Send modal Escape closes cleanly without disrupting Gmail
  compose afterwards.
- Onboarding Tab order is correct — including the (intended) exit into the
  browser chrome at the end of the page (an onboarding page is not a
  modal, so it must not trap focus).

**NOT verified — explicitly deferred:**
- VoiceOver / NVDA / JAWS actually announcing the step title, the
  delete-modal heading + description, the reorder result, the picker
  empty state, the Schedule modal title — owner is not screen-reader
  familiar, and learning a screen reader to verify is a real time
  commitment vs. acceptance of the gap for a local-only Free v1.
- The id-referenced ARIA inside the shadow root (`aria-controls` /
  `aria-activedescendant` / `aria-labelledby`) resolving for real AT
  across the shadow boundary. ARIA structure is correct by spec; only a
  real SR can confirm cross-boundary resolution. This is the THE risk
  Phase 3 carries — Free-v1 launch proceeds with this open.
- The visibility of the current `.fl-set-btn` / nav-item `:focus-visible`
  indicators under sustained keyboard-only use — owner's keyboard pass
  was task-focused (verifying traps), not a contrast judgement. Flagged
  in §c as a brand-touching call for owner.
- Color contrast was spot-checked by hand against the AA threshold
  formulas; no automated tool ran. A real audit (e.g. axe DevTools in
  Chrome) might surface secondary issues — flagged in §e.

## §g — owner-decisions-log entries this session

`Session 14 — no entries this session.` The session was remediation
against an explicitly-itemized backlog (the prompt named Gaps A/B/C/D/E
and the broad audit); no owner judgment-call came in mid-session that
moved the trajectory off-script. The single "flag for owner" decisions
(focus-ring visibility in §c; section grouping in §c) are still pending
— if either becomes a real call after the owner's hands-on, append the
entry then.

## §h — Session 15 opening sequence

**Session 15 = Google Workspace compatibility verification.** Confirm
Fashionably Late's UI-automated Schedule Send works on Google Workspace
accounts (not only consumer Gmail), including admin-controlled tenants.
Reference: `PRE_LAUNCH_CHECKLIST.md` "Google Workspace compatibility".

Suggested first steps:
1. Re-read PRE_LAUNCH "Google Workspace compatibility" + the spike notes
   in `research/scheduled-send-api-spike.md`.
2. On a Workspace account, drive the §5.2/§5.3/§5.5.1 paths end-to-end on
   a real Gmail tab (using `dist/` from `npm run build`).
3. If the Schedule-Send DOM differs from consumer Gmail, re-run
   `research/pick-date-time-probe.md` to capture the Workspace selectors
   and decide whether `gmail-recipe.ts` needs to fork by tenant type.
4. Owner-parallel during Session 14 hands-on or before Session 15: real
   brand identity + extension icons.

Then Session 16 (security audit) and Session 17 (comprehensive hands-on,
including the duplicate-instance regression test plan already documented
in PRE_LAUNCH).
