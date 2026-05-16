import { useCallback, useEffect, useRef, useState } from "react";
import {
  completeOnboarding,
  createDefaultDraft,
  getOnboardingDraft,
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
    saveOnboardingDraft(draft).catch((err: unknown) => {
      // No user-facing UI yet; just don't leave an unhandled rejection.
      console.error("[OutboxIQ] failed to persist onboarding draft:", err);
    });
  }, [draft]);

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const next = useCallback(() => {
    setDraft((d) => ({
      ...d,
      stepIndex: Math.min(d.stepIndex + 1, STEP_COUNT - 1),
    }));
  }, []);

  const back = useCallback(() => {
    setDraft((d) => ({ ...d, stepIndex: Math.max(d.stepIndex - 1, 0) }));
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
