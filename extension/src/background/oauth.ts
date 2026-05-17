// Free v1 OAuth flow — implicit grant via chrome.identity.launchWebAuthFlow.
// Runs in the SERVICE WORKER ONLY (PRD §6.5: tokens never reach the page).
//
// Contract (PRD §7.5, Free v1): no Client Secret, no code exchange, no
// refresh token, no backend. `response_type=token` returns a short-lived
// access token in the redirect fragment; on expiry we silently re-run the
// flow (Chrome re-issues with no UI if the Google session + consent still
// hold). Every failure path is TYPED and non-throwing so OAuth can never
// block native Gmail or the existing extension paths (§5.2.3 / §6.7).
//
// PREMIUM_NOTES (tier-split discipline): Premium v1 replaces this with the
// backend Option-B code exchange (PRD §13.3). Nothing here pre-builds that —
// no refresh-token or backend hooks (YAGNI / owner-decisions-log Entry 22).

import {
  OAUTH_AUTH_ENDPOINT,
  OAUTH_CLIENT_ID,
  OAUTH_SCOPES,
} from "../lib/oauth-config";
import {
  clearStoredAuth,
  getStoredAuth,
  isAuthValid,
  setStoredAuth,
  type StoredAuth,
} from "../lib/auth-token";

/** Why a token could not be obtained. Drives §6.7 graceful degradation in
 * callers; never surfaced to the page. */
export type AuthFailure =
  | "needs_interactive" // valid token absent and silent re-auth not possible
  | "denied" // user dismissed / refused consent on the interactive screen
  | "network" // could not reach Google
  | "state_mismatch" // returned `state` ≠ sent (possible CSRF/replay) — discard
  | "no_token" // redirect carried no access_token (unexpected response)
  | "unknown";

export type TokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: AuthFailure };

type FlowResult =
  | { ok: true; auth: StoredAuth }
  | { ok: false; reason: AuthFailure };

function randomState(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildAuthUrl(
  redirectUri: string,
  state: string,
  interactive: boolean,
): string {
  const p = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "token", // implicit grant — access token in the fragment
    scope: OAUTH_SCOPES.join(" "),
    include_granted_scopes: "true",
    state,
  });
  // Interactive: force the account chooser so a multi-account user always
  // picks which Google account to authorize (the getAuthToken bug we avoid
  // by using a Web-app client — Entry 29). Silent: no `prompt`, so Google
  // may return a token with zero UI when a session+grant already exist.
  if (interactive) p.set("prompt", "select_account");
  return `${OAUTH_AUTH_ENDPOINT}?${p.toString()}`;
}

/** Parse the launchWebAuthFlow redirect. Implicit grant puts results in the
 * URL *fragment*; an error can arrive in the fragment or the query. */
function parseRedirect(redirectUrl: string):
  | {
      ok: true;
      accessToken: string;
      expiresInSec: number;
      scope: string;
      state: string | null;
    }
  | { ok: false; reason: AuthFailure } {
  let url: URL;
  try {
    url = new URL(redirectUrl);
  } catch {
    return { ok: false, reason: "no_token" };
  }
  const frag = new URLSearchParams(url.hash.replace(/^#/, ""));
  const err = frag.get("error") ?? url.searchParams.get("error");
  if (err) {
    return {
      ok: false,
      reason:
        err === "access_denied" || err === "interaction_required"
          ? "denied"
          : "unknown",
    };
  }
  const accessToken = frag.get("access_token");
  if (!accessToken) return { ok: false, reason: "no_token" };
  return {
    ok: true,
    accessToken,
    expiresInSec: Number(frag.get("expires_in") ?? "0"),
    scope: frag.get("scope") ?? OAUTH_SCOPES.join(" "),
    state: frag.get("state"),
  };
}

/** Classify a launchWebAuthFlow rejection. Chrome's messages aren't a stable
 * API; we only need the coarse buckets the control flow branches on. */
function classifyLaunchError(err: unknown, interactive: boolean): AuthFailure {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  // Silent attempt that needs UI → escalate to interactive (not a real error).
  if (!interactive) return "needs_interactive";
  if (
    msg.includes("did not approve") ||
    msg.includes("canceled") ||
    msg.includes("cancelled")
  )
    return "denied";
  if (msg.includes("could not be loaded") || msg.includes("network"))
    return "network";
  return "unknown";
}

async function runFlow(interactive: boolean): Promise<FlowResult> {
  let redirectUri: string;
  try {
    redirectUri = chrome.identity.getRedirectURL();
  } catch {
    return { ok: false, reason: "unknown" };
  }
  const state = randomState();
  const url = buildAuthUrl(redirectUri, state, interactive);

  let redirect: string | undefined;
  try {
    redirect = await chrome.identity.launchWebAuthFlow({ url, interactive });
  } catch (err) {
    return { ok: false, reason: classifyLaunchError(err, interactive) };
  }
  if (!redirect) return { ok: false, reason: "no_token" };

  const parsed = parseRedirect(redirect);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  // CSRF/replay guard: a returned state that doesn't match what we sent means
  // the redirect isn't ours — discard, never store its token (Entry 25).
  if (parsed.state !== state) return { ok: false, reason: "state_mismatch" };

  const auth: StoredAuth = {
    accessToken: parsed.accessToken,
    expiresAt: Date.now() + Math.max(0, parsed.expiresInSec) * 1000,
    scopes: parsed.scope.split(/\s+/).filter(Boolean),
    grantedEmail: null,
  };
  try {
    await setStoredAuth(auth);
  } catch {
    // Storing failed (quota/unexpected). The token is still usable for this
    // call; return it rather than failing the whole flow.
  }
  return { ok: true, auth };
}

/**
 * The single access-token entry point for the rest of the extension.
 *
 * Order: valid cached token → silent re-auth (no UI) → if `interactive`,
 * the Google screen → else a typed `needs_interactive`. Never throws; every
 * branch yields a typed result so callers degrade per §6.7 instead of
 * breaking Gmail (§5.2.3).
 *
 * Contract: a NON-interactive call has exactly TWO outcomes — `{ok:true}` or
 * `{ok:false, reason:"needs_interactive"}`. Any silent-flow failure (denied,
 * no_token, state_mismatch, network…) collapses to `needs_interactive`,
 * because the only correct caller response to a failed silent attempt is
 * "retry with UI". The GRANULAR reason is meaningful (and surfaced) only on
 * the terminal INTERACTIVE attempt, where it drives logging/diagnostics.
 * Callers on a §6.7 degradation path only need ok vs not.
 */
export async function getAccessToken(
  opts: { interactive?: boolean } = {},
): Promise<TokenResult> {
  const interactive = opts.interactive ?? false;
  try {
    const cached = await getStoredAuth();
    if (isAuthValid(cached, OAUTH_SCOPES, Date.now())) {
      return { ok: true, token: cached.accessToken };
    }

    const silent = await runFlow(false);
    if (silent.ok) return { ok: true, token: silent.auth.accessToken };

    if (!interactive) return { ok: false, reason: "needs_interactive" };

    const shown = await runFlow(true);
    if (shown.ok) return { ok: true, token: shown.auth.accessToken };
    return { ok: false, reason: shown.reason };
  } catch {
    // Defensive catch-all — getAccessToken must NEVER throw into a caller
    // that could be on a Gmail-blocking path.
    return { ok: false, reason: "unknown" };
  }
}

/** Drop the cached token (call on a 401 from a Google API so the next
 * getAccessToken() forces a fresh silent/interactive auth). Phase 3 API
 * helpers call this. Non-throwing. */
export async function invalidateStoredToken(): Promise<void> {
  try {
    await clearStoredAuth();
  } catch {
    /* best-effort */
  }
}

// ── DEV-only hands-on harness (Entry 9) ────────────────────────────────────
// Lets the owner verify Phase 2 from the service-worker console without any
// UI yet. Stripped from production builds (import.meta.env.DEV is false).
// See research/oauth-smoke.md for the runbook.
if (import.meta.env.DEV) {
  (self as unknown as { __oqAuth?: Record<string, unknown> }).__oqAuth = {
    /** Force the interactive flow (account chooser + consent). */
    authorize: () => getAccessToken({ interactive: true }),
    /** Silent-only attempt (no UI) — used to verify re-issue. */
    silent: () => getAccessToken({ interactive: false }),
    getStored: getStoredAuth,
    clear: invalidateStoredToken,
    /** Artificially expire the stored token to exercise silent re-auth. */
    expireNow: async () => {
      const a = await getStoredAuth();
      if (a) await setStoredAuth({ ...a, expiresAt: Date.now() - 1 });
      return getStoredAuth();
    },
    /** Prove the token works: fetch the Calendar user-timezone endpoint. */
    testCalendar: async () => {
      const t = await getAccessToken({ interactive: true });
      if (!t.ok) return t;
      const r = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/settings/timezone",
        { headers: { Authorization: `Bearer ${t.token}` } },
      );
      return { status: r.status, body: await r.json() };
    },
  };
}
