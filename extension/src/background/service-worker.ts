// OutboxIQ service worker (PRD §7.1.1).
//
// Owns opening the onboarding tab (PRD §5.1.2). It has the chrome.tabs API and
// SW-created tabs aren't popup-blocked. Triggered three ways for reliability:
//   1. Lifecycle events — fresh install / browser restart.
//   2. A message from the content script — covers "extension already
//      installed but not onboarded, and Gmail is open" (incl. the dev reload
//      button, which does NOT fire onInstalled).
//   3. Clicking the toolbar icon — a guaranteed user-gesture fallback.

import { ONBOARDING_PAGE_PATH } from "../lib/constants";
import { isOnboardingComplete } from "../lib/storage";
import {
  MSG_OPEN_ONBOARDING,
  MSG_RESOLVE_RECIPIENT_TZ,
  type RuntimeMessage,
  type ResolveRecipientTzResponse,
} from "../lib/messages";
// Free v1 OAuth (PRD §7.5). Side-effect import: loading the module in the
// SERVICE-WORKER context is what makes OAuth actually run where
// chrome.identity lives (§6.5 — never the page) and what attaches the
// DEV/smoke `__oqAuth` console harness (research/oauth-smoke.md).
import "./oauth";
// PRD §5.4 recipient-timezone cascade (SW-side — needs the token). The
// Session-9 §5.3.5 modal reaches it ONLY through the message handler below.
import { resolveRecipientTimezone } from "./timezone-cascade";

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

// PRD §5.4 — recipient-timezone resolution for the Session-9 §5.3.5 modal.
// Separate listener so it can keep the response channel open (returns
// `true`). It NEVER rejects: resolveRecipientTimezone already degrades to
// `manual_needed` on every failure (§6.7), and an unexpected throw still
// answers `manual_needed` so the content script is never left hanging and
// Gmail is never blocked (§5.2.3).
chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender,
    sendResponse: (r: ResolveRecipientTzResponse) => void,
  ) => {
    if (message?.type !== MSG_RESOLVE_RECIPIENT_TZ) return false;
    resolveRecipientTimezone(message.email)
      .then(sendResponse)
      .catch(() => sendResponse({ source: "manual_needed", timezone: null }));
    return true; // async response
  },
);

// Toolbar-icon click: always open onboarding (force) — a reliable manual entry
// point during development and a sensible action while the popup/settings
// surface (PRD §5.8.1) isn't built yet.
chrome.action.onClicked.addListener(() => {
  void openOnboarding(true);
});
