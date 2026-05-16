// Shadow-DOM mount for the §5.3 modal (decision #2: hard CSS isolation).
//
// React + Shadow DOM quirks learned here (also recorded in CLAUDE.md so
// future sessions don't rediscover them):
//   1. createRoot must target an element INSIDE the shadow root, not the
//      host. Since React 17 event delegation roots at the createRoot
//      container; rooting it in the shadow tree is what makes synthetic
//      events fire for controls rendered in the shadow.
//   2. Page CSS does not cross the shadow boundary, so our styles MUST be
//      injected into the shadow root (styles.ts). The flip side is the
//      isolation we wanted: Gmail can't break us and we can't leak into it.
//   3. One host at a time — re-opening removes the previous host so a
//      stale React root can't linger.

import { createRoot, type Root } from "react-dom/client";
import { StrictMode } from "react";
import { ScheduleModal } from "./ScheduleModal";
import { MODAL_CSS } from "./styles";
import type { LastScheduled } from "../../lib/storage";

const HOST_ID = "outboxiq-schedule-modal-host";

export interface OpenScheduleModalArgs {
  timezone: string;
  lastScheduled: LastScheduled | null;
  onScheduled: (v: LastScheduled) => void;
}

export function openScheduleModal(args: OpenScheduleModalArgs): void {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = MODAL_CSS;
  shadow.appendChild(style);

  const container = document.createElement("div");
  shadow.appendChild(container);
  document.body.appendChild(host);

  let root: Root | null = createRoot(container);
  const close = (): void => {
    root?.unmount();
    root = null;
    host.remove();
  };

  root.render(
    <StrictMode>
      <ScheduleModal
        timezone={args.timezone}
        lastScheduled={args.lastScheduled}
        onScheduled={args.onScheduled}
        onClose={close}
      />
    </StrictMode>,
  );
}
