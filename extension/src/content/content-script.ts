// OutboxIQ Gmail content script (PRD §7.1.2).
//
// On Gmail load: if onboarding isn't complete, ask the service worker to open
// it (and do nothing else — we must not enhance Gmail before the user has
// onboarded). If onboarding IS complete, install §5.2 compose integration.
//
// The storage check runs here directly (content scripts can read
// chrome.storage); only the tab-open is delegated to the worker. The send is
// retried because a cold-started MV3 worker may not have its listener attached
// for the very first message — that race caused the earlier "receiving end
// does not exist" warning.

import {
  getState,
  isOnboardingComplete,
  setLastScheduled,
} from "../lib/storage";
import { MSG_OPEN_ONBOARDING } from "../lib/messages";
import { installComposeIntegration } from "./compose/compose-integration";
import { openScheduleModal } from "./schedule-modal/mount";
import { openNativeScheduleDialog } from "./schedule-modal/schedule-actions";

const RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 4;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOnboardingLaunch(): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await chrome.runtime.sendMessage({ type: MSG_OPEN_ONBOARDING });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Only an unstarted worker is worth retrying. Any other outcome means
      // the message was delivered (or a real error) — retrying would risk a
      // duplicate onboarding tab.
      if (
        !/Receiving end does not exist|Could not establish connection/i.test(
          msg,
        )
      ) {
        return;
      }
      await delay(RETRY_DELAY_MS);
    }
  }
}

// §5.2 intercept → §5.3 modal. Sync (returns immediately); the async work
// is self-contained with its own fallback so it never strands the user: if
// reading state or mounting the modal fails, hand off to Gmail's own native
// scheduler (PRD §5.2.3 / §6.7).
function handleScheduleSend(): void {
  void (async () => {
    try {
      const state = await getState();
      openScheduleModal({
        timezone: state.user.timezone,
        lastScheduled: state.lastScheduled,
        onScheduled: (v) => {
          // Persist for the "Last scheduled time" row next open. Fire-and-
          // forget with a catch so a storage failure can't break the flow.
          void setLastScheduled(v).catch((e) => {
            if (import.meta.env.DEV) {
              console.warn("[OutboxIQ] persist lastScheduled failed:", e);
            }
          });
        },
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[OutboxIQ] §5.3 open failed → native:", err);
      }
      try {
        await openNativeScheduleDialog();
      } catch {
        /* native menu is still user-clickable; nothing more to do */
      }
    }
  })();
}

async function bootstrap(): Promise<void> {
  try {
    if (await isOnboardingComplete()) {
      // PRD §5.2. Only after onboarding — pre-onboarding we leave Gmail
      // entirely untouched. Note: a tab already open from before onboarding
      // completed picks this up on its next Gmail load (acceptable MVP; a
      // live re-check is deliberately not built — see session debrief).
      installComposeIntegration({ onScheduleSend: handleScheduleSend });
      return;
    }
    await requestOnboardingLaunch();
  } catch (err) {
    // Never block or break Gmail (PRD §6.7, §5.2.3) — fail silently.
    console.warn("[OutboxIQ] content bootstrap skipped:", err);
  }
}

if (import.meta.env.DEV) {
  console.info("[OutboxIQ] content script loaded");
}
void bootstrap();
