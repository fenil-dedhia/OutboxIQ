// Typed wrapper over chrome.storage.local implementing the PRD §7.2 schema.
// This is the local-first state layer every other feature reads; onboarding
// (PRD §5.1) is what first populates it. Nothing here is ever transmitted.

import {
  STORAGE_KEY_STATE,
  STORAGE_KEY_ONBOARDING_DRAFT,
  SCHEMA_VERSION,
} from "./constants";

export type TimezoneSource = "calendar_api" | "browser" | "manual";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export interface DayHours {
  enabled: boolean;
  /** "HH:MM" 24h */
  start: string;
  /** "HH:MM" 24h */
  end: string;
}

export type WorkingHours = Record<Weekday, DayHours> & {
  /** Absolute floor — never send before this, any timezone. PRD §5.1 step 3. */
  absoluteEarliest: string;
  /** Absolute ceiling — never send after this, any timezone. */
  absoluteLatest: string;
};

export interface WorkingHoursErrors {
  /** Message per weekday; only present for an invalid *enabled* day. */
  days: Partial<Record<Weekday, string>>;
  /** Message for the absolute earliest/latest bounds, or null if valid. */
  bounds: string | null;
}

// PRD §5.1 step 3 validation. Zero-padded "HH:MM" strings compare
// lexicographically the same as chronologically, so plain `<` is correct.
// Disabled days are not validated (their times don't matter).
export function validateWorkingHours(wh: WorkingHours): WorkingHoursErrors {
  const days: Partial<Record<Weekday, string>> = {};
  for (const day of WEEKDAYS) {
    const d = wh[day];
    if (d.enabled && d.end < d.start) {
      days[day] = "End time must be after start time.";
    }
  }
  const bounds =
    wh.absoluteLatest < wh.absoluteEarliest
      ? "Latest send time must be after the earliest."
      : null;
  return { days, bounds };
}

export function isWorkingHoursValid(wh: WorkingHours): boolean {
  const e = validateWorkingHours(wh);
  return Object.keys(e.days).length === 0 && e.bounds === null;
}

export interface UserState {
  /** Empty until OAuth/identity is wired (just-in-time); not collected in §5.1. */
  email: string;
  /** IANA timezone, e.g. "Europe/Amsterdam". */
  timezone: string;
  timezoneSource: TimezoneSource;
  /** ISO timestamp once onboarding is finished; null means not onboarded. */
  onboardingCompletedAt: string | null;
}

export interface FeatureToggles {
  recipientOptimization: boolean;
  autoRescheduleOnOutsideHours: boolean;
  unscheduleOnReply: boolean;
  scheduleConfirmationToast: boolean;
  alwaysScheduleOutsideHours: boolean;
}

export interface RecipientCacheEntry {
  email: string;
  name: string | null;
  timezone: string;
  source: "people_api" | "directory" | "manual" | "cache";
  resolvedAt: string;
}

export interface Consent {
  privacyPolicyVersion: string;
  consentedAt: string;
}

/**
 * The time the user last scheduled THROUGH Fashionably Late (PRD §5.3.3 amendment,
 * 2026-05-16 — mirrors Gmail's native "Last scheduled time" row). We store
 * what we scheduled rather than scraping Gmail's own value: local-first,
 * no extra Gmail interaction, only a timestamp (no email content). The
 * Gmail-input-format strings are stored pre-rendered so re-scheduling needs
 * no timezone/DST recomputation.
 */
export interface LastScheduled {
  /** Gmail-style human display, e.g. "Sun, May 17, 8:00 AM". */
  display: string;
  /** Pre-formatted for Gmail's custom date input, e.g. "May 17, 2026". */
  gmailDate: string;
  /** Pre-formatted for Gmail's custom time input, e.g. "8:00 AM". */
  gmailTime: string;
}

export interface OutboxIQState {
  /** Shape version of this record (PRD §7.2). See SCHEMA_VERSION. */
  schemaVersion: number;
  user: UserState;
  workingHours: WorkingHours;
  featureToggles: FeatureToggles;
  recipientCache: RecipientCacheEntry[];
  /** Null until the user consents in onboarding (PRD §5.1 step 5). */
  consent: Consent | null;
  /** Null until the user schedules at least once via Fashionably Late (§5.3.3). */
  lastScheduled: LastScheduled | null;
}

function defaultDay(enabled: boolean): DayHours {
  return { enabled, start: "09:00", end: "17:00" };
}

/** PRD §5.1/§7.2 defaults: Mon–Fri 09:00–17:00, 07:00/19:00 absolute bounds. */
export function createDefaultState(): OutboxIQState {
  return {
    schemaVersion: SCHEMA_VERSION,
    user: {
      email: "",
      timezone: detectBrowserTimezone(),
      timezoneSource: "browser",
      onboardingCompletedAt: null,
    },
    workingHours: {
      monday: defaultDay(true),
      tuesday: defaultDay(true),
      wednesday: defaultDay(true),
      thursday: defaultDay(true),
      friday: defaultDay(true),
      saturday: defaultDay(false),
      sunday: defaultDay(false),
      absoluteEarliest: "07:00",
      absoluteLatest: "19:00",
    },
    featureToggles: {
      recipientOptimization: true,
      autoRescheduleOnOutsideHours: true,
      unscheduleOnReply: true,
      scheduleConfirmationToast: true,
      alwaysScheduleOutsideHours: false,
    },
    recipientCache: [],
    consent: null,
    lastScheduled: null,
  };
}

/** §6.7 graceful degradation: browser timezone is the documented fallback. */
export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "UTC";
  } catch {
    return "UTC";
  }
}

async function rawGet<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

async function rawSet(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/** Stored state merged over defaults, so a partial/older record is safe. */
export async function getState(): Promise<OutboxIQState> {
  const stored = await rawGet<Partial<OutboxIQState>>(STORAGE_KEY_STATE);
  const defaults = createDefaultState();
  if (!stored) return defaults;
  return {
    schemaVersion: stored.schemaVersion ?? defaults.schemaVersion,
    user: { ...defaults.user, ...stored.user },
    workingHours: { ...defaults.workingHours, ...stored.workingHours },
    featureToggles: { ...defaults.featureToggles, ...stored.featureToggles },
    recipientCache: stored.recipientCache ?? defaults.recipientCache,
    consent: stored.consent ?? defaults.consent,
    // SCHEMA_VERSION 1→2 added `lastScheduled`. It is purely additive and
    // nullable, so this default-merge IS the migration: an older v1 record
    // simply lacks the key and resolves to null. No explicit version branch
    // is needed yet (see CLAUDE.md migration convention).
    lastScheduled: stored.lastScheduled ?? defaults.lastScheduled,
  };
}

export async function setState(state: OutboxIQState): Promise<void> {
  await rawSet(STORAGE_KEY_STATE, state);
}

/** Record the time just scheduled via Fashionably Late (PRD §5.3.3 amendment). */
export async function setLastScheduled(value: LastScheduled): Promise<void> {
  const state = await getState();
  await setState({ ...state, lastScheduled: value });
}

export async function isOnboardingComplete(): Promise<boolean> {
  const state = await getState();
  return state.user.onboardingCompletedAt !== null;
}

// --- Onboarding draft (resume-mid-flow, PRD §5.1.4) -------------------------
// The in-progress answers are persisted separately from the committed state,
// so an interrupted onboarding never leaves partial/unconsented data in the
// real schema. Only completeOnboarding() writes OutboxIQState.

export interface OnboardingDraft {
  stepIndex: number;
  timezone: string;
  timezoneSource: TimezoneSource;
  workingHours: WorkingHours;
  consentChecked: boolean;
}

export function createDefaultDraft(): OnboardingDraft {
  const d = createDefaultState();
  return {
    stepIndex: 0,
    timezone: d.user.timezone,
    timezoneSource: d.user.timezoneSource,
    workingHours: d.workingHours,
    consentChecked: false,
  };
}

export async function getOnboardingDraft(): Promise<OnboardingDraft> {
  const stored = await rawGet<Partial<OnboardingDraft>>(
    STORAGE_KEY_ONBOARDING_DRAFT,
  );
  return { ...createDefaultDraft(), ...stored };
}

export async function saveOnboardingDraft(
  draft: OnboardingDraft,
): Promise<void> {
  await rawSet(STORAGE_KEY_ONBOARDING_DRAFT, draft);
}

async function clearOnboardingDraft(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_ONBOARDING_DRAFT);
}

/** Atomically commit a finished onboarding: writes state, clears the draft. */
export async function completeOnboarding(
  draft: OnboardingDraft,
  privacyPolicyVersion: string,
): Promise<void> {
  // Defense in depth: App.tsx disables "Finish Setup" on invalid hours, but
  // the invariant belongs with the data write, not one UI path — §5.5 will
  // enforce against these values, so a non-UI caller or a regression must
  // never be able to commit invalid working hours into the real state.
  // (Zero enabled days is NOT invalid — that's a legitimate
  // absolute-limits-only config; §5.5 treats it as no soft constraint.)
  if (!isWorkingHoursValid(draft.workingHours)) {
    throw new Error("Cannot complete onboarding: working hours are invalid.");
  }
  const now = new Date().toISOString();
  const state = await getState();
  const next: OutboxIQState = {
    ...state,
    user: {
      ...state.user,
      timezone: draft.timezone,
      timezoneSource: draft.timezoneSource,
      onboardingCompletedAt: now,
    },
    workingHours: draft.workingHours,
    consent: { privacyPolicyVersion, consentedAt: now },
  };
  await setState(next);
  await clearOnboardingDraft();
}
