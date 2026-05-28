// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from "react";
import { STEP_COUNT, useOnboarding } from "./useOnboarding";
import { Welcome } from "./steps/Welcome";
import { TimezoneStep } from "./steps/TimezoneStep";
import { WorkingHoursStep } from "./steps/WorkingHoursStep";
import { isWorkingHoursValid } from "../../lib/storage";
import { MSG_OPEN_SETTINGS } from "../../lib/messages";

// Session 14 a11y: announced step titles for the aria-live region. Match the
// h1 text of each step so the announcement and the visible heading agree.
const STEP_TITLE: Record<number, string> = {
  0: "Welcome to Fashionably Late",
  1: "Set up your timezones",
  2: "Set your working hours",
};

// PRD §5.8.1 access point: the completion screen links to Settings. Content
// scripts have no openOptionsPage, so settings-open is owned by the service
// worker; this extension page asks it via the same message the modal gear uses.
function openSettings(): void {
  void chrome.runtime.sendMessage({ type: MSG_OPEN_SETTINGS });
}

// Focus the nearest open Gmail tab, then close this onboarding tab.
// This is an extension page so it can use chrome.tabs directly; querying by
// URL needs the host permission for mail.google.com (declared in the
// manifest). window.close() does NOT work here because the tab was opened by
// the service worker, not by a script in this page — so the tab is removed
// via chrome.tabs.remove instead.
async function returnToGmail(): Promise<void> {
  let current: chrome.tabs.Tab | undefined;
  try {
    current = await chrome.tabs.getCurrent();

    const gmailTabs = await chrome.tabs.query({
      url: "https://mail.google.com/*",
    });

    if (gmailTabs.length > 0) {
      // Prefer a Gmail tab in the same window, nearest by tab position to
      // this one; otherwise fall back to any Gmail tab (and focus its window).
      const sameWindow = gmailTabs.filter(
        (t) => t.windowId === current?.windowId,
      );
      const pool = sameWindow.length > 0 ? sameWindow : gmailTabs;
      const anchor = current?.index ?? 0;
      const target = pool.reduce((best, t) =>
        Math.abs(t.index - anchor) < Math.abs(best.index - anchor) ? t : best,
      );

      if (target.id != null) {
        await chrome.tabs.update(target.id, { active: true });
        await chrome.windows.update(target.windowId, { focused: true });
      }
    }
  } catch {
    /* best effort — still close the onboarding tab below */
  }

  try {
    if (current?.id != null) {
      await chrome.tabs.remove(current.id);
      return;
    }
  } catch {
    /* fall through to fallback */
  }
  window.close();
}

export function App() {
  const { status, draft, update, next, back, finish } = useOnboarding();

  // Session 14 a11y: polite aria-live announcement that fires when the step
  // advances/Backs (and when the "done" screen appears). Skipped on the
  // initial mount — a user arriving on step 1 already sees it; an
  // announcement at load time is redundant noise. Step focus is handled
  // inside each step's heading (and the done h1, below); this region
  // duplicates the heading text in case AT misses the focus change.
  const [announcement, setAnnouncement] = useState("");
  const isFirstStep = useRef(true);
  const step = status === "ready" ? draft.stepIndex : -1;
  useEffect(() => {
    if (status !== "ready") return;
    if (isFirstStep.current) {
      isFirstStep.current = false;
      return;
    }
    const title = STEP_TITLE[step] ?? "";
    setAnnouncement(`Step ${step + 1} of ${STEP_COUNT}: ${title}`);
  }, [status, step]);
  useEffect(() => {
    if (status === "done") {
      setAnnouncement("You're all set. Fashionably Late is active.");
    }
  }, [status]);

  // Focus the "done" heading on completion (same pattern as each step).
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (status === "done") doneHeadingRef.current?.focus();
  }, [status]);

  const liveRegion = (
    <div role="status" aria-live="polite" className="oq-sr-only">
      {announcement}
    </div>
  );

  if (status === "loading") {
    return (
      <main className="oq-shell">
        {liveRegion}
        <p>Loading&hellip;</p>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="oq-shell">
        {liveRegion}
        <section className="oq-step" aria-labelledby="oq-done-title">
          <h1 id="oq-done-title" ref={doneHeadingRef} tabIndex={-1}>
            You&rsquo;re all set
          </h1>
          <p>
            Fashionably Late is active. Head back to Gmail &mdash; your
            scheduling preferences are saved on this device.
          </p>
          <div className="oq-actions">
            <button
              type="button"
              className="oq-primary"
              onClick={() => void returnToGmail()}
            >
              Return to Gmail
            </button>
            <button
              type="button"
              className="oq-secondary"
              onClick={openSettings}
            >
              Open Settings
            </button>
          </div>
        </section>
      </main>
    );
  }

  const isLastStep = step === STEP_COUNT - 1;
  // The last step is working hours; block Finish until inputs are valid (#2).
  const canFinish = isWorkingHoursValid(draft.workingHours);

  // Consent is gated on step 0 (the Get Started button is disabled until the
  // box is ticked), so by the time Finish is reachable consent is guaranteed.
  // finish() still re-checks it as defence in depth.
  async function handleFinish() {
    try {
      await finish();
    } catch (err) {
      console.warn("[Fashionably Late] finish blocked:", err);
    }
  }

  return (
    <main className="oq-shell">
      {liveRegion}
      <div className="oq-progress" aria-hidden="true">
        <div
          className="oq-progress-bar"
          style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
        />
      </div>
      <p className="oq-step-count">
        Step {step + 1} of {STEP_COUNT}
      </p>

      {step === 0 && (
        <Welcome
          consentChecked={draft.consentChecked}
          onConsentChange={(consentChecked) => update({ consentChecked })}
          onGetStarted={next}
        />
      )}
      {step === 1 && (
        <TimezoneStep
          timezone={draft.timezone}
          timezoneSource={draft.timezoneSource}
          pinned={draft.pinnedTimezones}
          onChange={(timezone, timezoneSource) =>
            update({ timezone, timezoneSource })
          }
          onPinnedChange={(pinnedTimezones) => update({ pinnedTimezones })}
        />
      )}
      {step === 2 && (
        <WorkingHoursStep
          workingHours={draft.workingHours}
          onChange={(workingHours) => update({ workingHours })}
        />
      )}

      {step > 0 && (
        <div className="oq-nav">
          <button type="button" className="oq-secondary" onClick={back}>
            Back
          </button>
          {isLastStep ? (
            <button
              type="button"
              className="oq-primary"
              onClick={handleFinish}
              disabled={!canFinish}
            >
              Finish Setup
            </button>
          ) : (
            <button type="button" className="oq-primary" onClick={next}>
              Continue
            </button>
          )}
        </div>
      )}
    </main>
  );
}
