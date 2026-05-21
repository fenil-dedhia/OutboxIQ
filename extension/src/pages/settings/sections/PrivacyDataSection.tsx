import { useState } from "react";

// PRD §5.8.2 "Privacy and Data" — STRUCTURE-ONLY for Session 12. The layout is
// complete for launch, but neither button executes its real action yet (both
// show a "coming soon" treatment), so wiring is a later one-PR change rather
// than a layout rebuild. The Privacy/ToS links are deliberate placeholders —
// the real hosted URL is a rename-proof / brand-neutral pre-launch decision
// (PRE_LAUNCH "Naming / rebrand readiness"), so we must NOT point at a real URL.

// A placeholder link: link-styled but inert (aria-disabled + a tooltip), and
// preventDefault so the #*-todo hash can't navigate. Reused for Privacy/ToS.
function PlaceholderLink({ id, children }: { id: string; children: string }) {
  return (
    <a
      href={`#${id}`}
      className="fl-set-disabled-link"
      aria-disabled="true"
      title="Available at launch"
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </a>
  );
}

export function PrivacyDataSection() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section className="fl-set-section" aria-labelledby="fl-set-privacy-h">
      <h2 id="fl-set-privacy-h">Privacy &amp; data</h2>
      <p className="fl-set-help">
        Everything Fashionably Late stores lives on this device. You can export
        or delete it at any time.
      </p>

      <div className="fl-set-privacy-actions">
        {/* TODO(§6.1.1 right to access): wire to a JSON export of
            chrome.storage.local. Stubbed for Session 12. */}
        <button
          type="button"
          className="fl-set-btn"
          onClick={() => setNotice("Data export is coming soon.")}
        >
          Export my data
        </button>
        {/* TODO(§6.1.1 right to erasure): wire to a confirmed clear-all of
            local storage. NOTE: Free-v1 copy must NOT mention "revoking
            backend access" (there is no backend — Entry 39); the §5.8.2
            backend-revocation wording is Premium-only. Stubbed for Session 12. */}
        <button
          type="button"
          className="fl-set-btn fl-set-btn-danger"
          onClick={() => setNotice("Data deletion is coming soon.")}
        >
          Delete my data
        </button>
      </div>

      {notice && (
        <p className="fl-set-notice" role="status">
          {notice}
        </p>
      )}

      <p className="fl-set-legal-links">
        <PlaceholderLink id="privacy-todo">Privacy Policy</PlaceholderLink>
        <span aria-hidden="true"> · </span>
        <PlaceholderLink id="terms-todo">Terms of Service</PlaceholderLink>
      </p>
    </section>
  );
}
