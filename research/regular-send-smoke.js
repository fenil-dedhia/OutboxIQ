// ============================================================================
// OutboxIQ — §5.5.1 regular-Send guard SMOKE-TEST HARNESS
//
// Purpose: make the Session-7 Phase-1 hands-on smoke test of the regular-Send
// guard DETERMINISTIC and RE-RUNNABLE. Unit tests (jsdom) prove the guard's
// decision logic; this harness lets a human verify the *assembled* extension
// against *live Gmail* — the load-bearing check this repo trusts (Entry 10:
// "green ≠ verified"). Re-run it after any Gmail change that breaks Send.
//
// HOW TO RUN (non-technical, copy-paste — same shape as send-button-probe.js):
//   1. Build + load the unpacked extension (extension/dist), complete real
//      onboarding ONCE (any values — that exercises the onboarding path).
//   2. chrome://extensions → OutboxIQ → "Inspect views: service worker".
//   3. Paste this WHOLE file into that service-worker console, press Enter.
//   4. Run a scenario, e.g.:  await OQ_SMOKE.scenario('whBeforeStart')
//   5. It prints exactly what you should see. RELOAD the Gmail tab (Cmd-R),
//      open ONE compose, click Send (or press ⌘/Ctrl+Enter), and compare.
//   6. Walk every button. Record the result in research/regular-send-smoke.md.
//   7. When done:  await OQ_SMOKE.reset()   (restores Mon–Fri 9–5 defaults)
//
// WHY the service-worker console (not the Gmail page console): the page's
// console runs in Gmail's world and has no chrome.storage. The service worker
// does. Writing here fires chrome.storage.onChanged, which the content
// script's config-cache listens to — so the guard re-reads live. We still
// recommend a Gmail reload per scenario to remove every confound and to
// re-exercise the bootstrap install path too.
//
// SCOPE of this harness (honest — Entry 16): it drives the real guard, the
// real config-cache onChanged refresh, the real soft-warning modal, the real
// Send interception, and the real native Schedule recipe. It does NOT re-run
// the onboarding *form* per scenario (tested once, separately) — it writes
// working-hours config the same way Settings eventually will. Multi-compose
// is deliberately NOT covered: the guard intentionally does not intercept ≥2
// composes (documented v1-acceptable safety net; CLAUDE.md / Entry 27).
// ============================================================================

(() => {
  const STATE_KEY = "outboxiqState";
  // chrome.storage StorageArea is promise-based in MV3 service workers.
  const get = (k) => chrome.storage.local.get(k).then((r) => r[k]);
  const set = (k, v) => chrome.storage.local.set({ [k]: v });

  // getDay(): 0=Sun..6=Sat → WorkingHours weekday keys.
  const DOW = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const clamp = (m) => Math.max(0, Math.min(1439, m));
  const hhmm = (m) => {
    const c = clamp(m);
    const h = String(Math.floor(c / 60)).padStart(2, "0");
    const mm = String(c % 60).padStart(2, "0");
    return `${h}:${mm}`;
  };
  // 12h display, e.g. 945 → "3:45 PM" — only for the printed expectation.
  const disp = (m) => {
    const c = clamp(m);
    let h = Math.floor(c / 60);
    const mm = String(c % 60).padStart(2, "0");
    const ap = h < 12 ? "AM" : "PM";
    h = h % 12 || 12;
    return `${h}:${mm} ${ap}`;
  };

  function day(enabled, start = "00:00", end = "23:59") {
    return { enabled, start, end };
  }
  function allDays(enabled, start, end) {
    const o = {};
    for (const d of DOW) o[d] = day(enabled, start, end);
    return o;
  }

  async function loadState() {
    const s = await get(STATE_KEY);
    if (!s) {
      throw new Error(
        "No OutboxIQ state found. Load the extension and COMPLETE ONBOARDING first.",
      );
    }
    if (!s.user || s.user.onboardingCompletedAt == null) {
      throw new Error(
        "Onboarding not complete — the guard is not installed. Finish onboarding, then re-run.",
      );
    }
    return s;
  }

  // Browser timezone so "now wall-clock in the configured tz" == this
  // machine's clock (removes the tz confound; the guard evaluates
  // nowWallInTimeZone(cfg.timezone)).
  function browserTz() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }

  async function writeConfig(workingHours, label) {
    const s = await loadState();
    const tz = browserTz();
    const next = {
      ...s,
      user: { ...s.user, timezone: tz, timezoneSource: "manual" },
      workingHours,
    };
    await set(STATE_KEY, next);

    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    console.log(
      "%c[OQ_SMOKE] " + label,
      "font-weight:bold;color:#1a73e8",
      "\n  timezone set to:", tz,
      "\n  today is:", DOW[now.getDay()], now.toDateString(),
      "\n  local time now ≈", disp(mins), `(${hhmm(mins)})`,
      "\n  working hours written:", workingHours,
      "\n\n  → RELOAD the Gmail tab (Cmd/Ctrl+R), open ONE compose, then test.",
    );
    return { mins, now, tz };
  }

  const SCENARIOS = {
    // No rule broken → NO modal, email sends immediately.
    async clean() {
      await writeConfig(
        { ...allDays(true, "00:00", "23:59"), absoluteEarliest: "00:00", absoluteLatest: "23:59" },
        "CLEAN — no violation",
      );
      console.log(
        "%c  EXPECT: NO warning modal. Send goes immediately (mouse AND ⌘/Ctrl+Enter).",
        "color:#137333",
      );
    },

    // Working-hours violation only (before-start), absolute NOT violated.
    // Mirrors the spec's "8:30 AM with a 9 AM start" shape.
    async whBeforeStart() {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const startM = clamp(mins + 60);
      const todayKey = DOW[now.getDay()];
      const wh = {
        ...allDays(true, "00:00", "23:59"),
        [todayKey]: day(true, hhmm(startM), "23:59"),
        absoluteEarliest: "00:00",
        absoluteLatest: "23:59",
      };
      await writeConfig(wh, "WORKING-HOURS only (before-start)");
      if (mins + 60 > 1439) {
        console.warn(
          "  ⚠ It is within ~1h of midnight — this scenario degrades. Prefer absBeforeEarliest, or retry earlier in the day.",
        );
      }
      console.log(
        "%c  EXPECT: modal 'Send this email later?', lead ≈ \"It's <now> <TZ>, before your working hours start.\"\n" +
          `  Primary: 'Reschedule to ~${disp(startM)} TODAY'.  Then 'Send now anyway', 'Cancel'.`,
        "color:#b06000",
      );
    },

    // Working-hours violation: today is not a working day at all.
    // Snap = soonest upcoming enabled day at its start (tomorrow 9:00 AM).
    async nonWorkingDay() {
      const now = new Date();
      const todayKey = DOW[now.getDay()];
      const tmrwKey = DOW[(now.getDay() + 1) % 7];
      const wh = { ...allDays(false), absoluteEarliest: "00:00", absoluteLatest: "23:59" };
      wh[todayKey] = day(false);
      wh[tmrwKey] = day(true, "09:00", "17:00");
      await writeConfig(wh, "WORKING-HOURS only (non-working-day)");
      console.log(
        "%c  EXPECT: modal; lead ≈ \"<now> <TZ> isn't one of your working days.\"\n" +
          `  Primary: 'Reschedule to ~9:00 AM ${tmrwKey} (tomorrow)'.  Then 'Send now anyway', 'Cancel'.`,
        "color:#b06000",
      );
    },

    // ABSOLUTE violation (before-earliest) — wins even though working hours
    // are wide open. The spec's "3 AM" case (now is before the floor).
    async absBeforeEarliest() {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const earliestM = clamp(mins + 60);
      const wh = {
        ...allDays(true, "00:00", "23:59"),
        absoluteEarliest: hhmm(earliestM),
        absoluteLatest: "23:59",
      };
      await writeConfig(wh, "ABSOLUTE (before-earliest) — wins over working hours");
      if (mins + 60 > 1439) {
        console.warn("  ⚠ Within ~1h of midnight — prefer absAfterLatest instead.");
      }
      console.log(
        "%c  EXPECT: modal; lead ≈ \"It's <now> <TZ> — before " +
          `${disp(earliestM)} <TZ>, the earliest you said you'd ever send an email."\n` +
          `  Primary: 'Reschedule to ~${disp(earliestM)} TODAY'.  Then 'Send now anyway', 'Cancel'.`,
        "color:#a50e0e",
      );
    },

    // ABSOLUTE violation (after-latest).
    async absAfterLatest() {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const latestM = clamp(mins - 60);
      const wh = {
        ...allDays(true, "00:00", "23:59"),
        absoluteEarliest: "00:00",
        absoluteLatest: hhmm(latestM),
      };
      await writeConfig(wh, "ABSOLUTE (after-latest)");
      if (mins - 60 < 0) {
        console.warn("  ⚠ It is shortly after midnight — prefer absBeforeEarliest instead.");
      }
      console.log(
        "%c  EXPECT (post Session-7 fix): modal; lead ≈ \"It's <now> <TZ> — after " +
          `${disp(latestM)} <TZ>, the latest you said you'd ever send an email."\n` +
          "  Primary: 'Reschedule to ~12:00 AM TOMORROW' (next working morning;\n" +
          "  this scenario sets all days on with 00:00 start, so the next morning\n" +
          "  start is 00:00). It must be a FUTURE time — clicking Reschedule must\n" +
          "  produce a VALID native scheduled send, NOT Gmail's 'Invalid time'.\n" +
          "  (Pre-fix this snapped to a PAST time today — Session 7 Test G bug.)",
        "color:#a50e0e",
      );
    },
  };

  async function scenario(name) {
    const fn = SCENARIOS[name];
    if (!fn) {
      console.error(
        `[OQ_SMOKE] unknown scenario '${name}'. Options: ${Object.keys(SCENARIOS).join(", ")}`,
      );
      return;
    }
    await fn();
  }

  async function status() {
    const s = await get(STATE_KEY);
    const now = new Date();
    console.log(
      "[OQ_SMOKE] status",
      "\n  onboardingCompletedAt:", s?.user?.onboardingCompletedAt ?? "(none — guard NOT installed)",
      "\n  timezone:", s?.user?.timezone,
      "\n  now:", DOW[now.getDay()], now.toLocaleString(),
      "\n  workingHours:", s?.workingHours,
    );
  }

  // Restore PRD defaults (Mon–Fri 09:00–17:00, abs 07:00/19:00). Leaves
  // onboarding/consent/lastScheduled intact.
  async function reset() {
    const s = await loadState();
    const d = (e) => ({ enabled: e, start: "09:00", end: "17:00" });
    const wh = {
      monday: d(true), tuesday: d(true), wednesday: d(true),
      thursday: d(true), friday: d(true), saturday: d(false), sunday: d(false),
      absoluteEarliest: "07:00", absoluteLatest: "19:00",
    };
    await set(STATE_KEY, { ...s, workingHours: wh });
    console.log("[OQ_SMOKE] reset → PRD default working hours. Reload Gmail.");
  }

  globalThis.OQ_SMOKE = { scenario, status, reset, SCENARIOS: Object.keys(SCENARIOS) };
  console.log(
    "%c[OQ_SMOKE] ready.",
    "font-weight:bold;color:#1a73e8",
    "\n  await OQ_SMOKE.scenario('clean' | 'whBeforeStart' | 'nonWorkingDay' | 'absBeforeEarliest' | 'absAfterLatest')",
    "\n  await OQ_SMOKE.status()   await OQ_SMOKE.reset()",
  );
})();
