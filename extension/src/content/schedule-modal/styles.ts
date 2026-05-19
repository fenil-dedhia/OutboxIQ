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
h1 { font-size: 16px; font-weight: 500; margin: 0 0 4px; }
.subtitle { font-size: 12px; color: #5f6368; margin: 0 0 16px; }
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
`;
