// Shared Pinned-Timezones editor (PRD §5.1.3 Step 2 + §5.8.2). The "chips +
// add-picker + at-cap remove-all" pattern, extracted from onboarding Step 2 so
// the onboarding step and the Settings "Pinned Timezones" section render the
// SAME control (one source of truth — same hygiene rationale as the shared
// TimezonePicker, §5.3.5 (k)). Settings additionally enables per-chip up/down
// reorder via `reorderable`; onboarding leaves it off.
//
// SELF-CONTAINED STYLING: like TimezonePicker, the chip/button styles ship in
// a co-located `fl-ptz-` <style> block so the control looks identical on the
// onboarding page and the Settings page without either page's CSS having to
// know about it.

import { TimezonePicker } from "./TimezonePicker";
import { resolveCuratedEntry } from "../timezone/search";
import {
  MAX_PINNED_TIMEZONES,
  movePinned,
  pinnedChipLabel,
} from "../timezone/pinned";

export interface PinnedTimezonesEditorProps {
  /** Canonical IANA ids, in the user's chosen order (rendered in that order). */
  pinned: string[];
  /** New array on every add / remove / reorder / remove-all. */
  onChange: (next: string[]) => void;
  /** Show per-chip up/down reorder controls (Settings §5.8.2 only). */
  reorderable?: boolean;
  disabled?: boolean;
}

export function PinnedTimezonesEditor({
  pinned,
  onChange,
  reorderable = false,
  disabled = false,
}: PinnedTimezonesEditorProps) {
  const atCap = pinned.length >= MAX_PINNED_TIMEZONES;

  // Resolve each stored id to its friendly chip label; an unresolved id
  // (legacy/unknown) falls back to the raw id rather than vanishing (§6.7).
  function chipLabel(id: string): string {
    const entry = resolveCuratedEntry(id);
    return entry ? pinnedChipLabel(entry) : id;
  }

  function addPinned(tz: string): void {
    if (atCap || pinned.includes(tz)) return;
    onChange([...pinned, tz]);
  }
  function removeAt(index: number): void {
    onChange(pinned.filter((_, i) => i !== index));
  }
  function move(index: number, dir: -1 | 1): void {
    onChange(movePinned(pinned, index, dir));
  }

  return (
    <div className="fl-ptz">
      <style>{PTZ_CSS}</style>

      {pinned.length > 0 && (
        <ul className="fl-ptz-chips">
          {pinned.map((id, index) => {
            const label = chipLabel(id);
            return (
              <li key={`${id}-${index}`} className="fl-ptz-chip">
                {reorderable && (
                  <span className="fl-ptz-reorder">
                    <button
                      type="button"
                      className="fl-ptz-move"
                      aria-label={`Move ${label} up`}
                      disabled={disabled || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="fl-ptz-move"
                      aria-label={`Move ${label} down`}
                      disabled={disabled || index === pinned.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                  </span>
                )}
                <span className="fl-ptz-chip-label">{label}</span>
                <button
                  type="button"
                  className="fl-ptz-chip-remove"
                  aria-label={`Remove ${label}`}
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {atCap ? (
        <p className="fl-ptz-max" role="status">
          Maximum {MAX_PINNED_TIMEZONES} pinned timezones. Remove one to add
          another, or{" "}
          <button
            type="button"
            className="fl-ptz-linkbtn"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            remove all
          </button>
          .
        </p>
      ) : (
        <div className="fl-ptz-add">
          <span className="fl-ptz-add-label">Add a timezone</span>
          <TimezonePicker
            value={null}
            ariaLabel="Add a timezone"
            placeholder="Add a timezone…"
            disabled={disabled}
            className="fl-ptz-add-picker"
            onChange={addPinned}
          />
        </div>
      )}
    </div>
  );
}

// Scoped, self-contained styles (see header note). Mirrors the blue-pill chip
// look the onboarding step shipped with in Session 11.
const PTZ_CSS = `
.fl-ptz { font: inherit; }
.fl-ptz *, .fl-ptz *::before, .fl-ptz *::after { box-sizing: border-box; }
.fl-ptz-chips {
  list-style: none; margin: 12px 0; padding: 0;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.fl-ptz-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 6px 4px 10px; background: #e8f0fe; border: 1px solid #d2e3fc;
  border-radius: 16px; font-size: 13px; color: #1a3a6b;
}
.fl-ptz-reorder { display: inline-flex; gap: 2px; margin-right: 2px; }
.fl-ptz-move {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; padding: 0; border: 0; border-radius: 4px;
  background: transparent; color: #1a73e8; font: inherit; font-size: 12px;
  line-height: 1; cursor: pointer;
}
.fl-ptz-move:hover:not(:disabled), .fl-ptz-move:focus-visible:not(:disabled) {
  background: #d2e3fc; outline: none;
}
.fl-ptz-move:disabled { color: #b6c6e0; cursor: default; }
.fl-ptz-chip-label { white-space: nowrap; }
.fl-ptz-chip-remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border: 0; border-radius: 50%;
  background: transparent; color: #1a73e8; font-size: 15px; line-height: 1;
  cursor: pointer;
}
.fl-ptz-chip-remove:hover:not(:disabled),
.fl-ptz-chip-remove:focus-visible:not(:disabled) {
  background: #d2e3fc; outline: none;
}
.fl-ptz-chip-remove:disabled { color: #b6c6e0; cursor: default; }
.fl-ptz-max { font-size: 13px; color: #5f6368; margin: 12px 0 4px; }
.fl-ptz-linkbtn {
  border: 0; background: none; padding: 0; color: #1a73e8; font: inherit;
  cursor: pointer; text-decoration: underline;
}
.fl-ptz-linkbtn:hover:not(:disabled),
.fl-ptz-linkbtn:focus-visible:not(:disabled) { color: #1b66c9; outline: none; }
.fl-ptz-add-label { display: block; font-size: 13px; color: #5f6368; margin-bottom: 6px; }
.fl-ptz-add-picker { max-width: 360px; }
`;
