// Free v1 OAuth access-token storage (PRD §7.5, §6.5).
//
// A tiny typed wrapper over the `outboxiqAuth` chrome.storage.local key. It
// holds ONLY a short-lived access token + its expiry/scope metadata.
//
// Why chrome.storage.local and not service-worker memory: MV3 terminates the
// service worker aggressively, so an in-memory token would force a re-auth
// on essentially every cold start. chrome.storage.local is extension-private
// (NOT web-accessible — satisfies §6.5 "tokens never exposed to the page or
// to web-accessible resources"; only the SW reads/writes this). The token is
// never put in OutboxIQState (§7.2) — it is ephemeral auth material, kept
// separate so it can't entangle with user data or bump SCHEMA_VERSION.
//
// PREMIUM_NOTES (tier-split discipline): Free v1 stores an ACCESS TOKEN ONLY.
// The implicit grant issues NO refresh token, so none is stored anywhere.
// Premium v1's refresh token lives encrypted on the backend (PRD §13.3),
// never here — do not add refresh-token fields to StoredAuth speculatively.

import { STORAGE_KEY_AUTH } from "./constants";

export interface StoredAuth {
  /** Google OAuth 2.0 bearer access token. */
  accessToken: string;
  /** Epoch ms after which the token must be treated as expired. */
  expiresAt: number;
  /** Scopes Google actually granted (space-split from the redirect). */
  scopes: string[];
  /**
   * The Google account email this token was granted for, if known. Used so a
   * later silent re-auth landing on a *different* account can be detected.
   * Null when not yet resolved (we don't make an extra call just for this).
   */
  grantedEmail: string | null;
}

/** Refresh this many ms BEFORE the real expiry, to cover clock skew and
 * in-flight requests. A token within the skew window is treated as expired. */
export const EXPIRY_SKEW_MS = 60_000;

async function rawGet<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  const stored = await rawGet<StoredAuth>(STORAGE_KEY_AUTH);
  return stored ?? null;
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_AUTH]: auth });
}

export async function clearStoredAuth(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_AUTH);
}

/**
 * Pure validity check (no I/O, no Date.now in a hidden place — caller passes
 * `now` so this stays unit-testable like working-hours.ts).
 *
 * Valid ⇔ there is a token, it is not within EXPIRY_SKEW_MS of expiry, and it
 * covers every scope in `requiredScopes` (a scope upgrade — e.g. adding
 * directory.readonly later — must force a fresh consent, not silently pass).
 */
export function isAuthValid(
  auth: StoredAuth | null,
  requiredScopes: readonly string[],
  now: number,
): auth is StoredAuth {
  if (!auth || !auth.accessToken) return false;
  if (now >= auth.expiresAt - EXPIRY_SKEW_MS) return false;
  const granted = new Set(auth.scopes);
  return requiredScopes.every((s) => granted.has(s));
}
