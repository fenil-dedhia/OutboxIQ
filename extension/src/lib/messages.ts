// Typed message contract between the content script and the service worker.
// Content scripts can't open extension tabs (no chrome.tabs), so they ask the
// service worker to do it.

export const MSG_OPEN_ONBOARDING = "OUTBOXIQ_OPEN_ONBOARDING" as const;

export interface OpenOnboardingMessage {
  type: typeof MSG_OPEN_ONBOARDING;
}

export type RuntimeMessage = OpenOnboardingMessage;
