// PRD §5.5.1 hardening — cross-instance install idempotency.
//
// The content script's module-scoped `integrationsInstalled` latch dedupes
// installs WITHIN one instance, but it cannot dedupe across two SEPARATE
// content-script instances living in the same Gmail tab. That happens after an
// extension reload/update while a Gmail tab stays open: the old instance is
// orphaned (its `chrome.*` context is invalidated) but its document-level
// listeners survive, and the service worker re-injects a fresh instance (the
// `scripting` install-time activation). Two instances → two §5.5.1 send guards
// on `document` at capture phase, each with its own state. When one replays
// the native Send ("Send now anyway"/"Reschedule"), the OTHER guard — whose
// `suppressed` flag is false — re-detects the same violation and
// `preventDefault`s the replayed gesture, so the email never goes. The symptom
// is "Send now anyway does nothing."
//
// The fix is a PAGE-level latch: a flag on `window`, which is the one object
// shared by every injected instance in the tab. The first instance to claim it
// installs the integrations; any later instance (orphaned-then-reinjected, or a
// static + scripting double-fire race on install) sees the claim and skips
// installing a second guard. First-claim-wins is deliberate: we cannot tear
// down another instance's closure-scoped guard from here, but the winning
// guard's send/schedule path is pure DOM (`fireFull`, the Gmail recipe), so it
// keeps working even when that instance is the orphaned one — strictly better
// than two guards that cancel each other. (A Gmail refresh restores a single
// live instance; that is the existing dev/update guidance.)

interface FlaggedWindow extends Window {
  __fashionablyLateIntegrationsInstalled?: true;
}

/**
 * Atomically claim the single per-page integration install.
 *
 * @returns `true` if THIS caller won the claim and should install the
 *   integrations; `false` if another content-script instance in this tab has
 *   already claimed it and this caller should skip installing.
 *
 * Synchronous and never throws: `enableIntegrationsIfOnboarded` runs to
 * completion without yielding, so check-and-set cannot interleave between
 * instances. If `window` is somehow unreadable we fail toward claiming (a
 * single instance still installs); a duplicate can only arise across instances,
 * which by definition share a reachable `window`.
 */
export function claimPageInstall(): boolean {
  try {
    const w = window as FlaggedWindow;
    if (w.__fashionablyLateIntegrationsInstalled === true) return false;
    w.__fashionablyLateIntegrationsInstalled = true;
    return true;
  } catch {
    return true;
  }
}

/** Test-only: clear the page latch so each case starts unclaimed (jsdom shares
 * one `window` across a file). Not used by production code. */
export function __resetPageInstallForTest(): void {
  try {
    delete (window as FlaggedWindow).__fashionablyLateIntegrationsInstalled;
  } catch {
    /* ignore */
  }
}
