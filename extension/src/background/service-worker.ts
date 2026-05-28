// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Fashionably Late service worker (PRD §7.1.1).
//
// Owns opening the onboarding tab (PRD §5.1.2). It has the chrome.tabs API and
// SW-created tabs aren't popup-blocked. Triggered three ways for reliability:
//   1. Lifecycle events — fresh install / browser restart.
//   2. A message from the content script — covers "extension already
//      installed but not onboarded, and Gmail is open" (incl. the dev reload
//      button, which does NOT fire onInstalled).
//   3. Clicking the toolbar icon — a guaranteed user-gesture fallback.
//
// CONTENT-SCRIPT HOT-INJECTION ON INSTALL (post-Session-10 hands-on fix):
// Chrome MV3's static `content_scripts` manifest declaration does NOT
// retroactively inject into tabs that were ALREADY OPEN when the extension
// installs — it only fires on subsequent page loads. Without intervention,
// a user installing Fashionably Late with Gmail already open would see no
// behaviour until they manually refresh that tab. We use `chrome.scripting`
// (requires the `scripting` permission, added in manifest.config.ts) to
// inject the content script into every open Gmail tab on `onInstalled`,
// so the user's existing tabs hot-upgrade. The content script then sits
// quietly until the storage listener it just installed observes the
// onboarding-completed write (see content-script.ts).

import { ONBOARDING_PAGE_PATH } from "../lib/constants";
import { isOnboardingComplete } from "../lib/storage";
import {
  MSG_OPEN_ONBOARDING,
  MSG_OPEN_SETTINGS,
  MSG_RESOLVE_RECIPIENT_TZ,
  type RuntimeMessage,
  type ResolveRecipientTzResponse,
} from "../lib/messages";
// Free v1 has NO OAuth (owner-decisions-log Entry 39): no `import "./oauth"`,
// no chrome.identity, no Google API. The OAuth/People infrastructure is
// Premium-only and OUT OF SCOPE of this project (Entry 52) — a future
// Premium build lives in a separate private repo, not here.
//
// PRD §5.4 recipient-timezone resolution — Free v1 is cache → manual,
// purely local (no token, no network). Kept reachable via the message
// handler below for the §5.3.5 modal (Session 10); the handler is now
// token-free. (A later simplification could resolve this in-content and
// drop the bridge entirely — a §5.3.5 design call, not done here.)
import { resolveRecipientTimezone } from "./timezone-cascade";

if (import.meta.env.DEV) {
  console.info("[Fashionably Late] service worker active");
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
    console.warn("[Fashionably Late] could not open onboarding:", err);
  } finally {
    // Release shortly after, so a later legitimate reopen (e.g. the user
    // closed the tab without finishing) still works.
    setTimeout(() => {
      launching = false;
    }, 3000);
  }
}

/**
 * Inject the content script into every currently-open Gmail tab. Chrome
 * MV3's static `content_scripts` declaration only fires on future page
 * loads, so without this an already-open Gmail tab stays inert until the
 * user manually refreshes it. The content script's own bootstrap is
 * idempotent (storage-listener + latch) so a tab that ALSO loads the
 * static content script later won't double-install.
 *
 * Reads the file path from the live manifest so it never drifts from the
 * CRXJS-built hashed filename. Per-tab try/catch — some tabs may reject
 * injection (e.g. URLs not actually matching despite the query), and a
 * single rejection must not abort the rest.
 *
 * Fail-open: any setup failure (manifest read, permission missing, no
 * matching tabs) is logged and ignored — never break Gmail (§5.2.3).
 */
async function injectIntoOpenGmailTabs(): Promise<void> {
  try {
    const manifest = chrome.runtime.getManifest();
    const files = manifest.content_scripts?.[0]?.js ?? [];
    if (files.length === 0) {
      if (import.meta.env.DEV) {
        console.warn(
          "[Fashionably Late] hot-inject: no content_scripts.js in manifest",
        );
      }
      return;
    }
    const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
    if (import.meta.env.DEV) {
      console.info(
        `[Fashionably Late] hot-injecting into ${tabs.length} open Gmail tab(s)`,
      );
    }
    for (const tab of tabs) {
      if (tab.id == null) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files,
        });
      } catch (err) {
        // Per-tab: a single reject (e.g., a temporarily-uninjectable
        // page state) must not stop the others. Logged DEV-only so prod
        // doesn't accumulate console noise on edge tabs.
        if (import.meta.env.DEV) {
          console.info(
            `[Fashionably Late] hot-inject skip (tab ${tab.id}):`,
            err,
          );
        }
      }
    }
  } catch (err) {
    console.warn("[Fashionably Late] hot-inject setup failed:", err);
  }
}

// PRD §5.8.1 access point. Opens — or focuses, if already open — the Settings
// page. `openOptionsPage()` targets our manifest `options_page` (which IS the
// Settings page), so it needs no "tabs" permission (Entry-39 minimal footprint)
// and dedupes an already-open Settings tab for free.
async function openSettings(): Promise<void> {
  try {
    await chrome.runtime.openOptionsPage();
  } catch (err) {
    console.warn("[Fashionably Late] could not open settings:", err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void openOnboarding(false);
  void injectIntoOpenGmailTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void openOnboarding(false);
  // Re-inject on browser startup as well: in principle Chrome should
  // restore content scripts into restored Gmail tabs automatically, but
  // it's a tiny safety net for cases where it doesn't (e.g. tab
  // discarding / lazy restore) and the static content-script
  // declaration hasn't fired yet.
  void injectIntoOpenGmailTabs();
});

// Synchronous, top-level listener so a cold-started worker has it attached as
// early as possible. Returns false: fire-and-forget, no response channel.
chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message?.type === MSG_OPEN_ONBOARDING) void openOnboarding(false);
  // PRD §5.8.1: the Schedule Send modal's gear icon and the onboarding
  // completion screen ask the SW to open Settings (content scripts have no
  // openOptionsPage; routing both through here keeps one definition).
  if (message?.type === MSG_OPEN_SETTINGS) void openSettings();
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

// Toolbar-icon click (PRD §5.8.1): once onboarding is complete, the icon opens
// Settings; before that, it (re)opens onboarding — the guaranteed user-gesture
// entry point into setup. `force` so a finished-but-reopened onboarding still
// works pre-completion.
chrome.action.onClicked.addListener(() => {
  void (async () => {
    if (await isOnboardingComplete()) await openSettings();
    else await openOnboarding(true);
  })();
});
