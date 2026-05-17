# §5.5.1 Regular-Send Guard — Hands-On Smoke Test (Session 7, Phase 1)

**Date:** 2026-05-17
**Status:** ⏳ Written, awaiting hands-on run by the owner. **Gate zero for
Session 7** — Phases 2 (GCP setup) and 3 (OAuth/cascade) do not start until
this is clean (Entry 10: green jsdom tests ≠ verified; the assembled
extension has never been hand-run against live Gmail).

The runnable script is **`research/regular-send-smoke.js`** (single source —
Entry-9 discipline, same role as `send-button-probe.js`). This file is the
how-to-run + the result log; it does not duplicate the script. Re-run after
any Gmail change that breaks Send.

---

## Why this exists

Session 6 implemented §5.5.1 (the regular-Send guard — **the
highest-criticality module in the product**: a bug here means users cannot
send email). The Send-button DOM probe verified the *primitives* hands-on
and 85 jsdom tests prove the *logic*, but **the wired whole has never been
run** — load the real extension → set working hours → click Send off-hours →
see the modal → walk each of the 3 choices end-to-end against live Gmail.
That is exactly the gap Entry 10 is about.

---

## Setup (once)

1. `npm --prefix extension run build` (already verified clean this session).
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** →
   select `extension/dist`.
3. Open Gmail. Onboarding opens. **Complete it for real** (any values — this
   also smoke-tests the onboarding path). This is required: the guard only
   installs after onboarding (`onboardingCompletedAt` set).
4. `chrome://extensions` → OutboxIQ → **"Inspect views: service worker"**.
   In that console, paste the **whole** of `research/regular-send-smoke.js`,
   press Enter. You should see `[OQ_SMOKE] ready.`

For each scenario: run the `OQ_SMOKE.scenario(...)` call, read the printed
EXPECT line, **reload the Gmail tab (Cmd/Ctrl+R)**, open **one** compose,
and test. (The guard re-reads config live on storage change, but reloading
removes every confound and also re-exercises the install path.)

> Multi-compose is **out of scope** for this matrix by design — the guard
> deliberately does not intercept ≥2 composes (documented v1-acceptable
> safety net; CLAUDE.md / Entry 27). Keep to ONE compose per test.

---

## Test matrix

Run each row. For each, record PASS/FAIL + a note in the Result Log below.

| # | Scenario cmd | Context | Action | Expected |
|---|---|---|---|---|
| 1 | `clean` | new compose | click Send | sends immediately, **no modal** |
| 2 | `clean` | new compose | ⌘/Ctrl+Enter | sends immediately, **no modal** |
| 3 | `whBeforeStart` | new compose | click Send | modal; "before your working hours start"; primary "Reschedule to ~+1h today" |
| 4 | `whBeforeStart` | new compose | ⌘/Ctrl+Enter | same modal (keyboard path) |
| 5 | `whBeforeStart` | new compose | modal → **Reschedule** | native Schedule Send fires; Gmail "Send scheduled for…" toast at the snapped time |
| 6 | `whBeforeStart` | new compose | modal → **Send now anyway** | email sends immediately; no second warning |
| 7 | `whBeforeStart` | new compose | modal → **Cancel** | modal closes; nothing sent; compose intact |
| 8 | `whBeforeStart` | new compose | modal → **Esc** | same as Cancel; Gmail does NOT also minimise/discard the draft |
| 9 | `whBeforeStart` | new compose | modal → click backdrop | same as Cancel |
| 10 | `absBeforeEarliest` | new compose | click Send | modal; "before … the earliest you said you'd ever send"; reschedule to floor today |
| 11 | `absBeforeEarliest` | new compose | modal → Reschedule | scheduled at the absolute-earliest boundary, **same day** |
| 12 | `nonWorkingDay` | new compose | click Send | modal; "isn't one of your working days"; reschedule to tomorrow ~9 AM |
| 13 | `whBeforeStart` | **inline reply** | click Send | same as #3 + chosen choice works end-to-end |
| 14 | `whBeforeStart` | **pop-out compose** | click Send | same as #3 + chosen choice works end-to-end |
| 15 | `absAfterLatest` | new compose | click Send | modal; "after … the latest you said you'd ever send" (optional extra) |
| 16 | `clean` | — | `OQ_SMOKE.reset()` | restores Mon–Fri 9–5; leave it clean for Phase 2/3 |

The §5.2.3 invariant to watch the whole time: **at no point should you ever
be unable to send an email.** Every failure path is designed to fall toward
sending. If you ever get stuck (Send does nothing, no modal, no email),
that is the most serious possible finding — stop and report it verbatim.

---

## Result Log

> Fill this in during the run. Be literal — paste exact modal text and exact
> console lines. "It sent anyway" / "nothing happened" are the important
> kinds of observations (Entry 18: a silent wrong outcome is the worst
> finding; surface it, don't smooth it over).

**Environment:** Chrome version ____ · Gmail UI (English?) ____ · OS ____ ·
local time at start ____ · timezone ____

| # | Result (PASS/FAIL) | Notes / exact text seen |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| 6 |  |  |
| 7 |  |  |
| 8 |  |  |
| 9 |  |  |
| 10 |  |  |
| 11 |  |  |
| 12 |  |  |
| 13 |  |  |
| 14 |  |  |
| 15 |  |  |
| 16 |  |  |

**Overall:** ☐ Clean — proceed to Phase 2  ☐ Issue(s) found — see notes

---

## Triage rule (from the Session 7 prompt)

- **Clean** → Phase 2 (GCP setup).
- **Trivial fix** (one-line, no design implication, ≤30 min) → fix in
  Phase 1, document here, then proceed.
- **Anything else** → stop. §5.5.1 fix becomes this session's whole scope;
  §5.3.5 moves to Session 8; the two-session split becomes three. Entry 15
  ("surface, don't act") applied to scope — do not let Phase 1 silently eat
  Phase 2/3 time.

---

## Session 7 run — finding & fix (2026-05-17)

**Result:** Tests A–F all PASS hands-on (new compose / inline reply /
pop-out; all 3 choices + Esc + backdrop; absolute & working-hours
violations). **Test G FAILED — a real, default-reachable bug.**

**Test G (`absAfterLatest`) finding:** for an "after your latest send time"
violation, the snap was the absolute ceiling **on the same calendar day**,
which for the regular-Send trigger ("now" *is* the requested time, and "now
is past the ceiling" ⇒ today's ceiling already elapsed) is **always in the
past**. Gmail rejected it: *"Invalid time."* Default-reachable: Send after
the default 7:00 PM `absoluteLatest`. Not a §5.2.3 safety failure (graceful
degradation held — landed in Gmail's native picker), but the headline
recommended action was broken in the most common evening case. Owner
re-scoped (fix this session + keep Phase 2; defer Phase 3).

**Fix (owner decision — "next working morning"):** a pure, time-aware
`ensureFutureSnap()` layer rolls **only** a past `after-latest` snap forward
to the next configured working day at its start (fallback: next calendar day
at `absoluteEarliest` if zero working days). Scoped to `after-latest` only;
every other snap is provably already future and untouched. Applied by both
the §5.5.1 and §5.3 consumers; `checkWorkingHours` unchanged/Date.now-free.
7 new unit tests (incl. an explicit Test-G regression); 92 green. PRD
§5.5.3 + CLAUDE.md amended; owner-decisions-log Entry 28.

### Re-verify after the fix (focused — Entry 10: green ≠ verified; the
hands-on check that found it must confirm the fix)

Rebuild (`npm --prefix extension run build`), reload the unpacked extension,
re-paste the harness, then:

| # | Scenario | Check |
|---|---|---|
| G1 | `absAfterLatest` | modal's "Reschedule to…" shows a **future** time (next morning, not today); clicking it produces a **valid** native scheduled send — **no "Invalid time"** |
| G2 | `whBeforeStart` | regression: still snaps to **today** ~+1h and Reschedule still works (proves the fix is scoped, didn't disturb passing cases) |
| G3 | `absBeforeEarliest` | regression: still snaps to **today** at the floor and Reschedule still works |

If G1 is valid and G2/G3 unchanged → §5.5.1 fix confirmed, gate zero
closed.

**Run result (2026-05-17):** ✅ PASS. G1 — `absAfterLatest` now reschedules
to a **future** time and produces a valid native scheduled send (no
"Invalid time"). G2 (`whBeforeStart`) and G3 (`absBeforeEarliest`)
unchanged — still snap to *today* and still work, confirming the fix is
surgical. Gate zero closed; Session 7 proceeded to Phase 2.

**§5.3 sibling re-verify (2026-05-17, post-close-out):** ✅ PASS. Same
`absAfterLatest` config, but triggered via the **Schedule Send modal**
(pick a later-today custom time → Schedule): the §5.5 warning fired with
the "scheduled for…" copy, "Reschedule to…" proposed a **future** time
(next morning, not a past time today), and it produced a valid native
scheduled send (no "Invalid time"). This closes the Q1 honest residual —
the §5.3 sibling fix is now hands-on verified, not reasoning-only. The
harness drives §5.5.1; the §5.3 path is a manual procedure (steps in the
Session-7 close-out exchange) — fold into the harness in a later session
if a §5.3 regression asset is wanted.
