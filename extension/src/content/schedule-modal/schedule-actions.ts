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
    const dialog = await waitFor(findScheduleDialog, { label: "dialog" });
    const rows = Array.from(
      dialog.querySelectorAll<HTMLElement>(SEL_DIALOG_PRESET),
    );
    const { rowKey } = formatForGmail(preset.wall);
    const row = rows.find((r) =>
      (r.textContent ?? "").replace(/\s+/g, " ").includes(rowKey),
    );
    if (!row) {
      throw new Error(
        `no native preset row matched "${rowKey}" (${rows.length} rows)`,
      );
    }
    if (isDev()) {
      console.info(`[OutboxIQ] §5.3 preset "${preset.id}" → row "${rowKey}"`);
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

/**
 * Schedule at a specific time via Gmail's custom "Pick date & time" path.
 * Drives: open dialog → click "Pick date & time" (`.Az.AM`) → set the two
 * inputs (probe-confirmed order: [date, time]) → click confirm. Powers both
 * the modal's custom picker and the "Last scheduled time" row.
 */
export async function scheduleAt(when: ScheduleAtStrings): Promise<void> {
  await openNativeScheduleDialog();
  await withInterceptionSuppressed(async () => {
    const dialog = await waitFor(findScheduleDialog, { label: "dialog" });
    const pick = dialog.querySelector<HTMLElement>(SEL_DIALOG_PICK_DATETIME);
    if (!pick) throw new Error('"Pick date & time" row not found');
    await fireFull(pick, "Pick date & time");

    // Picker swaps into the same dialog; wait for its two inputs.
    const inputs = await waitFor(
      () => {
        const dlg = findScheduleDialog();
        const found = dlg
          ? Array.from(dlg.querySelectorAll<HTMLInputElement>("input"))
          : [];
        return found.length >= 2 ? found : null;
      },
      { label: "custom date/time inputs" },
    );
    const [dateInput, timeInput] = inputs; // probe-confirmed order
    if (!dateInput || !timeInput) {
      throw new Error("custom date/time inputs missing");
    }
    setNativeValue(dateInput, when.gmailDate);
    setNativeValue(timeInput, when.gmailTime);

    const dlg = findScheduleDialog();
    const confirm = dlg ? findConfirmButton(dlg) : null;
    if (!confirm) throw new Error("custom-path confirm button not found");
    if (isDev()) console.info("[OutboxIQ] §5.3.4 custom-path confirm");
    await fireFull(confirm, "custom Schedule send");
  });
}
