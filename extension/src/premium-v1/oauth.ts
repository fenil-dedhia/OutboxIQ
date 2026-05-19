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
} from "./oauth-config";
import {
  clearStoredAuth,
  getStoredAuth,
  isAuthValid,
  setStoredAuth,
  type StoredAuth,
} from "./auth-token";
// Phase-2 harness deps — STATIC imports (not dynamic import()). A dynamic
// import() inside the MV3 service worker pulls in Vite's DOM-assuming
// preload helper → `window is not defined` at runtime (Session-9 hands-on
// finding; the build's INEFFECTIVE_DYNAMIC_IMPORT warning was the tell).
// Static is SW-correct. The oauth↔timezone-cascade↔google-api cycle is
// benign (all uses are call-time, not module-init). These symbols are used
// ONLY inside the DEV/smoke block below, so the ship build tree-shakes them
// out of oauth.ts (timezone-cascade still ships — service-worker.ts imports
// it as real product code; smoke:check + the ship-strip check both re-verified).
import { resolveRecipientTimezone } from "./timezone-cascade";
import {
  clearRecipientCache,
  listCachedRecipients,
  setManualRecipientTimezone,
} from "../lib/recipient-cache";

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

/** Opaque random hex — used for both the CSRF `state` and the OIDC `nonce`
 * (distinct values, same generator; 128 bits each). */
function randomToken(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** base64url → JSON object, or null. SW-safe (`atob` is on the worker
 * global). Never throws. */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    let b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - (b64.length % 4)) % 4);
    const obj: unknown = JSON.parse(atob(b64));
    return obj && typeof obj === "object"
      ? (obj as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * The authenticated account's email, read from the Google ID token that
 * arrives in the SAME sign-in redirect (scopes `openid email`).
 *
 * Validation is **deliberately proportionate, NOT signature-level** — a
 * conscious, bounded decision (Entry-25), encoded so it is neither ripped
 * out as "insecure" nor over-trusted:
 *  - The id_token is delivered by Google directly to `chrome.identity`'s
 *    TLS redirect, in the same flow whose `state` we already verify.
 *  - We additionally bind it: `nonce` must equal what we sent (replay /
 *    injection guard, mirroring `state`), `aud` must be our Client ID,
 *    `iss` must be Google.
 *  - It is used ONLY as `login_hint` — a UX hint Google itself
 *    re-validates; an unrecognised/forged value is simply ignored and we
 *    fall back to the account chooser (today's accepted behaviour). It
 *    crosses NO trust boundary (Free v1 has no backend; no access is
 *    granted on its basis).
 * Full RS256/JWKS verification would add a JWKS fetch (new network + a new
 * host permission) and crypto for **zero** security benefit at this trust
 * level. Any failure → null → `login_hint` omitted → graceful re-prompt
 * (zero regression). Pure; never throws.
 */
function emailFromIdToken(
  idToken: string | null | undefined,
  expectedNonce: string,
): string | null {
  if (!idToken) return null;
  const p = decodeJwtPayload(idToken);
  if (!p) return null;
  if (p.nonce !== expectedNonce) return null;
  if (p.aud !== OAUTH_CLIENT_ID) return null;
  if (
    p.iss !== "https://accounts.google.com" &&
    p.iss !== "accounts.google.com"
  )
    return null;
  if (p.email_verified === false) return null;
  const email = p.email;
  return typeof email === "string" && email.includes("@") ? email.trim() : null;
}

function buildAuthUrl(
  redirectUri: string,
  state: string,
  nonce: string,
  interactive: boolean,
  loginHint: string | null,
): string {
  const p = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    // Implicit grant returning BOTH an access token (used as before) AND an
    // OpenID ID token (its `email` claim → `login_hint`; Entry 38 / Session-9
    // — People `people/me` is proven 403 for the caller's own email, the
    // id_token is the OIDC-correct, no-extra-call, no-extra-host source).
    // `nonce` is MANDATORY whenever an id_token is requested.
    response_type: "token id_token",
    scope: OAUTH_SCOPES.join(" "), // includes `openid` (oauth-config.ts)
    include_granted_scopes: "true",
    state,
    nonce,
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
  // login_hint fix for multi-account silent renewal (Entry 34 → Entry 38).
  // SILENT ONLY: the interactive attempt keeps `prompt=select_account` with
  // NO hint so a multi-account user always actively picks (Entry 29). On the
  // silent (`!interactive`) request a known `login_hint` is exactly what
  // lets Google pick the account with zero UI; without it multi-account
  // users re-prompt ~hourly. The hint is the account email read from the
  // id_token of a prior grant (emailFromIdToken). When unknown (null) it is
  // omitted → behaviour is exactly the documented graceful re-prompt; Google
  // ignores an unrecognised hint, so a stale value is harmless.
  if (!interactive && loginHint) p.set("login_hint", loginHint);
  return `${OAUTH_AUTH_ENDPOINT}?${p.toString()}`;
}

/** Parse the launchWebAuthFlow redirect. Implicit grant puts results in the
 * URL *fragment*; an error can arrive in the fragment or the query. */
function parseRedirect(redirectUrl: string):
  | {
      ok: true;
      accessToken: string;
      idToken: string | null;
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
    // Present because response_type includes `id_token`; absent is tolerated
    // (→ no login_hint, graceful — never fails the flow over a UX hint).
    idToken: frag.get("id_token"),
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
  // The previously-known account email. Used two ways: as the silent
  // `login_hint` (so renewal is invisible for multi-account users), and to
  // CARRY IT FORWARD onto the new record below so a silent renewal doesn't
  // discard it and re-resolve every hour. Best-effort read; absent ⇒ null.
  let priorEmail: string | null = null;
  try {
    priorEmail = (await getStoredAuth())?.grantedEmail ?? null;
  } catch {
    /* best-effort: no prior email ⇒ silent omits login_hint (today's path) */
  }

  const state = randomToken();
  const nonce = randomToken();
  const url = buildAuthUrl(redirectUri, state, nonce, interactive, priorEmail);

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

  // The account email comes from THIS redirect's id_token (validated against
  // the `nonce` we just sent). Prefer a carried-forward prior value so a
  // silent renewal that (legitimately) returns no id_token doesn't lose it.
  // Either way: no extra network call, no people/me, no extra host — the
  // email rode in on the sign-in response. Unknown ⇒ null ⇒ login_hint
  // omitted ⇒ graceful re-prompt (zero regression).
  const auth: StoredAuth = {
    accessToken: parsed.accessToken,
    expiresAt: Date.now() + Math.max(0, parsed.expiresInSec) * 1000,
    scopes: parsed.scope.split(/\s+/).filter(Boolean),
    grantedEmail: priorEmail ?? emailFromIdToken(parsed.idToken, nonce),
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
    /**
     * Session-9 Phase-3 IDENTITY PROBE (replaces the dead `testPeopleMe` —
     * People `people/me` proved 403 for the caller's own email even with
     * userinfo.email, Entry 38). Forces an interactive grant, then returns
     * the email parsed from the sign-in id_token + persisted to
     * StoredAuth.grantedEmail. **PASS = `grantedEmail` is your account
     * email** (was the unreachable goal of the whole sub-task). Then
     * `expireNow()` + `silent()` should renew with NO account chooser even
     * multi-account. Runbook: research/oauth-smoke.md "Phase 3".
     */
    whoami: async () => {
      const t = await getAccessToken({ interactive: true });
      if (!t.ok) return t;
      return {
        ok: true,
        grantedEmail: (await getStoredAuth())?.grantedEmail ?? null,
        scopes: (await getStoredAuth())?.scopes ?? null,
      };
    },
    // ── Session-9 Phase-2 cascade/cache probes ───────────────────────────
    // testPeople above only does a RAW People fetch; the Phase-2 matrix
    // (scenarios b–g) tests the actual §5.4.1 cascade + the recipient cache,
    // which are reached in production ONLY via MSG_RESOLVE_RECIPIENT_TZ (no
    // UI until the Session-10 §5.3.5 modal). These expose that contract to
    // the SW console so Phase 2 is runnable now. Use the STATIC imports
    // above (NOT dynamic import() — that broke in the SW; see the import
    // header). DCE'd from the ship build with the rest of this block.
    // Runbook: research/oauth-smoke.md "Phase 2".
    /** The real Session-9 contract: full cascade for `email`. */
    resolveTz: (email = "") => resolveRecipientTimezone(email),
    /** Inspect / clear / seed the recipient cache (scenarios d, e). */
    cache: {
      list: () => listCachedRecipients(),
      clear: () => clearRecipientCache(),
      /** Persist a manual pick, as the §5.3.7 picker will (scenario e). */
      setManual: (email: string, timezone: string) =>
        setManualRecipientTimezone(email, timezone),
    },
  };
  // Loud startup marker: if this line is in the service-worker console,
  // the smoke build is loaded and `__oqAuth` is available. Its ABSENCE
  // means Chrome is running stale/old code (Remove + reload — see
  // research/oauth-smoke.md). Unconditional within this block on purpose.
  console.info(
    "[Fashionably Late] ✅ OAuth smoke harness ready — type __oqAuth in this console",
  );
}
