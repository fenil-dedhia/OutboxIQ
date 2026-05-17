// OAuth 2.0 client configuration (PRD §6.6, §7.5).
//
// ─────────────────────────────────────────────────────────────────────────
// FREE v1 model — IMPLICIT GRANT, access-token-only, NO secret, NO backend.
// ─────────────────────────────────────────────────────────────────────────
// Free v1 (this code) uses `chrome.identity.launchWebAuthFlow` with
// `response_type=token` (the OAuth 2.0 implicit grant) against Google's
// auth endpoint. Google returns a short-lived ACCESS TOKEN directly in the
// redirect fragment — there is **no authorization-code exchange, no token
// endpoint call, and NO Client Secret anywhere in this extension**. The
// implicit grant inherently issues **no refresh token**, which is exactly
// the Free v1 contract (PRD §7.5): on expiry we silently re-run the flow.
// (Session 8 owner decision at the Entry-19 architecture review: implicit
// grant chosen over the originally-spec'd code+secret exchange — simpler,
// fewer failure modes, and ships zero confidential material. PRD §7.5/§6.5
// amended to match per Entry-6 discipline; owner-decisions-log Session 8.)
//
// PREMIUM_NOTES (tier-split discipline — do NOT build any of this now):
// Premium v1 switches to `access_type=offline` + the authorization-code
// flow, with the code→token exchange and the per-user-encrypted REFRESH
// token living **only on the backend** (PRD §13.3 "Option B"; the Client
// Secret is a backend env var there, never in the extension). That is a
// separate Premium build with its own design review — no refresh-token or
// backend-exchange scaffolding belongs in Free v1 code (YAGNI / Entry 22).
//
// WHERE THIS LIVES — a deliberate, surfaced decision (Session 7):
//  • A typed constants module, NOT an env var: the extension build is
//    client-side. For an installed OAuth client Google treats the
//    **Client ID as public by design** — safe to commit and ship. Under
//    the Free v1 implicit grant there is no Client *secret* at all, so the
//    old "secret is intentionally public / §6.5 exception" caveat no
//    longer applies to Free v1 (it only ever applied to the rejected
//    code+secret approach). §6.5's "secrets never in source" holds with no
//    exception here.
//  • NOT the manifest `oauth2` key: that key only drives
//    chrome.identity.getAuthToken, which silently uses the profile's
//    primary account (it cannot let a multi-account user pick which Google
//    account to authorize) and cannot serve Premium v1's offline grant. We
//    use a **Web application** OAuth client + launchWebAuthFlow instead
//    (owner decision, Session 7; see notes/owner-decisions-log.md Entry 29
//    and CLAUDE.md "Google Cloud / OAuth").
//
// Brand-independent (CLAUDE.md "Locked tech decisions"): none of these
// values derive from the product name — a rebrand does not touch them.

/** Web-application OAuth 2.0 Client ID (public by design for installed
 * clients). GCP project `outboxiq-dev`. */
export const OAUTH_CLIENT_ID =
  "859685293675-5b9bok74iukllk8ge2h3plqn32kp4r8g.apps.googleusercontent.com";

/**
 * Google's OAuth 2.0 authorization endpoint. The implicit grant returns the
 * access token in this endpoint's redirect fragment; Free v1 calls **no**
 * token endpoint (there is no code exchange — see the header).
 */
export const OAUTH_AUTH_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * The redirect URI registered on the OAuth client. Built from the STABLE
 * pinned extension ID (manifest `key`; see manifest.config.ts). Kept here
 * for reference/registration parity ONLY — runtime code MUST derive it via
 * `chrome.identity.getRedirectURL()` (which returns exactly this) rather
 * than hard-coding, so the two can never silently drift.
 */
export const OAUTH_REDIRECT_URI =
  "https://dicnmcmhapcfceodecocnkaacjdpplnm.chromiumapp.org/";

/**
 * Minimum OAuth scopes (PRD §6.6). `directory.readonly` is intentionally
 * EXCLUDED here and from the consent screen — it is only needed for the
 * Workspace directory path, an additive task; adding it now would
 * needlessly broaden the consent screen. `gmail.compose`/`gmail.modify` are
 * Google "restricted" scopes (the deferred CASA pre-launch item — Free v1
 * still needs *a* CASA assessment; see PRE_LAUNCH_CHECKLIST.md); fully
 * functional under Testing mode with the test-user allowlist.
 */
export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.settings.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];
