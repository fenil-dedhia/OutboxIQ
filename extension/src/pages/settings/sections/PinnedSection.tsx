// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { PinnedTimezonesEditor } from "../../../lib/components/PinnedTimezonesEditor";
import { MAX_PINNED_TIMEZONES } from "../../../lib/timezone/pinned";

// PRD §5.8.2 "Pinned Timezones" (Session-11 amendment). The post-onboarding
// surface to view / add / remove / REORDER pins (onboarding is the only place
// to set them otherwise; upgraded users start with none by migration design).
// Reuses the SAME shared <PinnedTimezonesEditor> as onboarding Step 2, with
// `reorderable` on (the up/down controls are the Settings-only addition).
// Autosaves on every change (PRD §5.8).

interface Props {
  pinned: string[];
  onChange: (pinned: string[]) => void;
}

export function PinnedSection({ pinned, onChange }: Props) {
  return (
    <section className="fl-set-section" aria-labelledby="fl-set-pinned-h">
      <h2 id="fl-set-pinned-h">Pinned timezones</h2>
      <p className="fl-set-help">
        Pin up to {MAX_PINNED_TIMEZONES} timezones for the people you email
        most. They show first — in this order — in every timezone picker. Drag a
        row to reorder (or focus its handle and use the arrow keys).
      </p>
      <PinnedTimezonesEditor pinned={pinned} onChange={onChange} reorderable />
    </section>
  );
}
