import { useEffect, useRef, useState } from "react";
import {
  buildDataExport,
  deleteAllData,
  downloadJsonFile,
  exportFilename,
  serializeDataExport,
} from "../../../lib/data-management";
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "../../../lib/constants";

// PRD §5.8.2 "Privacy and Data". Export My Data (§6.1.1 right to access) and
// Delete My Data (§6.1.1 right to erasure) are both wired (Session 13), and the
// Privacy Policy / Terms of Service now link to the hosted docs
// (docs/legal/*.md on GitHub Pages; see constants.ts). The URLs 404 until Pages
// is enabled + the docs' dates are filled — accepted pre-launch (PRE_LAUNCH).
//
// Free v1 is local-only (§6.1.2 tier amendment): export reads only
// chrome.storage.local and downloads a file on-device; delete clears only
// chrome.storage.local. There is NO backend, account, or token to revoke — the
// delete copy must never imply otherwise (§6.1.2). No network, no telemetry
// (§11 / Entry 39).

type Notice = { text: string; tone: "info" | "error" };

/** Typed-confirmation word for the irreversible delete (case-insensitive). */
const CONFIRM_WORD = "delete";

interface PrivacyDataSectionProps {
  /** Called after a successful erasure so the page can show a coherent
   * post-delete (un-onboarded) state. */
  onDataDeleted?: () => void;
}

// Two-step confirmation for the irreversible local wipe: the user must type
// "delete" before the destructive button enables. Copy is local-only — it must
// NOT mention backend/servers/account/token revocation (§6.1.2 — Free v1 has
// none). Backdrop click / Cancel / Escape close harmlessly.
function DeleteDataModal({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmed = text.trim().toLowerCase() === CONFIRM_WORD;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fl-set-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="fl-set-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fl-set-del-h"
        aria-describedby="fl-set-del-body"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) onCancel();
        }}
      >
        <h2 id="fl-set-del-h">Delete all data?</h2>
        <p id="fl-set-del-body">
          This permanently deletes all your Fashionably Late data stored in this
          browser — your timezone, working hours, pinned timezones, saved
          recipient timezones, and preferences. This can&rsquo;t be undone.
        </p>
        <label className="fl-set-field-label" htmlFor="fl-set-del-input">
          To confirm, type <code>delete</code> below.
        </label>
        <input
          id="fl-set-del-input"
          ref={inputRef}
          className="fl-set-modal-input"
          type="text"
          value={text}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && confirmed && !busy) onConfirm();
          }}
        />
        <div className="fl-set-modal-actions">
          <button
            type="button"
            className="fl-set-btn"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fl-set-btn fl-set-btn-danger-solid"
            onClick={onConfirm}
            disabled={!confirmed || busy}
          >
            {busy ? "Deleting…" : "Delete my data"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrivacyDataSection({ onDataDeleted }: PrivacyDataSectionProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // §6.1.1 right to erasure: irreversibly clear all local data, then hand off
  // to the page so it can show the un-onboarded post-delete state.
  async function handleConfirmDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteAllData();
      setShowDeleteModal(false);
      onDataDeleted?.();
    } catch (err) {
      console.error("[Fashionably Late] data deletion failed:", err);
      setShowDeleteModal(false);
      // §6.7: a partial failure must not look like success.
      setNotice({
        text: "Couldn't delete all your data — some may still be on this device. Please try again.",
        tone: "error",
      });
    } finally {
      setDeleting(false);
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
        <button
          type="button"
          className="fl-set-btn fl-set-btn-danger"
          onClick={() => {
            setNotice(null);
            setShowDeleteModal(true);
          }}
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
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        <span aria-hidden="true"> · </span>
        <a
          href={TERMS_OF_SERVICE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>
      </p>

      {showDeleteModal && (
        <DeleteDataModal
          busy={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
    </section>
  );
}
