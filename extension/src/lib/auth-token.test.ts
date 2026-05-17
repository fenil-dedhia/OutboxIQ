import { describe, it, expect } from "vitest";
import {
  EXPIRY_SKEW_MS,
  clearStoredAuth,
  getStoredAuth,
  isAuthValid,
  setStoredAuth,
  type StoredAuth,
} from "./auth-token";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.settings.readonly",
];

function auth(over: Partial<StoredAuth> = {}): StoredAuth {
  return {
    accessToken: "tok",
    expiresAt: 10_000_000,
    scopes: [...SCOPES],
    grantedEmail: null,
    ...over,
  };
}

describe("auth-token storage round-trip", () => {
  it("get returns null when nothing stored", async () => {
    expect(await getStoredAuth()).toBeNull();
  });

  it("set then get returns the same record; clear removes it", async () => {
    await setStoredAuth(auth());
    expect(await getStoredAuth()).toEqual(auth());
    await clearStoredAuth();
    expect(await getStoredAuth()).toBeNull();
  });
});

describe("isAuthValid (PRD §7.5 — pure, caller passes now)", () => {
  it("false for null / empty token", () => {
    expect(isAuthValid(null, SCOPES, 0)).toBe(false);
    expect(isAuthValid(auth({ accessToken: "" }), SCOPES, 0)).toBe(false);
  });

  it("true well before expiry with all required scopes", () => {
    expect(isAuthValid(auth({ expiresAt: 1_000_000 }), SCOPES, 0)).toBe(true);
  });

  it("treats a token inside the skew window as expired", () => {
    const expiresAt = 1_000_000;
    // exactly at the skew boundary → expired (>=)
    expect(
      isAuthValid(auth({ expiresAt }), SCOPES, expiresAt - EXPIRY_SKEW_MS),
    ).toBe(false);
    // a hair before the skew window → still valid
    expect(
      isAuthValid(auth({ expiresAt }), SCOPES, expiresAt - EXPIRY_SKEW_MS - 1),
    ).toBe(true);
  });

  it("false when a required scope is missing (scope upgrade forces re-auth)", () => {
    const partial = auth({ scopes: [SCOPES[0]!], expiresAt: 1_000_000 });
    expect(isAuthValid(partial, SCOPES, 0)).toBe(false);
  });

  it("true when granted scopes are a superset of required", () => {
    const extra = auth({
      scopes: [...SCOPES, "https://www.googleapis.com/auth/contacts.readonly"],
      expiresAt: 1_000_000,
    });
    expect(isAuthValid(extra, SCOPES, 0)).toBe(true);
  });
});
