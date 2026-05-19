// PRD §5.2.3 hardening — render-time fallback for the §5.3 modal.
//
// Why this exists (Session 4 honest gap → Session 5): a throw during React
// render/commit of <ScheduleModal> is NOT synchronous to the caller. The
// §5.2 interceptor's try/catch (compose-integration.ts) wraps only the
// *synchronous* openScheduleModal() call; by the time React renders, that
// catch has long returned. So a render-time throw would leave the user with
// a dead/empty Shadow-DOM host AND Gmail's native Schedule Send already
// suppressed — the exact §5.2.3 ("never block native Gmail") hole.
//
// An error boundary is the only React mechanism that catches descendant
// render/lifecycle/constructor throws. It does NOT catch event-handler or
// async errors — but those are already covered by ScheduleModal's own
// run() try/catch and the §5.2.3 path, so this closes precisely the
// remaining gap and regresses nothing.

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Invoked once after a caught render/lifecycle throw, deferred OUT of
   * React's commit phase (see componentDidCatch). The caller tears down the
   * host and hands off to Gmail's native scheduler (§5.2.3). */
  onError: (error: unknown) => void;
}

interface State {
  failed: boolean;
}

export class ModalErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  /** Fire the handoff exactly once. StrictMode double-invokes render in dev,
   * so componentDidCatch can fire twice — but we must only tear down / drive
   * Gmail once. */
  private notified = false;

  static getDerivedStateFromError(): State {
    // Stop rendering the broken subtree immediately — render null so no
    // half-broken modal flashes before the host is torn down.
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (this.notified) return;
    this.notified = true;
    // Defer the handoff: unmounting the React root / driving Gmail's DOM
    // synchronously here would re-enter React mid-commit. setTimeout(0)
    // runs it after the current commit settles.
    setTimeout(() => this.props.onError(error), 0);
    if (import.meta.env.DEV) {
      console.warn(
        "[Fashionably Late] §5.3 modal render error → native fallback:",
        error,
        info.componentStack,
      );
    }
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
