import { useCallback, useEffect, useRef, useState } from "react";
import {
  completeOnboarding,
  createDefaultDraft,
  getOnboardingDraft,
  isWorkingHoursValid,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "../../lib/storage";
import { PRIVACY_POLICY_VERSION } from "../../lib/constants";

// Step order: Welcome+consent → Timezone → Working hours (Finish).
export const STEP_COUNT = 3;

type Status = "loading" | "ready" | "done";

export interface UseOnboarding {
  status: Status;
  draft: OnboardingDraft;
  /** Patch the draft; persisted automatically (resume-mid-flow, §5.1.4). */
  update: (patch: Partial<OnboardingDraft>) => void;
  next: () => void;
  back: () => void;
  /** Commits state + consent. Rejects if consent not checked (§5.1.4 AC). */
  finish: () => Promise<void>;
}

export function useOnboarding(): UseOnboarding {
  const [status, setStatus] = useState<Status>("loading");
  const [draft, setDraft] = useState<OnboardingDraft>(createDefaultDraft);
  // Avoid persisting the very first render before the stored draft loads.
  const hydrated = useRef(false);
  // The draft as it was when the user ARRIVED at the current step. Back()
  // restores it, so a step's settings only "stick" when the user clicks
  // Continue — clicking Back discards that step's tentative edits (owner UX,
  // Session 11; e.g. accidentally clearing the pre-selected pins then going
  // Back must NOT lose the defaults). Memory-only: a hard refresh resumes from
  // the persisted draft (§5.1.4), treating that as an implicit commit.
  const stepEntrySnapshot = useRef<OnboardingDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOnboardingDraft().then((stored) => {
      if (cancelled) return;
      // Clamp in case a draft from a previous step layout is still stored.
      setDraft({
        ...stored,
        stepIndex: Math.min(Math.max(stored.stepIndex, 0), STEP_COUNT - 1),
      });
      hydrated.current = true;
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    // Don't persist invalid working hours (#2): while invalid, no draft
    // change is written, so an interrupted edit resumes from the last valid
    // state rather than a broken one.
    if (!isWorkingHoursValid(draft.workingHours)) return;
    saveOnboardingDraft(draft).catch((err: unknown) => {
      // No user-facing UI yet; just don't leave an unhandled rejection.
      console.error(
        "[Fashionably Late] failed to persist onboarding draft:",
        err,
      );
    });
  }, [draft]);

  // Snapshot the draft on arrival at each step (only when stepIndex changes,
  // not on every field edit), so back() can revert this step's tentative edits.
  useEffect(() => {
    stepEntrySnapshot.current = draft;
    // Intentionally keyed on stepIndex only — capturing the whole draft as it
    // is at step-entry; field edits within a step must NOT update the snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.stepIndex]);

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  // Continue: commit this step's edits (they're already in `draft`) by simply
  // advancing. The step-entry snapshot updates via the effect above.
  const next = useCallback(() => {
    setDraft((d) => ({
      ...d,
      stepIndex: Math.min(d.stepIndex + 1, STEP_COUNT - 1),
    }));
  }, []);

  // Back: restore the current step's on-entry snapshot (discard tentative
  // edits) AND step back. Falls back to a plain decrement if no snapshot yet.
  const back = useCallback(() => {
    setDraft((d) => {
      const snap = stepEntrySnapshot.current ?? d;
      return { ...snap, stepIndex: Math.max(snap.stepIndex - 1, 0) };
    });
  }, []);

  const finish = useCallback(async () => {
    // Hard gate: cannot complete onboarding without explicit consent.
    if (!draft.consentChecked) {
      throw new Error("Consent is required to finish onboarding.");
    }
    await completeOnboarding(draft, PRIVACY_POLICY_VERSION);
    setStatus("done");
  }, [draft]);

  return { status, draft, update, next, back, finish };
}
