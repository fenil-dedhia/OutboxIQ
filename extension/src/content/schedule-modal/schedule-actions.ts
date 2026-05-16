// PRD §5.3 scheduling actions — turn a modal choice into a real native
// scheduled send by driving Gmail's own UI through the verified recipe
// (research/scheduled-send-api-spike.md). All Gmail DOM lives in
// gmail-recipe; this file only orchestrates it, always with our own
// interception suppressed so we don't re-intercept the synthetic activation.
//
// Two paths this session:
//   • PRESET  → open Gmail's native schedule dialog, click the matching
//     native preset row. Spike-verified mechanism (it verified one preset
//     click end-to-end). NOTE: matching the right row across day-variants
//     and locales was NOT in the spike's verification — selection here is
//     best-effort + probe-confirmable (see TODO below), same accepted
//     pattern as the §5.2 relabel.
//   • CUSTOM  → handed off to Gmail's own date/time picker (we open the
//     native dialog and leave it for the user). Driving the custom inputs
//     directly is the probe-gated stretch goal, deliberately NOT done here.

import {
  SEL_CHEVRON,
  SEL_SCHEDULE_MENUITEM,
  SEL_DIALOG_PRESET,
  fireFull,
  firePlain,
  waitFor,
} from "../../lib/schedule/gmail-recipe";
import { withInterceptionSuppressed } from "../compose/compose-integration";
import type { SchedulePreset } from "../../lib/schedule/presets";

const isDev = (): boolean => import.meta.env.DEV;

/** "8:00 AM" / "1:00 PM" from 24h wall components. */
function clockLabel(hour: number, minute: number): string {
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

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
 * Leaves it open — used for the §5.3.4 custom handoff and as the error
 * fallback so the user is never stranded (PRD §5.2.3). */
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
 *
 * Row selection (best-effort, TODO(post-probe)): match a row whose accessible
 * text contains the preset's clock time (e.g. "8:00 AM"); fall back to
 * positional order [morning, afternoon, monday]. Confirm/tighten against the
 * probe's "DIALOG (preset view)" dump before relying on this in the wild.
 */
export async function schedulePreset(preset: SchedulePreset): Promise<void> {
  await openNativeScheduleDialog();
  await withInterceptionSuppressed(async () => {
    const dialog = await waitFor(findScheduleDialog, { label: "dialog" });
    const rows = Array.from(
      dialog.querySelectorAll<HTMLElement>(SEL_DIALOG_PRESET),
    );
    if (rows.length === 0) throw new Error("no native preset rows found");

    const wanted = clockLabel(preset.wall.hour, preset.wall.minute);
    const byText = rows.find((r) =>
      (r.textContent ?? "").replace(/\s+/g, " ").includes(wanted),
    );
    const order: Record<SchedulePreset["id"], number> = {
      tomorrow_morning: 0,
      tomorrow_afternoon: 1,
      next_monday_morning: 2,
    };
    const row = byText ?? rows[order[preset.id]] ?? rows[0];
    if (!row) throw new Error("could not resolve a native preset row");
    if (isDev()) {
      console.info(
        `[OutboxIQ] §5.3 preset "${preset.id}" → row matched ` +
          `${byText ? "by text" : "by position (UNVERIFIED — confirm via probe)"}`,
      );
    }
    await fireFull(row, `preset ${preset.id}`);
  });
}
