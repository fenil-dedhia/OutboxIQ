// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Fashionably Late Gmail content script (PRD §7.1.2).
//
// On Gmail load: if onboarding isn't complete, ask the service worker to open
// it (and do nothing else — we must not enhance Gmail before the user has
// onboarded). If onboarding IS complete, install §5.2 compose integration.
//
// LIVE ONBOARDING-COMPLETE UPGRADE (added post-Session-10 hands-on):
// `chrome.storage.onChanged` subscription means a Gmail tab that was open
// BEFORE the user finished onboarding (in a separate tab) upgrades the
// moment the onboarding "Finish Setup" write lands — no Gmail refresh
// required. Same pattern `config-cache.ts` already uses to keep the §5.5.1
// snapshot fresh. `integrationsInstalled` latches so the listener is a
// no-op once integration is wired up (subsequent state changes are
// already routed through `startConfigWatch`'s own listener).
//
// The storage check runs here directly (content scripts can read
// chrome.storage); only the tab-open is delegated to the worker. The send is
// retried because a cold-started MV3 worker may not have its listener attached
// for the very first message — that race caused the earlier "receiving end
// does not exist" warning.

import { getState, setLastScheduled } from "../lib/storage";
import type { LastScheduled, OutboxIQState } from "../lib/storage";
import { STORAGE_KEY_STATE } from "../lib/constants";
import { MSG_OPEN_ONBOARDING } from "../lib/messages";
import { installComposeIntegration } from "./compose/compose-integration";
import { readComposeRecipients } from "./compose/compose-recipients";
import { openScheduleModal } from "./schedule-modal/mount";
import { openNativeScheduleDialog } from "./schedule-modal/schedule-actions";
import { installRegularSendGuard } from "./regular-send/regular-send-guard";
import { startConfigWatch } from "./regular-send/config-cache";
import { claimPageOwnership } from "./page-install-latch";

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

/** Hand off to Gmail's own native scheduler (PRD §5.2.3 / §6.7). Used both
 * when opening the modal fails synchronously and when it throws during React
 * render (the ErrorBoundary → onRenderError path). The multi-compose safety
 * net guarantees single-compose by the time the modal renders, so the global
 * chevron query in openNativeScheduleDialog() is unambiguous here. */
function openNativeFallback(): void {
  void openNativeScheduleDialog().catch(() => {
    /* native menu is still user-clickable; nothing more to do */
  });
}

// Persist the just-scheduled time so it becomes the "Last scheduled time"
// row next open (PRD §5.3.3 amendment). Fire-and-forget with a catch so a
// storage failure can't break the flow. Shared by the §5.3 modal and the
// §5.5.1 snap path so they persist identically.
function persistLastScheduled(v: LastScheduled): void {
  void setLastScheduled(v).catch((e) => {
    if (import.meta.env.DEV) {
      console.warn("[Fashionably Late] persist lastScheduled failed:", e);
    }
  });
}

// §5.2 intercept → §5.3 modal. Sync (returns immediately); the async work
// is self-contained with its own fallback so it never strands the user: if
// reading state, mounting, OR rendering the modal fails, hand off to Gmail's
// own native scheduler (PRD §5.2.3 / §6.7).
function handleScheduleSend(): void {
  void (async () => {
    try {
      const state = await getState();
      // PRD §5.3.5 (b): snapshot the compose's To+CC at open time. BCC is
      // excluded inside readComposeRecipients per spec; an empty array
      // (no recipients yet OR §6.7 DOM-read fail-open) means the modal
      // simply hides the Optimize section.
      const recipients = readComposeRecipients();
      openScheduleModal({
        timezone: state.user.timezone,
        workingHours: state.workingHours,
        lastScheduled: state.lastScheduled,
        recipients,
        // §5.1.3 Step 2: surface the user's pinned zones in the cache-miss
        // timezone picker (§5.3.5 (i)).
        pinnedTimezones: state.pinnedTimezones,
        // §5.8.2 Feature toggle: when off, the §5.3.5 Optimize section is
        // hidden (read fresh per open, so toggling in Settings takes effect on
        // the next Schedule Send — no Gmail refresh).
        optimizeEnabled: state.featureToggles.recipientOptimization,
        onScheduled: persistLastScheduled,
        // Render-time throw inside the modal (async to this try/catch) —
        // ErrorBoundary tears the host down and routes here (§5.2.3).
        onRenderError: openNativeFallback,
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[Fashionably Late] §5.3 open failed → native:", err);
      }
      openNativeFallback();
    }
  })();
}

// Latches the post-onboarding install so the storage listener can be a no-op
// once integration is wired up. Module-scoped — dedupes WITHIN this instance.
// Cross-INSTANCE coordination (an orphaned-after-reload instance + a re-injected
// one sharing one tab) is handled by page OWNERSHIP: this instance claims it,
// and every handler checks isCurrentOwner() so only the newest live instance
// acts. See page-install-latch.ts.
let integrationsInstalled = false;

/** Install §5.2 / §5.5.1 / §5.3 integrations against the just-read state.
 * Idempotent WITHIN this instance (`integrationsInstalled`); ACROSS instances
 * in the same tab, page ownership (`claimPageOwnership` + the handlers'
 * isCurrentOwner() checks) ensures only the newest live instance acts. Returns
 * true iff integrations are in place (so bootstrap skips the onboarding-launch
 * fallback). */
function enableIntegrationsIfOnboarded(state: OutboxIQState): boolean {
  if (integrationsInstalled) return true;
  if (state.user.onboardingCompletedAt === null) return false;
  // Become the active instance for this tab (last-writer-wins). A previously
  // loaded copy orphaned by an extension reload keeps its document listeners,
  // but every §5.2/§5.5.1 handler checks isCurrentOwner() and goes inert once
  // we claim here / once its context dies — so only THIS newest live copy acts.
  // Claim BEFORE installing so our handlers own the page the instant they exist.
  claimPageOwnership();
  installComposeIntegration({ onScheduleSend: handleScheduleSend });
  startConfigWatch({
    timezone: state.user.timezone,
    workingHours: state.workingHours,
    // §5.8.2 Feature toggle: when off, the §5.5.1 regular-Send guard does not
    // intercept (config-cache refreshes on storage change, so the toggle takes
    // effect live).
    autoRescheduleOnOutsideHours:
      state.featureToggles.autoRescheduleOnOutsideHours,
  });
  installRegularSendGuard({ onScheduled: persistLastScheduled });
  integrationsInstalled = true;
  return true;
}

/** Re-read state and try to enable; the listener path (post-onboarding).
 * Goes through getState() so default-merge / future schema migration
 * applies — same discipline as config-cache.ts. */
async function tryEnableIntegrations(): Promise<void> {
  if (integrationsInstalled) return;
  try {
    const state = await getState();
    enableIntegrationsIfOnboarded(state);
  } catch {
    /* §6.7 — never throw into Gmail; next storage change will retry */
  }
}

async function bootstrap(): Promise<void> {
  try {
    // Subscribe FIRST. If we subscribed AFTER the initial getState() the
    // onboarding-complete write could land in that window and we'd miss
    // it (rare, but the listener is cheap). The latch keeps it idempotent
    // — once integrations are installed the listener is a no-op.
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (!changes[STORAGE_KEY_STATE]) return;
        void tryEnableIntegrations();
      });
    } catch {
      /* environments without chrome.storage.onChanged (tests) — initial
       * read below still works; just no live-upgrade in that env */
    }

    // One read: derive onboarding-complete AND seed the §5.5.1 config cache
    // from the same snapshot.
    const state = await getState();
    if (enableIntegrationsIfOnboarded(state)) return;
    // Not onboarded → open onboarding. The storage listener above will
    // pick up "Finish Setup" the moment it writes — Gmail tab upgrades
    // live, no refresh required.
    await requestOnboardingLaunch();
  } catch (err) {
    // Never block or break Gmail (PRD §6.7, §5.2.3) — fail silently.
    console.warn("[Fashionably Late] content bootstrap skipped:", err);
  }
}

if (import.meta.env.DEV) {
  console.info("[Fashionably Late] content script loaded");
}
void bootstrap();
