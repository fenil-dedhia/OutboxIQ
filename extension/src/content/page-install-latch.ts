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
// THE SHARED CHANNEL MUST BE THE DOM, NOT `window`. The original fix put the
// latch on `window` — but a JS property on `window` is NOT shared across
// instances after a reload: the orphaned instance and the re-injected instance
// run in SEPARATE isolated worlds, each with its OWN `window`, so the flag set
// by one is invisible to the other and BOTH install a guard — i.e. the
// window-latch failed to cover the very reload case it was written for (the
// "Send now anyway does nothing" bug resurfaced). The underlying page DOM and
// its attributes ARE shared across every isolated world in the tab, so a marker
// attribute on `document.documentElement` dedupes reliably. First-claim-wins is
// deliberate: we cannot tear down another instance's closure-scoped guard from
// here, but the winning guard's send/schedule path is pure DOM (`fireFull`, the
// Gmail recipe), so it keeps working even when that instance is the orphaned one
// — strictly better than two guards that cancel each other. The marker resets
// on a Gmail page reload (a fresh document drops JS-set attributes), which is
// the existing recovery guidance and restores a single live instance.

/** Marker attribute on <html>. Visible to every isolated world in the tab
 * (unlike a `window` property), so it dedupes across re-injected instances. */
const INSTALL_ATTR = "data-fashionably-late-installed";

/**
 * Atomically claim the single per-page integration install.
 *
 * @returns `true` if THIS caller won the claim and should install the
 *   integrations; `false` if another content-script instance in this tab has
 *   already claimed it and this caller should skip installing.
 *
 * Synchronous and never throws: `enableIntegrationsIfOnboarded` runs to
 * completion without yielding, so check-and-set cannot interleave between
 * instances. If the DOM is somehow unreadable we fail toward claiming (a single
 * instance still installs); a duplicate can only arise across instances, which
 * by definition share a reachable document.
 */
export function claimPageInstall(): boolean {
  try {
    const el = document.documentElement;
    if (el.getAttribute(INSTALL_ATTR) === "1") return false;
    el.setAttribute(INSTALL_ATTR, "1");
    return true;
  } catch {
    return true;
  }
}

/** Test-only: clear the page latch so each case starts unclaimed (jsdom shares
 * one document across a file). Not used by production code. */
export function __resetPageInstallForTest(): void {
  try {
    document.documentElement.removeAttribute(INSTALL_ATTR);
  } catch {
    /* ignore */
  }
}
