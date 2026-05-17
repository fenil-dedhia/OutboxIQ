// ============================================================================
// SINGLE POINT OF FAILURE FOR GMAIL UI CHANGES.
//
// This module is the *only* place that encodes how to drive Gmail's native
// Schedule Send DOM. Every selector and the synthetic-event recipe live here
// and nowhere else, so when Gmail ships a UI change that breaks scheduling
// (the spike accepted this as a permanent, recurring operational cost), this
// is the one file to fix.
//
// Canonical recipe references — keep this code in lock-step with them:
//   • research/scheduled-send-api-spike.md  → "Verification" section (OQ2):
//     the preset path, verified end-to-end on consumer Gmail 2026-05-15.
//   • research/pick-date-time-probe.md      → the custom "Pick date & time"
//     path + the relabel-target dump. Run that probe to rediscover selectors
//     when Gmail breaks this.
//
// Why the recipe is shaped this way (from the spike, do not "simplify" away):
//   1. Gmail uses Google's `jsaction` event-delegation. The real click handler
//      is NOT on the menu item — it is ~3 ancestors up on a container that
//      resolves the target by COORDINATE hit-testing. Naïve synthetic clicks
//      fail silently.
//   2. Events must be dispatched on the INNERMOST rendered node at the
//      element's centre (via elementFromPoint), not the [role=menuitem]
//      wrapper.
//   3. Events must carry real clientX/clientY from getBoundingClientRect()
//      — this was the breakthrough; the delegated handler needs coordinates.
//   4. The full pointer→mouse→click sequence is required for delegated items;
//      the chevron has its own local handler and only needs plain mouse events.
//
// The probe script mirrors these primitives 1:1 on purpose: a clean probe run
// genuinely de-risks this module, and vice-versa.
// ============================================================================

// --- Selectors --------------------------------------------------------------
// Locale risk is annotated per selector. `selector="scheduledSend"` is the
// locale-INDEPENDENT anchor (Gmail's internal action id); prefer it.

/** Locale-DEPENDENT (aria-label). The "▾" next to Send. Has a local handler. */
export const SEL_CHEVRON = 'div[role="button"][aria-label="More send options"]';

/** Locale-INDEPENDENT. The "Schedule send" item — relabel + intercept anchor. */
export const SEL_SCHEDULE_MENUITEM =
  'div[role="menuitem"][selector="scheduledSend"]';

/** The schedule dialog. Prefer structural detection (contains SEL_DIALOG_PRESET). */
export const SEL_SCHEDULE_DIALOG = '[role="dialog"]';

/** Locale-INDEPENDENT-ish. The preset rows inside the schedule dialog.
 * NOTE: also matches the `.Az.AM` "Pick date & time" row and Gmail's
 * "Last scheduled time" row — callers must select by CONTENT, not index. */
export const SEL_DIALOG_PRESET = '[role="dialog"] [role="menuitem"].Az';

/** Locale-INDEPENDENT. The "Pick date & time" row — the extra `.AM` class
 * distinguishes it from the preset rows (Session 4 probe Result log). */
export const SEL_DIALOG_PICK_DATETIME =
  '[role="dialog"] [role="menuitem"].Az.AM';

// --- §5.5.1 regular "Send" button -------------------------------------------
// Verified by research/send-button-probe.{js,md} (Session 6, hands-on, 4
// contexts: new-compose / 2-compose / inline-reply / pop-out). The Send
// button has NO jsaction and only a locale-DEPENDENT aria-label/data-tooltip
// ("Send ‪(⌘Enter)‬"); its obfuscated class (`aoO`) is too fragile to anchor
// on. The robust, verified anchor is STRUCTURAL: it is the non-chevron
// `[role="button"]` sibling of the (already-accepted) chevron within their
// shared send-button group (`div.dC` = chevron.parentElement). The probe's
// independent attribute heuristic AGREED with this in every context (4/4),
// and each compose's Send button is its OWN in-pane subtree (compose-scoped,
// unlike the detached Schedule popup that breaks §5.2 multi-compose).

/** How many compose windows are open in THIS document (= chevron count).
 * The single source of truth for "multi-compose" — both the §5.2 safety net
 * and the §5.5.1 guard read it here so they can never disagree. Never throws
 * (a detection failure must never break Gmail). */
export function composeCount(): number {
  try {
    return document.querySelectorAll(SEL_CHEVRON).length;
  } catch {
    return 0;
  }
}

/**
 * The regular Send button for the chevron's compose: the role=button in the
 * chevron's parent group that is neither the chevron nor nested in/around it.
 * Cross-checked against the locale-dependent "Send"-prefixed aria-label/
 * data-tooltip (secondary; the structural relation is primary). Returns null
 * on any unexpected shape — callers must treat null as "don't intercept".
 */
export function regularSendButtonFor(chevron: Element): HTMLElement | null {
  const group = chevron.parentElement;
  if (!group) return null;
  const sendish = (b: Element): boolean => {
    const al = (b.getAttribute("aria-label") ?? "").trim();
    const tip = (b.getAttribute("data-tooltip") ?? "").trim();
    return /^send\b/i.test(al) || /^send\b/i.test(tip);
  };
  const siblings = Array.from(
    group.querySelectorAll<HTMLElement>('[role="button"]'),
  ).filter(
    (b) => b !== chevron && !b.contains(chevron) && !chevron.contains(b),
  );
  // Prefer the sibling that ALSO looks like Send (structural ∧ attribute —
  // the probe's "AGREE" path); fall back to the lone structural sibling.
  return siblings.find(sendish) ?? siblings[0] ?? null;
}

/**
 * The single compose's Send button, or null. Returns null when there is NOT
 * exactly one compose: 0 = nothing to guard; ≥2 = the §5.2/§5.5.1
 * multi-compose safety net (the Schedule recipe's global chevron query
 * mis-targets, so §5.5.1 must not intercept — fail toward native Send).
 */
export function singleComposeSendButton(): HTMLElement | null {
  try {
    const chevrons = document.querySelectorAll<HTMLElement>(SEL_CHEVRON);
    if (chevrons.length !== 1) return null;
    const chevron = chevrons[0];
    return chevron ? regularSendButtonFor(chevron) : null;
  } catch {
    return null;
  }
}

// --- Recipe primitives ------------------------------------------------------

function dev(): boolean {
  // Same DEV-gating pattern as the rest of the extension (Session 3).
  return import.meta.env.DEV;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Poll `fn` until it returns truthy or `timeout` elapses. Gmail renders menus
 * and dialogs asynchronously after the triggering event, so every navigation
 * step must wait rather than assume a synchronous DOM.
 */
export async function waitFor<T>(
  fn: () => T | null | undefined,
  opts: { timeout?: number; interval?: number; label?: string } = {},
): Promise<T> {
  const { timeout = 4000, interval = 80, label = "" } = opts;
  const start = Date.now();
  for (;;) {
    let v: T | null | undefined;
    try {
      v = fn();
    } catch {
      v = null;
    }
    if (v) return v;
    if (Date.now() - start > timeout) {
      throw new Error(`waitFor timeout${label ? ` (${label})` : ""}`);
    }
    await sleep(interval);
  }
}

function centerOf(el: Element): { cx: number; cy: number } {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

/**
 * The innermost rendered node at `el`'s centre — the spike's required
 * dispatch target (not the [role=menuitem] wrapper).
 *
 * GUARD (Session 4 probe finding): only trust the hit-test if it lands
 * inside `el`. The "Pick date & time" probe showed `elementFromPoint`
 * returning an element in Google's top bar (`gb_*`) — a different DOM
 * subtree entirely. Dispatching there means the event never bubbles to
 * Gmail's delegated handler on the dialog, so the click silently no-ops.
 * When the hit-test escapes `el`, dispatch on `el` itself instead.
 */
function innerTarget(el: Element): Element {
  const { cx, cy } = centerOf(el);
  const hit = document.elementFromPoint(cx, cy);
  if (hit && (hit === el || el.contains(hit))) return hit;
  if (dev() && hit) {
    console.info(
      `[OutboxIQ] recipe innerTarget: hit-test escaped target ` +
        `(<${hit.tagName.toLowerCase()} class="${hit.className}">) — ` +
        `dispatching on the element itself`,
    );
  }
  return el;
}

function mkPointer(
  type: string,
  cx: number,
  cy: number,
  bubbles: boolean,
): PointerEvent {
  return new PointerEvent(type, {
    bubbles,
    cancelable: true,
    composed: true,
    view: window,
    clientX: cx,
    clientY: cy,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    buttons: type === "pointerdown" ? 1 : 0,
  });
}

function mkMouse(
  type: string,
  cx: number,
  cy: number,
  bubbles: boolean,
): MouseEvent {
  return new MouseEvent(type, {
    bubbles,
    cancelable: true,
    composed: true,
    view: window,
    clientX: cx,
    clientY: cy,
    button: 0,
    buttons: type === "mousedown" ? 1 : 0,
  });
}

/**
 * The full verified activation sequence for `jsaction`-delegated items
 * (the "Schedule send" menuitem, dialog presets, the custom-path confirm).
 * `*enter` events do not bubble per spec; the rest must bubble to reach
 * Gmail's delegated ancestor handler.
 */
export async function fireFull(el: Element, why: string): Promise<void> {
  const { cx, cy } = centerOf(el);
  const t = innerTarget(el);
  const seq: Event[] = [
    mkPointer("pointerover", cx, cy, true),
    mkPointer("pointerenter", cx, cy, false),
    mkMouse("mouseover", cx, cy, true),
    mkMouse("mouseenter", cx, cy, false),
    mkPointer("pointerdown", cx, cy, true),
    mkMouse("mousedown", cx, cy, true),
    mkPointer("pointerup", cx, cy, true),
    mkMouse("mouseup", cx, cy, true),
    mkMouse("click", cx, cy, true),
  ];
  for (const ev of seq) t.dispatchEvent(ev);
  if (dev()) {
    console.info(
      `[OutboxIQ] recipe fireFull → ${why}: <${t.tagName.toLowerCase()}>`,
    );
  }
  await sleep(120);
}

/** The chevron has its own local handler — plain mouse events suffice
 * (spike). Coordinates included for safety. */
export async function firePlain(el: Element, why: string): Promise<void> {
  const { cx, cy } = centerOf(el);
  for (const type of ["mousedown", "mouseup", "click"]) {
    el.dispatchEvent(mkMouse(type, cx, cy, true));
  }
  if (dev()) console.info(`[OutboxIQ] recipe firePlain → ${why}`);
  await sleep(120);
}

/**
 * Set a value on a Gmail input the way a real user would, so Gmail's
 * Closure-controlled field actually registers it: use the native prototype
 * setter (React/Closure override the instance setter), then fire input +
 * change. Confirmed necessary for the custom-path date/time inputs (probe).
 */
export function setNativeValue(el: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
