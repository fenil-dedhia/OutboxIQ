// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.2 / §5.5.1 hardening — single-ACTIVE-instance page ownership.
//
// Reloading/updating the extension while a Gmail tab stays open leaves the OLD
// content-script instance ORPHANED: its document-level listeners survive, but
// its chrome.* context is severed, and a FRESH instance is injected on top. Two
// instances then fight over the same compose, with three symptoms but ONE
// cause:
//   • two §5.5.1 send guards — one replays the native Send, the other re-blocks
//     it → "Send now anyway does nothing";
//   • two §5.2 interceptors — the orphaned one can win a Schedule-Send click but
//     can't read storage (severed context), so it falls back to Gmail's NATIVE
//     modal instead of ours;
//   • observers/handlers churning against each other (e.g. continuous chevron /
//     relabel activity on compose open).
//
// The fix makes only ONE instance ACT: the newest LIVE one. Ownership is a
// last-writer-wins token in a `<html>` attribute — the DOM is the one channel
// shared across every isolated world in the tab. (A JS property on `window` is
// NOT shared across a reloaded instance's separate world, which is exactly why
// the earlier window-latch failed to dedupe the reload case it was written for.)
// Every §5.2/§5.3/§5.5.1 handler calls isCurrentOwner() and no-ops when false,
// so an orphaned or superseded copy is inert WITHOUT having to tear its
// listeners down. isCurrentOwner() also requires a live extension context, so an
// orphaned copy that still holds the token (the brief window before a new copy
// claims) is inert too. No Gmail refresh needed after an extension update.
//
// Unit tests prove the token + liveness logic but CANNOT reproduce the real
// two-instance orphan scenario (the test env is single-world) — that is
// hands-on verified: reload the extension with Gmail open and WITHOUT
// refreshing, then confirm Schedule Send still opens OUR modal and an off-hours
// "Send now anyway" actually sends.

const OWNER_ATTR = "data-fashionably-late-owner";

// Unique per content-script EXECUTION. The module is re-evaluated in each
// injected instance (even within one isolated world a fresh execution re-runs
// module init), so each instance gets its own token.
const MY_TOKEN = `fl-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Whether THIS content script's extension context is still connected. An
 * orphaned (post-reload) instance reads `undefined` here and never acts. */
function contextAlive(): boolean {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

/**
 * Claim page ownership for THIS instance (last-writer-wins). The content script
 * calls this once, just before installing its integrations, so the most
 * recently loaded LIVE instance becomes the owner and older/orphaned instances
 * go inert. Synchronous and never throws.
 */
export function claimPageOwnership(): void {
  try {
    document.documentElement.setAttribute(OWNER_ATTR, MY_TOKEN);
  } catch {
    /* best-effort; isCurrentOwner() defaults to acting when nothing is
       claimed, so a single live instance still works */
  }
}

/**
 * Whether THIS instance should act. True only when its extension context is
 * alive AND it is the current owner — or nobody has claimed yet (the single-
 * instance / fresh-page default, and the unit-test default). Called at the top
 * of every §5.2/§5.3/§5.5.1 handler so a superseded or orphaned copy no-ops.
 */
export function isCurrentOwner(): boolean {
  if (!contextAlive()) return false;
  try {
    const owner = document.documentElement.getAttribute(OWNER_ATTR);
    return owner === null || owner === MY_TOKEN;
  } catch {
    return true; // can't read the DOM → don't disable a live instance
  }
}

/** Test-only: clear the ownership marker so each case starts unclaimed. */
export function __resetPageOwnershipForTest(): void {
  try {
    document.documentElement.removeAttribute(OWNER_ATTR);
  } catch {
    /* ignore */
  }
}
