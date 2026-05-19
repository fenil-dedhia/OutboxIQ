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
 * Free v1 OAuth scope set — PRD §6.6 (Session-8 trim Entry 36; Session-9
 * `userinfo.email` addition, owner-decisions-log Entry 38).
 *
 * THREE scopes:
 *  1. `contacts.readonly` — the §5.4 recipient lookup (People
 *     `searchContacts`). Google **"sensitive"**, NOT "restricted".
 *  2. `userinfo.email` + 3. `openid` — together the **standard minimal
 *     OpenID identity set**, used to receive an **ID token in the
 *     sign-in redirect** whose `email` claim is the authenticated
 *     account's email, for `login_hint` so multi-account *silent* token
 *     renewal is invisible (Entry 34 limitation → Entry 38). Both Google
 *     **"non-sensitive"**. Session-9 hands-on PROVED People `people/me`
 *     returns 403 for the caller's own email even WITH `userinfo.email`
 *     (Google's docs were wrong — Entry-10, third time); the id_token
 *     path is the OIDC-correct source and needs **no extra API call and
 *     no new host permission** (the token arrives in the existing
 *     `chromiumapp.org` redirect). `openid` is added so the id_token is
 *     requested OIDC-correctly rather than relying on Google implicitly
 *     adding it — same Entry-38 decision, correctly implemented.
 *
 * All three are sensitive-or-lighter; **none is restricted**, so the CASA
 * posture is unchanged — `contacts.readonly` already drives the
 * sensitive-scope consent-screen verification; non-sensitive scopes add
 * nothing to that (PRE_LAUNCH_CHECKLIST.md). The identity-scope addition
 * is **evidence-driven, not speculative** (the owner-decided Entry-38
 * response to the proven 403), not a relaxation of the Entry-36
 * minimisation principle (which forbids *over-asking*, not a justified
 * intent-matching addition).
 *
 * Still deliberately NOT requested (zero Free v1 consumers):
 * `gmail.compose`/`gmail.modify` (Schedule Send is DOM automation; Gmail
 * cancel is Premium §13), `calendar.settings.readonly` (§5.1.3 amendment
 * — browser tz is the v1 source), `directory.readonly` (only the
 * deferred Workspace Directory path, §5.4.1 step 3, would add it,
 * incrementally, for Workspace users). Adding any **restricted** scope
 * later is an explicit re-evaluation, never speculative. PREMIUM_NOTES:
 * Premium v1's backend (§13) requests the Gmail scopes its server-side
 * Unschedule-on-Reply needs — Premium-tier, never added to this list.
 */
export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];
