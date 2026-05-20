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

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  resolveCuratedEntry,
  searchCuratedTimezones,
} from "../timezone/search";

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
}

export function TimezonePicker({
  value,
  onChange,
  placeholder = "Select a timezone",
  id,
  ariaLabel,
  disabled,
  className,
}: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

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

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    // Start the highlight on the current selection if it's in view, else top.
    const idx = selectedEntry
      ? results.findIndex(
          (e) => e.ianaIdentifier === selectedEntry.ianaIdentifier,
        )
      : -1;
    setActiveIndex(idx >= 0 ? idx : 0);
  }

  function commit(index: number) {
    const entry = results[index];
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

  function onInputKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
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
        setActiveIndex(results.length - 1);
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
    open && results.length > 0 ? optId(activeIndex) : undefined;

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

      {open && (
        <div className="fl-tzp-popup">
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
            {results.length === 0 && (
              <li className="fl-tzp-empty" role="presentation">
                No timezones found
              </li>
            )}
            {results.map((entry, i) => {
              const isSel =
                !!selectedEntry &&
                entry.ianaIdentifier === selectedEntry.ianaIdentifier;
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
            })}
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
.fl-tzp-popup {
  position: absolute; z-index: 2147483000; top: calc(100% + 4px); left: 0; right: 0;
  background: #fff; border: 1px solid #dadce0; border-radius: 6px;
  box-shadow: 0 2px 10px rgba(60,64,67,0.28); overflow: hidden;
  display: flex; flex-direction: column; max-height: 320px;
}
.fl-tzp-search {
  font: inherit; margin: 8px; padding: 7px 9px; border: 1px solid #dadce0;
  border-radius: 6px; color: #202124; outline: none;
}
.fl-tzp-search:focus { border-color: #1a73e8; box-shadow: 0 0 0 1px #1a73e8; }
.fl-tzp-list { list-style: none; margin: 0; padding: 0 0 4px; overflow-y: auto; }
.fl-tzp-option {
  padding: 8px 12px; cursor: pointer; color: #202124; font-size: 13px;
  line-height: 1.4; overflow-wrap: anywhere;
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
