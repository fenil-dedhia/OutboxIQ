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

## Session 6 — no entries this session.

Session 6 executed the already-locked Entry-2 / Entry-23 probe-gating
discipline (build the Send-button probe, clear the gate against live Gmail,
then implement §5.5.1). No new owner judgment redirected the build. The
owner's faithful hands-on probe runs — including reporting the alarming
intermediate "it sent" rather than mislabelling it, which is exactly what
let the gate catch the too-blunt one-shot diagnostic — were *execution of
the locked protocol*, not a trajectory change. The `armSuppress`-too-blunt
near-miss is a Claude-side process residual (recorded honestly in
`notes/session-6-summary.md` §f), not an owner-decisions entry per this
file's defined purpose. Recorded explicitly per the maintenance habit; not
manufactured into an entry.

---

*New entries are appended at every session close-out, alongside the session
summary. If a session produced no trajectory-changing owner input, record that
explicitly (`Session N — no entries this session.`) rather than leaving a gap
or inventing one.*
