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
  // by using a Web-app client — Entry 29).
  //
  // Silent: `prompt=none` is REQUIRED for a real silent renewal. Without
  // it Google still renders an interstitial, which launchWebAuthFlow
  // ({interactive:false}) cannot show → it fails and the user gets
  // re-prompted every ~hour (the Session-8 hands-on smoke Test-D finding).
  // With `prompt=none` Google, when a session + prior consent exist,
  // 302s straight back with a fresh token and zero UI; otherwise it
  // redirects with `error=login_required|consent_required|
  // interaction_required`, which parseRedirect maps to needs_interactive
  // so getAccessToken cleanly escalates to an interactive prompt.
  p.set("prompt", interactive ? "select_account" : "none");
  // TODO(Phase 3 — owner-decisions-log Session 8, tracked sub-task):
  // multi-account users still re-prompt on silent renewal because Google
  // won't pick an account without a `login_hint`. When Phase 3 People API
  // resolves the authenticated user's email, add it here on the silent
  // (`!interactive`) request: `p.set("login_hint", grantedEmail)`. Until
  // then this is the OWNER-ACCEPTED v1 graceful degradation (PRD §7.5
  // Entry-6 amendment) — do NOT add an OAuth scope just to get the email
  // (PRD §6.6 minimal-scopes rule); it comes free from the §5.4 People
  // work. Wire it from the StoredAuth.grantedEmail field (already in the
  // shape, currently null).
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
    if (err === "access_denied") return { ok: false, reason: "denied" };
    // The `prompt=none` "needs a human" family → escalate to interactive.
    if (
      err === "login_required" ||
      err === "consent_required" ||
      err === "interaction_required" ||
      err === "account_selection_required"
    ) {
      return { ok: false, reason: "needs_interactive" };
    }
    return { ok: false, reason: "unknown" };
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

// ── Hands-on smoke harness (Entry 9) ───────────────────────────────────────
// Lets the owner verify Phase 2 from the service-worker console without any
// UI yet. Present in `npm run dev` AND the dedicated `npm run build:smoke`
// (a clean one-shot build — the CRXJS dev server proved too fragile for a
// non-technical/remote run). DEAD-CODE-ELIMINATED from a plain
// `npm run build`, so it can never reach a shippable artifact (both flags
// are statically false there). See research/oauth-smoke.md for the runbook.
if (import.meta.env.DEV || __OQ_SMOKE__) {
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
    /**
     * Prove the token works against Free v1's ONLY real API — People
     * `searchContacts` (Session-8 trim: Calendar scope/host removed, so
     * the old testCalendar probe is gone). Pass any contact's email,
     * e.g. `__oqAuth.testPeople("someone@example.com")`. status 200 ⇒
     * the contacts.readonly token + people.googleapis.com host both work
     * (the Session-9 cascade dependency).
     */
    testPeople: async (email = "") => {
      const t = await getAccessToken({ interactive: true });
      if (!t.ok) return t;
      const r = await fetch(
        "https://people.googleapis.com/v1/people:searchContacts" +
          `?query=${encodeURIComponent(email)}` +
          "&readMask=names,emailAddresses",
        { headers: { Authorization: `Bearer ${t.token}` } },
      );
      return { status: r.status, body: await r.json() };
    },
  };
  // Loud startup marker: if this line is in the service-worker console,
  // the smoke build is loaded and `__oqAuth` is available. Its ABSENCE
  // means Chrome is running stale/old code (Remove + reload — see
  // research/oauth-smoke.md). Unconditional within this block on purpose.
  console.info(
    "[OutboxIQ] ✅ OAuth smoke harness ready — type __oqAuth in this console",
  );
}
