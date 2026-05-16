// OutboxIQ service worker (PRD §7.1.1).
//
// Owns opening the onboarding tab (PRD §5.1.2). It has the chrome.tabs API and
// SW-created tabs aren't popup-blocked. Triggered three ways for reliability:
//   1. Lifecycle events — fresh install / browser restart.
//   2. A message from the content script — covers "extension already
//      installed but not onboarded, and Gmail is open" (incl. the dev reload
//      button, which does NOT fire onInstalled).
//   3. Clicking the toolbar icon — a guaranteed user-gesture fallback.
// OAuth/token management and backend messaging are added just-in-time later.

import { ONBOARDING_PAGE_PATH } from "../lib/constants";
import { isOnboardingComplete } from "../lib/storage";
import { MSG_OPEN_ONBOARDING, type RuntimeMessage } from "../lib/messages";

if (import.meta.env.DEV) {
  console.info("[OutboxIQ] service worker active");
}

// In-memory guard so multiple Gmail tabs / retries don't stack onboarding
// tabs. Module scope resets when the worker restarts, which is fine.
let launching = false;

async function openOnboarding(force: boolean): Promise<void> {
  if (launching) return;
  launching = true;
  try {
    if (!force && (await isOnboardingComplete())) return;
    await chrome.tabs.create({
      url: chrome.runtime.getURL(ONBOARDING_PAGE_PATH),
    });
  } catch (err) {
    console.warn("[OutboxIQ] could not open onboarding:", err);
  } finally {
    // Release shortly after, so a later legitimate reopen (e.g. the user
    // closed the tab without finishing) still works.
    setTimeout(() => {
      launching = false;
    }, 3000);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void openOnboarding(false);
});

chrome.runtime.onStartup.addListener(() => {
  void openOnboarding(false);
});

// Synchronous, top-level listener so a cold-started worker has it attached as
// early as possible. Returns false: fire-and-forget, no response channel.
chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message?.type === MSG_OPEN_ONBOARDING) void openOnboarding(false);
  return false;
});

// Toolbar-icon click: always open onboarding (force) — a reliable manual entry
// point during development and a sensible action while the popup/settings
// surface (PRD §5.8.1) isn't built yet.
chrome.action.onClicked.addListener(() => {
  void openOnboarding(true);
});
