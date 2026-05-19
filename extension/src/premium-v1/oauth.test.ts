import { describe, it, expect, vi, beforeEach } from "vitest";

import { getAccessToken } from "./oauth";
import {
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
  type StoredAuth,
} from "./auth-token";
import { OAUTH_CLIENT_ID, OAUTH_SCOPES } from "./oauth-config";

function loginHintOf(url: string): string | null {
  return new URL(url).searchParams.get("login_hint");
}
function stateOf(url: string): string | null {
  return new URL(url).searchParams.get("state");
}
function nonceOf(url: string): string {
  return new URL(url).searchParams.get("nonce") ?? "";
}

/** Build a Google-style OIDC id_token (header.payload.sig — sig is ignored
 * by design; see emailFromIdToken's documented proportionate validation).
 * Defaults are a VALID token for the given nonce; override to test guards. */
function mkIdToken(over: {
  email?: string | null;
  emailVerified?: boolean;
  aud?: string;
  iss?: string;
  nonce?: string;
}): string {
  const payload: Record<string, unknown> = {
    iss: over.iss ?? "https://accounts.google.com",
    aud: over.aud ?? OAUTH_CLIENT_ID,
    nonce: over.nonce ?? "",
  };
  if (over.email !== null) payload.email = over.email ?? "me@gmail.com";
  if (over.emailVerified !== undefined)
    payload.email_verified = over.emailVerified;
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "RS256" })}.${b64(payload)}.sig`;
}

type LaunchOpts = { url: string; interactive: boolean };

/** Build a Google-style implicit-grant redirect, echoing `state`. Pass
 * `over.idToken` (claims) to also include an id_token in the fragment. */
function redirect(
  state: string | null,
  over: {
    accessToken?: string | null;
    scope?: string;
    expiresIn?: string;
    idToken?: Parameters<typeof mkIdToken>[0];
  } = {},
): string {
  const f = new URLSearchParams();
  if (over.accessToken !== null)
    f.set("access_token", over.accessToken ?? "AT-123");
  f.set("token_type", "Bearer");
  f.set("expires_in", over.expiresIn ?? "3600");
  f.set("scope", over.scope ?? OAUTH_SCOPES.join(" "));
  if (state !== null) f.set("state", state);
  if (over.idToken) f.set("id_token", mkIdToken(over.idToken));
  return `https://dicnmcmhapcfceodecocnkaacjdpplnm.chromiumapp.org/#${f.toString()}`;
}

function stubLaunch(impl: (o: LaunchOpts) => Promise<string>) {
  const fn = vi.fn(impl);
  (
    chrome.identity as unknown as { launchWebAuthFlow: typeof fn }
  ).launchWebAuthFlow = fn;
  return fn;
}

const fresh = (over: Partial<StoredAuth> = {}): StoredAuth => ({
  accessToken: "cached",
  expiresAt: Date.now() + 3_600_000,
  scopes: [...OAUTH_SCOPES],
  grantedEmail: null,
  ...over,
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getAccessToken — cache", () => {
  it("returns the cached token without launching a flow", async () => {
    await setStoredAuth(fresh());
    const launch = stubLaunch(async () => redirect("x"));
    const r = await getAccessToken({ interactive: true });
    expect(r).toEqual({ ok: true, token: "cached" });
    expect(launch).not.toHaveBeenCalled();
  });

  it("expired cached token triggers a silent re-auth", async () => {
    await setStoredAuth(
      fresh({ expiresAt: Date.now() - 1, accessToken: "old" }),
    );
    const launch = stubLaunch(async ({ url }) => redirect(stateOf(url)));
    const r = await getAccessToken();
    expect(r).toEqual({ ok: true, token: "AT-123" });
    expect(launch).toHaveBeenCalledOnce();
    expect(launch.mock.calls[0]![0].interactive).toBe(false);
  });
});

describe("getAccessToken — silent then interactive escalation", () => {
  it("silent success uses response_type=token id_token + nonce + prompt=none and stores the token", async () => {
    const launch = stubLaunch(async ({ url }) => redirect(stateOf(url)));
    const r = await getAccessToken();
    expect(r).toEqual({ ok: true, token: "AT-123" });
    const url = new URL(launch.mock.calls[0]![0].url);
    // id_token is requested so login_hint's email can ride in on the
    // sign-in response (Entry 38); `nonce` is mandatory with id_token.
    expect(url.searchParams.get("response_type")).toBe("token id_token");
    expect(url.searchParams.get("nonce")).toBeTruthy();
    expect(url.searchParams.get("client_id")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toContain("chromiumapp.org");
    expect(url.searchParams.get("scope")).toBe(OAUTH_SCOPES.join(" "));
    // Silent renewal MUST be prompt=none (Session-8 Test-D fix) so Google
    // returns a token with zero UI; without it launchWebAuthFlow silent
    // fails and the user is re-prompted ~hourly.
    expect(url.searchParams.get("prompt")).toBe("none");
    const stored = await getStoredAuth();
    expect(stored?.accessToken).toBe("AT-123");
    expect(stored?.scopes).toEqual([...OAUTH_SCOPES]);
  });

  it("a prompt=none silent failure (login_required) escalates to needs_interactive", async () => {
    // Real silent-renewal failure shape: Google 302s back with
    // ?error=login_required (NOT a launchWebAuthFlow rejection).
    stubLaunch(async ({ url, interactive }) => {
      if (!interactive)
        return "https://dicnmcmhapcfceodecocnkaacjdpplnm.chromiumapp.org/?error=login_required";
      return redirect(stateOf(url)); // interactive then succeeds
    });
    const escalated = await getAccessToken({ interactive: true });
    expect(escalated).toEqual({ ok: true, token: "AT-123" });
    // The successful escalation cached a token — clear it so the next
    // assertion exercises a *fresh* silent attempt, not the cache.
    await clearStoredAuth();
    // With interactive:false, a login_required silent failure stays a
    // clean needs_interactive (the two-outcome silent contract).
    const r = await getAccessToken({ interactive: false });
    expect(r).toEqual({ ok: false, reason: "needs_interactive" });
  });

  it("silent fail + interactive:false → needs_interactive, nothing stored", async () => {
    stubLaunch(async ({ interactive }) => {
      if (!interactive) throw new Error("User interaction required.");
      return redirect("should-not-reach");
    });
    const r = await getAccessToken({ interactive: false });
    expect(r).toEqual({ ok: false, reason: "needs_interactive" });
    expect(await getStoredAuth()).toBeNull();
  });

  it("silent fail + interactive:true → shows chooser (prompt=select_account) and succeeds", async () => {
    const launch = stubLaunch(async ({ url, interactive }) => {
      if (!interactive) throw new Error("User interaction required.");
      return redirect(stateOf(url));
    });
    const r = await getAccessToken({ interactive: true });
    expect(r).toEqual({ ok: true, token: "AT-123" });
    const interactiveCall = launch.mock.calls.find((c) => c[0].interactive)!;
    expect(new URL(interactiveCall[0].url).searchParams.get("prompt")).toBe(
      "select_account",
    );
  });
});

describe("getAccessToken — failure classification (never throws)", () => {
  it("interactive denial → reason 'denied'", async () => {
    stubLaunch(async ({ interactive }) => {
      if (!interactive) throw new Error("User interaction required.");
      throw new Error("The user did not approve access.");
    });
    expect(await getAccessToken({ interactive: true })).toEqual({
      ok: false,
      reason: "denied",
    });
  });

  // Granular reasons are terminal on the INTERACTIVE attempt. A non-
  // interactive call intentionally collapses every silent failure to
  // `needs_interactive` (the two-outcome silent contract — see oauth.ts
  // getAccessToken doc), so these exercise the interactive path where the
  // specific classification is what callers/log see.
  it("state mismatch → 'state_mismatch' and the token is NOT stored", async () => {
    stubLaunch(async ({ interactive }) => {
      if (!interactive) throw new Error("User interaction required.");
      return redirect("attacker-state"); // wrong state on the real attempt
    });
    const r = await getAccessToken({ interactive: true });
    expect(r).toEqual({ ok: false, reason: "state_mismatch" });
    expect(await getStoredAuth()).toBeNull();
  });

  it("redirect without access_token → 'no_token'", async () => {
    stubLaunch(async ({ url, interactive }) => {
      if (!interactive) throw new Error("User interaction required.");
      return redirect(stateOf(url), { accessToken: null });
    });
    expect(await getAccessToken({ interactive: true })).toEqual({
      ok: false,
      reason: "no_token",
    });
  });

  it("does not throw if launchWebAuthFlow throws a non-Error", async () => {
    // Reject with a non-Error value (Promise.reject avoids the
    // only-throw-error lint while still exercising the String(err) path).
    stubLaunch(() => Promise.reject("boom") as Promise<string>);
    const r = await getAccessToken({ interactive: true });
    expect(r.ok).toBe(false);
  });
});

// Session-9 Phase 3 — multi-account silent renewal fix (login_hint).
describe("getAccessToken — login_hint (silent renewal, Phase 3)", () => {
  it("passes login_hint on the SILENT request when the account email is known", async () => {
    await setStoredAuth(
      fresh({ expiresAt: Date.now() - 1, grantedEmail: "known@gmail.com" }),
    );
    const launch = stubLaunch(async ({ url }) => redirect(stateOf(url)));
    const r = await getAccessToken();
    expect(r).toEqual({ ok: true, token: "AT-123" });
    const silentCall = launch.mock.calls.find((c) => !c[0].interactive)!;
    expect(loginHintOf(silentCall[0].url)).toBe("known@gmail.com");
  });

  it("carries grantedEmail forward across a silent renewal (not reset to null)", async () => {
    await setStoredAuth(
      fresh({
        expiresAt: Date.now() - 1,
        accessToken: "old",
        grantedEmail: "known@gmail.com",
      }),
    );
    stubLaunch(async ({ url }) => redirect(stateOf(url)));
    await getAccessToken();
    const stored = await getStoredAuth();
    expect(stored?.accessToken).toBe("AT-123"); // renewed
    expect(stored?.grantedEmail).toBe("known@gmail.com"); // preserved
  });

  it("omits login_hint on the silent request when the account email is unknown", async () => {
    await setStoredAuth(
      fresh({ expiresAt: Date.now() - 1, grantedEmail: null }),
    );
    const launch = stubLaunch(async ({ url }) => redirect(stateOf(url)));
    await getAccessToken();
    const silentCall = launch.mock.calls.find((c) => !c[0].interactive)!;
    expect(loginHintOf(silentCall[0].url)).toBeNull();
  });

  it("persists grantedEmail from the sign-in id_token after an interactive grant (no extra call)", async () => {
    const launch = stubLaunch(async ({ url, interactive }) => {
      if (!interactive) throw new Error("User interaction required.");
      return redirect(stateOf(url), {
        idToken: { email: "me@gmail.com", nonce: nonceOf(url) },
      });
    });
    const r = await getAccessToken({ interactive: true });
    expect(r).toEqual({ ok: true, token: "AT-123" });
    expect((await getStoredAuth())?.grantedEmail).toBe("me@gmail.com");
    // The interactive attempt itself NEVER carries login_hint — a
    // multi-account user must actively pick (Entry 29, prompt=select_account).
    const interactiveCall = launch.mock.calls.find((c) => c[0].interactive)!;
    expect(loginHintOf(interactiveCall[0].url)).toBeNull();
  });

  it("no id_token in the redirect → grantedEmail null, token still ok (graceful)", async () => {
    stubLaunch(async ({ url, interactive }) => {
      if (!interactive) throw new Error("User interaction required.");
      return redirect(stateOf(url)); // no idToken
    });
    const r = await getAccessToken({ interactive: true });
    expect(r).toEqual({ ok: true, token: "AT-123" }); // token unaffected
    expect((await getStoredAuth())?.grantedEmail).toBeNull();
  });

  // emailFromIdToken's proportionate guards, exercised through the real flow.
  it.each([
    ["wrong nonce", { email: "x@gmail.com", nonce: "not-the-sent-nonce" }],
    ["wrong aud", { email: "x@gmail.com", aud: "someone-else.apps" }],
    ["non-Google iss", { email: "x@gmail.com", iss: "https://evil.example" }],
    ["email_verified:false", { email: "x@gmail.com", emailVerified: false }],
  ] as const)(
    "rejects an id_token with %s → grantedEmail null (token still ok)",
    async (_label, claims) => {
      stubLaunch(async ({ url, interactive }) => {
        if (!interactive) throw new Error("User interaction required.");
        return redirect(stateOf(url), {
          idToken: { nonce: nonceOf(url), ...claims },
        });
      });
      const r = await getAccessToken({ interactive: true });
      expect(r).toEqual({ ok: true, token: "AT-123" });
      expect((await getStoredAuth())?.grantedEmail).toBeNull();
    },
  );
});
