import { useState } from "react";
import {
  buildDataExport,
  downloadJsonFile,
  exportFilename,
  serializeDataExport,
} from "../../../lib/data-management";

// PRD §5.8.2 "Privacy and Data". Export My Data is wired (§6.1.1 right to
// access — Session 13); Delete My Data is still structure-only ("coming soon")
// until Phase 2. The Privacy/ToS links are deliberate placeholders — the real
// hosted URL is a rename-proof / brand-neutral pre-launch decision (PRE_LAUNCH
// "Naming / rebrand readiness"), so we must NOT point at a real URL.
//
// Free v1 is local-only (§6.1.2 tier amendment): export reads only
// chrome.storage.local and downloads a file on-device — no network, no
// telemetry (§11 / Entry 39).

type Notice = { text: string; tone: "info" | "error" };

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
  const [notice, setNotice] = useState<Notice | null>(null);

  // §6.1.1 right to access: serialize all local data to a JSON file and
  // download it on-device. Fully local (§6.1.2 / §11) — no network call.
  async function handleExport(): Promise<void> {
    try {
      const file = await buildDataExport();
      downloadJsonFile(exportFilename(), serializeDataExport(file));
      setNotice({
        text: "Your data was downloaded as a JSON file.",
        tone: "info",
      });
    } catch (err) {
      console.error("[Fashionably Late] data export failed:", err);
      setNotice({
        text: "Couldn't export your data. Please try again.",
        tone: "error",
      });
    }
  }

  return (
    <section className="fl-set-section" aria-labelledby="fl-set-privacy-h">
      <h2 id="fl-set-privacy-h">Privacy &amp; data</h2>
      <p className="fl-set-help">
        Everything Fashionably Late stores lives on this device. You can export
        or delete it at any time.
      </p>

      <div className="fl-set-privacy-actions">
        <button
          type="button"
          className="fl-set-btn"
          onClick={() => void handleExport()}
        >
          Export my data
        </button>
        {/* TODO(§6.1.1 right to erasure): wire to a confirmed clear-all of
            local storage. NOTE: Free-v1 copy must NOT mention "revoking
            backend access" (there is no backend — Entry 39); the §5.8.2
            backend-revocation wording is Premium-only. Stubbed until Phase 2. */}
        <button
          type="button"
          className="fl-set-btn fl-set-btn-danger"
          onClick={() =>
            setNotice({ text: "Data deletion is coming soon.", tone: "info" })
          }
        >
          Delete my data
        </button>
      </div>

      {notice && (
        <p
          className={
            "fl-set-notice" +
            (notice.tone === "error" ? " fl-set-notice--error" : "")
          }
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
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
