// OAuth 2.0 client configuration (PRD §6.6, §7.5).
//
// Captured in Session 7 Phase 2 (GCP project `outboxiq-dev`, Testing mode,
// explicit test-user allowlist). This file is **pure config — no OAuth flow
// logic lives here yet**; the flow (chrome.identity.launchWebAuthFlow, token
// storage/refresh, the §5.4 recipient cascade) is the deferred Phase 3 /
// Session 8 work, gated by its own pre-implementation architecture review.
//
// WHERE THIS LIVES — a deliberate, surfaced decision (Session 7):
//  • A typed constants module, NOT an env var: the extension build is
//    client-side, so a build-time "secret" is not secret. For an installed
//    OAuth client Google's model treats the **Client ID as public by
//    design** — it is safe to commit and ship. (The Client *secret* is the
//    opposite: it is NOT in this repo and never should be — see §7.5; if a
//    confidential exchange is ever needed it happens server-side / via PKCE,
//    a Phase 3 decision.)
//  • NOT the manifest `oauth2` key: that key only drives
//    chrome.identity.getAuthToken, which cannot deliver the refresh tokens
//    PRD §7.5 and the backend require. We use a **Web application** OAuth
//    client + launchWebAuthFlow instead (owner decision, Session 7; see
//    notes/owner-decisions-log.md and CLAUDE.md).
//
// Brand-independent (CLAUDE.md "Locked tech decisions"): none of these
// values derive from the product name — a rebrand does not touch them.

/** Web-application OAuth 2.0 Client ID (public by design for installed
 * clients). GCP project `outboxiq-dev`. */
export const OAUTH_CLIENT_ID =
  "859685293675-5b9bok74iukllk8ge2h3plqn32kp4r8g.apps.googleusercontent.com";

/**
 * The redirect URI registered on the OAuth client. Built from the STABLE
 * pinned extension ID (manifest `key`; see manifest.config.ts). Kept here
 * for reference/registration parity ONLY — Phase 3 runtime code must derive
 * it via `chrome.identity.getRedirectURL()` (which returns exactly this)
 * rather than hard-coding, so the two can never silently drift.
 */
export const OAUTH_REDIRECT_URI =
  "https://dicnmcmhapcfceodecocnkaacjdpplnm.chromiumapp.org/";

/**
 * Minimum OAuth scopes (PRD §6.6). `directory.readonly` is intentionally
 * EXCLUDED here and from the consent screen — it is only needed for the
 * Workspace directory path, an additive Session 8 task; adding it now would
 * needlessly broaden the consent screen. `gmail.compose`/`gmail.modify` are
 * Google "restricted" scopes (the deferred CASA Tier 2 pre-launch item);
 * fully functional under Testing mode with the test-user allowlist.
 */
export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.settings.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];
