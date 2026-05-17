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

---

*New entries are appended at every session close-out, alongside the session
summary. If a session produced no trajectory-changing owner input, record that
explicitly (`Session N — no entries this session.`) rather than leaving a gap
or inventing one.*
