// Single source of truth for cross-cutting constants.

// Planned public Privacy Policy URL. Per PRE_LAUNCH_CHECKLIST.md, the policy
// will be hosted as `docs/privacy.md` on GitHub Pages from this same repo
// (github.com/fenil-dedhia/OutboxIQ), and the onboarding flow, OAuth consent
// screen, and Settings panel all hard-code the resulting stable URL.
//
// IMPORTANT: this link 404s until the policy is written (a deliberate
// pre-launch task). It is intentionally the real future URL so nothing has to
// change at launch. The exact path form (`/privacy` vs `/privacy.html`)
// depends on the Jekyll/Pages config that does not exist yet — the checklist
// defers pinning the exact stable URL to pre-launch. Change it HERE only.
export const PRIVACY_POLICY_URL =
  "https://fenil-dedhia.github.io/OutboxIQ/privacy";

// Recorded in the consent record at consent time. No policy is published yet,
// so this sentinel marks "consented before a versioned policy existed". When
// the real policy ships with a version, bump this (one place).
export const PRIVACY_POLICY_VERSION = "unpublished-pre-launch";

// chrome.storage.local keys.
export const STORAGE_KEY_STATE = "outboxiqState";
export const STORAGE_KEY_ONBOARDING_DRAFT = "outboxiqOnboardingDraft";

// Version of the persisted OutboxIQState shape (PRD §7.2). Bump when the
// shape changes and add a migration in getState(); see CLAUDE.md. There is
// intentionally no migration framework yet — this just lays the foundation.
export const SCHEMA_VERSION = 1;

// Path (relative to the extension root) of the standalone onboarding page,
// as emitted by the CRXJS build. Used to open/locate the onboarding tab.
export const ONBOARDING_PAGE_PATH = "src/pages/onboarding/index.html";
