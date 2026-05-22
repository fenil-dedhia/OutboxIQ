// PRD §5.3 scheduling actions — turn a modal choice into a real native
// scheduled send by driving Gmail's own UI through the verified recipe
// (research/scheduled-send-api-spike.md + research/pick-date-time-probe.md
// Result log). All Gmail DOM lives in gmail-recipe; this file only
// orchestrates it, always with our own interception suppressed so we don't
// re-intercept the synthetic activation.
//
// Paths:
//   • PRESET  → open the native dialog, click the matching native preset
//     row. Selection is by CONTENT (the "May 17, 8:00 AM" date+time the row
//     embeds), never by position — Gmail inserts an extra "Last scheduled
//     time" row when the user has scheduled before, which shifts positions.
//     No positional fallback: if no row matches confidently we throw, and
//     the caller hands off to Gmail's native UI (never schedule the wrong
//     time silently).
//   • CUSTOM / LAST-SCHEDULED → open the native dialog, click "Pick date &
//     time" (`.Az.AM`), fill the two inputs, click the confirm button.
//     Verified openable by the Session 4 probe.

import {
  SEL_CHEVRON,
  SEL_SCHEDULE_MENUITEM,
  SEL_DIALOG_PRESET,
  SEL_DIALOG_PICK_DATETIME,
  fireFull,
  firePlain,
  waitFor,
  setNativeValue,
} from "../../lib/schedule/gmail-recipe";
import { withInterceptionSuppressed } from "../compose/compose-integration";
import { formatForGmail } from "../../lib/schedule/gmail-format";
import type { SchedulePreset } from "../../lib/schedule/presets";

const isDev = (): boolean => import.meta.env.DEV;

/** The schedule dialog: prefer the one that actually contains preset rows
 * (structural, locale-independent); fall back to any open dialog. */
function findScheduleDialog(): HTMLElement | null {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"]'),
  );
  return (
    dialogs.find((d) => d.querySelector(SEL_DIALOG_PRESET)) ??
    dialogs[dialogs.length - 1] ??
    null
  );
}

/** Open Gmail's native schedule dialog (chevron → "Schedule send" item).
 * Leaves it open — also the error fallback so the user is never stranded
 * (PRD §5.2.3). */
export async function openNativeScheduleDialog(): Promise<void> {
  await withInterceptionSuppressed(async () => {
    const chevron = await waitFor(
      () => document.querySelector<HTMLElement>(SEL_CHEVRON),
      { label: "chevron" },
    );
    await firePlain(chevron, "chevron");
    const item = await waitFor(
      () => document.querySelector<HTMLElement>(SEL_SCHEDULE_MENUITEM),
      { label: "scheduledSend" },
    );
    await fireFull(item, "scheduledSend menuitem");
    await waitFor(findScheduleDialog, { label: "schedule dialog" });
  });
}

/**
 * Schedule via a Quick Option by driving Gmail's matching native preset row.
 * Match is by the date+time substring Gmail embeds in the row
 * ("Tomorrow morningMay 17, 8:00 AM") — robust against the extra
 * "Last scheduled time" row and against position. No confident match →
 * throw (caller falls back to native; never mis-schedule silently).
 */
export async function schedulePreset(preset: SchedulePreset): Promise<void> {
  await openNativeScheduleDialog();
  await withInterceptionSuppressed(async () => {
    const { rowKey } = formatForGmail(preset.wall);
    // Wait for the MATCHING preset row directly (document-wide over dialogs),
    // for the same multi-dialog + render-race reason as scheduleAt: a dialog
    // chosen too early (the compose window, or before the rows render) yields
    // zero rows. Match by CONTENT (the embedded date+time), never position —
    // Gmail's extra "Last scheduled time" row shifts indices.
    const row = await waitFor<HTMLElement>(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>(SEL_DIALOG_PRESET),
        ).find((r) =>
          (r.textContent ?? "").replace(/\s+/g, " ").includes(rowKey),
        ) ?? null,
      { label: `preset row "${rowKey}"` },
    );
    if (isDev()) {
      console.info(
        `[Fashionably Late] §5.3 preset "${preset.id}" → row "${rowKey}"`,
      );
    }
    await fireFull(row, `preset ${preset.id}`);
  });
}

/** What the custom / last-scheduled path needs: Gmail-input-ready strings. */
export interface ScheduleAtStrings {
  gmailDate: string; // "May 17, 2026"
  gmailTime: string; // "8:00 AM"
}

function findConfirmButton(dialog: HTMLElement): HTMLElement | null {
  const buttons = Array.from(
    dialog.querySelectorAll<HTMLElement>('button, [role="button"]'),
  );
  const txt = (b: HTMLElement): string =>
    (b.textContent ?? "").trim().toLowerCase();
  // Primary: exact "Schedule send" (locale-dependent — same accepted risk as
  // the chevron's aria-label). Fallback: a schedule-ish button that is not
  // Cancel/None/Today/calendar-nav.
  return (
    buttons.find((b) => txt(b) === "schedule send") ??
    buttons.find(
      (b) => /schedule/.test(txt(b)) && !/cancel|none|today|»|«/.test(txt(b)),
    ) ??
    null
  );
}

export interface PickerFields {
  dateInput: HTMLInputElement;
  timeInput: HTMLInputElement;
  dialog: HTMLElement;
}

// Match Gmail's pre-filled custom-picker fields by value SHAPE:
//   date — "May 16, 2026"   (MMM D, YYYY)
//   time — "1:33 PM"        (h:mm A)
const DATE_VALUE = /[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/;
const TIME_VALUE = /\d{1,2}:\d{2}\s*[AP]M/i;

/**
 * Locate the custom "Pick date & time" picker's two inputs among the open
 * dialogs. Gmail keeps several [role="dialog"] nodes mounted at once (the
 * compose window is itself a role=dialog) and mounts the picker as a FRESH
 * dialog when "Pick date & time" is clicked, so we can't pin a node reference
 * or assume which dialog is "the" schedule dialog. Instead we identify the
 * picker by its CONTENTS: per the Session-4 probe it holds exactly two
 * pre-filled inputs whose values look like a date and a time. Matching those
 * shapes pins the picker unambiguously and never the compose window's
 * To/Subject inputs. Returns null until such a dialog exists (caller polls).
 * Exported for unit testing the multi-dialog disambiguation.
 */
export function findPickerFields(dialogs: HTMLElement[]): PickerFields | null {
  for (const dialog of dialogs) {
    const ins = Array.from(dialog.querySelectorAll<HTMLInputElement>("input"));
    const dateInput = ins.find((i) => DATE_VALUE.test(i.value));
    const timeInput = ins.find((i) => TIME_VALUE.test(i.value));
    if (dateInput && timeInput && dateInput !== timeInput) {
      return { dateInput, timeInput, dialog };
    }
  }
  return null;
}

/**
 * Schedule at a specific time via Gmail's custom "Pick date & time" path.
 * Drives: open dialog → click "Pick date & time" (`.Az.AM`) → set the two
 * inputs (probe-confirmed order: [date, time]) → click confirm. Powers both
 * the modal's custom picker and the "Last scheduled time" row.
 */
export async function scheduleAt(when: ScheduleAtStrings): Promise<void> {
  await openNativeScheduleDialog();
  await withInterceptionSuppressed(async () => {
    // (1) Wait for the "Pick date & time" ROW itself, document-wide — NOT
    // merely "a dialog that has presets". Gmail keeps multiple [role="dialog"]
    // elements mounted at once (the compose window is itself a role=dialog),
    // and the schedule menu's rows render a tick AFTER the dialog node appears.
    // The old "resolve a dialog, then query it once" approach raced: it could
    // hand back the COMPOSE dialog before the schedule rows existed, and the
    // `.Az.AM` query found nothing → intermittent "Pick date & time row not
    // found" (live diag 2026-05-22: dialogs=2; the row IS `.Az.AM`, so the
    // selector was right — the failure was dialog/timing). Polling for the row
    // fixes both. `.Az.AM` uniquely marks it (presets are `.Az` only).
    const pick = await waitFor<HTMLElement>(
      () => document.querySelector<HTMLElement>(SEL_DIALOG_PICK_DATETIME),
      { label: "Pick date & time row" },
    );
    await fireFull(pick, "Pick date & time");

    // (2) Clicking the row swaps the menu out for the date/time picker, which
    // Gmail renders as a FRESHLY-MOUNTED dialog (it tears the menu's node down).
    // A reference captured before the click goes stale → "custom date/time
    // inputs" timeout (2026-05-22). So re-query fresh each poll and let
    // findPickerFields identify the picker by its CONTENTS (a date-shaped and a
    // time-shaped input value), never by node identity or dialog order.
    const fields = await waitFor(
      () =>
        findPickerFields(
          Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')),
        ),
      { label: "custom date/time inputs" },
    );
    setNativeValue(fields.dateInput, when.gmailDate);
    setNativeValue(fields.timeInput, when.gmailTime);

    // (3) Confirm — scoped to the picker dialog we just identified.
    const confirm = findConfirmButton(fields.dialog);
    if (!confirm) throw new Error("custom-path confirm button not found");
    if (isDev()) console.info("[Fashionably Late] §5.3.4 custom-path confirm");
    await fireFull(confirm, "custom Schedule send");
  });
}
