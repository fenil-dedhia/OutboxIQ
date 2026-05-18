// Typed message contract between the content script and the service worker.
// Content scripts can't open extension tabs (no chrome.tabs), so they ask the
// service worker to do it.

export const MSG_OPEN_ONBOARDING = "OUTBOXIQ_OPEN_ONBOARDING" as const;

export interface OpenOnboardingMessage {
  type: typeof MSG_OPEN_ONBOARDING;
}

// PRD §5.4 recipient-timezone cascade. The Session-9 §5.3.5 modal lives in
// the content script and CANNOT call the SW-side cascade directly (the
// token must stay in the SW — §6.5), so this message IS the Session-9
// contract surface. Response mirrors `RecipientTimezone` structurally
// (defined here, not imported from background/, to keep the lib→background
// layering one-directional).
export const MSG_RESOLVE_RECIPIENT_TZ =
  "OUTBOXIQ_RESOLVE_RECIPIENT_TZ" as const;

export interface ResolveRecipientTzMessage {
  type: typeof MSG_RESOLVE_RECIPIENT_TZ;
  email: string;
}

export type ResolveRecipientTzResponse =
  | { source: "cache" | "people_api" | "directory"; timezone: string }
  | { source: "manual_needed"; timezone: null };

export type RuntimeMessage = OpenOnboardingMessage | ResolveRecipientTzMessage;
