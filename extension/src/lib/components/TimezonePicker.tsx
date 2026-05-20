// Shared IANA timezone picker (PRD §5.3.5 item (k) — BINDING ARCHITECTURAL
// CONSTRAINT). The same component implementation is used by:
//
//   1. Onboarding §5.1.3 Step 2 (TimezoneStep.tsx) — "Your timezone".
//   2. §5.3.5 Optimize-for-X inline picker (OptimizeSection.tsx) — cache-miss
//      "What timezone is [recipient] in?".
//
// Any improvement here lands in both consumers automatically. Do NOT duplicate
// the picker into either consumer.
//
// Session 11: re-built from a plain native <select> into a searchable combobox
// over the CURATED timezone dataset (src/lib/timezone/curated-timezones.ts).
// It shows friendly group labels ("(UTC+5:30) India — Mumbai, Delhi … (IST)")
// and matches a typed city/country/abbreviation/old-IANA-name/offset, but the
// value emitted by onChange is always a canonical IANA id, so existing stored
// data keeps working.
//
// SELF-CONTAINED STYLING: the popup is React-rendered DOM (not the browser's
// native <select> menu), and this component is used both on a normal page AND
// inside the §5.3 modal's Shadow DOM, where page CSS does not reach. So all
// structural styles ship inside the component as a co-located <style> block
// scoped with the `fl-tzp-` prefix — it renders identically in either root,
// and can't leak into Gmail or be broken by it. Consumers control only outer
// width via `className`.

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  resolveCuratedEntry,
  searchCuratedTimezones,
} from "../timezone/search";
import { resolvePinnedEntries } from "../timezone/pinned";

/** Fixed-overlay coordinates for the popup, measured from the trigger. The
 * popup is `position: fixed` so it overlays the page/modal like a native
 * <select> menu — it does NOT grow the modal's scroll height (no second
 * scrollbar) and is NOT clipped by the modal's `overflow:auto` card (the
 * shadow host sits on document.body with no transformed ancestor, so a fixed
 * descendant resolves against the viewport). */
interface PopupPos {
  left: number;
  top?: number;
  bottom?: number;
  minWidth: number;
  maxWidth: number;
  maxHeight: number;
}

export interface TimezonePickerProps {
  /** IANA zone, or null when the consumer requires "no default" (§5.3.5 (i)/(l)). */
  value: string | null;
  /** Fired with the chosen canonical IANA zone. Never fired for a non-pick. */
  onChange: (timezone: string) => void;
  /** Shown on the trigger when `value === null`. e.g. "Choose their timezone". */
  placeholder?: string;
  /** Applied to the trigger so consumers can wire a <label htmlFor>. */
  id?: string;
  /** Accessible name when the consumer doesn't render a visible <label>. */
  ariaLabel?: string;
  disabled?: boolean;
  /** className for the OUTER wrapper — consumer-owned width/layout only. */
  className?: string;
  /** Canonical IANA ids to surface in a "Pinned" section above "All
   * timezones" (PRD §5.1.3 Step 2, Session 11). Empty/undefined → flat list,
   * no sections. Resolved + deduped + offset-ordered for display. */
  pinnedIanaIds?: string[];
}

export function TimezonePicker({
  value,
  onChange,
  placeholder = "Select a timezone",
  id,
  ariaLabel,
  disabled,
  className,
  pinnedIanaIds,
}: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<PopupPos | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const baseId = useId();
  const listId = `${baseId}-list`;
  const optId = (i: number) => `${baseId}-opt-${i}`;

  // The curated group to display as the current selection. A stored zone that
  // isn't a curated primary (e.g. browser "Europe/Amsterdam", legacy
  // "Asia/Calcutta") resolves to its group for DISPLAY only — the stored value
  // is never silently migrated (requirement (e)).
  const selectedEntry = useMemo(
    () => (value ? resolveCuratedEntry(value) : undefined),
    [value],
  );
  const results = useMemo(() => searchCuratedTimezones(query), [query]);

  // Pinned section (§5.1.3 Step 2). When the consumer passes pinned ids, the
  // filtered results split into a "Pinned" group and an "All timezones" group;
  // an entry appears in exactly one (no duplication). `optionEntries` is the
  // flat, keyboard-navigable sequence (pinned first, then the rest), and every
  // option's id/highlight indexes into it.
  const pinnedIdSet = useMemo(() => {
    if (!pinnedIanaIds || pinnedIanaIds.length === 0) return null;
    const entries = resolvePinnedEntries(pinnedIanaIds);
    return entries.length
      ? new Set(entries.map((e) => e.ianaIdentifier))
      : null;
  }, [pinnedIanaIds]);

  const { pinnedMatches, allMatches, optionEntries } = useMemo(() => {
    if (!pinnedIdSet) {
      return { pinnedMatches: [], allMatches: results, optionEntries: results };
    }
    const pinned = results.filter((e) => pinnedIdSet.has(e.ianaIdentifier));
    const rest = results.filter((e) => !pinnedIdSet.has(e.ianaIdentifier));
    return {
      pinnedMatches: pinned,
      allMatches: rest,
      optionEntries: [...pinned, ...rest],
    };
  }, [results, pinnedIdSet]);

  // Trigger text: the resolved group label; else the raw stored id (unknown
  // zone — surfaced, not hidden); else the placeholder.
  const triggerText = selectedEntry?.label ?? value ?? placeholder;
  const isPlaceholder = !selectedEntry && !value;
  const isUnknown = !selectedEntry && !!value;

  function close(restoreFocus: boolean) {
    setOpen(false);
    setQuery("");
    if (restoreFocus) triggerRef.current?.focus();
  }

  // Measure where to put the fixed-overlay popup, anchored to the trigger.
  // Flips above the trigger when there's more room there. Uses only refs +
  // window, so it's stable across renders.
  const computePos = useCallback((): PopupPos | null => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - t.bottom - 8;
    const spaceAbove = t.top - 8;
    const below = spaceBelow >= 240 || spaceBelow >= spaceAbove;
    return {
      left: t.left,
      top: below ? t.bottom + 4 : undefined,
      bottom: below ? undefined : vh - t.top + 4,
      minWidth: t.width,
      maxWidth: Math.max(220, vw - t.left - 12),
      maxHeight: Math.max(160, Math.min(360, below ? spaceBelow : spaceAbove)),
    };
  }, []);

  function openMenu() {
    if (disabled) return;
    setPos(computePos());
    setOpen(true);
    // Start the highlight on the current selection if it's in view, else top.
    const idx = selectedEntry
      ? optionEntries.findIndex(
          (e) => e.ianaIdentifier === selectedEntry.ianaIdentifier,
        )
      : -1;
    setActiveIndex(idx >= 0 ? idx : 0);
  }

  function commit(index: number) {
    const entry = optionEntries[index];
    if (!entry) return;
    onChange(entry.ianaIdentifier);
    close(true);
  }

  // Focus the search field when the menu opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the highlighted option in view (guarded — jsdom has no layout and
  // may not implement scrollIntoView).
  useEffect(() => {
    if (!open) return;
    const opts =
      listRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    try {
      opts?.[activeIndex]?.scrollIntoView({ block: "nearest" });
    } catch {
      /* jsdom: scrollIntoView not implemented — harmless */
    }
  }, [open, activeIndex]);

  // Close on outside pointer. composedPath() crosses the shadow boundary, so
  // this works in both the page and the modal's Shadow DOM.
  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: Event) {
      const path = e.composedPath();
      if (wrapperRef.current && !path.includes(wrapperRef.current)) {
        close(false);
      }
    }
    document.addEventListener("mousedown", onDocPointer, true);
    return () => document.removeEventListener("mousedown", onDocPointer, true);
  }, [open]);

  // The popup is fixed-positioned, so it must follow the trigger when the page
  // or the modal's scroll container moves. Capture-phase scroll catches the
  // modal card's own scroll too.
  useEffect(() => {
    if (!open) return;
    const reposition = () => setPos(computePos());
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, computePos]);

  function onInputKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, optionEntries.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(optionEntries.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  }

  const activeOptionId =
    open && optionEntries.length > 0 ? optId(activeIndex) : undefined;

  const renderOption = (entry: (typeof optionEntries)[number], i: number) => {
    const isSel =
      !!selectedEntry && entry.ianaIdentifier === selectedEntry.ianaIdentifier;
    return (
      <li
        key={entry.ianaIdentifier}
        id={optId(i)}
        role="option"
        aria-selected={isSel}
        className={`fl-tzp-option${i === activeIndex ? " is-active" : ""}${isSel ? " is-selected" : ""}`}
        // mousedown (not click) so selection beats any blur/close race.
        onMouseDown={(e) => {
          e.preventDefault();
          commit(i);
        }}
        onMouseEnter={() => setActiveIndex(i)}
      >
        {entry.label}
      </li>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={`fl-tzp${className ? ` ${className}` : ""}`}
      data-open={open ? "true" : "false"}
    >
      <style>{PICKER_CSS}</style>

      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        className="fl-tzp-trigger"
        disabled={disabled}
        data-placeholder={isPlaceholder ? "true" : undefined}
        data-unknown={isUnknown ? "true" : undefined}
        onClick={() => (open ? close(true) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="fl-tzp-trigger-text">{triggerText}</span>
        <span className="fl-tzp-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isUnknown && !open && (
        <span className="fl-tzp-hint">
          Unrecognised timezone — pick to update.
        </span>
      )}

      {open && pos && (
        <div
          className="fl-tzp-popup"
          style={{
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            minWidth: pos.minWidth,
            maxWidth: pos.maxWidth,
            maxHeight: pos.maxHeight,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="fl-tzp-search"
            placeholder="Search city, country or zone…"
            aria-label="Search timezones"
            aria-controls={listId}
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
          />
          <ul ref={listRef} id={listId} role="listbox" className="fl-tzp-list">
            {optionEntries.length === 0 && (
              <li className="fl-tzp-empty" role="presentation">
                No timezones found
              </li>
            )}
            {pinnedIdSet && pinnedMatches.length > 0 && (
              <li className="fl-tzp-section-label" role="presentation">
                Pinned
              </li>
            )}
            {pinnedMatches.map((entry, j) => renderOption(entry, j))}
            {pinnedIdSet &&
              pinnedMatches.length > 0 &&
              allMatches.length > 0 && (
                <li className="fl-tzp-section-label" role="presentation">
                  All timezones
                </li>
              )}
            {allMatches.map((entry, k) =>
              renderOption(entry, pinnedMatches.length + k),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Scoped, self-contained styles (see header note). Kept deliberately close to
// the prior native-select aesthetic: a bordered control with a chevron.
const PICKER_CSS = `
.fl-tzp { position: relative; width: 100%; box-sizing: border-box; font: inherit; }
.fl-tzp *, .fl-tzp *::before, .fl-tzp *::after { box-sizing: border-box; }
.fl-tzp-trigger {
  display: flex; align-items: center; gap: 8px; width: 100%;
  font: inherit; text-align: left; cursor: pointer;
  padding: 8px 10px; border: 1px solid #dadce0; border-radius: 6px;
  background: #fff; color: #202124; line-height: 1.3;
}
.fl-tzp-trigger:focus-visible { outline: none; border-color: #1a73e8; box-shadow: 0 0 0 1px #1a73e8; }
.fl-tzp-trigger:disabled { background: #f8f9fa; color: #5f6368; cursor: default; }
.fl-tzp-trigger[data-placeholder="true"] .fl-tzp-trigger-text { color: #5f6368; }
.fl-tzp-trigger-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fl-tzp-chevron { flex: 0 0 auto; color: #5f6368; font-size: 11px; }
.fl-tzp-hint { display: block; margin-top: 4px; font-size: 12px; color: #b06000; }
/* Fixed overlay (top/left/min-/max-width/max-height set inline from the
   trigger rect). width:max-content lets it grow horizontally to fit the
   widest single-line row instead of wrapping; it overflows the modal to the
   side/below like a native <select> menu rather than scrolling the modal. */
.fl-tzp-popup {
  position: fixed; z-index: 2147483000;
  background: #fff; border: 1px solid #dadce0; border-radius: 6px;
  box-shadow: 0 2px 10px rgba(60,64,67,0.28); overflow: hidden;
  display: flex; flex-direction: column; width: max-content;
}
.fl-tzp-search {
  font: inherit; margin: 8px; padding: 7px 9px; border: 1px solid #dadce0;
  border-radius: 6px; color: #202124; outline: none; min-width: 0;
}
.fl-tzp-search:focus { border-color: #1a73e8; box-shadow: 0 0 0 1px #1a73e8; }
.fl-tzp-list { list-style: none; margin: 0; padding: 0 0 4px; overflow-y: auto; overflow-x: hidden; }
.fl-tzp-option {
  padding: 8px 12px; cursor: pointer; color: #202124; font-size: 13px;
  line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fl-tzp-option.is-active { background: #e8f0fe; }
.fl-tzp-option.is-selected { font-weight: 600; }
.fl-tzp-option.is-selected::after { content: " ✓"; color: #1a73e8; }
.fl-tzp-empty { padding: 12px; color: #5f6368; font-size: 13px; text-align: center; }
.fl-tzp-section-label {
  padding: 8px 12px 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; color: #5f6368;
}
.fl-tzp-section-label + .fl-tzp-section-label { display: none; }
`;
