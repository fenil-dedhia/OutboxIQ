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

// chrome.storage.local keys. These are opaque, brand-independent, PERMANENTLY
// FROZEN identifiers (CLAUDE.md "Locked tech decisions" — renaming them would
// orphan existing users' local data; a rebrand must not touch them).
export const STORAGE_KEY_STATE = "outboxiqState";
export const STORAGE_KEY_ONBOARDING_DRAFT = "outboxiqOnboardingDraft";

// Free v1 OAuth: the cached short-lived ACCESS TOKEN only (PRD §7.5). Kept
// DELIBERATELY SEPARATE from outboxiqState (the §7.2 settings/data blob) so
// ephemeral auth material never entangles with user data or forces a
// SCHEMA_VERSION bump. Frozen identifier, same rule as the keys above.
//
// PREMIUM_NOTES: Free v1 stores ONLY an access token here (implicit grant —
// no refresh token is ever issued or stored, anywhere). Premium v1 does NOT
// extend this key: its refresh token lives encrypted on the backend (PRD
// §13.3 Option B), never in chrome.storage.local. Do not add refresh-token
// fields here speculatively (YAGNI / tier-split discipline).
export const STORAGE_KEY_AUTH = "outboxiqAuth";

// Version of the persisted OutboxIQState shape (PRD §7.2). Bump when the
// shape changes and add a migration in getState(); see CLAUDE.md. There is
// intentionally no migration framework yet — this just lays the foundation.
//
// v1→v2 (2026-05-16): added `lastScheduled` (PRD §5.3.3 amendment). Purely
// additive + nullable, so getState()'s default-merge is the migration; no
// explicit version branch needed yet.
export const SCHEMA_VERSION = 2;

// Path (relative to the extension root) of the standalone onboarding page,
// as emitted by the CRXJS build. Used to open/locate the onboarding tab.
export const ONBOARDING_PAGE_PATH = "src/pages/onboarding/index.html";

// PRD §5.2.1: the native "Schedule send" dropdown item is relabelled to this.
// Verbatim from the PRD — do not paraphrase (it is the one branded surface in
// compose; §8.1 "native feel over branded feel" keeps it to exactly this).
export const SCHEDULE_SEND_LABEL =
  "Schedule Send (powered by Fashionably Late)";
