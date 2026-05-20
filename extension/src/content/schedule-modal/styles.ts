// Styles for the §5.3 modal. Injected INTO the shadow root (page CSS does not
// cross the boundary, so Gmail can neither break us nor be broken by us —
// the isolation we chose in decision #2). Visually mirrors Gmail's native
// scheduling modal (PRD §5.3.1 "preserve the visual style and dimensions")
// rather than Fashionably Late branding (PRD §8.1 "native feel over branded feel").

export const MODAL_CSS = `
:host, * { box-sizing: border-box; }
.backdrop {
  position: fixed; inset: 0; z-index: 2147483647;
  background: rgba(32,33,36,.4);
  display: flex; align-items: center; justify-content: center;
  font: 14px/1.5 "Google Sans", Roboto, Arial, sans-serif; color: #202124;
}
.card {
  background: #fff; width: 460px; max-width: calc(100vw - 32px);
  border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,.28);
  padding: 20px 24px 16px; max-height: calc(100vh - 48px); overflow:auto;
}
.card:focus { outline: none; }
/* Header row: title/subtitle on the left, the §5.8.1 settings gear top-right.
   align-items:flex-start keeps the gear level with the title's first line. */
.modal-header { display: flex; align-items: flex-start; gap: 8px; }
.modal-header-text { flex: 1 1 auto; min-width: 0; }
h1 { font-size: 16px; font-weight: 500; margin: 0 0 4px; }
.subtitle { font-size: 12px; color: #5f6368; margin: 0 0 16px; }
/* A single icon-link (NOT a menu). Self-styled in the shadow root, same as the
   rest of the modal — page CSS doesn't reach here. Sized for clear visibility
   (owner UX call, Session-12 hands-on: the 16px glyph read as too small). */
.gear {
  flex: 0 0 auto; width: 36px; height: 36px; padding: 0; margin: -4px -6px 0 0;
  border: 0; border-radius: 50%; background: none; cursor: pointer;
  color: #5f6368; font-size: 22px; line-height: 36px; text-align: center;
}
.gear:hover, .gear:focus-visible { background: #f1f3f4; color: #202124; outline: none; }
.gear:disabled { opacity: .6; cursor: default; }
.section-label {
  font-size: 11px; font-weight: 500; letter-spacing: .4px;
  text-transform: uppercase; color: #5f6368; margin: 12px 0 6px;
}
.preset {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; text-align: left; background: none; border: 0;
  padding: 10px 8px; border-radius: 6px; cursor: pointer; font: inherit;
  color: #202124;
}
.preset:hover, .preset:focus-visible { background: #f1f3f4; outline: none; }
.preset.selected {
  background: #e8f0fe; box-shadow: inset 3px 0 0 #1a73e8;
}
.preset.selected span:first-child { color: #1a73e8; font-weight: 500; }
.preset .when { color: #5f6368; font-size: 12px; }
.preset.selected .when { color: #1a73e8; }
.divider { border: 0; border-top: 1px solid #e0e0e0; margin: 12px 0; }
.pick { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.pick input {
  font: inherit; padding: 6px 8px; border: 1px solid #dadce0;
  border-radius: 4px; color: #202124;
}
.pick.selected input { border-color: #1a73e8; box-shadow: 0 0 0 1px #1a73e8; }
.note { font-size: 12px; color: #5f6368; margin: 8px 0 0; }
.actions {
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;
}
button.text {
  font: inherit; background: none; border: 0; color: #1a73e8;
  padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;
}
button.text:hover, button.text:focus-visible { background: #e8f0fe; outline:none; }
button.primary {
  font: inherit; background: #1a73e8; color: #fff; border: 0;
  padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500;
}
button.primary:hover { background: #1b66c9; }
button:disabled { opacity: .6; cursor: default; }
.status { font-size: 12px; color: #5f6368; margin-top: 8px; }
.status.error { color: #c5221f; }

/* §5.5 soft-warning modal — same Gmail-native card, stacked actions so the
   recommended (Reschedule) choice reads first without auto-acting (§5.5.2,
   locked soft-warning pattern). */
.warn-lead { font-size: 14px; margin: 0 0 10px; }
.warn-why { font-size: 12px; color: #5f6368; margin: 0 0 16px; }
.warn-actions { display: flex; flex-direction: column; gap: 8px; }
.warn-actions button { width: 100%; text-align: center; }
button.secondary {
  font: inherit; background: #fff; color: #1a73e8;
  border: 1px solid #dadce0; padding: 8px 16px; border-radius: 4px;
  cursor: pointer; font-weight: 500;
}
button.secondary:hover, button.secondary:focus-visible {
  background: #f8fafe; border-color: #1a73e8; outline: none;
}

/* §5.3.5 Optimize-for-X section (locked items a–n, Session 10).
   Visually integrated with Quick Options + Pick Custom; not a styled
   island (§8.1 native feel). The engage label + recipient dropdown
   sit on ONE row that never wraps. The CLOSED dropdown button fills
   the remaining row width and truncates a long selected value with
   the browser's native ellipsis — it never pushes past the modal
   (no horizontal scroll). The OPEN dropdown menu is native and sizes
   to its content automatically, so long emails are fully readable
   when the menu is expanded (owner UX call after Session 10 hands-on). */
.optimize { margin-top: 4px; }
/* Stronger separation between the core scheduling workflow (Quick
   Options + Pick Custom) and the optional Optimize feature: the
   leading divider gets extra breathing room above/below vs the
   12px inter-section dividers, so Optimize reads as its own block
   rather than crammed under Pick Custom (owner UX call). */
.optimize > .divider { margin: 22px 0 18px; }
.optimize-row {
  display: flex; align-items: center; gap: 16px; flex-wrap: nowrap;
  margin: 0 0 8px;
}
.optimize-engage {
  display: inline-flex; align-items: center; gap: 8px;
  color: #202124; cursor: pointer; flex: 0 0 auto; white-space: nowrap;
}
.optimize-engage input[type="checkbox"] {
  width: 16px; height: 16px; accent-color: #1a73e8; cursor: pointer;
}
.optimize-recipient {
  font: inherit; border: 1px solid #dadce0;
  border-radius: 4px; color: #202124; background: #fff;
  /* Extra right padding reserves space for the native dropdown arrow so
     a truncated long email stops BEFORE the chevron instead of running
     under it. The open menu still shows the full value (native). */
  padding: 6px 28px 6px 8px;
  text-overflow: ellipsis;
  /* Fill the row's remaining width; min-width:0 lets it shrink below
     content size so the closed button stays inside the modal and the
     selected text truncates with the native <select> ellipsis. */
  flex: 1 1 auto; min-width: 0;
}
.optimize-recipient:disabled { background: #f8f9fa; color: #5f6368; }
.optimize-body {
  margin-top: 8px; padding: 10px 12px; background: #f8f9fa;
  border-radius: 6px; border: 1px solid #e8eaed;
  display: flex; flex-direction: column; gap: 10px;
}
.optimize-timing-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  color: #202124;
}
.optimize-timing-label {
  color: #5f6368; font-size: 12px; flex: 0 0 auto; width: 100%;
}
.optimize-timing {
  /* font:inherit picks up the 14px modal body (matches Quick Options /
     Pick Custom) — the row no longer forces a smaller size. */
  font: inherit; padding: 6px 28px 6px 8px; border: 1px solid #dadce0;
  border-radius: 4px; color: #202124; background: #fff; flex: 1 1 auto;
  min-width: 0; text-overflow: ellipsis;
}
.optimize-tooltip-btn {
  font: inherit; width: 20px; height: 20px; line-height: 18px;
  border-radius: 50%; border: 1px solid #dadce0; background: #fff;
  color: #5f6368; cursor: pointer; padding: 0; font-style: italic;
  font-weight: 600;
}
.optimize-tooltip-btn:hover, .optimize-tooltip-btn:focus-visible {
  background: #e8f0fe; border-color: #1a73e8; color: #1a73e8; outline: none;
}
.optimize-tooltip {
  font-size: 12px; color: #5f6368; margin: 0;
  padding: 8px 10px; background: #fff; border-radius: 4px;
  border: 1px solid #e8eaed; line-height: 1.5;
}
.optimize-tz {
  display: flex; flex-direction: column; gap: 6px; min-width: 0;
}
.optimize-tz-prompt {
  font-size: 12px; color: #5f6368; margin: 0;
  /* A long unbroken recipient email must wrap within the modal rather
     than overflow it (no char-count cutoff — adapts to any length).
     anywhere also fixes the flex min-content sizing so the column
     can't be forced wider than the card. */
  overflow-wrap: anywhere;
}
/* The shared TimezonePicker (Session 11) is a self-styled combobox; this
   class now only sets its width within the optimize panel. */
.optimize-tz-select { width: 100%; }
/* flex (not inline-flex) so it spans the panel width and the long-email
   span can wrap; flex-start keeps the checkbox at the first text line
   when the email wraps to multiple lines. */
.optimize-remember {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 12px; color: #5f6368; cursor: pointer; margin-top: 2px;
  min-width: 0;
}
.optimize-remember > span { overflow-wrap: anywhere; min-width: 0; }
.optimize-remember input[type="checkbox"] {
  width: 14px; height: 14px; accent-color: #1a73e8; cursor: pointer;
  flex: 0 0 auto; margin-top: 1px;
}
.optimize-confirm {
  font-size: 13px; color: #202124; margin: 2px 0 0;
  padding: 8px 10px; background: #e8f0fe; border-radius: 4px;
  border-left: 3px solid #1a73e8; line-height: 1.5;
  overflow-wrap: anywhere;
}
`;
