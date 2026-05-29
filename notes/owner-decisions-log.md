# Owner Decisions Log

A running record of moments where the owner/PM's input materially changed the
trajectory of the build — not routine approvals, but the points where a
specific direction, objection, or question moved the project somewhere it
would not otherwise have gone.

**Two purposes:**

1. **Portfolio artifact** — concrete evidence of what AI-assisted product
   development looks like when the human stays load-bearing: where judgment,
   not just prompting, did the work.
2. **Coaching material** — each entry ends with one transferable principle for
   future AI-assisted builders.

**Honesty rule:** the counterfactual ("what Claude Code would have done
without it") is written to be accurate, not flattering. Where the owner's
judgment was wrong, incomplete, or had to be corrected, that is logged too.
A hagiography would be useless as either a portfolio piece or a teaching tool.
Entries cite real artifacts (commit hashes, files, PRD sections) so they are
verifiable. Where the *outcome* is documented but the conversational
provenance is not, that gap is stated rather than papered over — see Entry 3,
and note that this gap is itself the reason this log now exists (Entry 17).

**Maintenance habit:** at every session close-out, append a new entry — or the
single line `Session N — no entries this session.` if nothing qualified —
alongside the session-summary update. "Nothing qualified" is a legitimate and
common outcome; do not manufacture entries to fill the log. This obligation is
recorded in `CLAUDE.md` so future sessions maintain it automatically.

---

## Entry 1 — Naming: rejecting calendar-adjacent names

- **Session:** 1
- **Moment:** Early naming discussion for the product.
- **My input:** Rejected the initial naming options on the grounds that they
  could be confused with calendar-invite scheduling (a different mental model
  from "send this email later"); steered toward a name about the *outbox*,
  which led to "OutboxIQ".
- **What Claude Code would have done without it:** Accepted an early
  plausible-sounding name — likely something built around "schedule"/"send"/
  "time" — and moved on to scaffolding. Positioning-confusion risk between
  "scheduled email send" and "calendar scheduling" is a subtle product concern
  an implementation-focused agent does not naturally prioritize.
- **Outcome:** The product is named OutboxIQ; the name frames it around the
  outbox, not the calendar.
- **Artifact:** No written-record artifact — the deliberation predates the
  session summaries and was never logged. The only trace is the name itself
  (`OutboxIQ_PRD.md`, the repo name, every doc since). That absence is itself
  the point of Entry 17.
- **Lesson (for coaching):** A name is a positioning decision, not a label —
  reject names that put the user in the wrong mental model, even when they
  "sound fine."

## Entry 2 — Spike-first: gating all feature work behind a technical unknown

- **Session:** 1
- **Moment:** Planning the build order. The whole product depends on being
  able to create a Gmail-native scheduled send, which the Gmail API does not
  support — feasibility was unproven.
- **My input:** Required that the Gmail scheduled-send technical spike run and
  be reviewed *before* any Schedule Send feature code, backend Pub/Sub wiring,
  or recipient-cache code — an explicit hard gate, not a "look into it soon."
- **What Claude Code would have done without it:** Asked to "make progress,"
  an agent would plausibly have started scheduling-adjacent scaffolding (modal
  shell, scheduled-record storage, backend skeleton) in parallel — work that
  feels productive but is built on an approach the spike could have
  invalidated.
- **Outcome:** No feature code was written until Session 2 verified Approach C
  end-to-end. The gate held; no work was thrown away.
- **Artifact:** `notes/session-1-summary.md:31-34`; the "Gating constraint"
  section of `CLAUDE.md`; spike at `research/scheduled-send-api-spike.md`.
- **Lesson (for coaching):** Identify the one assumption that, if false,
  invalidates everything else — and refuse to build on top of it until it is
  proven, no matter how much "safe" adjacent work is available.

## Entry 3 — Salvaging Approach C when programmatic clicks kept failing

- **Session:** 2
- **Moment:** During the spike's Open Question 2, synthetic clicks on Gmail's
  "Schedule send" menu item kept failing silently. The approach (UI-automate
  Gmail's own Schedule Send) appeared to be a dead end.
- **My input:** Recollection: pasted the actual HTML of the Schedule Send menu
  item and pushed for one more attempt with a different selector/dispatch
  strategy rather than abandoning the approach.
- **What Claude Code would have done without it:** After repeated silent
  failures, the reasonable conclusion is "UI automation is too unreliable" and
  a pivot to the documented fallback — Approach A (backend cron sends a draft
  at time T). The spike doc itself enumerates Approach A as the fallback and
  records why it is materially weaker: no native Scheduled label (§5.7),
  backend scope expansion beyond the locked two-purposes rule (§7.3.1), and it
  would force a custom scheduled-emails dashboard that §11.18 explicitly
  forbids.
- **Outcome:** The recipe was found — dispatch to the innermost content
  element with real `clientX/clientY` coordinates and a full pointer→mouse
  sequence against Gmail's `jsaction` coordinate hit-testing. Approach C was
  confirmed end-to-end; the PRD's four hard commitments all held. This is the
  single decision the entire product architecture rests on.
- **Artifact:** `research/scheduled-send-api-spike.md:91-102` (OQ2, the
  verified recipe) and `:27-58` (Approach A vs C comparison); commit
  `7bed18c`. **Honest provenance gap:** the doc records the *technical*
  breakthrough but not *who* pushed for one more attempt or pasted the HTML.
  The counterfactual stands on the fully-documented Approach A/C comparison;
  the conversational credit is reconstructed from the owner's recollection.
  This entry is exactly the kind of provenance the log (Entry 17) exists to
  start capturing.
- **Lesson (for coaching):** "It keeps failing" and "it cannot work" are
  different claims; before accepting a costly pivot, supply the
  reviewer/implementer with the raw artifact (here, the literal DOM) and buy
  one more focused attempt.

## Entry 4 — Going public, and catching that MIT was now the wrong license

- **Session:** 2
- **Moment:** After the spike wrapped, deciding to make the GitHub repo public
  for portfolio visibility (linked from a résumé).
- **My input:** Directed the repo go public; this surfaced that the
  Session-1-locked MIT license — chosen on the assumption the repo stayed
  private during dev — now actively granted copy/modify/commercial-use rights
  on a public portfolio piece. Confirmed the reversal to all-rights-reserved
  once the tradeoff was on the table.
- **What Claude Code would have done without it:** MIT was a *locked*
  Session-1 decision flagged "do not re-litigate." An agent respecting locked
  decisions would have kept MIT and not connected "repo is now public" to
  "MIT now does the opposite of what's wanted." (Honest note: per the session
  record the licensing implication was flagged during the exchange, not missed
  — but the decision to go public, and to treat the license as a consequence
  worth reversing a locked decision for, was owner-driven.)
- **Outcome:** License changed MIT → all-rights-reserved/proprietary; `LICENSE`,
  `README.md`, `CLAUDE.md`, `PRE_LAUNCH_CHECKLIST.md`, and project memory
  updated for consistency. `session-1-summary.md` deliberately left saying
  "MIT" as a correct historical record.
- **Artifact:** Commit `19be388`; `notes/session-2-summary.md:26-28`; memory
  `license-decision.md`.
- **Lesson (for coaching):** A "locked decision" is locked against drift, not
  against new facts — when context changes (private → public), re-examine
  which locked assumptions the change just invalidated.

## Entry 5 — TypeScript: catching a contradiction instead of taking a default

- **Session:** 3
- **Moment:** Choosing the extension's language layer before scaffolding the
  toolchain.
- **My input:** Caught a contradiction in the advice being given — the
  "owner is non-technical, so minimize ceremony → plain JS" reasoning conflicts
  with "owner is non-technical and relies on Claude Code, so compile-time
  safety matters *more* here, and the type-ceremony cost is borne by Claude
  Code, not the owner." Forced this to a deliberate, recorded decision rather
  than letting a default stand.
- **What Claude Code would have done without it:** Plausibly let the naive
  "non-technical → simpler is better → JavaScript" heuristic win, or proceeded
  on inconsistent advice without ever resolving it into a stated rationale.
- **Outcome:** TypeScript locked as the language layer, with the explicit
  rationale recorded (compile-time error-catching is worth more precisely
  because the owner does not debug runtime issues; ceremony cost falls on the
  agent). Now a locked decision in `CLAUDE.md` and memory.
- **Artifact:** Memory `tech-stack.md`; `CLAUDE.md` "Locked tech decisions";
  `notes/session-3-summary.md:9`; commit `6916a0f`. **Provenance note:** the
  decision and rationale are recorded; the "caught a contradiction" exchange
  is reconstructed from the owner's recollection and the shape of the recorded
  rationale.
- **Lesson (for coaching):** When two pieces of advice can't both be true,
  that's not noise to smooth over — make the contradiction explicit and force
  a reasoned decision with its rationale written down.

## Entry 6 — Collapsing onboarding from 5 PRD steps to 3

- **Session:** 3
- **Moment:** Implementing PRD §5.1 onboarding, which specified five steps
  (welcome → timezone → working hours → transparency → consent).
- **My input:** Directed a restructure to three steps
  (welcome+transparency+consent → timezone → working hours), and required the
  PRD itself be amended so it stays source-of-truth rather than silently
  diverging from the code.
- **What Claude Code would have done without it:** Implemented the literal
  five-step PRD flow. Faithfully following the spec is the correct default for
  a careful agent — the load-bearing input was the UX judgment that five steps
  is unnecessarily heavy *and* the discipline to amend the spec, not just the
  code.
- **Outcome:** 3-step onboarding shipped; PRD §5.1.2/§5.1.3/§5.1.4 and §8.8
  amended with a dated restructure note; verbatim privacy copy preserved.
- **Artifact:** Commit `de40c7a`; `notes/session-3-summary.md:15,22`; PRD
  §5.1.3 amendment.
- **Lesson (for coaching):** When you deviate from the spec for good reason,
  change the spec — a codebase that silently contradicts its own spec is worse
  than either following or formally amending it.

## Entry 7 — Fixing all six debrief-surfaced gaps before exiting the session

- **Session:** 3
- **Moment:** The end-of-session honest debrief surfaced six code-level gaps
  in the just-shipped §5.1 work (consent-label markup bug, missing
  working-hours validation, no schema versioning, unhandled draft-save
  rejection, debug logging in prod, PRD §7.2 drift).
- **My input:** Chose to fix all six in-session rather than carry them forward
  as "known gaps for next session."
- **What Claude Code would have done without it:** The default debrief
  behavior is to *list* the gaps as deferred/tracked and move on — they would
  have entered Session 4 as backlog, including a legally-meaningful invalid
  consent-gate markup bug.
- **Outcome:** All six fixed and pushed in Session 3 (`a5fa897`, `a34836e`,
  `210428e`, `95518aa`, `04f7d18`). One item — automated tests for the
  form-editing widgets — was *explicitly* deferred to a dedicated
  test-hardening session, a deliberate scoped exception, not drift.
- **Artifact:** `notes/session-3-summary.md:27-38`; commits as listed.
- **Lesson (for coaching):** "Surfaced and tracked" is not the same as
  "handled" — for defects in code you just shipped, the default should be
  fix-now; deferral should be the explicit, justified exception.

## Entry 8 — Pushback on the muted Privacy Policy link and consent copy

- **Session:** 3
- **Moment:** Reviewing the onboarding consent step. The Privacy Policy link
  was styled as muted secondary text and the `<a>` was nested inside the
  consent `<label>`.
- **My input:** Pushed back on the muted styling on GDPR/PRD salience grounds
  (a consent-relevant disclosure should not be visually de-emphasized) and
  required the rendered copy be reviewed before approval, not just the code.
- **What Claude Code would have done without it:** Muted secondary text plus a
  label-nested link is a defensible "clean UI" default; an agent not weighing
  consent-salience and consent-gate validity would have shipped it. The
  label-nested link is independently an invalid-markup bug — a link click
  could toggle a legally-meaningful consent control.
- **Outcome:** Privacy Policy link pulled out of the consent label into a
  separate body-prominent element; consent registers only via the checkbox's
  explicit `onChange`. The underlying concern is corroborated by the
  pre-launch accessibility checklist, which independently flags both the
  consent-control markup and muted-text contrast.
- **Artifact:** Commit `a5fa897`; `PRE_LAUNCH_CHECKLIST.md:91-92`;
  `notes/session-3-summary.md:31`; memory `privacy-policy-link.md`.
- **Lesson (for coaching):** Review the rendered artifact, not just the code —
  and on anything legally meaningful (consent, disclosure), visual prominence
  is a correctness property, not a style preference.

## Entry 9 — Requiring the throwaway probe be committed to the repo

- **Session:** 4
- **Moment:** A DevTools probe was written to verify the "Pick date & time"
  custom Schedule Send path against live Gmail before writing §5.3.4 code.
- **My input:** Instructed that the throwaway probe be committed to the repo
  (later: split into a single-source runnable `.js` + a how-to/result `.md`
  for non-technical copy-paste) so it can be re-run to rediscover selectors
  when Gmail breaks the path post-launch.
- **What Claude Code would have done without it:** Used the probe ephemerally
  in the console and discarded it — DevTools snippets are conventionally not
  committed. The verification would have happened; the *re-verification asset*
  would not exist.
- **Outcome:** `research/pick-date-time-probe.{js,md}` is now a canonical
  recipe reference alongside the spike doc; `CLAUDE.md` points future sessions
  to re-run it when Gmail's DOM changes. It paid off the same session — its
  result log captures the `innerTarget` fix and the full verified DOM.
- **Artifact:** Commits `d603a64`, `ba5ee63`, `491417b`;
  `research/pick-date-time-probe.md`; `CLAUDE.md` Gmail-automation gotcha.
- **Lesson (for coaching):** A verification you can't repeat is a verification
  with an expiry date — for anything built on fragile external surface, invest
  in making the check re-runnable, not just run-once.

## Entry 10 — The hands-on smoke test that unit tests could never have caught

- **Session:** 4
- **Moment:** §5.2/§5.3 were "done": 33 unit tests green, the probe verified
  the custom path end-to-end, production build clean. Loaded the real
  extension and scheduled an actual email for 3:33 AM despite having set a
  7:00 AM earliest time during onboarding.
- **My input:** Did the hands-on smoke test instead of trusting green tests;
  reported the 3:33 AM result and asked why the floor wasn't honored.
- **What Claude Code would have done without it:** With 33 green tests and a
  probe-verified path, the honest agent conclusion is "verified, ready for
  Session 5." No test asserts working-hours enforcement *because that feature
  (§5.5) is not built yet* — so nothing automated could surface the gap.
- **Outcome:** Surfaced three distinct issues: (1) onboarding collects working
  hours + absolute limits but **nothing enforces them** (§5.5 unbuilt — the
  §5.3.6 hook is a no-op), making those onboarding fields functionally inert;
  (2) the "Absolute limits (any timezone)" copy was genuinely confusing
  (→ Entry 11); (3) an *apparent* post-schedule navigation bug. Honest
  balance: only (1) and (2) were real defects — (3) was investigated and shown
  to be Gmail-native behavior (zero navigation code, grep-verified); "fixing"
  it would have violated §8.1/§11, so the correct response was to push back on
  the bug report, not act on it.
- **Artifact:** `notes/session-4-summary.md:50-67` and `:104-111`; commits
  `289fdf6` (microcopy), `58c0ee3` (post-schedule-landing not-a-bug);
  Session-5 sequence reasoning at `:157-164`.
- **Lesson (for coaching):** Green tests verify what you thought to assert; a
  human using the product the wrong way on purpose finds the things you didn't
  — and a tester's "this is a bug" is a signal to investigate, not always a
  defect to fix.

## Entry 11 — Microcopy as a cognitive-load decision

- **Session:** 4
- **Moment:** The 3:33 AM confusion (Entry 10) traced partly to the
  onboarding fieldset legend "Absolute limits (any timezone)", which did not
  convey that it was a hard cap in the user's own local time.
- **My input:** Treated the confusing copy as a real defect to fix in-session,
  on cognitive-load grounds, rather than a cosmetic nit to defer.
- **What Claude Code would have done without it:** The original copy was
  Claude Code's own and had passed its own review — it shipped. Without a real
  user hitting the confusion, it would have stayed; an agent does not reliably
  catch that its own wording is unclear.
- **Outcome:** Legend → "Hard limits (your local time)"; the working-hours
  legend gained a "soft daily preference" helper and absolute-limits a
  hard-cap helper. Text-only and faithful to PRD §5.1.3 — verified no PRD
  amendment was needed (contrast with Entry 6, where deviation *did* require
  amending the spec). Honest caveat: the record does not capture whether the
  final wording was Claude Code's proposal or the owner's edit — only that the
  owner drove the fix and the relabel shipped.
- **Artifact:** Commit `289fdf6`; `notes/session-4-summary.md:55-60`.
- **Lesson (for coaching):** The author of a confusing sentence is the worst
  judge of its clarity — route microcopy through a fresh reader, and treat
  "this confused a real user" as a defect, not polish.

## Entry 12 — Mid-session scope expansion: "Last scheduled time"

- **Session:** 4
- **Moment:** Mid-session, after a clean probe, the plan (firm = §5.2 + §5.3
  shell + presets) had room. The PRD specified strictly three Quick Option
  presets.
- **My input:** Expanded scope mid-session — add a "Last scheduled time" row
  to mirror Gmail's own behavior (PRD §8.1 "native feel"), going beyond the
  PRD's strict three presets.
- **What Claude Code would have done without it:** Implemented exactly the
  three PRD presets — correct per spec, and the conservative default.
- **Outcome:** "Last scheduled time" row shipped, but the *implementation* was
  a correction of the raw request: sourced from local storage of what
  OutboxIQ itself scheduled (schema v2 `lastScheduled`, additive), **not** by
  scraping Gmail — keeping it local-first and inside §11. Honest tradeoff,
  documented: it reflects the last *OutboxIQ* time, which can diverge from
  Gmail's global scheduled-time memory. This is a case where the owner's
  instinct was right but incomplete, and the agent's constraint-awareness
  shaped how it was built; the PRD §5.3.3 was amended with a dated note.
- **Artifact:** Commits `508f240`, `3fea35d`; `notes/session-4-summary.md:72-78`.
- **Lesson (for coaching):** Scope expansion is legitimate when it serves a
  stated principle (here "native feel"), but the *how* still has to respect
  the hard constraints — a good implementer pushes back on the mechanism even
  while accepting the goal.

## Entry 13 — Select-then-confirm: an irreversible action shouldn't fire on first click

- **Session:** 4
- **Moment:** Post-smoke-test review of the §5.3 modal, where clicking a
  Quick Option immediately scheduled and closed.
- **My input:** Directed a select-then-confirm model — clicking an option only
  *selects* it; a single primary "Schedule" button (disabled until a choice)
  commits — and renamed "Pick date & time" to "Pick custom".
- **What Claude Code would have done without it:** Click-to-schedule-
  immediately is a defensible fast-path design, and it shipped that way first.
  An immediate, hard-to-reverse action firing on a single click is a real UX
  hazard the owner caught only by using the modal.
- **Outcome:** Select-then-confirm modal shipped; PRD §5.3.4 amended for the
  rename and the confirm model.
- **Artifact:** Commits `0745588`, `983e69f`;
  `notes/session-4-summary.md:50-54`.
- **Lesson (for coaching):** A selection and a commitment are different events
  — never let one click both choose and execute an action the user can't
  trivially undo.

## Entry 14 — Reordering Session 5: finish §5.5 before adding §5.3.5/§5.4

- **Session:** 4 (planning Session 5)
- **Moment:** Sequencing Session 5. The natural next step by PRD section order
  was §5.3.5/§5.4 (the OAuth + People API + Maps "Optimize for recipient"
  feature work).
- **My input:** Moved §5.5 working-hours runtime enforcement *ahead* of
  §5.3.5/§5.4, on the principle of finishing what's started before adding new
  surface area — onboarding already collects working hours/absolute limits and
  the new microcopy promises behavior the code doesn't yet honor.
- **What Claude Code would have done without it:** Followed PRD section order /
  gone to the higher-visibility OAuth feature next, layering new UI on top of
  an unenforced foundation. The session summary explicitly marks this ordering
  as the owner's, not a Claude Code recommendation.
- **Outcome:** Session 5 sequence fixed with §5.5 enforcement before
  §5.3.5/§5.4; reasoning recorded so it isn't re-litigated.
- **Artifact:** Commit `d000955`; `notes/session-4-summary.md:136-164`.
- **Lesson (for coaching):** Don't add new surface area while existing inputs
  are inert — close the loop on what users already see before building the
  next thing on top of it.

## Entry 15 — Recurring: "surface, don't act" on scope expansion

- **Session:** Recurring (Sessions 1–4)
- **Moment:** Repeatedly, across sessions, when adjacent features looked
  plausible to add (a separate scheduled-emails view, fixing the "navigation
  bug", broadening permissions, etc.).
- **My input:** Consistently reinforced: when something is outside scope or
  touches PRD §11 / privacy / OAuth scopes / data residency, surface the
  tradeoff and stop — do not improvise the change.
- **What Claude Code would have done without it:** An agent optimizing for
  visible progress tends to build plausible adjacent features. PRD §11
  explicitly forbids 20 of them; without the standing instruction, several
  would have been "helpfully" added (the fallback ladder in the probe doc
  literally encodes "Claude stops and brings this to Fenil — does not
  improvise").
- **Outcome:** Permissions stayed minimal (`storage` + one host permission, no
  `tabs`/`identity`); no forbidden dashboard; the not-a-bug nav behavior was
  left native by design; backend remained untouched until genuinely needed.
- **Artifact:** `CLAUDE.md` "Working in this repo" + §11 framing;
  `research/pick-date-time-probe.md:69`; `notes/session-4-summary.md:104-111`.
- **Lesson (for coaching):** A standing "surface, don't act" rule on
  out-of-scope work is worth more than catching each instance individually —
  it changes the agent's default from "helpfully add" to "flag and wait."

## Entry 16 — Recurring: the honest-debrief format

- **Session:** Recurring (established Session 3, reinforced Session 4)
- **Moment:** End-of-session wrap-ups.
- **My input:** Established a debrief format asking for a 1–5 confidence rating
  and explicitly "the shortcuts you'd flag to a senior reviewer" — rather than
  a generic "is everything good?"
- **What Claude Code would have done without it:** A generic debrief reports
  the green state — "33 tests pass, build clean, ready for next session." The
  consent-gate markup bug, the unenforced §5.5, the confusing copy, the
  missing modal error boundary, the React-bundle-on-every-page cost would all
  have gone unflagged because, by the normal bar, the session *was* "good."
- **Outcome:** Session 3's debrief surfaced six real gaps (all fixed before
  exit, Entry 7); Session 4's surfaced five honest gaps plus the smoke-test
  lesson. The format has consistently produced issues a normal debrief would
  not.
- **Artifact:** `notes/session-3-summary.md:27-38`;
  `notes/session-4-summary.md:113-126` ("Honest gaps flagged") and `:64-67`.
- **Lesson (for coaching):** How you ask for a status determines what you
  learn — "what would you flag to a senior reviewer?" extracts what "is
  everything good?" actively hides.

## Entry 17 — Creating this log

- **Session:** Between Sessions 4 and 5 (meta task)
- **Moment:** Recognizing that the most valuable signal in this collaboration
  — where owner judgment changed the build's trajectory — was scattered across
  session summaries, commit messages, and memory, and in some cases (Entries 1,
  3, 5) was never captured at all because the conversational provenance lived
  only in chat.
- **My input:** Directed that owner-decision provenance be tracked as a
  first-class, ongoing artifact: this file, with a fixed entry structure, an
  explicit honesty rule, populated retroactively for Sessions 1–4 and
  maintained at every future session close-out — including the instruction to
  log my own wrong or incomplete calls, not just the good ones.
- **What Claude Code would have done without it:** Continued recording
  *outcomes* in session summaries and commits, but not the *decision
  provenance* — the counterfactual ("what would have happened otherwise") and
  the attribution of judgment would have stayed implicit and progressively
  unrecoverable, as Entries 1/3/5 already show.
- **Outcome:** `notes/owner-decisions-log.md` created and back-filled;
  `CLAUDE.md` updated so every future session appends an entry (or "no entries
  this session") as part of close-out.
- **Artifact:** This file; the corresponding `CLAUDE.md` close-out obligation;
  the commit that introduces both.
- **Lesson (for coaching):** Outcomes are recorded by default; the *reasoning
  and ownership* behind them are not — if the decision process is the thing
  worth teaching, it has to be deliberately instrumented, or it disappears.

## Entry 18 — Silent bugs may never be deferred by documentation

- **Session:** 5
- **Moment:** The Session 5 smoke test (Scenario 4) confirmed a deterministic,
  *silent* wrong-email mis-target: with two compose windows open, scheduling
  from one scheduled the other, with no error and no signal. Claude presented
  three options — full fix (own session), minimal safety net, or document +
  defer as a known MVP edge — flagged the severity as sharper than Session 4's
  "MVP edge" framing, and recommended the minimal safety net.
- **My input:** Chose the minimal safety net, and — the load-bearing part —
  converted Claude's *lean* into a stated, general rule: **a bug that fails
  silently (wrong outcome, no error, no visible degradation) may not be
  deferred via documentation even when "document + defer" is the cheapest
  option; the cheapest acceptable response is the one that makes the failure
  visible or safe.** Also specified the implementation contract: an
  unconditional (not DEV-gated) diagnostic log for test-user visibility, *no*
  user-facing message (graceful degradation, not an apology), and that
  PRE_LAUNCH must frame the safety net as interim, not the end state.
- **What Claude Code would have done without it:** Honest accounting: Claude
  had *already* surfaced the upgraded severity and recommended the same option,
  so this is not a case where owner judgment reversed a wrong default. But
  Claude offered "document + defer" as a *legitimate* option and only "leaned"
  against it — had the owner picked it, Claude would have executed it. The
  owner's contribution was removing that ambiguity: turning a situational
  preference into a transferable principle, and pinning the
  visibility/no-message/interim-framing contract that Claude had not specified.
- **Outcome:** Safety net shipped (`313d34d`): ≥2 compose chevrons → hand off
  to native on the real compose-scoped menuItem so Gmail schedules the correct
  email; unconditional `console.info`; no user-facing message. The full fix
  (detached-popup anchor problem) is logged as launch-blocking in
  `PRE_LAUNCH_CHECKLIST.md`, explicitly marked interim-not-end-state.
- **Artifact:** Commits `ce5e97f`, `313d34d`; `PRE_LAUNCH_CHECKLIST.md`
  "Multi-compose targeting — full fix"; `notes/session-5-summary.md`
  (Scenario 4); `CLAUDE.md` "Locked product decisions".
- **Lesson (for coaching):** "Cheapest acceptable" is not "cheapest." Triage
  by *failure mode*, not just cost: a bug that throws or visibly degrades can
  be documented and deferred; a bug that silently produces the wrong result
  must first be made loud or made safe — never just written down.

## Entry 19 — Locking §5.5 as a soft warning *before* the build

- **Session:** 5
- **Moment:** Session 5 planning, before any §5.5 code. The PRD calls the
  feature "Auto-Reschedule on Outside Working Hours" and §5.5.2 lists a
  primary "Schedule for [Next Working Day]" action plus an auto-suppress
  checkbox.
- **My input:** Pre-emptively locked the interaction model as a **soft
  warning** — three explicit choices (Reschedule / Send anyway / Cancel),
  never a hard block, never a silent auto-snap, surface the absolute-limit
  violation when both fire — and required it recorded in CLAUDE.md *before*
  planning, "not have it surface as a decision during build." Later refined
  the snap target (Q3): absolute violations snap to the same-day boundary,
  not next-working-day, because "absolute limits are clock-time rules, not
  day-of-week rules — the user picked their day deliberately."
- **What Claude Code would have done without it:** The PRD's name
  ("Auto-Reschedule"), the §5.5.2 primary action, and the auto-suppress
  checkbox all point an implementer toward auto-snap-with-a-toggle. Claude
  would plausibly have built the literal §5.5.2 (recommended action primary,
  suppress-in-future checkbox) — defensible spec-following, but it bakes in
  the silent-shift behaviour the owner considers a trust violation. The
  snap-target subtlety (same-day vs next-working-day for *absolute*
  violations) is exactly the kind of thing that surfaces mid-build as an
  ambiguous decision made under implementation pressure.
- **Outcome:** Locked decision recorded pre-build (`ce5e97f`); §5.5 shipped
  as the soft warning (`0921d26`); PRD §5.5.1/.2/.3 amended to match
  (`c86e424`) rather than left to contradict the code (Entry-6 discipline).
  No build-time re-litigation occurred — the lock did its job.
- **Artifact:** `CLAUDE.md` "Locked product decisions"; commits `ce5e97f`,
  `0921d26`, `c86e424`; PRD §5.5 amendments; `notes/session-5-summary.md`.
- **Lesson (for coaching):** The decisions most worth making are the ones
  you make *before* the work, in calm, not the ones forced on you mid-build
  by the code. If a spec's defaults encode a behaviour you'd object to,
  override it explicitly and in writing up front — don't let "follow the
  spec" smuggle it in.

## Entry 20 — Catching a paternalistic rule in my own approved plan

- **Session:** 5
- **Moment:** Implementing the agreed validation prerequisite. The approved
  plan (Claude's own, owner-signed-off) said: add a "must have ≥1 working
  day enabled" hard rule so §5.5.3's next-working-day search is well-defined.
- **My input:** Stopped implementation and surfaced that the *approved
  plan itself* was wrong — a ≥1-day hard-block forbids a legitimate
  "absolute-limits-only, no soft preference" configuration and is the same
  config-layer paternalism the soft-warning lock rejects — then chose
  "treat zero days as no soft constraint" and had §5.5 handle it instead.
- **What Claude Code would have done without it:** This one is honest in
  Claude's favour and the owner's both: Claude *did* catch its own plan's
  flaw and surface it rather than build the approved-but-wrong thing — the
  "surface, don't act" rule (Entry 15) firing on Claude's *own* plan, not
  just on scope creep. But the call to accept the legitimacy of an
  absolute-only config (rather than, say, hard-blocking and adding a UI
  hint) was the owner's. Without the owner the most likely path is Claude
  builds the approved hard-block, because deviating from an
  owner-approved plan needs explicit re-clearance — which is precisely
  what surfacing obtained.
- **Outcome:** No hard-block added; `validateWorkingHours` unchanged;
  defense-in-depth went to `completeOnboarding` instead; §5.5 calc treats
  zero days as soft-constraint-inactive (`eac9218`, `29610a5`). PRD §5.5.3
  amendment documents the zero-days semantics.
- **Artifact:** Commits `eac9218`, `29610a5`; PRD §5.5.3 amendment;
  `notes/session-5-summary.md` "surfaced-and-corrected".
- **Lesson (for coaching):** An approved plan is not immune from the
  "surface, don't act" rule — if you discover *your own signed-off plan*
  is wrong while building it, stop and re-clear, don't loyally implement
  the mistake. Plan approval buys direction, not infallibility.

## Entry 21 — Warnings fire for unintended actions, not the core use case

- **Session:** 5.5
- **Moment:** Hands-on use of the Session 5 §5.5 build. It warned on *every*
  out-of-working-hours schedule — including the product's entire reason to
  exist: deliberately scheduling 3 AM local to land in a recipient's 9 AM.
- **My input:** Diagnosed this as a UX miscalibration, not a bug, and
  pivoted the design: **Schedule Send warns on absolute limits only;**
  working hours stop triggering the Schedule Send modal (kept for the
  regular-Send trigger and future §5.3.5). Reasoning: warning a user for
  doing exactly what the product enables trains them to reflex-dismiss the
  modal, destroying its value for the absolute-limit cases that matter.
- **What Claude Code would have done without it:** Claude built §5.5 to the
  literal PRD ("a time outside their working hours" → warn) and it passed
  its own review — 57 green tests, locked-pattern modal, PRD-amended. No
  automated check could surface this: the code did exactly what the spec
  said. It took the owner *using* the product on its own core use case to
  see that the spec itself was miscalibrated. Claude would have carried the
  over-warning forward.
- **Outcome:** One-predicate narrowing (`fbad42d`), zero calc ripple
  (`checkWorkingHours` still computes both; only the consumer narrows); PRD
  §5.5 amended, CLAUDE.md locked. The working-hours branch explicitly
  preserved for §5.5.1/§5.3.5 with a CONSUMERS doc-block so it isn't later
  deleted as dead.
- **Artifact:** Commit `fbad42d`; PRD §5.5 amendment; `CLAUDE.md` "Locked
  product decisions"; `notes/session-5.5-summary.md`.
- **Lesson (for coaching):** A feature that fires on the user's *intended*
  action isn't protecting them — it's noise that teaches them to ignore the
  signal. Calibrate alerts against the core use case first; "the spec said
  to warn" is not the same as "warning here helps."

## Entry 22 — Refusing a network-effect design before it was ever coded

- **Session:** 5.5
- **Moment:** Scoping forward features. Working-hours sharing / reply-time
  prediction / cross-user send-time coordination are attractive
  network-effect ideas.
- **My input:** Explicitly deferred all of them to v2 and recorded *why*
  in PRE_LAUNCH: gating single-user optimization on mutual adoption would
  compromise the solo experience for a sharing incentive — bad B2B SaaS
  design; the product must be fully valuable to user #1 with no other
  users present.
- **What Claude Code would have done without it:** This is a clean
  owner-judgment entry — the idea was never in a plan or the code, so
  Claude had nothing to build or not-build. The value was *pre-empting*:
  naming the anti-pattern and writing it into the launch checklist so a
  future session (or a future enthusiastic "while we're here") cannot
  reintroduce adoption-gated optimization without confronting the recorded
  reasoning. Without it, the idea stays un-adjudicated and resurfaces.
- **Outcome:** PRE_LAUNCH "v1 vs. v2 decisions" section created
  (`5fe1536`); single-user experience explicitly protected as a v1
  invariant.
- **Artifact:** `PRE_LAUNCH_CHECKLIST.md` "v1 vs. v2 decisions"; commit
  `5fe1536`.
- **Lesson (for coaching):** The cheapest time to kill a bad design is
  before it is a plan. Write down the *reasoning* for a deferral, not just
  the deferral — an un-argued "later" gets relitigated; an argued one
  holds.

## Entry 23 — Pulling §5.5.1 forward, then accepting the split

- **Session:** 5.5
- **Moment:** Deciding when to build the regular-Send (§5.5.1) trigger.
- **My input:** Pushed to pull §5.5.1 *forward* into this work rather than
  leave it loosely "its own future session" — reasoning that the full
  trigger surface (Schedule Send + regular Send) is one UX story and should
  be handled holistically while context is fresh, before more dependent
  code lands.
- **What Claude Code would have done without it:** Left §5.5.1 as the
  vaguely-deferred item Session 5 had made it. The owner's push forced the
  question "is this one session?" — and the honest answer (which Claude
  then gave, and the owner accepted) was *no*: §5.5.1 is probe-gated
  (unverified primary-Send DOM) and the single highest-criticality change
  in the product (a bug = users cannot send email), so it earns isolation.
  The owner's instinct (handle holistically, soon) and the sizing reality
  (isolate the dangerous, unverified piece) were reconciled into a
  back-to-back 5.5 → 5.6 split with zero rework.
- **Outcome:** §5.5.1 scheduled as its own Session 5.6 with a probe gate;
  5.5 shipped the independent pieces (bug fixes, narrowing, copy, docs).
  The "holistic" goal is preserved at the program level; the risk is
  isolated.
- **Artifact:** `notes/session-5.5-summary.md` (split + 5.6 sequence);
  `CLAUDE.md` Repository status.
- **Lesson (for coaching):** "Do it all together while it's fresh" and
  "isolate the riskiest, least-known piece" can both be right — the
  resolution is sequencing (adjacent sessions), not cramming. Pulling work
  forward is good; pulling *risk* forward into a crowded session is not.

## Entry 24 — Product changes propagate to copy

- **Session:** 5.5
- **Moment:** After the §5.5 narrowing + §5.5.1 split, the onboarding
  working-hours helper still described the *old* behaviour ("a soft daily
  preference") — accurate before the pivot, stale after it.
- **My input:** Required the surrounding language move with the behaviour:
  the helper now states that clicking Send outside working hours triggers a
  gentle confirm. Also demanded a check of the transparency screen (the
  outcome there: the verbatim PRD §5.1.3 bullet was *still* accurate, so it
  was deliberately left unchanged — propagation means *re-checking* copy,
  not reflexively rewriting it).
- **What Claude Code would have done without it:** Shipped the behaviour
  change with the onboarding copy untouched. Copy drift is invisible to
  tests and to the implementer (the words still "read fine"); only a reader
  holding the new mental model notices the mismatch. It would have sat
  there until a confused user hit it — small, but exactly the kind of
  detail that erodes trust by accumulation.
- **Outcome:** Helper copy updated (`1bf9f0d`); transparency bullet
  re-verified and intentionally kept (no PRD §5.1.3 amendment needed —
  contrast Entry 6, where deviation *did* require amending the spec).
- **Artifact:** Commit `1bf9f0d`; `notes/session-5.5-summary.md` (H).
- **Lesson (for coaching):** When a feature's behaviour shifts, its
  surrounding language is part of the change, not an afterthought — a
  codebase whose copy describes the old behaviour ships users a wrong
  mental model. "Propagate to copy" also means *re-confirm*, not blindly
  rewrite: some copy survives the change correct.

## Entry 25 — Assumption falsification is normal; design for robustness, don't re-guess

- **Session:** 5 (the multi-compose relabel arc)
- **Moment:** The original A1 relabel work (`0a0a5de`) shipped on a
  *transient-menu* assumption — that Gmail recreates the Schedule menu on
  every dropdown open, so a check-at-relabel-time would naturally
  re-evaluate. Hands-on smoke testing falsified it: labels froze and
  disagreed across composes (Bug 1 + Bug 2). The assumption could not have
  been verified without live execution; it was a guess that read as fact in
  the code comment.
- **My input:** Framed the falsification as *normal* for DOM-heavy
  extension work where the model can't be empirically verified without live
  execution, and set the standard for the response: the completion fix must
  be **correct under both candidate DOM models** (transient *and*
  persistent menu), not rebuilt on a fresh guess. Concretely that meant
  idempotent bidirectional labeling, capture-original-once for locale-safe
  revert, a shared predicate between label and click-behaviour, and the
  reactive trigger driven off the existing observer.
- **What Claude Code would have done without it:** The natural agent
  response to "your assumption was wrong" is to form a *new* confident
  assumption (e.g. "OK, the menu is persistent") and rebuild on it — which
  the *next* smoke test could have falsified just as easily, costing
  another round-trip. Claude *did* open by naming the falsified assumption,
  the specific commit, and the false comment (the owner-decisions-log
  discipline now operating on Claude's own work) — but the explicit
  instruction to engineer for robustness *under uncertainty* rather than
  re-assert a new model was the owner's, and it is what made the fix
  one-and-done (Chrome 4-state verify passed first try).
- **Outcome:** `5b88b11` — reactive, idempotent, bidirectional relabel,
  correct whether the menu is transient or persistent; the false `0a0a5de`
  comment corrected in the same commit. Verified against real Gmail
  (owner's 4-state test) on the first attempt.
- **Artifact:** Commits `0a0a5de` (the falsified original), `5b88b11` (the
  robust completion); `notes/session-5-summary.md` (the A1 arc); this
  entry.
- **Lesson (for coaching):** When an unverifiable assumption is falsified,
  the failure is not the lesson — *re-asserting confidence in a new guess*
  is. Where you cannot empirically check the model, design for correctness
  under *all* plausible models; robustness-under-uncertainty beats a
  better guess, because the next guess can be wrong too.

## Session 6 — note on the §5.5.1 work itself (no entry), then Entries 26–27

The §5.5.1 implementation that was the body of Session 6 produced **no
owner-decisions entry**: it executed the already-locked Entry-2 / Entry-23
probe-gating discipline (build the Send-button probe, clear the gate
against live Gmail, then implement). No new owner judgment redirected that
build. The owner's faithful hands-on probe runs — including reporting the
alarming intermediate "it sent" rather than mislabelling it, which is
exactly what let the gate catch the too-blunt one-shot diagnostic — were
*execution of the locked protocol*, not a trajectory change. The
`armSuppress`-too-blunt near-miss is a Claude-side process residual
(recorded honestly in `notes/session-6-summary.md` §f), not an
owner-decisions entry per this file's defined purpose.

The two decisions below are **separate** from that §5.5.1 work — owner-
driven, trajectory-changing scope reductions made in the same calm review
that preceded the §5.3.5/§5.4 build. They qualify; Entries 26 and 27.

## Entry 26 — Removing Google Maps from product scope by asking what it was for

- **Session:** 6 (close-out, pre-§5.3.5/§5.4 review)
- **Moment:** Prepping the §5.3.5/§5.4 "Optimize for recipient" work.
  Claude Code surfaced the Google Maps Geocoding + Time Zone APIs as part
  of that prep — as a paid third-party dependency behind a backend proxy —
  carrying it forward as a given because the PRD specified it.
- **My input:** Pushed back with, in effect, "what does Maps actually do
  here?" — refusing to build the dependency before its necessity was
  established. The resulting decision: **remove** Maps from scope entirely
  (not defer to v2), eliminating a paid API, the backend's entire second
  purpose, the `POST /timezone/resolve` endpoint, two OAuth-adjacent
  concerns, and an estimated session of proxy work.
- **What Claude Code would have done without it:** Carried Maps forward as
  PRD-specified scope and built §5.4.1 steps 3–4 + the backend proxy in
  Session 7 — faithfully implementing the spec, which is the correct
  default for a careful agent. **Honest split of credit (Entry 17 rule):**
  the *analysis* that justified removal — the single-digit hit-rate
  estimate, the cache-forever mitigation, the free-Workspace-Directory
  alternative, the cost/complexity argument — was Claude Code's, produced
  in response to the owner's question. The owner's contribution was the
  *question* and the *decision*; Claude Code's was the *analysis*. Neither
  gets all the credit: without the question the analysis never runs;
  without the analysis the question doesn't resolve into a confident
  permanent removal.
- **Outcome:** Maps removed permanently. Backend is single-purpose
  (Unschedule-on-Reply). PRD §5.4.1/§5.4.3/§6.1.1/§7.3.1/§7.3.3/§7.4,
  CLAUDE.md, README, PRE_LAUNCH amended (commit `2a89c81`). A pre-existing
  PRD self-contradiction (line 16 "only … Unschedule-on-Reply" vs §7.3.1
  "two purposes") was resolved as a side effect.
- **Artifact:** Commit `2a89c81`; PRD §5.4.1 + §7.3.1 amendments;
  `CLAUDE.md` Architecture (`backend/` "exactly one reason");
  `notes/session-6-summary.md` close-out addendum.
- **Lesson (for coaching):** A spec line is not a justification. Before
  building a costly external dependency, ask "what does this actually buy,
  and how often?" — a single question can delete a paid API, a backend
  purpose, and a session of work. And split credit honestly: the question
  and the analysis are different contributions; a log that hands either
  one the whole win teaches the wrong lesson.

## Entry 27 — Reframing the multi-compose deferral with an argument, not a status change

- **Session:** 6 (close-out, same review)
- **Moment:** Reviewing launch blockers before §5.3.5/§5.4. The
  multi-compose "full fix" was carried (Session 5) as **launch-blocking**.
- **My input:** Reframed it as a **v2 deferral, not launch-blocking** —
  and required the deferral be *argued in writing* in the canonical
  "v1 vs. v2 decisions" place (Entry 22 discipline: an argued deferral
  holds, an unargued one gets relitigated), explicitly framing this as a
  refined decision with more context, **not** a correction of the Session
  5 call (which was right given what was known then).
- **What Claude Code would have done without it:** Kept the
  launch-blocking label — it was a documented prior decision; an agent
  respecting locked decisions does not silently downgrade a launch
  blocker. The honest counterfactual is not "Claude would have built the
  wrong thing" (the safety net already exists and is correct); it is that
  the blocker would have sat there *unargued*, and a future session — or a
  future "we're near launch, let's clear blockers" pass — would have
  either felt compelled to spend a session on the full fix or downgraded
  it without the reasoning written down. The owner's contribution was the
  judgment that the cost/benefit doesn't justify v1 work **and** the
  discipline to argue it rather than just relabel it.
- **Outcome:** Reframed across PRE_LAUNCH (section + a new argued
  "v1 vs. v2" entry), CLAUDE.md, and the PRD §5.5.1 amendment (commit
  `33c79ac`). The Session 5 launch-blocking framing is preserved in the
  historical summaries as accurate-at-the-time.
- **Artifact:** Commit `33c79ac`; `PRE_LAUNCH_CHECKLIST.md` "Multi-compose
  targeting" + "v1 vs. v2 decisions"; this entry; Entry 18 (the original
  silent-vs-visible-bug decision this refines) and Entry 22 (the pattern
  this applies).
- **Lesson (for coaching):** Downgrading a prior "must-fix" is legitimate
  — but only if you *argue* it, not just relabel it, and only if you say
  plainly that it's a refinement with more context, not a correction of
  the earlier call. An unargued downgrade reads as drift and gets
  relitigated; an argued one, placed where deferrals are tracked, holds.

## Entry 28 — The Phase-1 smoke that caught a default-reachable bug, and the re-scope it forced

- **Session:** 7
- **Moment:** Phase 1 "gate zero" — the first hands-on run of the assembled
  §5.5.1 regular-Send guard against live Gmail. 85 jsdom tests were green;
  Session 6 had shipped §5.5.1 probe-gated. Tests A–F passed; **Test G**
  (Send while past the absolute *latest* time) showed the modal's primary
  "Reschedule to…" proposing a **past** time, which Gmail rejected
  ("Invalid time").
- **My input:** Ran the smoke faithfully and reported Test G's exact
  failure with screenshots rather than rounding it to "mostly worked";
  then made two calls — (a) re-scoped the session: *fix §5.5.1 now **and**
  keep Phase 2, defer Phase 3* (chose this over the offered "fix-only" and
  "document & defer the bug" options); (b) chose the snap-target product
  decision — **"next working morning"** — which refines a *locked*
  decision.
- **What Claude Code would have done without it:** Honest split. The
  smoke-first discipline is locked protocol (Entry 10) and Claude built
  the harness and flagged Test G as non-trivial — the prompt's triage rule
  would have caught it either way. But no automated test could surface
  this: the unit asserts the locked same-day snap, which is "correct" per
  spec — the *spec* was miscalibrated for §5.5.1's reuse (the Entry-21 /
  Entry-25 pattern). It took the owner *using* the product on its own
  default evening path and reporting the precise Gmail rejection. The
  specific re-scope shape and the snap semantics were owner calls; Claude
  surfaced options and a recommendation and did **not** pick.
- **Outcome:** Surgical fix — a pure, time-aware `ensureFutureSnap()`
  scoped to the one provably past-prone case (`after-latest`), applied by
  both §5.5.1 and §5.3; `checkWorkingHours` unchanged/Date.now-free. +7
  tests incl. an explicit Test-G regression (92 green); re-verified
  hands-on (G1 valid future schedule; G2/G3 unchanged). PRD §5.5.3 +
  CLAUDE.md amended (refine, not overturn). Commit `f673e5b`. Phase 3
  deferred to Session 8.
- **Artifact:** Commit `f673e5b`; `research/regular-send-smoke.{js,md}`;
  PRD §5.5.3 + CLAUDE.md "Locked product decisions" amendments;
  `notes/session-7-summary.md`.
- **Lesson (for coaching):** A human using the product on its own default
  path finds what green tests structurally cannot when the *spec itself*
  is the thing miscalibrated. And when the bug sits on a locked decision,
  the fix's semantics are an owner product call — surface options, don't
  improvise them mid-build.

## Entry 29 — Overriding the prompt's own OAuth-client instruction

- **Session:** 7
- **Moment:** Phase 2 GCP setup. The session prompt's step 4 explicitly
  said: create a **"Chrome extension"** type OAuth client.
- **My input:** When Claude surfaced that a "Chrome extension" client
  (which drives `chrome.identity.getAuthToken`) structurally **cannot**
  deliver the refresh tokens the deferred Phase 3 — and PRD §7.5 / the
  backend — require, chose to create a **"Web application"** client
  instead, knowingly deviating from the prompt's literal instruction, and
  to do it *now* rather than defer client creation.
- **What Claude Code would have done without it:** Honest in Claude's
  favour on the catch: Claude applied "surface, don't act" to the
  *prompt's own scope* (Entry 20) — flagged the conflict and recommended
  the Web-application path with reasoning. But deviating from an explicit
  written instruction requires owner authority; without the owner Claude
  would not have unilaterally substituted a different client type, and the
  honest default (follow the explicit step) would have produced a
  credential torn out and redone in Phase 3. Claude's analysis; the
  owner's decision to authorise correcting the prompt.
- **Outcome:** Web-application OAuth client created (`outboxiq-dev`,
  Testing mode), redirect URI built from a newly **pinned stable extension
  ID** (manifest `key`), Client ID captured in a typed
  `src/lib/oauth-config.ts` — the "where it lives" decision also surfaced
  (public-by-design typed constant; **not** an env var, **not** the
  manifest `oauth2` key). Consent screen + 4 scopes + 2 test users
  verified hands-on for both accounts (`?code=`). Commit `dda59e0`. The
  Phase 3 OAuth *flow* stays deferred to its own architecture review.
- **Artifact:** Commit `dda59e0`; `extension/src/lib/oauth-config.ts`;
  `extension/manifest.config.ts` (pinned `key`); `CLAUDE.md` "Google Cloud
  / OAuth"; `notes/session-7-summary.md`.
- **Lesson (for coaching):** A prompt instruction is not exempt from
  "what is this actually for?" (Entry 26). When a literal step conflicts
  with a deferred-but-known requirement, surface the conflict and get
  explicit authority to deviate — don't follow it into rework, and don't
  silently change it either.

## Entry 30 — A rename question that hardened an implicit property into a guardrail

- **Session:** 7
- **Moment:** Mid-Phase-2, the owner proactively asked how a future
  product **rename** would affect what was already built and configured,
  and whether impact could be confined to copy/branding.
- **My input:** The question itself — forcing an explicit
  brand/identity-decoupling analysis *before* any rename pressure exists —
  and then choosing "**log it, don't churn code now**" (a tracked
  guardrail + a surfaced launch-blocker) over an immediate refactor.
- **What Claude Code would have done without it:** A clean
  owner-judgment-via-question entry (cf. Entry 26's question, Entry 22's
  pre-emption). The decoupling was *already largely true by construction*
  (extension ID from the manifest `key`, opaque Client ID, etc.) — Claude
  produced that analysis in response. Without the question it stays an
  implicit, undocumented property, and the brand-named, hard-coded
  Privacy/ToS/Pages URLs sit as a latent launch trap nobody named until a
  rebrand or launch made it expensive.
- **Outcome:** `PRE_LAUNCH_CHECKLIST.md` "Naming / rebrand readiness" (incl.
  a new launch-blocker: host the real legal docs on a rename-proof,
  brand-neutral/owned URL) + a `CLAUDE.md` "Locked tech decisions"
  brand-independent-identifiers bullet. **No code churn** — the owner's
  restraint kept Session 7 focused; the `PRODUCT_NAME` centralisation is
  logged as an explicitly-deferred optional task, not drift.
- **Artifact:** `PRE_LAUNCH_CHECKLIST.md` "Naming / rebrand readiness";
  `CLAUDE.md` "Locked tech decisions"; this entry.
- **Lesson (for coaching):** The cheapest moment to harden an
  architectural property is when someone asks whether it holds. One
  forward-looking question turns an implicit, fragile assumption into a
  written guardrail and surfaces the single place it leaks — long before
  launch pressure makes it costly.

## Entry 31 — Locking "refresh tokens live on the backend" before Session 8 could decide it under pressure

- **Session:** 7 close-out → pre-Session-8 (a documents-only architectural
  lock; not new Session-7 build work — sits alongside Entries 28–30).
- **Moment:** Session 7 deferred the OAuth flow to Session 8 with "where
  do tokens live (PKCE-in-extension vs server-side exchange)?" left as an
  open question for Session 8's pre-implementation review. Before that
  review, the owner stepped in to settle it in calm.
- **My input (owner):** Directed **Option B** — refresh tokens live only
  on the backend, per-user-encrypted, obtained via server-side
  authorization-code exchange; the extension never stores a refresh token
  and PKCE-in-extension (Option A) is explicitly rejected. Supplied the
  full five-point rationale (Unschedule-on-Reply structurally needs a
  backend refresh token; §7.3.4 already specifies exactly this; the
  privacy story; one CASA-audited surface; enterprise/GDPR posture) and
  the explicit instruction to encode it across PRD/CLAUDE/PRE_LAUNCH and
  to expand the roadmap to three sessions (8 backend+OAuth, 9 cascade,
  10 UI).
- **What Claude Code would have done without it:** Session 8 would have
  opened with "where do tokens live?" as a live question and very likely
  resolved it **mid-build, under implementation pressure**, in favour of
  whichever option Claude led with. The end answer might well have been
  the same (Option B is the spec-consistent choice), but the *reasoning*
  would not have been recorded with the depth later work needs (CASA
  prep, enterprise security reviews). **Honest credit split (Entry 17):**
  the decision, its A-vs-B weighing, and the rationale were the **owner's
  — brought whole**, not produced by Claude in this round (do not inflate
  this: the prompt itself contained the analysis). Claude's load-bearing
  contributions were *upstream and downstream*, not the choice itself:
  (a) the Session-7 Entry-29 analysis that `getAuthToken` cannot deliver
  refresh tokens → the Web-application client, which is the technical
  precondition Option B rests on; (b) this close-out review surfacing two
  implications the owner's directive did **not** enumerate — that a
  backend outage now also degrades the client-only Calendar/People
  features (broadening §6.7's trigger, captured in the §7.5 amendment),
  and that "add OAuth token management to the backend" had to be framed
  so it does not read as reversing the Entry-26 single-purpose narrowing.
  Owner forced and decided; Claude supplied the precondition and hardened
  the record. Neither did the other's part.
- **Outcome:** PRD §7.5 (Option B, supersedes the split-storage wording),
  §7.3.1 (one-purpose-incl-OAuth-infra framing), §7.3.3 (`/auth/exchange`,
  `/auth/token`, `/auth/revoke`), §7.3.4 (refresh-token-backend-exclusive
  confirmation) amended; CLAUDE.md Architecture + "Google Cloud / OAuth"
  (locked, with the 8/9/10 split and a §5.1.3 Calendar-amendment tracking
  marker); PRE_LAUNCH Infrastructure + "Naming / rebrand readiness"
  (domain lead-time/trademark) updated; `backend/README.md` refined to
  match (a forward-looking doc the prompt did not name — flagged). The
  Entry-19 lesson applied **successfully**: the decision was made in calm,
  not under build pressure.
- **Artifact:** This entry; PRD §7.5/§7.3.1/§7.3.3/§7.3.4 amendments;
  `CLAUDE.md` "Google Cloud / OAuth" + Architecture; `PRE_LAUNCH_CHECKLIST.md`
  Infrastructure + "Naming / rebrand readiness"; `backend/README.md`;
  `notes/session-7-summary.md` (deferred-scope update).
- **Lesson (for coaching):** The decisions most worth taking off the
  critical path are the architectural ones a future session would
  otherwise make mid-build. Pulling "where do tokens live?" into calm
  review didn't change the likely answer — it changed whether the
  *reasoning* was recorded at the depth that audits, enterprise reviews,
  and future architecture will need. And split credit precisely: bringing
  a decision whole is a different contribution from creating the
  precondition it rests on or surfacing its unstated implications — a log
  that blurs them teaches the wrong lesson.

## Entry 32 — Splitting OutboxIQ into Free v1 and Premium v1 tiers before Session 8 could build the backend

- **Session:** 7 close-out → pre-Session-8 (a documents-only scope/tier
  decision; sits *after* Entry 31, same day, 2026-05-17 — not new
  Session-7 build work).
- **Moment:** Session 7 had locked the Option-B token architecture
  (Entry 31) and set Session 8 to start the **backend skeleton + OAuth
  server-side exchange** — because, under the then-operative assumption,
  Unschedule-on-Reply (the backend's reason to exist) was in v1's only
  tier, so OAuth couldn't work end-to-end without the backend. Before
  that build began, the owner asked the load-bearing strategic question:
  **"does Optimize-for-recipient (§5.3.5) actually require a backend?"**
- **My input (owner):** Split OutboxIQ into **two tiers of the same
  generation**: **Free v1** — extension-only, no backend, free, the
  public-launch target — and **Premium v1** — extension + backend, paid,
  built later, carrying Unschedule-on-Reply and the whole backend. The
  reasoning: implementation work across Sessions 5–7 had made the
  *cost-to-ship of the full scope* concrete (CASA Tier 2 — several-
  thousand-USD, 4–8 weeks; backend infra; per-user encryption; ongoing
  hosting; EU compliance posture), while the PRD's core value
  proposition — recipient-aware Schedule Send with Optimize-for-recipient
  — is fully deliverable on-device. A leaner Free v1 validates demand
  *before* that investment. Two sub-decisions flowed from it: **(a)**
  retain the Session-7 Web-application OAuth client for Free v1 (with
  `access_type=online`, no refresh token, no backend); **(b)** add two
  informational Gmail-API pre-launch probes to validate a *potential*
  future inbox-organization direction before naming/positioning is
  finalized — rather than expand Free v1 scope on intuition.
- **What Claude Code would have done without it (Entry 17 honesty
  rule):** Session 8 would have opened and **begun backend
  implementation for Unschedule-on-Reply** — faithfully executing the
  Entry-31 lock and the Session-7 roadmap, which is the correct default
  for an agent respecting locked decisions. That path incurs the full
  cost-to-ship (CASA Tier 2 alone is 4–8 weeks) and delays any public
  launch by **months**, to ship a feature whose demand is unvalidated.
  The honest credit split:
  - **The implementation work itself surfaced the cost realities.** The
    PRD was **not "wrong"** — it was written before the cost-to-ship was
    concrete. Sessions 5–7 *taught* the team what the full scope
    actually costs by building against it. The spec didn't fail; it was
    front-loaded before the evidence existed.
  - **Claude Code's earlier work is foundation, not failure.** Sessions
    5–7 built real, valuable features (the §5.5/§5.5.1 enforcement, the
    verified Schedule Send recipe, the GCP/OAuth foundation). Every
    architecture decision along the way — including Entry 31's Option B —
    was **correct for its scope** and remains the binding design *for
    Premium v1*. The tier split reframes on top of that work; it does
    not invalidate it (Entry-4 discipline made explicit: locked against
    drift, not against the new fact that Unschedule-on-Reply is now
    tier-gated).
  - **The owner's strategic question was the load-bearing pivot.** "Does
    Optimize-for-X require a backend?" forced the explicit
    feature-by-feature examination of *which capability needs which
    infrastructure* — the analysis that established the backend
    dependency is isolated to exactly one PRD feature. Claude supplied
    that mapping in response; the owner supplied the question and the
    decision. Neither does the other's part (the recurring Entry-26
    pattern: a question can delete — or here, defer — a whole
    infrastructure tier).
  - **A small Entry-25 moment (logged honestly against Claude):** earlier
    in this conversation Claude initially leaned toward switching from
    the Web-application OAuth client to a Chrome-extension client for the
    simpler Free v1 flow. The owner's pushback — *"do we lose
    anything?"* — forced Claude to re-examine, and it revised: a
    Chrome-extension client (`getAuthToken`) **cannot let a multi-Google-
    account user choose which account to authorize**, a real correctness
    bug for the target users. Claude examined its own guess and corrected
    it when given the chance; the owner's question is what created the
    chance. (This is *why* the Web-app client is retained for Free v1 —
    the multi-account UX, not just the Premium reuse.)
  - **Framing: this is a tier split, not scope deletion.** Free v1 and
    Premium v1 are **parallel tiers of the same generation**, not
    sequential versions and **not "v2"** (which in this repo means a
    later generation / post-launch additive direction). The deferred
    design is **preserved verbatim and intact in PRD §13**, explicitly
    *not* an Entry-26-style permanent removal. This framing is
    load-bearing for the product's eventual commercial structure (a
    Free→Premium upgrade, not a forced migration).
  - **GDPR is not tiered.** Compliance is a regulatory obligation, not a
    Premium feature; Free v1's lighter posture follows naturally from it
    processing less personal data (local-first only), not from a
    decision to "tier compliance" (PRD §6.1 amendment).
- **Outcome:** Documents-only encoding (no feature code, no test, no GCP
  change). PRD: new **§13 Premium v1 Scope** (full §5.6 + §7.3 + the
  Entry-31 §7.5 Option-B design moved verbatim, with §5.6/§7.3 left as
  stubs); §7.5 rewritten as the Free v1 `access_type=online` model;
  §11 tier note (§11 = never build, in any tier ≠ §13 = build, Premium
  tier); dated tier pointers on §1/§2.2/§6.1/§6.5/§6.7/§7.1/§7.4 so the
  PRD stays internally consistent. CLAUDE.md: Repository status, Source-
  of-truth docs, Architecture, Locked tech decisions, and a rewritten
  "Google Cloud / OAuth" (two OAuth models, Free roadmap, updated §5.1.3
  + stale-comment tracking markers). `PRE_LAUNCH_CHECKLIST.md` retitled
  to **Free v1** and audited per item; `PREMIUM_LAUNCH_CHECKLIST.md`
  created (CASA Tier 2, backend infra, online→offline OAuth, backend
  legal addendum, Free→Premium migration, billing). A new "Pre-launch
  probes" section captures the two Gmail-API probes with reasoning and
  fixed sequencing (feature-complete → probes → naming/positioning →
  hardening). **A flagged refinement of the directive, surfaced not
  silently implemented (Entry-20/25 discipline):** "CASA Tier 2 → Premium,
  no longer Free-v1-blocking" is only half-right — Free v1 keeps the
  restricted Gmail scopes, so *a* CASA assessment (plausibly Tier 1,
  tier-to-confirm) is **still Free-v1-launch-blocking**; encoded
  accurately rather than as a launch-blindsiding "no assessment needed".
- **Artifact:** This entry; PRD §13 + §7.5 rewrite + §1/§2.2/§6/§7/§11
  tier amendments; `CLAUDE.md` (Repository status, Architecture, Locked
  tech, "Google Cloud / OAuth"); `PRE_LAUNCH_CHECKLIST.md` (Free v1
  audit + "Pre-launch probes"); `PREMIUM_LAUNCH_CHECKLIST.md` (new);
  `notes/session-7-summary.md` forward addendum; `README.md` /
  `backend/README.md` tier touches. Entry 31 (the preserved Premium
  design, *not* rewritten), Entry 26 (removal-vs-preservation contrast),
  Entry 22 (the argued-deferral pattern this applies at scope level),
  Entry 4 (locked-against-drift-not-new-facts), Entry 17 (the credit-
  split honesty this entry runs on).
- **Lesson (for coaching):** Building against a spec is how you learn
  what the spec actually costs — and the right response to "this is more
  expensive than the document assumed" is not to cut the feature or push
  through regardless, but to ask *which part actually carries the cost*
  and whether the validated-value core can ship without it. A tier split
  preserves the deferred design (a future build reads it intact) instead
  of deleting it; it is a different move from removal, and saying which
  one you're making — in writing, argued, where deferrals are tracked —
  is what stops it being relitigated. And keep crediting precisely:
  the implementation that surfaced the cost, the question that forced the
  examination, and the analysis that answered it are three different
  contributions; a log that merges them teaches the wrong lesson.
- **Amendment (2026-05-27, Session-13 follow-up — Entry 52 executed; this
  Premium-removal commit).** The "two tiers of the same generation, Premium
  built *later in this repo*" framing above is **superseded** on the
  "where Premium lives" axis only. Premium v1 is now **out of scope of this
  project entirely**: the preserved `extension/src/premium-v1/` + `backend/`
  + `PREMIUM_LAUNCH_CHECKLIST.md` + PRD §13 were **removed** from this public
  repo, and a future Premium build will be a **fork of this (now Apache-2.0)
  Free v1 repo into a separate private repo** — two independent Web Store
  listings (Pattern Y), independent versions. The *historical record* of the
  tier-split decision stays accurate exactly as written above (Entry-4
  discipline — this is an appended note, not a rewrite); only the
  forward-looking distribution/location changes. See **Entry 52** (the scope
  call), **Entry 53** (the Apache-2.0 license that makes the fork clean), and
  **Entry 54** (the Pattern-Y / Path-2 distribution choice).

## Entry 33 — Implicit-grant pivot, caught at the Entry-19 architecture review

- **Session:** 8 (Phase 2 pre-implementation review).
- **Moment:** The Session-8 prompt (and the tier-split docs it rested on)
  specified Free v1 OAuth as an authorization-code exchange with a
  (non-confidential) Client Secret shipped in the extension. The Entry-19
  architecture review ran *before* any OAuth code.
- **My input (owner):** Preserved the Entry-19 checkpoint (architecture
  review before code) and authorised the pivot when it surfaced.
- **What Claude Code would have done without it:** This one is honestly
  in Claude's favour on the catch. At the review Claude surfaced that the
  OAuth 2.0 **implicit grant** (`response_type=token`) is the standard
  installed-client online pattern, is materially simpler (no token
  endpoint, fewer failure modes), and **ships zero confidential
  material** — strictly better than the spec'd code+secret for the Free
  v1 (online, no-refresh) case. Without the Entry-19 gate, Claude would
  have built the literal prompt (code+secret) — defensible spec-following
  that would have shipped a needless "secret" and more failure surface,
  then likely been reworked later. The load-bearing owner contribution
  was *keeping the review gate that made the catch possible* and saying
  yes; the technical proposal was Claude's.
- **Outcome:** Implicit grant implemented (`src/background/oauth.ts`);
  PRD §7.5/§6.5 amended (Entry-6) so the spec matches the code; the
  "non-confidential secret exception" to §6.5 was *withdrawn* (no secret
  exists). Commits `50ab02e`…`fd60134`.
- **Artifact:** Commits `50ab02e`, `8153726`, `49977ed`, `7fae602`,
  `fd60134`; PRD §7.5/§6.5 Session-8 amendments; `notes/session-8-summary.md`.
- **Lesson (for coaching):** Entry-19 architecture reviews keep earning
  their keep. A strategic decision fixed at the prompt/spec level can
  still carry an implementation detail that benefits from technical
  scrutiny *before* code lands — the cheapest place to change it.

## Entry 34 — Silent-renewal Option 1: graceful degradation, fix at the seam

- **Session:** 8 (Phase 2 hands-on smoke).
- **Moment:** Hands-on testing showed `silent()` after token expiry
  returns `needs_interactive` for a multi-account user — Google won't
  silently pick an account without a `login_hint` the extension doesn't
  capture.
- **My input (owner):** Chose **Option 1** — accept the graceful
  re-prompt as documented Free v1 behaviour; fix it later via
  `login_hint` once Phase 3's People API provides the user's email; do
  **not** pull Phase 3 identity work into Phase 2 or expand OAuth scope
  for it.
- **What Claude Code would have done without it:** Joint, honestly
  split. Claude surfaced the failure mode rather than burying it as an
  "edge case", and presented three options with a recommendation
  (Option 1) — so the *finding* and the *menu* were Claude's. But Claude
  offered "fix login_hint now" and "halt" as legitimate options; the
  owner's contribution was the **sequencing judgment** — fix at the
  natural seam (People API already yields the email in Phase 3), don't
  distort phase boundaries or scope for it — and turning that into a
  transferable rule.
- **Outcome:** `prompt=none` fix landed (real single-account silent
  renewal); the multi-account limitation documented (PRD §7.5 Entry-6
  amendment) with a `TODO(Phase 3)` in `oauth.ts` and a tracked
  sub-task. Commit `fd60134`.
- **Artifact:** Commits `fd60134`, `7c100e9`; PRD §7.5 multi-account
  amendment; `oauth.ts buildAuthUrl` TODO; Session-8 task list.
- **Lesson (for coaching):** A graceful-degradation finding does not
  require halt-and-redesign. Document it honestly, fix it at the natural
  seam where the missing piece arrives for free, and keep shipping —
  but say plainly it's a known limitation until the seam is reached.

## Entry 35 — Calendar-timezone assumption-correction (the PRD was wrong, not imprecise)

- **Session:** 8 (Phase 3 onboarding-wiring decision point).
- **Moment:** About to wire the PRD-specified Calendar API timezone read
  into onboarding (browser tz had been treated as a mere §6.7 fallback).
- **My input (owner):** Asked, in effect, "isn't the *browser* timezone
  more accurate for us — the OS zone auto-updates as the user travels,
  but a Google Calendar setting is a manual preference that goes stale?"
  — and directed that Calendar be **removed from v1 entirely** (not
  deferred), browser tz made THE source, with the PRD assumption
  corrected, not just the code changed.
- **What Claude Code would have done without it:** Owner-driven, and
  logged honestly *against* Claude: Claude had carried the PRD's
  "Calendar is the authoritative source" framing without scrutinising it
  — across the tier-split work and Phase 3 core, Claude built toward
  wiring Calendar and only flagged the *UX* of when to prompt, never the
  *premise*. The owner's product question caught a spec assumption that
  sounds reasonable in the abstract but is wrong for OutboxIQ's actual
  use case (scheduling against the user's current working context).
  Without the question, Calendar integration ships and travelling users
  get stale timezones.
- **Outcome:** Calendar removed from v1; PRD §5.1.3 amended as an
  explicit assumption-correction (Entry-11 shape); the dead
  `getCalendarTimezone()` removed; CLAUDE.md §5.1.3 marker discharged
  "by correction, not wiring"; a future §5.8 Calendar-override Setting
  recorded as explicitly-not-v1. Commit `4f3b2eb`.
- **Artifact:** Commit `4f3b2eb`; PRD §5.1.3 amendment; `CLAUDE.md`
  §5.1.3 marker discharge; `notes/session-8-summary.md`.
- **Lesson (for coaching):** Implementation-vs-spec contact points are
  where owner product judgment pays off most. A spec assumption that
  reads as obviously-reasonable ("a Google API beats a browser API")
  can be exactly backwards for the product's real use case — and the
  agent that accepted the spec is the worst-placed to notice. Sharp
  owner review at the build moment catches it at the cheapest time.

## Entry 36 — Scope minimisation (Option A), made load-bearing by the activation framing

- **Session:** 8 (Phase 3 close-out review).
- **Moment:** The Calendar removal prompted "what scopes does Free v1
  actually use?"
- **My input (owner):** Chose **Option A** — trim Free v1's OAuth ask to
  `contacts.readonly` only — and supplied the **activation-funnel /
  user-trust** argument as the load-bearing reason: the consent screen
  fires at the "Optimize for [recipient]" click; asking there to
  read/modify all email for a scheduling action creates cognitive
  dissonance that drives consent abandonment and erodes trust even among
  approvers.
- **What Claude Code would have done without it:** Joint, split
  honestly. Claude's code inspection produced the *discovery* (Free v1
  calls only People `searchContacts`; three requested scopes unused) and
  the data-minimisation / CASA arguments. But framed only as
  "minimisation + compliance + CASA", this reads as architectural
  housekeeping. The owner's **activation-funnel framing** is what makes
  it a visible product win (consent-abandonment / trust at the exact
  moment of the ask) rather than cleanup — and that reframing is what
  justifies acting now rather than "revisit at Settings". Without it
  Claude would likely have left the scopes (it had only *flagged* the
  question, recommending the owner decide).
- **Outcome:** `OAUTH_SCOPES` → `contacts.readonly`; PRD §6.6 resolved;
  manifest host fixed to `people.googleapis.com` (a latent bug the trim
  surfaced); PRE_LAUNCH CASA item reframed to "verify whether Free v1
  needs CASA at all". Commits `7f86a55`, `600ce07`, `c8209f6`.
- **Artifact:** Commits `7f86a55`, `600ce07`, `c8209f6`; PRD §6.6
  amendment; `extension/src/lib/oauth-config.ts`; `manifest.config.ts`.
- **Lesson (for coaching):** The strongest decisions carry **two**
  lines of reasoning — a principle line *and* a user-experience line.
  The discovery and the principle can be the agent's; find the
  user-visible line before locking, because that is what turns
  "housekeeping" into a decision worth making now.

## Entry 37 — Removing §5.9 and §5.7: PRD over-spec the native-architecture choice silently invalidated

- **Session:** 8 (close-out, reviewing the scope-trim discussion).
- **Moment:** Reviewing scope/feature surface after the trim.
- **My input (owner):** Identified that §5.9 (Undo toast) and §5.7
  (badge + cleanup-listening) are moot given OutboxIQ's
  native-Schedule-Send architecture (chosen at the Session-2 spike), and
  **removed both from product scope** (Entry-26-shaped removal, all
  tiers) — §5.9 duplicates Gmail's own scheduled-send toast (violates
  §8.1); §5.7's badge differentiates against an effectively empty set
  post-install; §5.7's cleanup-listening is absorbed by Premium §13.
- **What Claude Code would have done without it:** Owner-driven. The
  native-architecture choice was made in Session 2; the PRD scope was
  never reconciled against what that choice rendered unnecessary, and
  Claude carried §5.9/§5.7 forward as in-scope across every session
  (including this session's own "does §5.9/§5.7 need gmail.modify?"
  framing — Claude was reasoning about *how to build* them, not whether
  they should exist). Without the owner's review both would have
  consumed implementation effort and kept distorting the scope/scope-
  trim analysis. Bonus: their removal made the Entry-36 scope trim
  *unconditionally* safe (no §5.9/§5.7 → no future Free v1 gmail.modify
  need → the DOM-vs-API probe Claude would otherwise have proposed is
  unnecessary).
- **Outcome:** PRD §5.7/§5.9 amended (removed, not deferred); §8.11
  superseded; §8.6 stale undo-toast sentence fixed; PRE_LAUNCH badge
  artwork struck. Commit `600ce07`.
- **Artifact:** Commit `600ce07`; PRD §5.7/§5.9/§8.6/§8.11 amendments;
  `PRE_LAUNCH_CHECKLIST.md`; `notes/session-8-summary.md`.
- **Lesson (for coaching):** PRD-vs-architecture divergence accumulates
  silently — a feature can become unnecessary the moment an
  architectural choice is made, years before anyone notices the spec
  still lists it. A periodic "does the spec still match what this
  architecture actually needs?" review is how you find the features
  that quietly died.

## Entry 38 — Adding `userinfo.email` after live testing falsified the docs-based scope assumption

- **Session:** 9 (Phase-3 hands-on, the load-bearing check).
- **Moment:** The committed `__oqAuth.testPeopleMe` probe, run by the
  owner against live Google on a *cleanly* contacts-only token (the
  owner did a full Google-account revoke first, on a flagged concern,
  so the result couldn't be a false pass from a lingering Session-8
  broad grant), returned **HTTP 403**: `contacts.readonly` cannot read
  the user's own email via `people/me`. Google's `people.get`
  documentation had listed `contacts.readonly` as sufficient — the
  docs were wrong. This left the `login_hint` multi-account fix
  (Entry 34) non-functional without a decision.
- **My input (owner):** Chose to **add the minimal non-sensitive
  `userinfo.email` scope** rather than ship the permanent multi-account
  re-prompt — explicitly reaffirming that this refines, not reverses,
  the Entry-36 minimisation principle (the principle forbids
  *speculative* scope; this is *evidence-required* and intent-matching).
  Also drove the rigour that made the finding trustworthy: questioned
  why no consent screen reappeared, which surfaced the lingering-grant
  risk and led to the full-revoke clean re-test.
- **What Claude Code would have done without it:** Joint, split
  honestly. Claude's contributions: building the probe instead of
  trusting the docs (Entry-9/10 discipline), catching that
  `__oqAuth.clear()` doesn't revoke the Google-side grant and that
  `include_granted_scopes=true` could mask the answer (so it
  recommended the full revoke), the robust-either-way implementation
  that made a 403 a zero-regression non-event, and presenting the
  two-option decision with Option A recommended. The **decision itself
  was the owner's** — Claude explicitly did not take it (the prompt
  forbade a unilateral scope add; Entry 15). Not a case of the owner
  overriding Claude: Claude recommended A, the owner concurred and
  owned it. The load-bearing owner act was the *rigour* (revoke-first)
  that made the evidence trustworthy and the *authority* to amend the
  Entry-36 lock.
- **Outcome:** `OAUTH_SCOPES` → `contacts.readonly` + `userinfo.email`;
  PRD §6.6 Entry-6 amendment; `oauth-config.ts` / `user-identity.ts`
  headers updated; CLAUDE.md / PRE_LAUNCH / session-9 summary synced;
  145 tests still green (scope rippled dynamically, no code logic
  change — the Entry-25 robust design absorbed it). Owner re-confirms
  the 403→200 flip hands-on via `testPeopleMe` after adding the scope
  in GCP.
- **Artifact:** `extension/src/lib/oauth-config.ts`;
  `extension/src/background/user-identity.ts`; PRD §6.6 Session-9
  amendment; `PRE_LAUNCH_CHECKLIST.md`; `notes/session-9-summary.md`;
  the Session-9 screenshots (GCP Data Access; the contacts-only consent
  screen; the 200/403 console).
- **Lesson (for coaching):** Documentation is a hypothesis, not
  ground truth — a committed probe + a *clean* test environment is what
  turns it into a fact. The owner's instinct to ask "why didn't it ask
  me?" was the highest-leverage move of the session: it exposed that
  the test would otherwise have silently lied. And a scope-minimisation
  *principle* is not a scope-count *target* — adding one well-evidenced,
  intent-matching scope is consistent with minimisation, not a breach
  of it; say so explicitly so a future session doesn't read Entry 36
  as forbidding it.
- **Resolution addendum (2026-05-19, same session — Entry-4 discipline:
  the decision above stands; this records what implementing it actually
  revealed).** Adding `userinfo.email` was **necessary but NOT
  sufficient**: hands-on, People `people/me` returned **403 even with
  `userinfo.email` + `openid` + `email` in the token** (proven via
  `getStored().scopes`). People is simply the wrong API for the caller's
  own email — Google's docs misled a *third* time. The correct,
  OIDC-canonical source is the **ID token that already rides in the
  sign-in redirect**: switched to `response_type=token id_token` + a
  mandatory `nonce`, added `openid` to the scope set (so the id_token is
  requested correctly — same Entry-38 intent, not a new decision), and
  read/validated the `email` claim (nonce/aud/iss checks; proportionate,
  non-signature — documented in `oauth.ts`). **No `people/me`, no extra
  network call, no new host permission.** The dead People-based
  `user-identity.ts` (+ tests) was **removed** (Entry-22 / Session-8
  precedent — not kept "for a maybe"). **Verified live, owner hands-on:**
  `whoami()` → `grantedEmail` resolved; `expireNow()`+`silent()` →
  multi-account silent renewal with **no account chooser**. The
  Entry-34 limitation is closed. The owner's follow-up question — "do we
  still need `contacts.readonly` at all, given its near-zero timezone
  hit rate?" — is **surfaced and tracked as the headline Session-10
  decision** (potential upside: an all-non-sensitive-scope app, which
  may remove the consent-screen verification gate entirely); it is
  deliberately **NOT decided here** (end-of-session momentum is the
  wrong place for a launch-shaping scope call — the recurring lesson of
  this very session).
- **Lesson addendum (for coaching):** "Add the obviously-correct scope"
  was right *and* still not the fix — the failure had two independent
  causes (insufficient scope **and** wrong API/endpoint), and fixing
  only the visible one left the bug. When a docs-based assumption is
  falsified, distrust the *whole* approach it sat under, not just the
  one parameter you changed. And when the fix lands, the next sharp
  question ("then why do we still need the *other* scope?") is a gift —
  capture it, don't answer it tired.

## Entry 39 — Free v1 drops ALL Google API: API-first PRD vs. DOM-first reality

- **Session:** 9 (end, immediately after Entry 38's fix landed
  verified-live; the owner chose to act on the question Entry 38 surfaced
  rather than defer it to Session 10).
- **Moment:** Entry 38's "do we still need `contacts.readonly`?" was
  framed as a Session-10 decision. The owner closed it now: the empirical
  evidence was already conclusive (People timezone hit-rate ≈ nil — the
  §5.4.1 Maps-removal amendment's "single-digit %" was, in live testing,
  effectively zero), and the recipient is **readable from the Gmail
  compose DOM** without any API. So the *entire* Google-API dependency in
  Free v1 existed to power a step that almost never fires.
- **My input (owner):** Decided **Free v1 ships with zero OAuth and zero
  Google API** — cascade collapses to cache → manual; the recipient name
  comes from the compose DOM. Directed that Sessions 7–9's OAuth/People/
  `login_hint` work be **preserved cleanly as inert Premium v1
  infrastructure, not deleted and not commented-out**. Imposed the
  execution discipline (bounded phases, green checkpoints, stop-and-split
  on any surprise) and the timing rationale (do it now, before any
  §5.3.5 UI is built on the soon-to-be-removed infra).
- **What Claude Code would have done without it:** Owner-driven and
  logged honestly *against* Claude. Across Sessions 7–9 Claude built the
  entire OAuth/People stack faithfully to the PRD's API-first §5.4.1 —
  and even *surfaced* the near-zero hit-rate as an honest caveat
  (Session-8/9) — but treated it as a documentation footnote, never as
  "then the API itself may be unnecessary." Claude was reasoning about
  *how to make the API path work* (three scope/endpoint iterations)
  while the owner asked *whether the API path should exist*. Without the
  owner, Free v1 ships with an OAuth consent screen, `identity` +
  googleapis host permissions, and a CASA/consent-verification pre-launch
  gate — all to power a feature that resolves to the manual picker
  ~always. The simplification, the preservation pattern, and the timing
  were all the owner's; Claude's contribution was clean execution and
  the evidence that made the call obvious in hindsight.
- **Outcome:** OAuth/People/auth-token/oauth-config + the full API
  cascade + tests moved (history-preserving `git mv`) to
  `extension/src/premium-v1/` with a wire-up README; Free v1
  `timezone-cascade.ts` rewritten to cache→manual; `service-worker.ts`
  de-OAuthed; manifest reduced to `permissions:["storage"]` +
  `host_permissions:["https://mail.google.com/*"]`, no `oauth2` key.
  Build/typecheck/lint/format green; 143 tests (premium-v1 inert but
  still tested); zero Free v1 → premium-v1 imports (audited). PRD
  §5.3.5/§5.3.7/§5.4.1/§6.6/§7.5/§13 amended (Entry-4 discipline);
  CLAUDE.md net **−5.8k** (stale Free-v1-OAuth detail → Premium
  pointers); the now-inverted "SW must import oauth" gotcha fixed.
- **Artifact:** `extension/src/premium-v1/` (+ `README.md`);
  `extension/src/background/timezone-cascade.ts`,
  `service-worker.ts`, `manifest.config.ts`; PRD §5.3.5/§5.3.7/§5.4.1/
  §6.6/§7.5/§13 Entry-39 amendments; `CLAUDE.md`;
  `notes/session-9-summary.md`.
- **Lesson (for coaching):** The deepest miss isn't a wrong answer
  inside the frame — it's not questioning the frame. A spec that says
  "call API X to get data Y" silently presumes Y isn't already in front
  of you; when the implementer keeps optimizing *the API call* while the
  data sits in the DOM, that's frame-lock. The owner's repeated "do we
  even need this?" beat three rounds of "how do we make this work."
  Corollary on craft: deleting working, *verified* code is wrong;
  isolating it inert (named, compilable, tested, un-imported) preserves
  the sunk value for the tier that needs it without taxing the tier that
  doesn't — "not deleted, not wired" is a first-class outcome, not a
  hedge.

## Entry 40 — "Default boundaries" rename + §5.5 Optimize-for-X exception (extending Entry 21)

- **Session:** 9 (Phase-G docs-only follow-on, immediately after the
  Entry-39 OAuth pivot landed on `origin/main`). Owner chose to lock the
  §5.3.5 UX *and* refine the §5.5 trigger *before* any §5.3.5 UI is
  built — same "context is fresh; nothing layered on the soon-to-be-
  changed surface yet" timing rationale as Entry 39.
- **Moment:** Walking the §5.3.5 UX through end-to-end revealed a
  trigger collision: a user who engages Optimize-for-X for a far-
  timezone recipient (the feature's *core use case*) is, by design,
  scheduling a time that crosses their own "absolute limits" — the
  9 AM-in-PST send from a New York user lands at 6 AM local. Under
  the existing §5.5 trigger logic (Entries 19/21 — Schedule Send
  warns on absolute-limit violations), every successful Optimize-for-X
  send would fire the soft-warning modal at the *result* of an
  explicit four-step engagement (open modal → check Optimize → pick
  recipient → pick timing). The owner observed this is the **same
  failure mode Entry 21 caught** for working-hours-on-Schedule-Send,
  one level deeper: it would train users to dismiss the warning, and
  the warning's value for the cases it actually exists to catch
  (Pick Custom at 3 AM by accident) would erode.
- **My input (owner):** Stated the core insight as a product
  principle — **"the feature should serve the mental model, not the
  other way around"** — and made two linked, locked calls:
  (1) The §5.5 trigger **narrows** to exclude Optimize-for-X-computed
  times; the warning fires only for manual selection (Case 2). Locked.
  (2) Calling the limits **"absolute" / "hard"** when an explicit,
  by-design feature override exists is **misleading labelling**.
  Rename them **"Default boundaries"** product-wide. Locked. Imposed
  the docs-only constraint (no feature code in this commit), the
  preserve-history rule (Entries 19/20/21/28 remain accurate-at-the-
  time), and the timing rationale.
- **What Claude Code would have done without it:** Genuinely joint,
  but the load-bearing moves were the owner's. Claude built every
  prior session's §5.5 work faithful to the Entry-19/21 lock and
  would have built §5.3.5's UI on top of that lock in Session 10 —
  meaning the trigger collision would have shipped, the warning
  would have fired on every optimized send, and the resulting
  "train users to dismiss the modal" failure mode would only have
  been caught *after* user feedback (the worst place to catch it,
  given §11's no-telemetry binding makes that signal hard to see).
  Claude's contribution was: (a) precision-scoping the exception
  (Case 1 *algorithmic* exempted vs. Case 2 *manual* still warns —
  vs. the looser "Optimize-for-X disables §5.5" framing the owner
  initially floated, which would have weakened the warning's
  signal value for the Pick-Custom-at-3-AM case); (b) surfacing
  the rename as the necessary honest-labelling companion to the
  exception (without it, the spec would describe a "hard limit"
  that an explicit feature was built to override — a contradiction
  in the docs); (c) the "preserve internal `absoluteEarliest`/
  `absoluteLatest` schema identifiers per Entry 30, rename only
  user-facing copy" call to avoid a SCHEMA_VERSION bump for zero
  user-facing benefit. Both lines of work get credit honestly: the
  *core insight + locked direction* was owner; the *precision
  scoping + surfaced corollaries* was Claude.
- **Outcome:** PRD §5.3.5 fully rewritten to the locked UX spec
  (items a–n); PRD §5.5 carries the Entry-40 amendment (rename +
  Case 1/Case 2 exception + preserved Entry 19/20/21/28 locks);
  PRD §5.1.3 Step 3 / §5.3.6 / §5.3.7 / §5.8.2 updated for the
  rename + the exception's routing; CLAUDE.md "Locked product
  decisions" gains the Entry-40 lock (refines, does not invalidate,
  Entries 19/20/21/28); CLAUDE.md repo-status reflects Phase G;
  internal `absoluteEarliest`/`absoluteLatest` schema fields and
  test/JSDoc references **kept as stable identifiers** (Entry-30
  pattern). One user-facing code-string alignment task surfaced
  for Session 10: `WorkingHoursStep.tsx` onboarding labels still
  read "Hard limits" / "Earliest I'd ever send an email" — tracked
  in CLAUDE.md "Free v1 roadmap" as Session-10's spec-code
  alignment first task (deferred from Phase G per the docs-only
  constraint, not forgotten).
- **Artifact:** PRD §5.1.3 / §5.3.5 / §5.3.6 / §5.3.7 / §5.5 / §5.8.2
  Entry-40 amendments; CLAUDE.md "Locked product decisions" two new
  bullets (rename+exception, §5.3.5 spec lock); CLAUDE.md repo
  status; `notes/session-9-summary.md`.
- **Lesson (for coaching):** Locked decisions can be **refined when
  implementation reveals tension with the product's core use case**.
  Entry 21 first taught this: a *valid rule* (warn on off-hours
  send) can be *miscalibrated* when applied uniformly across triggers
  that have radically different user-intent profiles (Schedule Send
  with explicit time-pick vs. regular Send with implicit "now"). This
  entry extends the lesson **one level deeper**: a *valid rule* (warn
  on Default-boundaries violation) can be miscalibrated when the
  violation is *itself the deliberate output of a feature you built
  expressly to produce it*. The pattern: **when a warning fires on
  the user's intended action through a feature you built explicitly
  to enable that action, the warning is miscalibrated even when the
  rule it enforces is otherwise valid.** The fix is not to delete the
  rule; it is to **scope the trigger precisely** to the cases where
  intent is *ambiguous* (Case 2 — manual selection) and *exempt* the
  cases where intent is *explicit and feature-mediated* (Case 1 —
  algorithmic). And: an honest *label* for the rule (Default
  boundaries, not absolute limits) is doing real work — it tells the
  next reader what the rule actually is, which matters when the next
  reader will design a feature that interacts with it.

## Entry 41 — Product rename: OutboxIQ → Fashionably Late (Entry 30 paid off)

- **Session:** 9 (immediately after the Phase-G spec-lock + Default-
  boundaries rename landed on `origin/main` — same "context is fresh,
  no Session-10 UI built on top yet" timing rationale as Entries
  39/40; the right window to land a brand change.)
- **Moment:** Owner returned from extended positioning reflection
  (multiple chats across name candidates) with the rename decision
  locked. Domain secured, Chrome Web Store availability checked,
  trademark cleared *before* asking for the implementation pass.
- **My input (owner):** Made the call: **"OutboxIQ" → "Fashionably
  Late"**. The original Entry-1 name set the positioning around the
  outbox rather than the calendar — that reasoning held and still
  holds; the original name was *not wrong*. But nine sessions of
  implementation surfaced product realities the original name didn't
  fully anticipate (the DOM-first vs. API-first pattern; the §5.3.5
  feature-mediated-override pattern; the broader-than-just-outbox
  positioning possibilities the owner was considering). The new name
  captures the actual value — sending at the *right* time, often
  *later* than the user's immediate impulse — memorably and slightly
  playfully, while sidestepping the Entry-1 calendar-confusion risk
  entirely (no "schedule"/"outbox" framing that could be misread as
  calendar-adjacent). Also imposed the implementation discipline:
  historical artifacts preserved verbatim (Entry-4); forward-looking
  artifacts and user-visible strings renamed; Entry-30 brand-
  independent identifiers stay frozen; GCP-side rename deferred to
  Premium-v1 kickoff; GitHub repo rename owner's separate call later.
- **What Claude Code would have done without it:** Owner-driven
  entirely. No frame in the implementation context invited
  questioning the name — by every metric Claude could see, "OutboxIQ"
  was a working name doing its job: brand-independent identifiers
  decoupled cleanly (Entry 30), no PRD section needed it changed, no
  technical pressure existed. Claude's contribution was, at most,
  Entry 30's earlier defensive work (also owner-prompted — "what
  would a rename touch?") that made *this* rename mechanically clean;
  the *decision* and the *new name* were the owner's. Without the
  owner's positioning reflection, the product launches as "OutboxIQ"
  — a defensible name, not the strongest one given how the value
  proposition actually crystallized through nine sessions.
- **Outcome (Entry-30 paid off — the rename was as cheap as that
  framework predicted):** 41 forward-looking files bulk-renamed
  case-sensitively (`OutboxIQ` → `Fashionably Late`); preserved
  verbatim — `notes/session-*.md`, `notes/owner-decisions-log.md`
  Entries 1–40, commit messages, LICENSE (no product-name reference),
  every Entry-30 identifier (extension ID, storage keys, Client ID,
  redirect URI, GCP project ID, GitHub repo URL/path,
  `PRIVACY_POLICY_URL`). Verbatim locked-copy spec text (PRD §5.1.3
  onboarding + §5.2.1 `SCHEDULE_SEND_LABEL`) renamed via explicit
  PRD amendments per the Entry-30 "amendment, not silent edit"
  discipline. npm package `outboxiq-extension` → `fashionably-late-extension`
  (lockfile resynced). Brand-and-naming-history note at top of
  `CLAUDE.md` so future readers (incl. future Claude Code sessions)
  don't get confused by mixed references. GCP/OAuth-client rename
  tracked in `PRE_LAUNCH_CHECKLIST.md` "Naming / rebrand readiness"
  as the first task of Premium-v1 kickoff. Two classes of
  bulk-sed collateral caught & reverted: filesystem paths /
  GitHub URLs (`Projects/OutboxIQ/`, `github.com/fenil-dedhia/OutboxIQ/`,
  `fenil-dedhia.github.io/OutboxIQ/privacy` — preserved per the
  no-clone-reconfig + repo-rename-is-separate constraints) and
  grammar artifacts ("an Fashionably Late" → "a Fashionably Late",
  consonant-sound article flip).
- **Artifact:** Single rename commit (this entry's landing commit);
  PRD §5.1.3 / §5.2.1 Entry-41 amendments; `CLAUDE.md` top-of-file
  naming-history note + general body refresh; `PRE_LAUNCH_CHECKLIST.md`
  "Naming / rebrand readiness" Entry-41 update with the GCP-rename
  deferral; this entry.
- **Lesson (for coaching):** **Foresight architecture pays off
  exactly when its premise comes true.** Entry 30 was set up in
  Session 7 *because the owner asked a forward question* ("what
  would a rename touch?"). That move looked, at the time, like
  modest hygiene — a documented guardrail, no code churn. Two
  sessions later, the question's premise materializes, and the
  rename is cheap precisely because the guardrail held: 41 files
  changed, zero stable identifiers touched, zero data orphaned,
  zero token re-issues forced, zero GCP-side churn forced for Free
  v1. The lesson generalises: when an owner asks "what would
  change?", treating it as a request for *documented invariants*
  (rather than immediate refactor) compounds — the invariant gets
  hardened cheaply now, and the change it anticipated lands cheaply
  later. Corollary on rename mechanics: case-sensitive sed
  (`OutboxIQ` → `Fashionably Late` only, leaving lowercase
  `outboxiq*` identifiers intact) is the right blunt tool when
  identifiers were deliberately lowercased to be brand-independent;
  the only collateral was filesystem-path / URL artifacts and the
  "a"/"an" article flip, both caught by a post-rename grep audit
  and reverted surgically. Worth recording: the rename's *biggest
  win* wasn't the new name — it was confirming the Entry-30
  framework worked in practice exactly as designed.

## Entry 42 — The install-time activation gap: owner overruled Claude's "acceptable MVP" deferral

- **Session:** 10 (hands-on verification phase, *after* the §5.3.5 build
  landed). Note: a "Session 10 — no entries" line was written at the
  early close-out, when the session looked like pure spec-faithful
  implementation. The hands-on phase then produced two real entries
  (this + Entry 43); the premature "no entries" line was removed. The
  lesson there is itself worth noting — *don't close the log before the
  session is actually over.*
- **Moment:** The owner loaded the built extension with Gmail already
  open and the Optimize/relabel features never activated. After
  diagnosing it together (Chrome MV3 does not retro-inject content
  scripts into already-open tabs; the static `content_scripts`
  declaration only fires on the *next* page load), the owner said:
  *"We should find a better onboarding experience. Most users will not
  refresh their Gmail. Is there a way to force trigger our version
  somehow that will work cleanly and consistently every time after
  install?"*
- **My input (owner):** Rejected "refresh required" as a real-user
  experience and demanded install-time activation that works without
  any manual refresh, in both scenarios (Gmail open before install /
  opened after).
- **What Claude Code had already done (the honest, non-flattering
  counterfactual):** This is not a "Claude would have missed it" case —
  it is worse. Claude had **already seen this behaviour in an earlier
  session and deliberately deferred it**, writing it into
  `content-script.ts` and CLAUDE.md as an *"acceptable MVP limitation —
  a tab already open picks this up on its next Gmail load; a live
  re-check is deliberately not built."* That judgement was made from a
  developer's chair (devs refresh constantly) and was wrong for real
  users, who install an extension and expect it to just work. Left
  alone, Fashionably Late would have shipped with a silent first-run
  failure: install → nothing happens → no feedback → uninstall. The
  owner, reasoning as a *user* rather than a *developer*, caught a
  launch-quality activation bug that Claude had explicitly rationalised
  as fine.
- **Outcome:** Two-part fix. (1) `content-script.ts` subscribes to
  `chrome.storage.onChanged` so a tab open during onboarding upgrades
  the instant "Finish Setup" writes (latched, idempotent). (2) The
  service worker hot-injects the content script into all open Gmail
  tabs on `onInstalled` via `chrome.scripting` (new `scripting`
  permission). Owner verified live: *"works fine now."* CLAUDE.md
  "acceptable MVP" gotcha resolved + manifest-permissions note updated.
- **Lesson (for coaching):** A deferral logged as "acceptable MVP" is
  still a *decision*, and it inherits the blind spot of whoever made
  it. Claude's deferrals are most dangerous exactly when they sound
  reasonable from an implementer's view but fail a user's view —
  install-time activation is the canonical example. When the owner's
  product instinct contradicts a logged "acceptable" deferral, the
  deferral deserves re-examination, not defence. (Pairs with Entry 27,
  where a deferral was *reframed*; here a deferral was *overturned*.)
- **Artifact:** commits `a3a5035` (storage-listener), `d7e5dd6`
  (hot-inject + `scripting` permission); CLAUDE.md repo-status +
  manifest-permissions update; `notes/session-10-summary.md`.

## Entry 43 — Hands-on rendering corrected the docs-only-locked §5.3.5 UX

- **Session:** 10 (hands-on UI-iteration phase). The §5.3.5 UX was
  locked **docs-only** in Entry 40 (Session 9), items (a)–(n), with the
  explicit framing "ready for Session 10 build."
- **Moment:** Once the spec was rendered in the real modal and exercised
  against live Gmail, the owner drove a rapid screenshot-by-screenshot
  iteration that surfaced several issues the prose lock could not have
  anticipated: (i) the To/CC suffix on each recipient ("Sarah Chen
  (To)") read as noise → **dropped** (PRD §5.3.5 (c) amended); (ii) the
  tooltip's "based on general research, not Fashionably Late tracking"
  disclaimer read as awkward over-justification → **trimmed** (§5.3.5
  (g) amended; §11 stays binding on *behaviour*, was never a copy
  requirement); (iii) the "Optimize timing for" panel appearing on
  checkbox-engage before a recipient was chosen → **gated on selection**
  to enforce a who→when order (§5.3.5 (m) amended); plus a series of
  pure-CSS problems no spec would ever specify (one-line layout,
  body-vs-label font size, dropdown sizing, the open-menu overlapping
  "for", long-email overflow + chevron-overlap truncation, section
  divider spacing).
- **My input (owner):** Supplied the design judgement and the specific
  corrections, screenshot by screenshot, including the *preferred*
  resolution for tradeoffs (e.g. wrap long emails to the next line
  rather than ellipsis-truncate the label; truncate the `<select>`
  button but show the full value in the open menu).
- **What Claude Code would have done without it:** Built faithfully to
  the literal Entry-40 spec and stopped — shipping the (To)/(CC)
  suffix, the awkward disclaimer, the un-gated panel, and the overflow
  bugs. All *functional*, all visibly rough. Claude's contribution in
  this phase was execution + a couple of honest tradeoff framings (the
  Gmail-username-length question; wrap-vs-truncate), not the design
  direction.
- **Outcome:** Six UI-polish commits (`ae72470`…`d91a886`); PRD §5.3.5
  (c)/(g)/(m) amendments; the feature now matches Gmail's native modal
  aesthetic and handles the long-email edge cleanly. Plus a separate
  pre-requisite fix: the originally-shipped compose-recipient DOM
  anchors (`input[name="to"|"cc"]` + doc-wide `[email]`) were a Claude
  implementation guess that the original close-out had honestly flagged
  as un-verified-live (3/5 confidence); they were simply *wrong* against
  real Gmail (0 / 477-inbox-wide matches). A live probe
  (`research/compose-recipients-probe.{js,md}`) found the real anchor
  (`div[role="option"][data-hovercard-id]`) and the module was
  re-anchored (`a052e6e`).
- **Lesson (for coaching):** Docs-only UX locking (Entry 40's method)
  reliably nails *structure and logic* — it caught the §5.5 trigger
  collision and locked the data model, which held up perfectly. But it
  **cannot** anticipate rendered presentation: spacing, type scale,
  overflow, control affordances, and the felt sense of interaction
  order. "Ready for build" is not "ready to ship"; the gap between them
  is hands-on iteration, and that iteration is where the actual UX is
  made, not merely polished. Corollary, from the compose-recipient
  miss: a DOM selector written without a live probe is a *hypothesis*,
  and shipping it as fact (even with honest confidence-flagging) still
  means the feature is broken until someone runs it — the probe should
  precede the build, not follow the bug.
- **Artifact:** commits `a052e6e`, `ae72470`, `ee84d16`, `71444e4`,
  `5b2fd96`, `52b514c`, `d91a886`; PRD §5.3.5 (c)/(g)/(m) amendments;
  `research/compose-recipients-probe.{js,md}`;
  `notes/session-10-summary.md`.

## Entry 44 — Curated timezone dataset over raw IANA, then hands-on reshaped the picker

- **Session:** 11 (the headline work; Phase 1 owner-gated, Phases 2–3 hands-on).
- **Moment:** The picker had been rendering all ~600 raw IANA identifiers
  (`Asia/Calcutta`, alphabetical-by-continent). Owner testing surfaced three
  concrete failures: legacy city names confuse (Calcutta vs. Kolkata); one
  city per zone hides the zone from someone searching a *different* city in it
  (a Mumbai user finds no "Mumbai"); and Africa-first ordering buries the
  populous regions. Later, *during* the build, owner hands-on caught what the
  spec and unit tests could not: the popup grew the modal into a second
  scrollbar and wrapped each row; and the UTC+8 row was an unreadable jumble
  that mixed a country (China) with its own cities (Shanghai) *and* unrelated
  countries, naming Singapore twice.
- **My input (owner):** Directed the whole reframe — **abandon raw-IANA
  display for a curated list of offset-labelled GROUPS** with multi-city search
  matching, canonical IANA stored underneath. Gated Phase 1 on reviewing the
  dataset before any picker code (approved: keep all entries incl. thin/edge;
  Greenland = Nuuk-only). Then drove four hands-on UX corrections as separate
  calls: (1) the popup must float like a native menu (no modal scrollbar, no
  clipping); (2) rows single-line, menu grows sideways; (3) "**split the worst,
  keep the rest**" — multi-sovereign offsets become one row per country, the
  rest stay one short row; (4) drop the noisy "(no DST)" notes and make
  ALL-CAPS search case-sensitive so "IST" finds India/Israel, not Istanbul.
- **What Claude Code would have done without it:** Claude executed each step
  faithfully and added the engineering rigour — the machine-verified dataset
  (every offset + DST flag recomputed from ICU and asserted), the
  correctness-driven (offset + DST) entry keying, the self-styled Shadow-DOM-safe
  combobox, the fixed-overlay positioning, the case-sensitive-abbreviation
  search. But the *problems being solved* were all owner-surfaced: the curated
  reframe was the owner's direction, and the three rendered-UX defects (double
  scrollbar, wrapping, jumbled grouping) were invisible to the spec and to
  jsdom — they only appear when a human opens the dropdown in a real modal.
  Left to its own devices Claude would have shipped the literal spec (a flat
  curated list, jammed multi-country rows, an in-flow popup) and the UX would
  have been caught only after release.
- **Outcome:** `src/lib/timezone/{curated-timezones,search,zone-info,pinned}.ts`;
  the rebuilt `TimezonePicker.tsx`; commits `f78aa02` `2d03753` `b0e101f`
  `c434d8c` `a9d6ddb`. ~64 verified entries; 239 tests green.
- **Lesson (for coaching):** Two reinforced. (1) *The deepest fix is often
  reframing what's displayed, not optimising how* — the raw IANA list wasn't a
  rendering bug, it was the wrong data model for a human to scan; the owner saw
  that the answer was a curated abstraction, not a better-sorted enumeration.
  (2) *Extends Entry 43:* spec-faithful + green tests still isn't shippable UX.
  A dataset can be machine-perfect (offsets verified) and still read as a
  jumble; a popup can pass every unit test and still spawn a second scrollbar.
  The felt experience of a list — scan-ability, grouping intuition, overflow
  behaviour — is made in hands-on iteration, and the owner doing that iteration
  was the load-bearing contribution.
- **Addendum (2026-05-20, same session) — "split the worst" → the Option-B
  label grammar.** A further hands-on pass found the labels still read as a
  jumble in two specific ways the owner articulated as rules: (1) a row must
  not interleave one country's cities with another's ("New York, Miami,
  Toronto", not "…, Toronto, Miami"); (2) a row must not name a country
  *and* list another country's cities — "India, Sri Lanka — …, Colombo" makes
  it unclear Colombo is Sri Lankan. The owner asked to re-open the original
  3-way granularity choice, weighed it, and picked a **4th custom option**:
  every label is now either a recognised *zone name + cities* (cities grouped
  by country, no country names), a *single country + its cities*, or a *bare
  country list* — never mixed. India/Sri Lanka, UK/Ireland/Portugal,
  Thailand/Vietnam/Indonesia, Japan/Korea split into one-country rows. Claude's
  earlier "split the worst" (Entry-44 main) was a *granularity* fix; this was a
  *grammar* fix the owner derived from two clean rules — and it generalised
  better than any of the three options Claude had offered. Lesson: when the
  options you present all feel slightly off to the user, the right move is
  often a rule they can state, not an option they can pick — capture the rule.

## Entry 45 — Pinned Timezones: a new feature, specified with migration discipline

- **Session:** 11 (Phase 3).
- **Moment:** The curated picker still meant scrolling to reach the handful of
  zones a given user actually emails into. The owner specified a complementary
  feature: let users pin up to 5 zones, surfaced first in every picker.
- **My input (owner):** Defined the feature concretely — **cap of 5**, five
  pre-selected defaults (PST/EST/GMT/CET/IST), captured during a reworked
  onboarding Step 2 ("Set up your timezones"), with a Skip path and a
  "Pinned"/"All timezones" sectioned dropdown. Imposed the migration discipline
  explicitly: **no silent default-pinning of existing/upgraded users** — the
  defaults pre-check only in the onboarding *draft*; the committed state
  defaults to empty, and pinning is always an explicit user act.
- **What Claude Code would have done without it:** This was an owner feature
  request, not something Claude would have proposed (it sits outside the PRD as
  written). Claude's contribution was the implementation shape: the additive
  SCHEMA_VERSION 2→3 default-merge migration (no framework, consistent with the
  `lastScheduled` precedent), the flat `pinnedTimezones: string[]` on §7.2
  (matching the existing camelCase schema rather than the prompt's nested
  shape), threading the pins through to the §5.3.5 inline picker, and choosing
  to leave editing to the future Settings panel rather than half-build it now.
- **Outcome:** `pinnedTimezones` on state + draft; `constants.ts`
  `MAX_PINNED_TIMEZONES`/`DEFAULT_PINNED_TIMEZONES`; `pinned.ts`; reworked
  onboarding Step 2; picker `pinnedIanaIds` sections; Settings stub note +
  PRE_LAUNCH "Settings panel" item. Commit `4a79ec2`; +15 tests.
- **Lesson (for coaching):** A new feature carries an implicit data-lifecycle
  decision that's easy to get subtly wrong — here, "what happens to users who
  already exist?" The owner naming "no silent pinning" up front turned a
  potential surprise (everyone suddenly has 5 pins after an update) into a
  deliberate, tested migration. The cheapest place to get migration semantics
  right is in the feature spec, not in a post-launch bug report.
- **Hands-on addendum (2026-05-20, same session).** Owner hands-on of the
  rendered Step 2 produced three further calls, the third trajectory-worthy:
  (1) fold the standalone "Skip" link into the at-cap message as an inline
  "remove all"; (2) make the user's-own timezone visually primary (it's the
  required setting, but the colourful optional pinned chips were drawing the
  eye first); (3) **commit-on-Continue** — a step's settings now change only
  when the user clicks Continue; **Back restores the step's on-entry state**.
  This last one is a genuine onboarding-model change: the prior build wrote
  every edit straight to the persisted draft, so clicking "remove all" then
  "Back" *kept* the cleared pins — which felt like data loss for someone just
  exploring the steps. Claude had built the straightforward continuous-write
  model (correct for §5.1.4 resume, wrong for the felt safety of Back); the
  owner named the principle ("until Continue, a step's settings shouldn't
  change") and Claude implemented it as a per-step on-entry snapshot that Back
  restores, kept memory-only so §5.1.4 resume still works. Same Entry-43/44
  lesson once more: the data model can be technically sound and still feel
  unsafe in the hand — and only hands-on navigation surfaces it.

## Entry 46 — The §5.8 Settings build, reshaped in hands-on (drag-to-reorder + four rendered-UX fixes)

- **Session:** 12 (Phase 1, owner hands-on after the gate)
- **Moment:** Phase 1 shipped the Settings panel spec-faithfully — sidebar nav,
  the three sections, pinned chips with up/down reorder *arrows*, a modal gear
  icon — green tests, clean build. Owner hands-on against a real install
  surfaced a string of rendered-UX issues invisible to the spec and to jsdom.
- **My input (owner):** Drove five corrections as separate calls: (1) replace
  the horizontal up/down-arrow reorder chips with a **vertical drag-and-drop
  list + grip handle** ("…or whatever is the convention"); (2) the modal **gear
  was too small** to read; (3) the timezone dropdown **scrolled on hover**,
  hiding the top pinned row under the sticky header; (4) the closed picker **cut
  off most of the label** on onboarding + Settings — widen where there's room;
  (5) the widened picker then **crowded the onboarding card** — give it room.
- **What Claude Code would have done without it:** Built the literal spec
  (arrow-button reorder, default-width picker, a hover-scroll effect that fought
  the user) and called it done on green tests. Each of the five was invisible to
  unit tests and to jsdom — they appear only when a human uses the rendered
  control. Honest credit split: the hover-scroll (#3) was a genuine *bug Claude
  introduced* (a keyboard-scroll effect that also fired on mouse hover) and the
  owner caught it; the other four were UX-quality judgments the owner made and
  Claude implemented (drag-and-drop with a keyboard-arrow fallback for a11y, the
  sizing, the width, the spacing rhythm). Each shipped with a regression/coverage
  test.
- **Outcome:** Commits `dd80ee1`, `00864e6`, `2ad10e5`, `520b250`; the shared
  `PinnedTimezonesEditor` (drag list + `reorderable` prop) and the
  `TimezonePicker` hover-scroll gate.
- **Lesson (for coaching):** the Entry-43/44 lesson, a fourth time —
  spec-faithful + green tests is not shippable UX. The *felt* experience of a
  control (does the list move under my cursor? can I read the label? does
  reordering feel like a list or a poke-the-arrows chore?) is made in hands-on
  iteration. Drag-to-reorder over arrows is the clearest case: both satisfy
  "reorder pins," but only one matches what the user's hand expects.

## Entry 47 — Live-sync into an open modal: owner took the risk I recommended against (knowingly)

- **Session:** 12 (Phase 1 hands-on)
- **Moment:** A pin reorder in Settings didn't reflect in an *already-open*
  Schedule Send modal (a separate extension context). The owner asked to make it
  live-update — and, the load-bearing part, asked **"are there any risks?"**
  before deciding.
- **My input (owner):** After I laid out the risk taxonomy and **recommended the
  safe-scoped version** (update the pins but don't reshuffle the dropdown *while
  it's open*, to avoid an option moving under the cursor mid-click), the owner
  chose **immediate live-update** — pins update instantly even with the dropdown
  open — explicitly accepting the reshuffle-under-cursor risk.
- **What Claude Code would have done without it:** Claude both (a) recommended
  the safer option and (b) would have built it absent owner input — so this is a
  case where owner judgment chose the *riskier* path against Claude's lean.
  Claude's honest contributions: it surfaced the risk taxonomy *unprompted*,
  held the genuinely-non-negotiable line (pins-only — never live-shift the
  user's own timezone / preset times / boundaries mid-interaction, which would
  move the times they're reading), and added the test coverage
  (`emitStorageChange` in the chrome-mock). The owner's contribution was
  deciding the reshuffle-while-open tradeoff was acceptable given how rare the
  interleaving is — a product call made with the risks in front of them.
- **Outcome:** Commit `884cdd3`; `useLivePinnedTimezones` (pins-only, one
  listener per open modal, cleaned up on unmount).
- **Lesson (for coaching):** "be honest about risks" cuts both ways — the point
  of laying out a risk taxonomy is so the owner can *knowingly* accept a risk
  the agent would have avoided. The agent's job there isn't to win the
  recommendation; it's to make the tradeoff legible, hold the truly
  non-negotiable line (scope), and then implement the owner's call cleanly.

## Entry 48 — Repo rename OutboxIQ → fashionably-late: the Entry-30 deferred call, made

- **Session:** 12 (mid-session, owner-directed)
- **Moment:** Looking at the public GitHub repo, the owner updated the
  description and renamed the repo **OutboxIQ → `fashionably-late`** — the rename
  Entries 30/41 had explicitly deferred as "the owner's separate call."
- **My input (owner):** Made the call to rename now; chose the slug
  (`fashionably-late`, matching the npm package); iterated the description copy
  (kept the original "lands at the right moment" payoff, dropped the Premium
  "auto-cancels on early replies" claim that Free v1 doesn't build).
- **What Claude Code would have done without it:** This was the owner exercising
  a decision Entry 30 reserved for them. Claude's contributions: flagging that
  the live description advertised an unbuilt/Premium feature (auto-cancel) on the
  public Free-v1 repo and proposing accurate copy; executing the cascade the
  rename triggers — `PRIVACY_POLICY_URL` (the only repo-name-*derived* value in
  code, via the GitHub Pages path), the git remote, and the CLAUDE.md /
  PRE_LAUNCH naming notes — while explicitly NOT touching the frozen identifiers
  (`OutboxIQState` type, `outboxiq*` storage keys, `outboxiq-dev` GCP project)
  Entry 30 froze for breakage reasons; and holding the line that the rename does
  NOT discharge the rename-proof-Privacy-URL launch-blocker (the Pages URL is
  still repo-named, just the new name).
- **Outcome:** Repo renamed on GitHub (owner; GitHub auto-redirects the old
  URL); cascade commit `92d75e0`; `GITHUB_REPO_URL` constant added for the
  Phase-3 About link.
- **Lesson (for coaching):** the Entry-30 brand-independent-identifier framework
  paid off exactly as designed — the rename touched display copy + one derived
  URL + docs, and *nothing* load-bearing. The discipline that matters at rename
  time is knowing which "OutboxIQ" strings are the brand (rename) vs. frozen
  identities (leave) — a distinction Claude could apply mechanically *because*
  Entry 30 had drawn it sessions earlier.

## Entry 49 — Recipient timezone inference from email Date-headers: explored, deferred (not Free-v1 work now)

- **Session:** 13 (pre-session brainstorm, owner + PM thinking partner)
- **Moment:** The owner raised an idea: a recipient's past emails carry their
  UTC offset in the `Date:` header, so the extension could in principle infer a
  recipient's timezone on-device — no API, no backend — and (esp. for travelers)
  be more accurate than a static stored zone. The hope was this could pull part
  of the "automatic" experience into Free v1 earlier than planned, framed
  honestly as a confident *suggestion* that falls back to asking, never a silent
  guarantee.
- **My input (owner):** After working through it, the owner concluded the idea
  should be **logged and deferred, not probed or built** this session — choosing
  pre-launch hardening for Session 13 instead.
- **The reasoning (why deferred, honestly):**
  1. **Offset ≠ timezone, and the gap is unclosable from one sample.** A `Date:`
     offset (e.g. `-0700`) can't distinguish e.g. Los Angeles-on-DST from
     Arizona-no-DST, and the offset is *self-reported by the sender's device* —
     phones with wrong clocks, VPNs, scheduled sends, and travelers all write
     "lying" offsets. So inference can **never** be 100%-confident timezone, which
     means **the manual-pick fallback never goes away.** Inference therefore can't
     *replace* asking (the owner's own framing) — it could at most *seed* the
     existing manual picker with a confident, human-confirmed default.
  2. **The grand "automatic in Free v1" version is Premium-shaped.** The useful
     cold-send case (suggest a zone for someone you're about to email but aren't
     currently threaded with) almost certainly needs the **Gmail API**
     (`messages` read scope) — the data isn't in the compose-time DOM. Adding a
     Gmail read scope **reintroduces the OAuth + CASA/consent-verification gate
     that Entry 39's whole purpose was to remove.** That's a large cost.
  3. **The only clearly Free-v1-shaped slice is the thread-reply case** — when
     replying inside an existing thread, the recipient's past messages are
     already rendered in the DOM (no API, no scope). Multiple samples in a long
     thread can even partly resolve the DST ambiguity (observe a shift across a
     boundary). But the prize is bounded: it only helps on a cache **miss in a
     thread**, and the §5.3.5 manual cache is indefinite-TTL (Session 10) so each
     recipient benefits at most **once**. It's a one-time first-setup convenience,
     not the automatic vision.
  4. **§11 read:** header-offset-for-scheduling is **not** what §11's "recipient
     profiling" ban targets (that's behavioral/engagement profiling) — so not a
     "do not build". But the *brand framing* ("we read your recipients' past
     emails") needs care given the privacy-first positioning — a lightweight
     owner call, relevant only if the thread-DOM version is ever pursued.
- **What Claude Code would have done without it:** N/A for build (nothing built).
  The decision is recorded so the idea is **captured, not lost** — a future
  session could revisit the thread-reply slice with a cheap DOM probe ("are
  past-message Date offsets reachable in an open Gmail thread?") if priorities
  change. The honest counterfactual: the agent's lean was that the prize is small
  relative to the likely API/scope cost, and a probe is only worth it for the
  thread-only slice; the owner agreed and chose to defer entirely for now.
- **Outcome:** No code. Idea logged here; Session 13 proceeds to pre-launch
  hardening (Export/Delete My Data + the §5.3.5 live check).
- **Lesson (for coaching):** worth distinguishing "infer so we don't have to
  ask" (impossible here — offset can't be ground truth) from "infer so the ask
  is one tap" (possible, but bounded). Naming that distinction early stopped a
  plausible-sounding feature from being scoped on a hope; the deferral is
  eyes-open, and the reasoning is preserved so revisiting it later starts from
  evidence, not from scratch.

## Entry 50 — Export hides non-Free-v1 feature flags (owner caught the confusing dead toggles)

- **Session:** 13 (Phase-1 hands-on)
- **Moment:** Inspecting the freshly-wired Export JSON, the owner noticed the
  `featureToggles` block listed five flags but the Settings UI shows only two,
  and asked whether the other three should be in the file "because it might
  confuse users." The three: `unscheduleOnReply` (Premium v1), and the inert
  `scheduleConfirmationToast` (moot — §5.9 Undo removed, Entry 37) and
  `alwaysScheduleOutsideHours` (§5.5.2 dropped).
- **My input (owner):** After I laid out the trade-off — keep a faithful full
  dump (honours the Phase-1 "export the whole object, never hand-pick" decision,
  fully re-importable) vs. hide the three (cleaner, but hand-picks fields) — the
  owner chose **hide the three dead flags**. `unscheduleOnReply: true` in
  particular read like an active feature that doesn't exist in Free v1.
- **What Claude Code would have done without it:** Claude had *just* built the
  export to dump the whole state object precisely so nothing is silently omitted
  — and would have shipped it that way. The owner's read of it as a *user-facing
  trust artifact* (not just a data dump) flipped the call. Claude's contribution:
  correcting the owner's "all three are Premium" mental model (only one is —
  the others are removed/dropped), and implementing the narrowing safely as a
  keyof-typed **deny-list** (not an allow-list), so a genuinely-new Free-v1
  toggle still exports automatically and only the named dead keys drop; filtered
  on a copy so the stored schema is untouched.
- **Outcome:** Commit `e5568bc`; `EXPORT_OMITTED_TOGGLE_KEYS` + tests (deny-list
  stripped, new toggle still exported, input not mutated).
- **Lesson (for coaching):** "export everything, omit nothing" is the right
  engineering instinct for a *data dump*, but the export is *also* something a
  user reads — and a `true` next to a feature that doesn't exist is worse than a
  missing field. The deeper fix is to stop *storing* dead fields (a schema
  cleanup), which the deny-list defers honestly rather than papering over.

## Entry 51 — The duplicate-instance bug: a wrong-assumption fix, then the right one, then "don't force-reload"

- **Session:** 13 (mid-session, owner bug reports)
- **Moment:** The owner hit "Send now anyway does nothing" (the §5.5.1 soft
  warning wouldn't send) — the *third* time this bug family surfaced — plus a
  chevron-click loop and Schedule Send opening Gmail's native modal instead of
  ours. Root cause (one, not three): reloading the extension with Gmail open
  leaves an **orphaned** content-script instance (listeners alive, chrome.*
  context severed) alongside a fresh one, and the two fight.
- **My input (owner):** The owner reported each symptom precisely, asked the
  load-bearing question — *"I didn't refresh Gmail; is that why?"* (it was) —
  ran the clean-slate retest that confirmed the unifying diagnosis, and then made
  two calls: (1) approved building the durable fix, (2) after I laid out that
  force-reloading users' Gmail on every update would be intrusive for an email
  tool and is unnecessary once the fix is in, chose to **rely on the ownership
  fix and NOT auto-reload**.
- **What Claude Code would have done without it:** Claude's *first* fix this
  session (`d7c54f7`, a DOM-attribute latch) rested on a wrong assumption it had
  itself written a session earlier — that the latch could dedupe to one copy and
  the survivor would be fine — when the survivor could be the *dead* orphaned
  copy. The owner's hands-on ("it resurfaced") is what exposed that the fix was
  incomplete; without it Claude would have considered the bug closed. The right
  fix (`3c74e55`, newest-LIVE-copy-wins + orphaned-copies-inert via a context
  liveness check) followed. Claude's contributions: the eventual correct model,
  and holding the line that auto-reloading inboxes is the wrong trade — but the
  *diagnosis* depended on the owner's report, and the auto-reload restraint was
  the owner's explicit product call.
- **Outcome:** Commits `d7c54f7` (superseded) → `3c74e55` (durable). Owner
  confirmed the blocking symptom resolves after one Gmail refresh and accepted
  the approach. Caveat: the two-copy orphan scenario is single-world-impossible
  to unit-test (session-13-summary §f).
- **Lesson (for coaching):** two lessons. (1) A fix built on an untested
  assumption about a platform's runtime model (here: whether `window` / a
  reloaded content script share state) isn't done until it's driven in the real
  runtime — green tests on single-world jsdom proved nothing about the
  two-world reality. (2) "Make the bug impossible" is tempting (force-reload),
  but the cure can be worse than the disease for the user; the owner was right
  that a non-intrusive fix that *handles* the orphan beats one that *prevents*
  it by yanking people out of their inbox.

## Entry 52 — Premium v1 kept out of this project; the Free-v1-only remaining-session roadmap

- **Session:** 13 (close-out)
- **Moment:** Asked what Session 14 looks like, the owner set the remaining
  roadmap — **Accessibility pass → Workspace compatibility → security audit →
  comprehensive hands-on testing** — and directed that **anything Premium-v1
  scope be left out of this repo/project**.
- **My input (owner):** Defined the roadmap and the scope boundary. This
  sharpens Entry 32's tier-split (Premium = a *later* track) into "Premium is
  not part of *this* project at all."
- **What Claude Code would have done without it:** Claude's own Session-14 sketch
  had already put Premium v1 out of immediate scope, so the roadmap aligned.
  Claude's load-bearing contribution was **refusing to silently act on the
  ambiguous "out of this repo"**: the repo holds the deliberately-*preserved*,
  inert, verified premium-v1 OAuth/People stack (`src/premium-v1/`), the untouched
  `backend/`, `PREMIUM_LAUNCH_CHECKLIST.md`, and PRD §13 — all locked by Entry 39
  / CLAUDE.md as "preserved, not deleted." Physically deleting built+tested work
  is hard to reverse, so Claude recorded the directive, honoured it in the
  roadmap (no Premium work planned), and **flagged the physical removal as a
  decision needing explicit owner go-ahead** rather than executing it.
- **Outcome:** Free-v1-only roadmap recorded (session-13-summary §h). Premium v1
  code/docs **left in place pending an explicit "remove it" decision**; offered
  as a clean dedicated task if the owner confirms.
- **Lesson (for coaching):** an ambiguous scope instruction that would *delete
  preserved work* is exactly the case to surface, not assume. "Leave Premium out
  of the project" almost certainly means the roadmap; it *might* mean the files —
  and the cost of guessing wrong (discarding Sessions 7–9 verified work) is high
  and one-directional, so confirm.
- **Amendment (2026-05-27 — the explicit go-ahead arrived; removal executed).**
  The owner confirmed the directive this entry flagged: physically remove the
  preserved Premium v1 code/docs. Done in **this commit** (`chore: remove
  Premium v1 from public repo (Entry 52 executed)`): deleted
  `extension/src/premium-v1/` (the verified-but-inert OAuth/People stack +
  tests), `backend/`, `PREMIUM_LAUNCH_CHECKLIST.md`, and PRD §13; removed the
  Premium-only OAuth-smoke build tooling (`build:smoke` / `smoke:check` /
  `scripts/check-smoke-build.mjs` / the `OQ_SMOKE` define) that only existed
  to exercise the deleted harness; rewrote the surviving `§13` / `src/premium-v1/`
  pointers in the PRD, README, CLAUDE.md, and the kept source comments to
  "out of scope of this project." The strategic shape of "where Premium goes
  instead" (fork into a private repo; two-listing distribution) is recorded in
  **Entry 54**, and the Apache-2.0 license that makes that fork clean in
  **Entry 53**. The flag-don't-guess judgment recorded above was the right call:
  the removal happened on an explicit owner instruction, not an inference.

## Entry 53 — License model decided: Apache 2.0 + COMMERCIAL.md posture

- **Session:** Between Sessions 13 and 14 (pre-launch documentation pass,
  2026-05-27).
- **Moment:** Free v1 is feature-complete (Session 13 close). The public-launch
  surface narrowed to docs + brand + Web Store + accessibility / security /
  comprehensive testing — and the long-deferred "license model" item in
  `PRE_LAUNCH_CHECKLIST.md` finally needed an actual answer rather than another
  deferral. The owner considered a real commercial restriction (a source-
  available license in the PolyForm / BUSL / Elastic v2 family) before
  deciding the other way.
- **My input (owner):** Chose **Apache License, Version 2.0** (`LICENSE` +
  `NOTICE` at the repo root), with a short companion **`COMMERCIAL.md`** that
  signals commercial-licensing inquiries are welcome. Two things to log
  precisely:
  - The `COMMERCIAL.md` is **signal, not legal restriction.** Apache 2.0
    already permits commercial use, modification, and distribution — so the
    `COMMERCIAL.md` is *outreach* for arrangements beyond Apache (custom
    support, indemnification beyond Apache's terms, co-branded distribution),
    never a constraint on what Apache 2.0 allows.
  - The owner explicitly **accepted that anyone can use, modify, and
    commercialize the Free v1 code freely.** Prioritized contributor-
    friendliness and OSS norms over commercial protection — the explicit
    framing was "the OSS-contributor benefit (clean inbound-= outbound, no
    CLA friction, anyone can fork without negotiation) is worth more here
    than the commercial-protection a source-available license would buy."
- **What Claude Code would have done without it (Entry 17 honesty rule):**
  Nothing material — the license model is a strategic owner decision, and the
  prior PRE_LAUNCH "license-model deferred to pre-launch" lock means Claude
  would have correctly continued deferring rather than picking one
  unilaterally. The honest accounting: this was **100% owner judgment**, and
  Claude's contribution was faithful execution — fetching the verbatim
  Apache 2.0 text from the canonical source (sha256 verified against the
  well-known canonical hash), drafting `NOTICE` and `COMMERCIAL.md` to the
  prompt's spec, rewriting Terms §4, adding the regression-guard test, and
  applying per-file SPDX-License-Identifier headers across ~100 source
  files. The argued contribution — *why* Apache 2.0 over PolyForm-style —
  is the owner's.
- **Outcome:** Apache 2.0 adopted (commit `ba90c3c`). New files: `LICENSE`
  (verbatim Apache-2.0 text from `apache.org/licenses/LICENSE-2.0.txt`,
  followed by Fenil Dedhia's appendix-style copyright notice); `NOTICE`;
  `COMMERCIAL.md`. Updates: `README.md` License section; `docs/legal/terms.md`
  §4 (replaced the "source code is not open source / all rights reserved"
  paragraph with the accurate Apache 2.0 statement); `docs/legal/privacy.md`
  §2 + §11 (clarified Premium will be a separate Chrome Web Store extension,
  not an in-product upgrade — companion to Entry 54); `CLAUDE.md` "Locked
  tech decisions" License line; `PRE_LAUNCH_CHECKLIST.md` license-review
  item marked RESOLVED with the original bullet retained struck-through;
  `extension/package.json` `license: "UNLICENSED"` → `"Apache-2.0"`.
  Per-file SPDX-License-Identifier headers added in a separate focused
  commit (`1b0613e`) to keep the substantive license adoption diff readable.
  New `extension/src/license-files.test.ts` (10 tests total — 4 for the
  three root files' presence, 6 spot-checking SPDX headers on
  representative source files).
- **Artifact:** This entry; commits `ba90c3c` (Apache 2.0 adoption) +
  `1b0613e` (SPDX headers); the four new / replaced root files (`LICENSE`,
  `NOTICE`, `COMMERCIAL.md`, updated `README.md`); the updated legal docs;
  the new test file. The Apache 2.0 license is also the load-bearing enabler
  for Entry 54's Pattern-Y / Path-2 distribution (a future Premium fork is
  only "clean" because the public repo is Apache 2.0).
- **Lesson (for coaching):** A "license-model deferred to pre-launch" item
  that's been deferred *for a year* has to be picked eventually, and the
  right moment is "just before launch with feature work done" — not earlier
  (you don't yet know what you're licensing) and not later (the launch is
  blocked). When the decision is 100% owner strategic judgment, the honest
  move is to log it that way rather than invent a Claude counterfactual that
  doesn't exist (Entry 17 binding). And: "signal posture, not legal
  restriction" (`COMMERCIAL.md`) is a pattern worth naming — a contact
  channel that doesn't add legal surface but invites the conversations that
  can lead to real commercial relationships, complementing an open license
  rather than fighting it.

## Entry 54 — Premium v1 distribution: Pattern Y (two listings), Path 2 (separate builds from a private fork)

- **Session:** Between Sessions 13 and 14 (pre-launch documentation pass,
  2026-05-27; companion to Entries 52 and 53).
- **Moment:** Entry 52 had decided "Premium v1 is out of scope of this
  project"; this 2026-05-27 batch was about *executing* that scope
  decision (commit `652656b` deleted the preserved Premium code, backend,
  checklist, and PRD §13). The deeper question that surfaced once the
  removal was concrete: *how* will Premium actually ship when it
  eventually does? Two crossed axes appeared, with four corners and very
  different consequences:
  - **Pattern X (one Chrome Web Store extension, in-product upgrade to
    Premium)** vs. **Pattern Y (two separate Web Store extensions, two
    separate listings)** — the *distribution* shape.
  - **Path 1 (one codebase, Premium toggled by feature flags / build
    flavors)** vs. **Path 2 (two codebases — Premium = fork of this repo
    into a private one)** — the *build* shape.
- **My input (owner):** Chose **Pattern Y + Path 2**. The reasoning, in
  the owner's own framing:
  - Free's permission story stays minimal — no `identity`, no Google API,
    no consent screen, ever, on the Free `.crx`. The Entry-39 invariant
    is enforced at *distribution* time, not just code time.
  - The Free `.crx` is byte-for-byte built from this public Apache-2.0
    repo (transparency: any reviewer can trace the installed extension
    back to the source).
  - Premium will require modifications to base code that **cannot be
    cleanly feature-flagged** (OAuth bootstrap on install, backend
    wire-up, different manifest scopes, an entirely different
    `host_permissions` set). A single-build Pattern X1 approach would
    either produce a Premium-flavored "Free" experience for free users
    (wrong) or saddle the public Free repo with permanent inert Premium
    scaffolding — exactly the situation just exited in Entry 52.
  - Free and Premium have **independent release cycles, independent
    semver, independent release notes.** Each evolves at its own cadence
    without forcing churn on the other.
- **What Claude Code would have done without it (Entry 17 honesty rule):**
  As with Entry 53, this is 100% owner strategic judgment; Claude has no
  counterfactual default to undo here. The actual risk Claude would have
  left open given Entry 52 alone: ambiguity at fork time a year from
  now — "do we fork this repo? Feature-flag in a private branch? One
  extension or two? One semver or two?" — three or four unresolved
  questions someone (Claude or another agent or the owner himself) would
  have to re-decide under launch pressure. The owner closed all of them
  in one decision and one entry.
- **Honest counterfactual cost:** Pattern X1 + Path 1 (one listing, feature
  flags, single codebase) would have been **operationally simpler**: one
  Web Store listing to maintain, one codebase, smoother in-product upgrade
  path, lower marketing complexity (one product, one funnel). The owner
  explicitly chose to pay that operational tax in exchange for:
  - **Transparency over operational simplicity** (Free `.crx` is provably
    the public Apache-2.0 code).
  - **Minimal Free permissions over upgrade UX** (Free never asks for
    OAuth — not even optionally, behind a feature flag, with consent).
  - **Clean separation over feature-flag tangles** (no `if (premium) {…}`
    threading through the codebase forever).
- **Outcome:** Recorded as the **"Premium v1 strategic posture"**
  subsection under `CLAUDE.md` "Locked product decisions" (commit
  `e8d6e40`), and as part of the §1 SUPERSEDING NOTE in the PRD, the
  `README.md` repository-layout note, the `PRE_LAUNCH_CHECKLIST.md` top
  SUPERSEDING NOTE, and the amendments to Entries 32 and 52. Five
  consistent surfaces, one decision. The Apache 2.0 license adopted in
  Entry 53 is the load-bearing enabler: without it the future Premium
  fork couldn't be made cleanly. The previously-preserved verified
  Sessions 7–9 OAuth/People work is **recoverable from this repo's git
  history** if the Premium fork ever wants to use it — not deleted in any
  permanent sense, just no longer present in `HEAD`.
- **Artifact:** This entry; the CLAUDE.md "Premium v1 strategic posture"
  subsection; the §1 SUPERSEDING NOTE in `Fashionably_Late_PRD.md`; the
  README repository-layout out-of-scope note; the PRE_LAUNCH SUPERSEDING
  NOTE; the amendments to Entries 32 and 52. Cross-refs: Entry 52 (the
  scope call this entry sharpens distribution-wise), Entry 53 (the
  license that makes the fork clean), Entry 39 (the no-OAuth invariant
  Pattern Y enforces at distribution time), Entry 32 (the original tier
  split this supersedes the "where Premium lives" axis of).
- **Lesson (for coaching):** When you decide *not* to do X in a project,
  you've answered "is X in scope here?" but **not** "how does X actually
  happen, if it ever does?" The latter is a separate decision with its
  own independent axes — distribution shape and build shape are different
  questions, not all four corners are equally good, and naming the axes
  explicitly is what stops future ambiguity at fork time. The other
  lesson: when an honest counterfactual cost exists (Pattern X1 + Path 1
  *would* be operationally simpler), log it — the decision isn't "we
  picked the obviously best option," it's "we knowingly chose
  transparency + minimal permissions + clean separation over operational
  simplicity, with eyes open." A decision recorded with its
  counterfactual is harder to second-guess later because the trade was
  already made on the record.

---

## Session 14 — no entries this session.

Session 14 was the WCAG 2.1 AA remediation pass against PRD §6.3 + §8.9 — a
remediation session against an explicitly-itemized backlog (Gaps A/B/C/D/E
plus a broad audit), not a session where owner judgment moved the build's
trajectory off-script. The flagged "brand-touching" calls (focus-ring
visibility on `.fl-set-btn` / nav items; section grouping inside the
TimezonePicker listbox if a real screen-reader pass surfaces it) remain
*pending* owner judgment, not yet decided — when/if either becomes a real
call, an entry will be appended then. The owner's keyboard hands-on across
Tests 1/2/3 confirmed the implementation works as designed; the deferred
screen-reader walkthrough is documented in `PRE_LAUNCH_CHECKLIST.md` and
`notes/session-14-summary.md` §f as an explicit, acceptable Free-v1-launch
gap (Free v1 is local-only with no critical-safety surface).

---

## Session 15 — no entries this session.

Session 15 was the Google Workspace compatibility verification — a
**Branch 1 / clean** outcome per the session prompt's branching structure.
All six Part-A checks on a real Workspace account came back **identical**
to consumer Gmail; the DevTools console showed zero Fashionably-Late-
attributable errors; no code changed. A clean confirm-the-design-holds
result is by construction **not** a trajectory-changing owner decision —
no judgment was exercised against an option set, no counterfactual was
chosen against, no spec was amended. The session prompt anticipated this
exact case ("Append an owner-decisions-log entry only if the verification
surfaced a trajectory decision (it likely didn't — if it's a clean 'works
identically,' note 'no entry needed' in the close-out)."). The one honest
gap — the admin-disabled Schedule-Send graceful-degradation path (§6.7)
was not exercised because the owner is not the tenant admin on the
account used — is documented in `PRE_LAUNCH_CHECKLIST.md` and
`notes/session-15-summary.md`, carried forward to Session 16 (security
audit, the natural lens for admin-policy interaction surfaces) or 17
(comprehensive hands-on, if access to an admin-disabled tenant becomes
available), with the explicit fallback of accepting it as a Free-v1
launch gap given Free v1's existing fall-through-to-native-Gmail
graceful-degradation pattern (multi-compose safety net, §5.5.1 30s
watchdog, `gmail-recipe.ts` step-failure paths). If a future Workspace
session surfaces a real DOM divergence requiring a `gmail-recipe.ts`
shared-selector-vs-tenant-fork call, **that** would be an entry — not
this one.

---

## Entry 55 — Conscious owner acceptance of three pre-launch security items as documented Free-v1 launch gaps

- **Session:** 16 (2026-05-28 — the pre-launch security gate, third of the
  four hardening sessions: a11y → Workspace → **security** → comprehensive
  hands-on).
- **Moment:** Session 16 produced its verdict — **zero exploitable
  vulnerabilities in production source**, +2 defensive XSS regression tests
  (commit `2e23394`), and **four findings flagged for owner judgment**
  (`notes/session-16-summary.md` §c): (1) page-ownership token forging via
  the Session-13 `<html>[data-fashionably-late-owner]` mechanism, low
  severity; (2) admin-policy interaction surface (Workspace DLP /
  send-event hooks), unknown severity — carried from S15 §"Honest gap" /
  §"What was NOT verified"; (3) `npm audit` advisories in `rollup` reached
  transitively through `@crxjs/vite-plugin`, build-tooling-only (runtime
  audit is clean); (4) `console.info` "multi-compose detected" line — no
  security impact, intentional, flagged for audit-trail completeness only.
  Each flag arrived with an explicit recommended disposition and a
  hardening-options analysis. **This is the moment immediately before
  Chrome Web Store submission** — the owner had to make the call:
  hardening-now, or accept-and-document.
- **My input (owner):** **Accepted all three actionable flags (1/2/3) as
  documented Free-v1 launch gaps**, with the framing that *in each case
  the fix is worse than the risk*. The per-flag reasoning, in the owner's
  own framing:
  - **Flag 1 (page-ownership forging, Low) — accepted + documented, not
    hardened.** The DOM-attribute coordination is structurally forced by
    MV3's isolated-worlds model — closure / WeakMap / cryptographic-signature
    "fixes" don't work cross-world. The blast radius is bounded to UX-prompt
    suppression: a forged token disables the §5.5.1 outside-hours soft
    warning, with **no data exfiltration, no privilege escalation, no
    impersonation** (the user's email still sends normally via Gmail's
    native Send). Every viable hardening option (a defensive
    `MutationObserver` re-claim being the only mechanical candidate) lands
    on the gated hot path that Session 13's `claimPageOwnership` +
    `isCurrentOwner` finally got right after the bug-3 saga (Entry 51) —
    risking a regression of that fix to defend against a low-severity attack
    that already requires another foothold (a malicious co-installed
    extension, or Gmail-side compromise) is the wrong trade. *Documented in
    CLAUDE.md gotcha + flagged for revisit only if a real attack
    materialises post-launch.*
  - **Flag 2 (admin-policy surface, Unknown) — accepted as a launch gap,
    explicitly NOT worth acquiring a test environment to close.** Cannot be
    definitively closed without a real Workspace tenant running DLP /
    content-compliance / send-event hooks, which neither the owner nor
    Claude has. The structural reasoning (no Google API call axis per
    Entry 39 so the data-perimeter collision risk is zero; the §5.5.1
    gesture replay matches Gmail's own shape so a tenant Send hook sees the
    same event Gmail's UI produces) gives a low *structural* collision risk
    but is reasoning, not testing. The owner explicitly chose **not** to
    treat this as launch-blocking and explicitly **not** to seek out a
    tenant environment to close it. Opportunistic re-test in Session 17 *if*
    tenant access becomes available, otherwise Free v1 launches with this
    documented unknown — supported by Free v1's existing fail-toward-native-
    Gmail pattern on every ambiguous path (the multi-compose safety net,
    the §5.5.1 30-second watchdog, the `gmail-recipe.ts` step-failure
    paths). The "honest gap" carried from Session 15 is therefore
    upgraded to "accepted Free-v1-launch gap with conscious owner sign-off"
    by this entry — no longer a pending decision.
  - **Flag 3 (`npm audit`, Build-only) — accepted + monitor.** The two
    high-sev advisories (`GHSA-mw96-cpmx-2vgc`, Rollup < 2.80.0 path
    traversal) are reachable only when rollup is run against
    attacker-controlled inputs (which our build never does — we build only
    from `extension/src/` + our `node_modules/`). `npm audit --omit=dev` is
    **0 vulnerabilities**; the shipped runtime dep tree is `react@19.2.6` +
    `react-dom@19.2.6` only. The single `fixAvailable` is a SemVer-major
    DOWNgrade of `@crxjs/vite-plugin` from 2.x to 1.x, which **breaks the
    build** (already locked in the CLAUDE.md gotcha: "Do **not** run
    `npm audit fix --force` (it breaks the build)"). The accept-the-tax
    stance was already on record from CLAUDE.md "Locked tech decisions"
    (the CRXJS community-plugin trade-off); this entry confirms it survives
    the security-pass scrutiny without change, and adds a concrete monitor
    trigger: take the bump when `@crxjs/vite-plugin` ships a 2.x release
    that pulls in patched rollup.
  - **Flag 4 (no action needed)** — confirmed intentional per the
    pre-Session-16 owner decision; flagged for audit completeness only.
- **What Claude Code would have done without it (Entry 17 honesty rule):**
  Claude *had already* arrived at the accept-and-document recommendation
  for each of the three actionable flags during the audit pass — so on
  the *direction* this is owner-confirmed, not owner-corrected. The
  load-bearing owner contribution is what Entry 17's lesson named:
  **converting a "Claude recommends accept" into a "the owner consciously
  accepted at the pre-launch security gate, on the record, with reasoning"**.
  Without this entry, the flagged items would live as "Claude flagged + no
  trajectory change recorded" in a `Session 16 — no entries this session.`
  block (which is in fact what Claude initially drafted and the owner
  explicitly overruled). That draft would have been *technically accurate*
  by the strict "did owner judgment fork the build's trajectory off
  Claude's default" test, but **wrong by the spirit of Entry 17**: a future
  reviewer or auditor asking "did the team know about these items at
  launch?" needs to be able to see the answer, in the owner's voice, on
  the record. A `no entries` block doesn't pass that test for a security
  gate, even if it would for an a11y or compatibility one.
- **Honest counterfactual cost:** None of the three accept-stances chose
  the obviously-cheaper path:
  - For Flag 1, the *theoretically* safer path is "harden the token (e.g.
    `MutationObserver` re-claim) anyway, on the principle that any
    structural attack surface should be closed by default." The owner
    rejected that for the regression-risk-on-the-hot-path reason above —
    paid in *residual low-severity attack surface* to avoid risking the
    bug-3 fix. Future cost if a real attack ever materialises: re-litigate
    in a focused session with full hot-path test coverage, slower than
    fixing it now would have been.
  - For Flag 2, the *theoretically* safer path is "delay launch until a
    tenant probe is possible." The owner rejected that explicitly — paid
    in *a documented unknown carrying into launch* to avoid an open-ended
    pre-launch delay for a structurally-low-risk axis. Future cost if a
    real Workspace tenant reports a collision: scoped reactive fix
    post-launch, slower-and-louder than fixing it before launch would have
    been; this is the calculated bet.
  - For Flag 3, the *theoretically* safer path is "take the patched
    `@crxjs/vite-plugin` 2.x upgrade as soon as it ships, before launch,
    regardless of timing." The owner rejected the wait-for-upstream gating
    of launch — paid in *carrying a known dev-tooling advisory through
    submission* to avoid a SemVer-major rebuild dance on a non-shipped
    dependency. Future cost: a Web Store reviewer or third-party security
    scanner could in principle flag the advisory; the answer is the audit
    trail (this entry + the CLAUDE.md gotchas) showing it was identified
    and consciously accepted with a reachability analysis.

  All three counterfactuals are *known* and *recorded* — that is the entire
  point of this entry. A future reviewer asking "did you know about these
  at launch?" should be able to read this and see: **yes, all three were
  identified during the pre-launch security pass, each had explicit
  hardening options reviewed, and the owner consciously chose
  accept-and-document with the reasoning above. They were not missed.**
- **Outcome:** The three flags are recorded as **accepted Free-v1 launch
  gaps** in `notes/session-16-summary.md` §c (per-flag full reasoning), in
  `PRE_LAUNCH_CHECKLIST.md` "Security audit — DONE (Session 16, 2026-05-28)"
  (the pre-launch-visible record), in `CLAUDE.md` Current-state + 2 gotcha
  breadcrumbs (the working-state record), and in this entry (the
  decision-provenance record). No spec amendment; no production code
  change; no SCHEMA_VERSION bump. The §"§g owner-decisions-log entries"
  section of the session summary is updated to point at this entry instead
  of `Session 16 — no entries this session.` Flag 4 is unchanged (no
  action).
- **Artifact:** This entry; `notes/session-16-summary.md` §c (the
  per-flag reasoning, severity assessment, and hardening-options analysis
  for each); `PRE_LAUNCH_CHECKLIST.md` "Security audit — DONE (Session 16,
  2026-05-28)"; the Session-16 paragraph in `CLAUDE.md` "Current state";
  the two gotcha breadcrumbs in CLAUDE.md (page-ownership latch +
  `npm audit`); the in-session XSS regression-guard commit `2e23394`
  (orthogonal — pinning React's escape-by-default for the one
  attacker-influenceable data path, not related to Flags 1/2/3). Cross-refs:
  Entry 17 (the honesty rule this entry is bound by), Entry 39 (the
  no-OAuth invariant that bounds Flag 2's data-perimeter axis), Entry 51
  (the Session-13 page-ownership fix Flag 1's mechanism comes from),
  Entry 52 (the Premium-out-of-scope decision that keeps the audit surface
  this narrow). The CLAUDE.md gotcha for `npm audit` (already locked) and
  the gotcha for the page-ownership latch (Session 13, this entry adds a
  security-flag breadcrumb to it) are the daily-reference surfaces; this
  entry is the *why*.
- **Lesson (for coaching):** Two lessons, both Entry-17-flavored:
  1. **A "no entries this session" block is the wrong answer for a
     security pre-launch gate, even when Claude's recommendation is
     accepted without modification.** The default test "did owner judgment
     move the build's trajectory off Claude's default" is the right test
     for sessions where the *direction* is the question; for security
     gates the *acceptance itself* is the artifact that has to exist, in
     the owner's voice, because a future auditor asks "did you know" not
     "did you reverse Claude". The honest answer to "did you know" is
     only on the record if the owner consciously signed off — the absence
     of a counter-decision is not the same evidence as a logged
     acceptance.
  2. **Accept-and-document at a pre-launch gate is a real decision with
     real counterfactuals, not a passive default.** For each of the three
     flags, the cheaper-in-isolation path was the "harden it anyway" /
     "delay until tenant access" / "wait for upstream patch" path; the
     owner's accept-stance traded short-term latent risk for *not*
     regressing a hot-path fix / *not* gating launch on an unavailable
     environment / *not* breaking the build on a non-shipped dep.
     Recording the trade with the counterfactual — including the
     "and this is what we'll pay if the risk materialises" line — is what
     makes the decision robust against later second-guessing: the call
     was made on the record, with eyes open, with the cost named.

---

## Entry 56 — Default boundaries removed from the product; working hours consolidated as the single send-time window (SCHEMA_VERSION v3→v4)

- **Session:** 17 (2026-05-28 — comprehensive hands-on testing, the final
  pre-submission gate; this refactor was scoped INTO Session 17 and sequenced
  *before* the final hands-on pass so testing covers the post-refactor code).
- **Moment:** During Flow D (the §5.5.1 outside-hours warning) hands-on
  testing, the owner observed that the product had **two overlapping
  warnings** on a regular Send: a *working-hours* violation (per-day window,
  e.g. Thu 9–5) and a *Default-boundaries* violation (global earliest/latest,
  e.g. 7 AM–7 PM). They fire the same three-choice soft-warning modal with
  near-identical copy; the only difference is which boundary was crossed.
  From the user's seat they're two flavors of one thing ("you're sending
  outside an hour-range you configured") — no progressive escalation, no
  distinct treatment, functionally redundant. The owner named it a product-
  coherence problem, parked it ("I'll get back to you on this"), then returned
  with the decision: **erase Default boundaries from the product entirely**
  (UI, onboarding, storage, the guard, the PRD as live spec) and let per-day
  working hours be the single window.
- **My input (owner):** Drove the consolidation and its shape:
  - **Working hours alone is sufficient and conceptually richer** (per-day vs
    a single global pair), so it's the survivor; Default boundaries is the
    cut.
  - **The Optimize-for-X warning exemption stays.** (Discovery found it was
    never bound to Default boundaries anyway — it's architectural: Optimize
    routes through `commitOptimize()` → `run()`, bypassing the warning gate
    entirely. So "rebinding" it was a no-op; it survives unchanged.)
  - **Authorized the SCHEMA_VERSION v3→v4 bump** — the first *subtractive*
    schema change in the project (prior bumps were additive default-merges).
    Explicitly overrides the standing "no bump unless necessary" guard for
    this refactor, with a real one-way migration (drop the keys on read,
    write back v4).
  - **Confirmed the consequence I surfaced before editing:** removing Default
    boundaries also removes the §5.3 **Schedule Send** modal's *only* warning
    trigger (it warned on absolute-only by the locked Entry-21 split, never on
    working hours). The owner confirmed Schedule Send should now show **no**
    soft warning at all — coherent with Entry 21 (a deliberate off-hours
    *schedule* is the core use case; warning on it trains dismissal). The
    working-hours warning now lives ONLY on §5.5.1 regular Send.
- **What Claude Code would have done without it (Entry 17 honesty rule):**
  Claude would NOT have initiated this on its own — the two-warning design
  was the locked, shipped behavior (Entries 19/20/21/40), and Claude's
  standing instructions treat those as not-to-relitigate without explicit
  owner input. Left alone, Free v1 would have shipped with the redundant
  pair. The owner's product-coherence judgment is the entire origin of the
  change. Claude's load-bearing contribution was in execution discipline:
  reporting before editing that three of the spec's structural assumptions
  didn't match the code (Default boundaries is a sub-block of the Working
  Hours Settings section and onboarding step — NOT its own 7th section or a
  separate step, so no "7→6 sections" change; the Optimize exemption is
  architectural, not boundary-bound; and the Schedule-Send-loses-its-warning
  consequence), and getting the owner's explicit yes on the one real
  behavioral fork before cutting hot-path code.
- **Honest counterfactual cost:** The cheaper-in-isolation path was
  **defer-to-Premium** — leave the redundancy for v1 (it's not a bug, just
  inelegant) and reconsider the warning model whenever Premium is built. The
  owner rejected that: chose to **pay the cost of a hot-path refactor + a
  subtractive schema migration at the final pre-submission gate** to ship a
  *coherent* product rather than a redundant one. The risk taken on: touching
  the §5.5.1 guard and §5.3 modal (just-validated in Flow F) right before
  launch — mitigated by full unit-test coverage (incl. the v3→v4 migration
  test) + the mandatory Flow D / Flow F hands-on re-verification this entry
  requires before submission. If the consolidation later proves too blunt
  (e.g. a user wants a hard "never before X" floor *and* a soft per-day
  window), it returns as an additive Premium/​v2 feature — but the v1 surface
  is simpler and the schema is clean. The owner judged a clean, coherent v1
  worth more than the optionality of the second rule type.
- **Outcome:** Default boundaries removed across UI (Settings Working Hours
  section + onboarding Working Hours step — both stay single sections/steps,
  just lose the boundary sub-block), storage (`absoluteEarliest`/
  `absoluteLatest` dropped from `WorkingHours`; `validateWorkingHours` loses
  its bounds check; `getState` rebuilds workingHours weekday-only and writes
  back v4), the §5.5 calc (`checkWorkingHours` loses its absolute branches;
  `ViolationKind` narrows to `"working-hours"`; `before-earliest`/
  `after-latest`, the `boundary` field, and `ensureFutureSnap` all removed),
  the §5.3 modal (no warning path; `gate()` is now a past-time guard only;
  `workingHours` prop dropped through `mount.tsx` + `content-script.ts`), and
  the §5.5.1 warning copy ("after your working hours end" → "past your working
  hours"). `SCHEMA_VERSION` 3→4. PRD §5.5.1 + §5.1.3 + §5.3.5 + §5.8.2
  amended (Entry-4 discipline — historical text preserved, amendment appended).
  Test count moved (removed the absolute-rule / `ensureFutureSnap` / boundary
  tests, added the v3→v4 migration test). Detail in `notes/session-17-summary.md`.
- **Numbering note:** the session prompts guessed "Entry 56 (Workspace)" /
  "Entry 58" for this; the actual sequential next number after Entry 55 is
  **56**, assigned here because this decision was committed first. The
  Workspace admin-policy launch-gap acceptance (planned for the S17 close-out)
  follows as the next entry.
- **Lesson (for coaching):** *Coherence is a feature.* The redundancy wasn't
  a bug and nothing was broken — every test was green and both warnings
  "worked." The owner's contribution was noticing that *working correctly* and
  *making sense to a user* are different bars, and choosing to pay real
  refactor + migration cost at the worst possible time (the final gate) to
  clear the higher one. The execution lesson pairs with it: when a detailed
  spec's structural assumptions don't match the code, **report the mismatches
  and the one real behavioral fork before editing** — don't silently "make it
  work" against the wrong mental model. Three of this spec's assumptions were
  off; surfacing them first turned a possibly-wrong 7→6-sections change into
  the correct sub-block removal and got explicit sign-off on the Schedule-Send-
  loses-its-warning consequence.

---

## Entry 57 — Workspace admin-policy interaction surface accepted as a documented Free-v1 launch gap

- **Session:** 17 (2026-05-28 — final pre-submission gate / close-out).
- **Moment:** Two related items had been carried forward as "honest gaps /
  known unknowns" since Sessions 15–16: (a) the **admin-disabled
  Schedule-Send graceful-degradation** path (§6.7), never exercised because
  the owner isn't a Workspace tenant admin (Session 15 honest gap); and
  (b) the broader **admin-policy / DLP / content-compliance / send-event-hook
  interaction surface** (Session 16 security Flag 2 — `notes/session-16-summary.md`
  §c). Both were explicitly deferred to "Session 17 if tenant access becomes
  available, else accept as a launch gap." At the Session-17 close-out — the
  last gate before Chrome Web Store submission — that conditional had to be
  resolved one way or the other.
- **My input (owner):** **Confirmed I have no Workspace-tenant-admin access,
  and that acquiring a tenant environment (DLP / send-event hooks) purely to
  close these is not worth it for Free v1.** Both items are therefore
  **consciously accepted as documented Free-v1 launch gaps**, not left as
  ambiguous "pending." Reasoning, in my framing: Free v1 makes no Google API
  call (Entry 39), so there is **no data-perimeter axis** for a tenant DLP /
  compliance policy to collide with; and on every ambiguous step Free v1
  **fails toward Gmail's own native path** (the multi-compose safety net, the
  §5.5.1 30-second watchdog, the `gmail-recipe.ts` step-failure fallbacks) —
  the same shape of graceful degradation an admin-disabled Schedule Send would
  need. So the *structural* risk is low even though it's untested. This is the
  same accept-and-document posture as Entry 55, now applied to the one
  remaining carried-forward unknown.
- **What Claude Code would have done without it (Entry 17 honesty rule):**
  Claude had already recommended exactly this disposition in Sessions 15–16
  ("carry forward if a tenant appears, else accept as a launch gap"), so on
  *direction* this is owner-confirmed, not owner-corrected. The load-bearing
  owner contribution is the same as Entry 55's lesson: **converting a
  conditional "accept if we can't test it" into an unconditional, on-the-record
  "the owner consciously accepted at the final gate, having confirmed the test
  environment is unavailable and not worth acquiring."** A future auditor asking
  "did you know about the admin-policy unknown at launch?" can now read a clear
  yes with the owner's reasoning, rather than an unresolved carry-forward.
- **Honest counterfactual cost:** the theoretically-safer path is "delay
  launch until a real Workspace tenant with DLP can be borrowed/stood up and
  the path driven." Rejected — paid in *a documented, structurally-low-risk
  unknown carried into launch* to avoid an open-ended pre-launch delay for an
  axis Free v1's no-API posture already largely neutralizes. Future cost if a
  real tenant later reports a collision: a scoped reactive fix post-launch,
  slower-and-louder than pre-launch would have been — the calculated bet,
  named here so it isn't second-guessed later.
- **Outcome:** Recorded as **accepted Free-v1 launch gaps** in
  `PRE_LAUNCH_CHECKLIST.md` ("Google Workspace compatibility" honest-gap note
  → accepted-gap; "Security audit" Flag 2 → ACCEPTED), in
  `notes/session-17-summary.md`, and in this entry. No code change, no spec
  change, no SCHEMA_VERSION bump. Cross-refs: Entry 39 (no-OAuth invariant
  that bounds the data-perimeter axis), Entry 55 (the sibling
  conscious-acceptance entry from the S16 security gate), Session 15 / 16
  summaries (the original gap framing).
- **Lesson (for coaching):** the mirror of Entry 55's lesson — *a
  carried-forward "known unknown" must be explicitly closed at the final gate,
  one way or the other.* Letting it stay "pending / accept if we can't test"
  through launch would read, to a later auditor, as something that slipped
  through. Confirming the test environment is genuinely unavailable, naming the
  structural reasons the risk is low, and signing off on the acceptance is what
  turns a loose end into a deliberate, defensible launch decision.

---

## Entry 58 — Brand color (Moonstone #5EB1BF) + the AA trade-off, the teal-plate icon, and the owner-authored promo composition

- **Session:** 18 (2026-05-29 — branding & media assets).
- **Moment:** Session 18 replaced the placeholder brand ("OQ" icons, Google-blue
  UI) with the real one. Three points needed owner input: (1) the brand primary
  color — and what to do when it failed WCAG AA as a button; (2) whether the
  extension icon should be a transparent mark or a filled plate; (3) the Chrome
  Web Store promo-tile composition.
- **My input (owner):**
  1. Chose **Moonstone `#5EB1BF`** as the brand primary (a muted variant of the
     provided logo's `#40bfc1`). When the Phase-1 contrast math showed **white
     text on `#5EB1BF` is only 2.47:1 — fails AA** (needs 4.5:1), I chose the
     **AA-safe path**: the brand color stays the logo/accent, and the accessible
     **700 shade `#367B87` (4.84:1)** becomes the primary-button + link-text
     color. The brand color is deliberately *not* the literal button color.
  2. After seeing the first (transparent) icons **fade on a dark toolbar and
     blur at 16px**, I directed a **background plate**, and picked the **teal
     plate with a white symbol** over a white plate.
  3. **Authored the promo-tile composition** precisely — symbol, a letter-spaced
     *typeset* "FASHIONABLY LATE" wordmark, a thin 50%-white divider, then the
     tagline, as a centered stack — and the tagline copy **"Schedule emails at
     their perfect time."** (and the new manifest description copy).
- **What Claude Code would have done without it (Entry 17 honesty rule):**
  - *AA trade-off:* Claude had already computed the failure and recommended
    700-as-button / 500-as-accent, so on **direction** this is owner-confirmed,
    not corrected. The load-bearing owner act was the explicit sign-off that the
    brand color would *not* be the button — a real, recorded visual concession.
  - *Icon:* Claude generated transparent icons per the brief and **flagged** the
    dark-mode fade, but — bound by the "no new logo treatment" hard rule —
    defaulted to "accept it, owner's call." The owner pushed past that to the
    plate fix. **That improvement Claude would not have made unprompted.**
  - *Promo:* Claude's algorithmic composition was honestly "acceptable, not
    designer-grade" (centered lockup + tagline). The owner's spec (typeset
    letter-spaced wordmark + divider) materially improved it — design judgment
    Claude shouldn't fake.
- **Honest counterfactual cost:** small, and net-positive. The AA-safe path costs
  "the brand color isn't the literal button color" (a purist might dislike it),
  bought to keep the Session-14 AA commitment intact — the right trade. The plate
  costs a slightly less-minimal icon, bought for legibility on every toolbar and
  at 16px. No code risk, no scope change, no `SCHEMA_VERSION` bump.
- **Outcome:** Moonstone palette applied across the UI with a drift-guard test
  (`extension/src/brand-palette.test.ts`, 349→356 tests); teal-plate icons
  (16/32/48/128) + multi-res favicon; inline-SVG in-product logo placements (4
  surfaces, +6 tests → 362); Primer-theme logo header + favicon on the legal
  site; Web Store promo assets. Recorded in `notes/session-18-summary.md`, in
  `PRE_LAUNCH_CHECKLIST.md` (brand items → DONE), and here. Cross-refs: **S14**
  (the AA commitment this honored — the *old* accent scraped 4.55:1, the new 700
  is 4.84:1, an improvement), **Entry 41** (brand/naming history).
- **Numbering note:** the Session-18 prompt guessed "Entry 57" for this; the
  actual sequential next number after Entry 57 (the S17 Workspace gap) is
  **58** — the same off-by-one the prompts made for Entries 56/57.
- **Lesson (for coaching):** a brand color chosen for how it *looks* can fail the
  accessibility bar it has to *clear* — resolve that at the design gate, not after
  shipping, and record the trade-off so "why isn't the button the brand color?"
  has a documented answer. And: when a hard rule ("don't invent treatments")
  would otherwise freeze a real UX problem (the dark-mode icon), it is the
  *owner's* call to lift it deliberately — which is exactly what the plate
  decision was.

---

*New entries are appended at every session close-out, alongside the session
summary. If a session produced no trajectory-changing owner input, record that
explicitly (`Session N — no entries this session.`) rather than leaving a gap
or inventing one.*
