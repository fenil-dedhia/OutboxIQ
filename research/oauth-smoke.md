# Free v1 OAuth + recipient-cascade verification runbook

**What this verifies, hands-on, against live Google:** the Free v1
OAuth implicit-grant flow (`src/background/oauth.ts`, PRD §7.5) **and**
the §5.4.1 recipient-timezone cascade + cache (`timezone-cascade.ts`,
`recipient-cache.ts`, `google-api.ts`). Same "committed, re-runnable,
copy-paste" discipline as `research/regular-send-smoke.md`
(owner-decisions-log Entry 9). Unit tests cover the logic (145 tests);
this covers what only live Google can — Entry-10 discipline.

> **This is the Session-9 owner runbook.** It has three parts, run in
> order, each a gate:
> - **Phase 1 — GCP consent-screen reconfig** (GCP Console; ~15–30 min).
> - **Phase 2 — recipient-cascade verification** (SW console).
> - **Phase 3 — login_hint scope-tension probe** (SW console).
>
> Part 0 (A–E) is the Session-8 OAuth-flow regression — re-run it after
> Phase 1 because the trimmed scope changes the consent screen and
> forces a one-time re-consent.

> **Account note:** OAuth is in **Testing mode** with an explicit
> allowlist. Use a test-list account (`fenil.h.dedhia@gmail.com` or the
> throwaway). A non-allowlisted account is refused by Google — expected,
> not a bug. Where a step says "multi-account", have ≥2 Google accounts
> signed into Chrome.

---

## Phase 1 — GCP consent-screen reconfig (do this FIRST)

Session 8 trimmed Free v1's OAuth ask to **`contacts.readonly` only**
(PRD §6.6, Entry 36). The *code* already requests only that scope; the
*GCP consent screen* still advertises the old four. This phase aligns
GCP. The OAuth **client is unchanged** — only the consent-screen scope
list changes. Existing test users (just you) **re-consent once** on the
next authorize (the prior grant was for the old scope set).

**Steps (GCP Console):**

1. https://console.cloud.google.com/ → make sure the project is
   **`outboxiq-dev`** (project picker, top bar).
2. **APIs & Services → OAuth consent screen**.
3. **Edit app** → advance to the **Scopes** step (the
   **"Update / Edit scopes"** panel).
**Phase 1a — remove the old scopes (✅ DONE & live-verified Session 9):**

4. Removed `gmail.compose`, `gmail.modify`,
   `calendar.settings.readonly`; `contacts.readonly` left as the only
   sensitive scope. Verified via the GCP "Data Access" screen (no
   restricted scopes; contacts-only sensitive) **and** the live consent
   screen on a full-revoke clean token ("See and download your
   contacts" only). No re-verification was triggered. Done.

**Phase 1b — ADD `userinfo.email` (owner task — the Entry-38 decision):**

Session-9 hands-on proved a `contacts.readonly`-only token gets **403**
from `people/me` (it cannot read your own email), so the owner decided
to add the minimal non-sensitive `userinfo.email` scope (PRD §6.6
Entry-38 amendment) to make multi-account silent renewal invisible.

1. https://console.cloud.google.com/ → project **`outboxiq-dev`**.
2. **APIs & Services → OAuth consent screen → Data Access**
   (the same screen as before) → **Add or remove scopes**.
3. In the filter, find/paste
   **`https://www.googleapis.com/auth/userinfo.email`** → tick it →
   **Update**. (It appears under **"Your non-sensitive scopes"** —
   "See your primary Google Account email address". Non-sensitive =
   **no CASA / verification impact**, by design — Entry 38.)
4. Confirm the scope set is now exactly: `contacts.readonly`
   (sensitive) **+** `userinfo.email` (non-sensitive). **Save / Update**
   through to the end.

> **If GCP demands app-verification, a "needs verification" banner, or
> anything beyond a plain scope add in Testing mode — STOP and
> screenshot it** (it should NOT — `userinfo.email` is non-sensitive).
> Surface, don't click through (Entry 15).

**Phase 1b verification:** redo Part 0 test A (with a full revoke
first — Step A below). The consent screen must now show **"See and
download your contacts"** *and* **"See your primary Google Account
email address"** — and nothing else. That screenshot is the Phase-1b
pass artifact, and it sets up the Phase-3 re-confirm (403→200).

---

## Setup (once, before Part 0 / Phase 2 / Phase 3)

> **Use the one-shot `npm run build:smoke`, NOT `npm run dev`.** The
> CRXJS dev server corrupts `dist/` (copies node_modules, the .pem, a
> nested dist/); the SW won't open. `build:smoke` is a clean one-shot
> build that *also* includes the `__oqAuth` harness (a plain
> `npm run build` strips it, so it can never ship — verified this
> session).

1. Terminal (first line wipes any corrupt dist from a prior `dev`):

   ```
   rm -rf /Users/fenildedhia/Code/Projects/OutboxIQ/extension/dist
   npm --prefix /Users/fenildedhia/Code/Projects/OutboxIQ/extension run build:smoke
   ```

   Wait for `✓ built`. Nothing stays running; close the Terminal.
2. Chrome → `chrome://extensions` → Developer mode ON. If a Fashionably Late
   card exists, **Remove** it first. **Load unpacked** →
   `/Users/fenildedhia/Code/Projects/OutboxIQ/extension/dist`.
3. On the card, click the blue **"service worker"** link → DevTools →
   **Console** tab. **Run every `__oqAuth…` command in that console.**
   "service worker (inactive)" → click it to wake it. Look for the
   marker line first:
   > `[Fashionably Late] ✅ OAuth smoke harness ready — type __oqAuth …`
   Absent → stale worker: see the troubleshooting box at the end.

---

## Part 0 — OAuth-flow regression (re-run after Phase 1)

### A. First authorization (interactive — the consent screen)

```js
await __oqAuth.clear();           // start clean (clears the old-scope grant)
await __oqAuth.authorize();
```

A Google window opens. **Expected:**

- An **account chooser** (`prompt=select_account`). With **multiple
  accounts signed in, all are listed and you pick one** — confirm this
  (the multi-account requirement, Entry 29).
- Consent screen lists **"See and download your contacts"** and (after
  Phase 1b) **"See your primary Google Account email address"** — and
  nothing else. It must **NOT** mention Gmail or Calendar. *(Old four
  still shown → Phase 1a didn't take. No email line → Phase 1b
  (`userinfo.email`) not added yet. Fix in GCP, then `__oqAuth.clear()`
  + full revoke, retry.)* → **Allow**.
- Console result: `{ ok: true, token: "ya29.…" }`.

✅ Pass: `ok:true` + token, **and the consent screen showed only
Contacts** (Phase-1 gate). ❌ `{ok:false, reason:"denied"}` despite
clicking Allow → record and stop.

### B. Token works (People — Free v1's only API)

```js
await __oqAuth.testPeople("someone-in-your-contacts@example.com");
```

**Expected:** `{ status: 200, body: {…} }` (200 is the pass signal even
if `body` is empty). Proves the `contacts.readonly` token **and** the
`people.googleapis.com` host both work. 401/403 ⇒ scope/consent;
network error ⇒ host-permission. (Scenario **h** host check: in the SW
DevTools **Network** tab, confirm the request went to
`people.googleapis.com`, not `www.googleapis.com`.)

### C. Cached token reused (no second prompt)

```js
await __oqAuth.authorize();       // immediately again
```

**Expected:** `{ok:true, token}` **with no Google window**; same token
as A.

### D. Silent re-issue after expiry

```js
await __oqAuth.expireNow();
await __oqAuth.silent();
```

**Expected (single-account):** `{ok:true, token}` **no window**, fresh
token. **Multi-account:** may return `{ok:false,
reason:"needs_interactive"}` — that is the documented Session-8
limitation **Phase 3 fixes**; record which you saw and how many
accounts are signed in.

### E. Revocation degrades cleanly

```js
// Revoke "Fashionably Late" at https://myaccount.google.com/permissions, then:
await __oqAuth.clear();
await __oqAuth.silent();
```

**Expected:** `{ok:false, reason:"needs_interactive"}` — clean typed
failure, **no exception**. Re-`authorize()` to restore for Phase 2/3.

---

## Phase 2 — recipient-cascade verification

Tests the real Session-9 contract `resolveRecipientTimezone()` (§5.4.1)
+ the recipient cache — reached in production only via
`MSG_RESOLVE_RECIPIENT_TZ` (no UI until the Session-10 §5.3.5 modal),
so the harness exposes it: `__oqAuth.resolveTz(email)` and
`__oqAuth.cache.{list,clear,setManual}`.

> **Read this first — scenario (a) honest caveat.** Google People has
> **no first-class IANA-timezone field**. `searchContactTimezone`
> returns a timezone *only* if a contact's `locations[].value` is
> literally an IANA string (e.g. `America/New_York`), which Google
> essentially never populates — the PRD acknowledges a single-digit
> hit rate; it is *why* manual-cached-forever exists. So **scenario
> (a) "real contact → `source:"people_api"` with a timezone" is
> effectively NOT observable against live Google** — a real contact
> resolves to `manual_needed` (scenario b). The people_api-success
> *mechanism* is unit-tested (`google-api.test.ts`); do not chase its
> live absence as a bug. Capture the live People `body` (test B) so
> the no-IANA-field reality is on record.

Start clean:

```js
await __oqAuth.cache.clear();
```

### b/c. Contact (or non-contact) with no usable tz → manual_needed

```js
await __oqAuth.resolveTz("someone@example.com");   // not in cache
```

**Expected:** `{ source: "manual_needed", timezone: null }` — the
cascade ran cache→People→(Directory deferred)→manual and degraded
correctly. Same result whether the email is a contact without an IANA
location (b) or not a contact at all (c). ✅ Pass: `manual_needed`,
no throw.

### e. Manual selection persists (then d. cache hit, no network)

```js
await __oqAuth.cache.setManual("someone@example.com", "America/New_York");
await __oqAuth.cache.list();        // shows the entry, source:"manual"
await __oqAuth.resolveTz("someone@example.com");
```

**Expected:** the resolve returns
`{ source: "cache", timezone: "America/New_York" }`. **Scenario d
(no API call):** with the SW DevTools **Network** tab open, this second
`resolveTz` must fire **no `people.googleapis.com` request** (cache
short-circuits step 1). Confirm the IANA string is well-formed
(`America/New_York`), not malformed.

### f. Network failure → manual_needed (no block, no throw)

```js
// DevTools → Network tab → throttling dropdown → "Offline". Then:
await __oqAuth.resolveTz("fresh-uncached@example.com");
// Set throttling back to "No throttling" afterward.
```

**Expected:** `{ source: "manual_needed", timezone: null }` — People
fetch throws → typed `network` → cascade → manual. Never hangs,
never throws (§6.7).

### g. Token expiry mid-cascade → silent renewal fires

```js
await __oqAuth.expireNow();
await __oqAuth.resolveTz("another-uncached@example.com");
```

**Expected:** still resolves (`manual_needed` for a normal contact, per
the (a) caveat) **without error**: inside, People's `getAccessToken`
hit an expired token and silently renewed. **Single-account:** fully
silent. **Multi-account WITHOUT the Phase-3 fix active:** may surface
an account chooser — exactly the limitation Phase 3 addresses; note
which you saw.

---

## Phase 3 — multi-account `login_hint` (RESOLVED & verified live)

**Status: DONE (Session 9), owner-verified live.** History, so the arc
isn't re-walked: `contacts.readonly`-only → 403 from `people/me`; adding
`userinfo.email` (Entry 38) → **still 403** even with
`userinfo.email`+`openid`+`email` in the token (People is simply the
wrong API for the caller's own email — Google's docs wrong three times,
Entry-10). **Shipped mechanism:** the email is read from an **OpenID
id_token in the sign-in redirect** (`response_type=token id_token` +
`nonce`; `openid` scope added; nonce/aud/iss validated). No `people/me`,
no extra call, no new host permission. `testPeopleMe` is **removed**
(it tested the dead path); the probe is now **`whoami`**.

> **Pre-req:** the smoke build that includes the id_token rework; a full
> Google-account revoke + `userinfo.email`+`openid` present in GCP
> (Phase 1b) so the token carries the identity scopes. Re-run only if
> re-verifying or after a related change.

```js
await __oqAuth.clear();
await __oqAuth.authorize();   // consent: contacts + email (+ basic openid)
await __oqAuth.whoami();      // → { ok:true, grantedEmail:<you>, scopes }
await __oqAuth.expireNow();
await __oqAuth.silent();      // → { ok:true, token } with NO account chooser
```

- **✅ PASS (observed Session 9):** `whoami().grantedEmail` is your
  account email; after `expireNow()`, `silent()` returns `{ok:true}`
  **with no account-chooser** even on a multi-account profile. That is
  the Entry-34 limitation closed — the load-bearing Session-9 outcome.
- **⚠️ If `grantedEmail` is null or `authorize()` itself fails** →
  surface with the console output (Entry 15). `grantedEmail:null` alone
  is **no regression** (login_hint omitted = prior graceful re-prompt;
  product still works). `authorize()` wholly failing would implicate
  the `response_type=token id_token` change — revertable in one step.

---

## Result log (fill in when you run it)

```
Date:
Chrome version:
Account(s) used (and how many signed in):

PHASE 1 GCP reconfig : DONE / BLOCKED — notes (any GCP banner?):
  Consent screen now shows ONLY "See your contacts": YES / NO

PART 0
A first authorize    : PASS / FAIL — consent showed only Contacts: YES/NO
B testPeople         : PASS / FAIL — status:
  (h) host = people.googleapis.com in Network tab: YES / NO
C cached reuse       : PASS / FAIL
D silent re-issue    : PASS / FAIL — single/multi account; chooser?:

PHASE 2 cascade
b/c manual_needed    : PASS / FAIL
e manual persists    : PASS / FAIL
d cache hit, NO net  : PASS / FAIL (people.googleapis.com call seen? Y/N)
f offline → manual   : PASS / FAIL
g expiry mid-cascade : PASS / FAIL — silent? or chooser?:
(a) people_api tz observed live: YES (unexpected!) / NO (expected)

PHASE 3 login_hint
testPeopleMe.extracted        :  <email> / null
testPeopleMe.storedGrantedEmail:  <email> / null
status                        :
multi-account silent now invisible (expireNow→silent, no chooser): YES/NO/N-A
→ if extracted null: SURFACED to owner (decision pending) — paste body
```

---

## If `__oqAuth is not defined` — stale Chrome service worker

The built `dist/` is almost certainly fine (MV3 caches the old worker
hard). Resolve deterministically:

1. **Prove the build (Terminal — one short copy-safe line):**

   ```
   npm --prefix /Users/fenildedhia/Code/Projects/OutboxIQ/extension run smoke:check
   ```

   Expect **✅ BUILD OK**. (Don't hand-paste a multi-command line — it
   wraps on copy and corrupts the check.)
2. **Hard-reset Chrome:** `chrome://extensions` → Fashionably Late → **Remove**;
   **fully quit Chrome (⌘Q)**; reopen → Developer mode ON → **Load
   unpacked** → `…/extension/dist`; click **service worker** →
   Console; click the card's **↻ reload** once, watch for the marker.
3. **Marker present** → proceed. **Marker absent (with ✅ BUILD OK)** →
   wrong folder/profile: re-check the Load-unpacked path is exactly
   `…/extension/dist` and there's no second Fashionably Late in another Chrome
   profile. Screenshot and send back.
