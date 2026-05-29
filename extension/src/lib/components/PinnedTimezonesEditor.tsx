// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

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
  // Session 14 a11y (Gap D): aria-live announcement of reorder results.
  // Plain HTML5 DnD is mouse-only; the arrow-key reorder on the grip is the
  // keyboard path, and an AT user needs the new position spoken back to
  // confirm the move. Announcements fire at the source (handlers), not via
  // a prop-diff effect — the diff approach can't distinguish "user moved A
  // down" from "user moved B up" (both look identical in the array swap).
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");

  // Resolve each stored id to its friendly label; an unresolved id
  // (legacy/unknown) falls back to the raw id rather than vanishing (§6.7).
  function chipLabel(id: string): string {
    const entry = resolveCuratedEntry(id);
    return entry ? pinnedChipLabel(entry) : id;
  }

  function announceMove(zone: string, toIndex: number, total: number): void {
    setReorderAnnouncement(
      `Moved ${chipLabel(zone)} to position ${toIndex + 1} of ${total}.`,
    );
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
      const next = movePinned(pinned, index, -1);
      onChange(next);
      announceMove(pinned[index]!, index - 1, next.length);
    } else if (e.key === "ArrowDown" && index < pinned.length - 1) {
      e.preventDefault();
      const next = movePinned(pinned, index, 1);
      onChange(next);
      announceMove(pinned[index]!, index + 1, next.length);
    }
  }

  function onDrop(targetIndex: number): void {
    if (dragIndex !== null) {
      const movedId = pinned[dragIndex]!;
      const next = reorderPinned(pinned, dragIndex, targetIndex);
      onChange(next);
      // The dragged row's final position is its index in the new array
      // (reorderPinned semantics — insert at target after removing source).
      announceMove(movedId, next.indexOf(movedId), next.length);
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="fl-ptz">
      <style>{PTZ_CSS}</style>

      {/* Polite aria-live region for reorder announcements. Visually hidden;
          empty on initial mount so it's silent on render. */}
      {reorderable && (
        <div role="status" aria-live="polite" className="fl-ptz-sr-only">
          {reorderAnnouncement}
        </div>
      )}

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
.fl-ptz-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

/* Horizontal chips (onboarding). */
.fl-ptz-chips {
  list-style: none; margin: 12px 0; padding: 0;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.fl-ptz-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 6px 4px 10px; background: #eff7f8; border: 1px solid #b6dce2;
  border-radius: 16px; font-size: 13px; color: #295f68;
}

/* Vertical drag-to-reorder list (Settings). */
.fl-ptz-list {
  list-style: none; margin: 12px 0; padding: 0;
  display: flex; flex-direction: column; gap: 6px; max-width: 440px;
}
.fl-ptz-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; background: #eff7f8; border: 1px solid #b6dce2;
  border-radius: 10px; font-size: 14px; color: #295f68;
}
.fl-ptz-item.is-over { border-color: #367b87; box-shadow: 0 0 0 1px #367b87; }
.fl-ptz-item.is-dragging { opacity: .45; }
.fl-ptz-item-label { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.fl-ptz-grip {
  flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px;
  background: transparent; color: #5f6368; font: inherit; font-size: 14px;
  line-height: 1; cursor: grab;
}
.fl-ptz-grip:hover:not(:disabled), .fl-ptz-grip:focus-visible:not(:disabled) {
  background: #b6dce2; color: #295f68; outline: none;
}
.fl-ptz-grip:active { cursor: grabbing; }
.fl-ptz-grip:disabled { color: #b8bcc0; cursor: default; }

.fl-ptz-chip-label { white-space: nowrap; }
.fl-ptz-chip-remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: 0; border-radius: 50%;
  background: transparent; color: #367b87; font-size: 16px; line-height: 1;
  cursor: pointer; flex: 0 0 auto;
}
.fl-ptz-chip-remove:hover:not(:disabled),
.fl-ptz-chip-remove:focus-visible:not(:disabled) {
  background: #b6dce2; outline: none;
}
.fl-ptz-chip-remove:disabled { color: #b8bcc0; cursor: default; }

.fl-ptz-max { font-size: 13px; color: #5f6368; margin: 12px 0 4px; }
.fl-ptz-linkbtn {
  border: 0; background: none; padding: 0; color: #367b87; font: inherit;
  cursor: pointer; text-decoration: underline;
}
.fl-ptz-linkbtn:hover:not(:disabled),
.fl-ptz-linkbtn:focus-visible:not(:disabled) { color: #295f68; outline: none; }
.fl-ptz-add-label { display: block; font-size: 13px; color: #5f6368; margin-bottom: 6px; }
.fl-ptz-add-picker { max-width: 360px; }
`;
