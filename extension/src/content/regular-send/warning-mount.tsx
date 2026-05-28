// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.5.1 — Shadow-DOM mount for the regular-Send soft warning.
//
// Byte-for-byte the same isolation pattern as schedule-modal/mount.tsx (see
// the React-inside-Shadow-DOM gotchas in CLAUDE.md): createRoot targets an
// element INSIDE the shadow root (so React 17+ event delegation works for
// shadow-rendered controls), MODAL_CSS is injected into the shadow (page CSS
// doesn't cross the boundary — and neither do we), and only one host exists
// at a time. The ModalErrorBoundary closes the §5.2.3 hole: a render-time
// throw is async to the guard's try/catch, so the boundary routes it to
// onRenderError → the guard's fail-toward-send (replay native Send).

import { createRoot, type Root } from "react-dom/client";
import { StrictMode } from "react";
import { RegularSendWarning } from "./RegularSendWarning";
import { ModalErrorBoundary } from "../schedule-modal/ErrorBoundary";
import { MODAL_CSS } from "../schedule-modal/styles";
import type { WorkingHoursVerdict } from "../../lib/schedule/working-hours";

const HOST_ID = "outboxiq-regular-send-warning-host";

export interface OpenRegularSendWarningArgs {
  verdict: WorkingHoursVerdict;
  tzAbbr: string;
  onSnap: () => void;
  onProceed: () => void;
  onCancel: () => void;
  /** Render-time throw → guard's fail-toward-send (replay native Send). */
  onRenderError: () => void;
}

export interface RegularSendWarningHandle {
  /** Tear down the host. Idempotent. */
  close: () => void;
}

export function openRegularSendWarning(
  args: OpenRegularSendWarningArgs,
): RegularSendWarningHandle {
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
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    root?.unmount();
    root = null;
    host.remove();
  };

  // Deferred out of React's commit phase by the boundary (componentDidCatch
  // setTimeout(0)), so close()'s synchronous unmount here is safe.
  const handleRenderError = (): void => {
    close();
    args.onRenderError();
  };

  root.render(
    <StrictMode>
      <ModalErrorBoundary onError={handleRenderError}>
        <RegularSendWarning
          verdict={args.verdict}
          tzAbbr={args.tzAbbr}
          onSnap={args.onSnap}
          onProceed={args.onProceed}
          onCancel={args.onCancel}
        />
      </ModalErrorBoundary>
    </StrictMode>,
  );

  return { close };
}
