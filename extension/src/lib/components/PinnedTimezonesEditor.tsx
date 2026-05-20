// Shared Pinned-Timezones editor (PRD §5.1.3 Step 2 + §5.8.2). The "chips +
// add-picker + at-cap remove-all" pattern, extracted from onboarding Step 2 so
// the onboarding step and the Settings "Pinned Timezones" section render the
// SAME control (one source of truth — same hygiene rationale as the shared
// TimezonePicker, §5.3.5 (k)).
//
// Two layouts:
//   • reorderable=false (onboarding) — horizontal removable chips (unchanged
//     from the Session-11 owner-approved look).
//   • reorderable=true (Settings §5.8.2) — a VERTICAL list, each row a drag
//     handle + label + remove. Drag-and-drop to reorder (owner UX call,
//     Session-12 hands-on), with arrow-key reordering on the focused handle so
//     the control stays keyboard-operable (§6.3) — plain DnD is not.
//
// SELF-CONTAINED STYLING: like TimezonePicker, the styles ship in a co-located
// `fl-ptz-` <style> block so the control looks identical on the onboarding page
// and the Settings page without either page's CSS having to know about it.

import { useState } from "react";
import { TimezonePicker } from "./TimezonePicker";
import { resolveCuratedEntry } from "../timezone/search";
import {
  MAX_PINNED_TIMEZONES,
  movePinned,
  pinnedChipLabel,
  reorderPinned,
} from "../timezone/pinned";

export interface PinnedTimezonesEditorProps {
  /** Canonical IANA ids, in the user's chosen order (rendered in that order). */
  pinned: string[];
  /** New array on every add / remove / reorder / remove-all. */
  onChange: (next: string[]) => void;
  /** Vertical drag-to-reorder list with handles (Settings §5.8.2). Off →
   * horizontal chips (onboarding). */
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Resolve each stored id to its friendly label; an unresolved id
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

  // Keyboard reorder on a focused drag handle (accessible alternative to DnD).
  // Boundary presses are no-ops (don't fire a redundant write). List items are
  // keyed by id, so the moved handle keeps DOM identity → focus follows it.
  function onHandleKeyDown(e: React.KeyboardEvent, index: number): void {
    if (disabled) return;
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      onChange(movePinned(pinned, index, -1));
    } else if (e.key === "ArrowDown" && index < pinned.length - 1) {
      e.preventDefault();
      onChange(movePinned(pinned, index, 1));
    }
  }

  function onDrop(targetIndex: number): void {
    if (dragIndex !== null)
      onChange(reorderPinned(pinned, dragIndex, targetIndex));
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="fl-ptz">
      <style>{PTZ_CSS}</style>

      {pinned.length > 0 &&
        (reorderable ? (
          <ul className="fl-ptz-list">
            {pinned.map((id, index) => {
              const label = chipLabel(id);
              return (
                <li
                  key={id}
                  className={
                    "fl-ptz-item" +
                    (dragIndex === index ? " is-dragging" : "") +
                    (overIndex === index && dragIndex !== index
                      ? " is-over"
                      : "")
                  }
                  draggable={!disabled}
                  onDragStart={(e) => {
                    setDragIndex(index);
                    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIndex(index);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(index);
                  }}
                >
                  <button
                    type="button"
                    className="fl-ptz-grip"
                    aria-label={`Reorder ${label} (use up and down arrow keys)`}
                    disabled={disabled}
                    onKeyDown={(e) => onHandleKeyDown(e, index)}
                  >
                    ☰
                  </button>
                  <span className="fl-ptz-item-label">{label}</span>
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
        ) : (
          <ul className="fl-ptz-chips">
            {pinned.map((id, index) => {
              const label = chipLabel(id);
              return (
                <li key={id} className="fl-ptz-chip">
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
        ))}

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

// Scoped, self-contained styles (see header note).
const PTZ_CSS = `
.fl-ptz { font: inherit; }
.fl-ptz *, .fl-ptz *::before, .fl-ptz *::after { box-sizing: border-box; }

/* Horizontal chips (onboarding). */
.fl-ptz-chips {
  list-style: none; margin: 12px 0; padding: 0;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.fl-ptz-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 6px 4px 10px; background: #e8f0fe; border: 1px solid #d2e3fc;
  border-radius: 16px; font-size: 13px; color: #1a3a6b;
}

/* Vertical drag-to-reorder list (Settings). */
.fl-ptz-list {
  list-style: none; margin: 12px 0; padding: 0;
  display: flex; flex-direction: column; gap: 6px; max-width: 440px;
}
.fl-ptz-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; background: #e8f0fe; border: 1px solid #d2e3fc;
  border-radius: 10px; font-size: 14px; color: #1a3a6b;
}
.fl-ptz-item.is-over { border-color: #1a73e8; box-shadow: 0 0 0 1px #1a73e8; }
.fl-ptz-item.is-dragging { opacity: .45; }
.fl-ptz-item-label { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.fl-ptz-grip {
  flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px;
  background: transparent; color: #5f6368; font: inherit; font-size: 14px;
  line-height: 1; cursor: grab;
}
.fl-ptz-grip:hover:not(:disabled), .fl-ptz-grip:focus-visible:not(:disabled) {
  background: #d2e3fc; color: #1a3a6b; outline: none;
}
.fl-ptz-grip:active { cursor: grabbing; }
.fl-ptz-grip:disabled { color: #b6c6e0; cursor: default; }

.fl-ptz-chip-label { white-space: nowrap; }
.fl-ptz-chip-remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: 0; border-radius: 50%;
  background: transparent; color: #1a73e8; font-size: 16px; line-height: 1;
  cursor: pointer; flex: 0 0 auto;
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
