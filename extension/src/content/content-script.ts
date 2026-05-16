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
// does not exist" warning. §5.3 (the enhanced modal) replaces the temporary
// placeholder seam below.

import { isOnboardingComplete } from "../lib/storage";
import { MSG_OPEN_ONBOARDING } from "../lib/messages";
import { installComposeIntegration } from "./compose/compose-integration";
import { openSchedulePlaceholder } from "./schedule-modal/placeholder";

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

async function bootstrap(): Promise<void> {
  try {
    if (await isOnboardingComplete()) {
      // PRD §5.2. Only after onboarding — pre-onboarding we leave Gmail
      // entirely untouched. Note: a tab already open from before onboarding
      // completed picks this up on its next Gmail load (acceptable MVP; a
      // live re-check is deliberately not built — see session debrief).
      installComposeIntegration({ onScheduleSend: openSchedulePlaceholder });
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
