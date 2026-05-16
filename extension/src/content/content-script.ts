// OutboxIQ Gmail content script (PRD §7.1.2).
//
// On Gmail load, if onboarding isn't complete, ask the service worker to open
// it. The storage check runs here directly (content scripts can read
// chrome.storage); only the tab-open is delegated to the worker. The send is
// retried because a cold-started MV3 worker may not have its listener attached
// for the very first message — that race caused the earlier "receiving end
// does not exist" warning. Compose integration (§5.2) and the enhanced modal
// (§5.3) are the next responsibilities for this script.

import { isOnboardingComplete } from "../lib/storage";
import { MSG_OPEN_ONBOARDING } from "../lib/messages";

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

async function maybeLaunchOnboarding(): Promise<void> {
  try {
    if (await isOnboardingComplete()) return;
    await requestOnboardingLaunch();
  } catch (err) {
    // Never block or break Gmail (PRD §6.7) — fail silently.
    console.warn("[OutboxIQ] onboarding launch check skipped:", err);
  }
}

console.info("[OutboxIQ] content script loaded (scaffold)");
void maybeLaunchOnboarding();
