import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccessToken } from "./oauth";
import {
  getStoredAuth,
  setStoredAuth,
  type StoredAuth,
} from "../lib/auth-token";
import { OAUTH_SCOPES } from "../lib/oauth-config";

type LaunchOpts = { url: string; interactive: boolean };

/** Build a Google-style implicit-grant redirect, echoing the request `state`
 * (the real CSRF round-trip the code verifies). */
function redirect(
  state: string | null,
  over: {
    accessToken?: string | null;
    scope?: string;
    expiresIn?: string;
  } = {},
): string {
  const f = new URLSearchParams();
  if (over.accessToken !== null)
    f.set("access_token", over.accessToken ?? "AT-123");
  f.set("token_type", "Bearer");
  f.set("expires_in", over.expiresIn ?? "3600");
  f.set("scope", over.scope ?? OAUTH_SCOPES.join(" "));
  if (state !== null) f.set("state", state);
  return `https://dicnmcmhapcfceodecocnkaacjdpplnm.chromiumapp.org/#${f.toString()}`;
}

function stateOf(url: string): string | null {
  return new URL(url).searchParams.get("state");
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
  it("silent success stores the token and uses response_type=token, no prompt", async () => {
    const launch = stubLaunch(async ({ url }) => redirect(stateOf(url)));
    const r = await getAccessToken();
    expect(r).toEqual({ ok: true, token: "AT-123" });
    const url = new URL(launch.mock.calls[0]![0].url);
    expect(url.searchParams.get("response_type")).toBe("token");
    expect(url.searchParams.get("client_id")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toContain("chromiumapp.org");
    expect(url.searchParams.get("scope")).toBe(OAUTH_SCOPES.join(" "));
    expect(url.searchParams.has("prompt")).toBe(false); // silent: no chooser
    const stored = await getStoredAuth();
    expect(stored?.accessToken).toBe("AT-123");
    expect(stored?.scopes).toEqual([...OAUTH_SCOPES]);
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
