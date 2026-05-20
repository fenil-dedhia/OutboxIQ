// PRD §5.3.5 Fashionably Late Optimize Section — items (a)–(n).
//
// Rendered inside the §5.3 modal below Quick Options + Pick Custom (spec (a)).
// Self-contained: owns its own engaged/recipient/timing/timezone/remember
// state; surfaces "the user has picked a complete Optimize time" upward
// via `onChange(OptimizeChoice | null)`. The parent (ScheduleModal) maps a
// non-null choice to a commit-time send WITHOUT running the §5.5 warning
// (Entry 40 Case 1 exception — the four-step engagement here is explicit
// feature-mediated intent; the calc still runs in the parent for parity).
//
// Locked behaviour (PRD §5.3.5 / Entry 40 — do not re-litigate here):
//   (a) Checkbox starts UNCHECKED on modal open (opt-in per send).
//   (b) Recipient dropdown sourced from compose To+CC (BCC excluded).
//   (c) Per-entry display = name (or email); the "(To)"/"(CC)" field
//       suffix was DROPPED (owner UX call 2026-05-20, PRD §5.3.5 (c)
//       amendment) — not information worth surfacing. `field` still
//       carried in data for BCC exclusion.
//   (d) Single recipient → pre-selected; multi → "Choose recipient…"
//       placeholder; Schedule disabled until one is selected.
//   (e) Display name from compose DOM (Gmail's resolved chip); never
//       emailed → email shown.
//   (f) Two timings only: Morning peak (9 AM their time) [default] /
//       Midday engagement (1 PM their time). "End of day" dropped — out
//       of scope, not deferred.
//   (g) Tooltip: open-rate framing only (the "based on general research,
//       not Fashionably Late tracking" disclaimer was dropped as awkward
//       justification, owner UX call 2026-05-20 — §11 no-tracking remains
//       binding on BEHAVIOUR; it was never a copy requirement).
//   (h) Cache hit → confirmation line.
//   (i) Cache miss → inline tz picker with "Choose their timezone"
//       placeholder (NOT user's tz), Remember default-checked,
//       Schedule disabled until tz selected.
//   (j) Manual cache TTL: indefinite (recipient-cache.ts is source-aware).
//   (k) IANA tz picker MUST be the shared TimezonePicker component
//       (used by both onboarding §5.1.3 Step 2 + here — binding lock).
//   (l) No "I don't know" hint / heuristic fallback.
//   (m) Multi-recipient unselected → inert section, Schedule disabled.
//       The "Optimize timing for" panel is gated on a SELECTED recipient
//       (engaged && selected): pick the person first, then configure
//       timing (owner UX call 2026-05-20). Single-recipient composes
//       auto-select, so the panel appears immediately on engage.
//   (n) §5.5 Default-boundaries warning suppressed for Optimize-computed
//       times (handled by the parent's commit path; this component does
//       not invoke the warning).

import { useEffect, useId, useMemo, useState } from "react";
import { TimezonePicker } from "../../lib/components/TimezonePicker";
import { getCachedRecipient } from "../../lib/recipient-cache";
import {
  computeOptimizeSendTime,
  type OptimizeTiming,
} from "../../lib/schedule/optimize-time";
import { formatForGmail } from "../../lib/schedule/gmail-format";
import { formatTimezoneLabel } from "../../lib/schedule/timezone-format";
import type { ComposeRecipient } from "../compose/compose-recipients";

export interface OptimizeChoice {
  recipientEmail: string;
  recipientName: string | null;
  recipientTz: string;
  timing: OptimizeTiming;
  /** True when the user picked the tz manually via the inline picker AND
   * chose to remember it (spec (i)). Drives whether the parent writes
   * the cache on Schedule (cache hits aren't re-written). */
  rememberTz: boolean;
  /** True iff this choice came from a cache hit (recipient already had a
   * stored timezone before the modal opened). Drives the same parent
   * decision from the opposite direction — never re-write a hit. */
  cacheHit: boolean;
}

export interface OptimizeSectionProps {
  /** Already-filtered To+CC (BCC excluded by `readComposeRecipients`). */
  recipients: ComposeRecipient[];
  /** User's IANA timezone — drives the "your time" half of the (h) line. */
  userTimezone: string;
  /** User's pinned IANA zones (PRD §5.1.3 Step 2) — surfaced in the inline
   * timezone picker's "Pinned" section. */
  pinnedTimezones?: string[];
  /** Bubbles a complete (commit-ready) Optimize choice, or null when the
   * section is unengaged / incomplete. The parent uses non-null presence
   * to enable Schedule and to bypass the §5.5 warning on commit. */
  onChange: (choice: OptimizeChoice | null) => void;
  /** Bubbles "checkbox engaged" so the parent can clear its own preset /
   * custom selection (the modal is one-decision-at-a-time, §8.7). */
  onEngage?: () => void;
  /** External signal to disengage Optimize (parent picked a preset / custom).
   * Increments to force a reset; identity-compared, not value-read. */
  resetSignal?: number;
  disabled?: boolean;
}

interface TzState {
  /** "loading" while we read the cache; never visible to the user (the
   * Optimize body waits for either "hit" or "miss" before rendering). */
  kind: "loading" | "hit" | "miss";
  /** Cached tz for a hit; null for a miss/loading. */
  cachedTz: string | null;
  /** User's manual selection during a miss; null until they pick one. */
  manualTz: string | null;
}

function recipientKey(r: ComposeRecipient): string {
  return r.email.toLowerCase();
}

function recipientDisplay(r: ComposeRecipient): string {
  // Name where Gmail rendered one into the chip; else the email (spec (e),
  // never-emailed recipients). The "(To)"/"(CC)" field suffix was dropped
  // (owner UX call 2026-05-20 — see PRD §5.3.5 (c) amendment): the To-vs-CC
  // distinction is not information worth surfacing in the dropdown. `field`
  // is still carried in the data for BCC exclusion + future use.
  return r.displayName ?? r.email;
}

export function OptimizeSection({
  recipients,
  userTimezone,
  pinnedTimezones,
  onChange,
  onEngage,
  resetSignal,
  disabled,
}: OptimizeSectionProps) {
  const [engaged, setEngaged] = useState(false);
  const initialRecipient = recipients.length === 1 ? recipients[0]! : null;
  const [selectedKey, setSelectedKey] = useState<string | null>(
    initialRecipient ? recipientKey(initialRecipient) : null,
  );
  const [timing, setTiming] = useState<OptimizeTiming>("morning");
  const [remember, setRemember] = useState(true);
  const [tzState, setTzState] = useState<TzState>({
    kind: "loading",
    cachedTz: null,
    manualTz: null,
  });
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const checkboxId = useId();
  const recipientId = useId();
  const timingId = useId();
  const tzPickerId = useId();

  const selected = useMemo(
    () => recipients.find((r) => recipientKey(r) === selectedKey) ?? null,
    [recipients, selectedKey],
  );

  // Parent-driven disengage: when the parent's preset/custom selection
  // changes, drop Optimize so the two choices are never simultaneously
  // "ready" (one-decision-at-a-time — §8.7).
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setEngaged(false);
    }
  }, [resetSignal]);

  // Cache lookup whenever the selected recipient changes. Runs even when
  // unengaged so flipping the checkbox renders the right body instantly
  // (no second loading flash). Cleanup flag avoids race-set if the user
  // picks another recipient before the first resolves.
  useEffect(() => {
    if (!selected) {
      setTzState({ kind: "miss", cachedTz: null, manualTz: null });
      return;
    }
    let cancelled = false;
    setTzState({ kind: "loading", cachedTz: null, manualTz: null });
    void getCachedRecipient(selected.email).then((hit) => {
      if (cancelled) return;
      if (hit) {
        setTzState({ kind: "hit", cachedTz: hit.timezone, manualTz: null });
      } else {
        setTzState({ kind: "miss", cachedTz: null, manualTz: null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Active tz: cached if hit, else manual pick (or null if miss-pending).
  const activeTz: string | null =
    tzState.kind === "hit" ? tzState.cachedTz : tzState.manualTz;

  // Bubble the choice. The parent treats non-null as "Schedule-ready,
  // bypass §5.5". Engaged-but-incomplete (no recipient, no tz) → null.
  useEffect(() => {
    if (!engaged || !selected || !activeTz) {
      onChange(null);
      return;
    }
    onChange({
      recipientEmail: selected.email,
      recipientName: selected.displayName,
      recipientTz: activeTz,
      timing,
      rememberTz: tzState.kind === "miss" && remember,
      cacheHit: tzState.kind === "hit",
    });
  }, [engaged, selected, activeTz, timing, remember, tzState.kind, onChange]);

  // Empty compose: hide the section entirely (spec (a) — visible only when
  // there's a recipient; covers both "user hasn't typed any yet" and the
  // §6.7 graceful-degrade case where DOM read returned an empty array).
  if (recipients.length === 0) return null;

  // The (h) line previews recipient + user time. Computed only when
  // engaged + complete so an idle section doesn't churn it.
  const preview =
    engaged && selected && activeTz
      ? (() => {
          const result = computeOptimizeSendTime(
            new Date(),
            userTimezone,
            activeTz,
            timing,
          );
          const userFmt = formatForGmail(result.userWall);
          const recipFmt = formatForGmail(result.recipientWall);
          const userLabel = formatTimezoneLabel(userTimezone, result.moment);
          const recipLabel = formatTimezoneLabel(activeTz, result.moment);
          return {
            recipTime: recipFmt.gmailTime,
            recipAbbr: recipLabel.abbr,
            recipCity: recipLabel.city,
            userTime: userFmt.gmailTime,
            userAbbr: userLabel.abbr,
          };
        })()
      : null;

  return (
    <div className="optimize">
      <hr className="divider" />

      <div className="optimize-row">
        <label
          className="optimize-engage"
          htmlFor={checkboxId}
          title="Optimize delivery for a specific recipient's working hours"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={engaged}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.checked;
              setEngaged(next);
              if (next) onEngage?.();
            }}
          />
          <span>Optimize delivery for</span>
        </label>

        <select
          id={recipientId}
          aria-label="Optimize recipient"
          className="optimize-recipient"
          value={selectedKey ?? ""}
          disabled={disabled}
          onChange={(e) => setSelectedKey(e.target.value || null)}
        >
          {(recipients.length > 1 || !selectedKey) && (
            <option value="" disabled>
              Choose recipient…
            </option>
          )}
          {recipients.map((r) => (
            <option key={recipientKey(r)} value={recipientKey(r)}>
              {recipientDisplay(r)}
            </option>
          ))}
        </select>
      </div>

      {engaged && selected && (
        <div className="optimize-body">
          <label className="optimize-timing-row" htmlFor={timingId}>
            <span className="optimize-timing-label">Optimize timing for</span>
            <select
              id={timingId}
              className="optimize-timing"
              value={timing}
              disabled={disabled}
              onChange={(e) => setTiming(e.target.value as OptimizeTiming)}
            >
              <option value="morning">Morning peak (9:00 AM their time)</option>
              <option value="midday">
                Midday engagement (1:00 PM their time)
              </option>
            </select>
            <button
              type="button"
              className="optimize-tooltip-btn"
              aria-expanded={tooltipOpen}
              aria-label="What do these timings mean?"
              onClick={() => setTooltipOpen((v) => !v)}
            >
              i
            </button>
          </label>
          {tooltipOpen && (
            <p className="optimize-tooltip" role="note">
              Morning typically sees the highest open rate. Midday catches
              recipients between meetings.
            </p>
          )}

          {selected && tzState.kind === "miss" && (
            <div className="optimize-tz">
              <label className="optimize-tz-prompt" htmlFor={tzPickerId}>
                What timezone is {recipientDisplay(selected)} in?
              </label>
              <TimezonePicker
                id={tzPickerId}
                value={tzState.manualTz}
                placeholder="Choose their timezone"
                pinnedIanaIds={pinnedTimezones}
                disabled={disabled}
                onChange={(tz) =>
                  setTzState({
                    kind: "miss",
                    cachedTz: null,
                    manualTz: tz,
                  })
                }
                className="optimize-tz-select"
              />
              <label className="optimize-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={disabled}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>
                  Remember for future emails to {recipientDisplay(selected)}
                </span>
              </label>
            </div>
          )}

          {preview && (
            <p className="optimize-confirm">
              We&rsquo;ll send this at {preview.recipTime} in{" "}
              {preview.recipAbbr} ({preview.recipCity}). That&rsquo;s{" "}
              {preview.userTime} {preview.userAbbr} your time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
