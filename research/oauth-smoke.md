# OAuth smoke runbook (Free v1 — Phase 2 verification)

**What this verifies:** the Free v1 OAuth implicit-grant flow
(`src/background/oauth.ts`, PRD §7.5) end-to-end against live Google,
before any Calendar/People code (Phase 3) is built on top of it. Same
"committed, re-runnable, copy-paste" discipline as
`research/regular-send-smoke.md` (owner-decisions-log Entry 9).

You run this hands-on; it can't be unit-tested (real Google consent,
real Chrome `identity` API). It is **DEV-only** — the `__oqAuth` helper
is stripped from production builds.

> **Account note:** OAuth is in **Testing mode** with an explicit
> allowlist. Use a test-list account (`fenil.h.dedhia@gmail.com` or the
> throwaway). A non-allowlisted account will be refused by Google — that
> is expected, not a bug.

---

## Setup (once)

> **Use the one-shot `npm run build:smoke`, NOT `npm run dev`.** The
> CRXJS dev server was found to corrupt `dist/` (copying node_modules,
> the .pem, and a recursively-nested dist/) and the service worker would
> not open. `build:smoke` is a clean one-shot production-quality build
> that *also* includes the `__oqAuth` harness (a plain `npm run build`
> strips it, so it can never ship).

1. In a Terminal, run these two lines (the first wipes any corrupt dist
   from a previous `npm run dev`):

   ```
   rm -rf /Users/fenildedhia/Code/Projects/OutboxIQ/extension/dist
   npm --prefix /Users/fenildedhia/Code/Projects/OutboxIQ/extension run build:smoke
   ```

   Wait for `✓ built`. No process stays running — you can close the
   Terminal.
2. Chrome → `chrome://extensions` → Developer mode ON. If an OutboxIQ
   card is already there from before, click **Remove** first (the old
   one points at the corrupt dist). Then **Load unpacked** → select
   `/Users/fenildedhia/Code/Projects/OutboxIQ/extension/dist`.
3. On the OutboxIQ card, click the blue **"service worker"** link
   (under "Inspect views") → DevTools opens → click its **Console**
   tab. **Run every command below in that console.** If it says
   "service worker (inactive)", click it — that wakes it and opens the
   console. (If clicking still does nothing, click the **↻ reload**
   icon on the card once, then click the link again.)

---

## If `__oqAuth is not defined` — it's a stale Chrome service worker

The built `dist/` is almost certainly fine (MV3 caches the old service
worker hard). Resolve it deterministically:

**1. Prove the build is good (Terminal — one short, copy-safe line):**

```
npm --prefix /Users/fenildedhia/Code/Projects/OutboxIQ/extension run smoke:check
```

(Do **not** use a hand-pasted multi-command line — it wraps on copy and
corrupts the check. This script does the clean `build:smoke` and proves
the harness is in the service-worker chunk.) Expect **✅ BUILD OK**;
then do step 2.

**2. Hard-reset Chrome (kills the cached worker):**

- `chrome://extensions` → OutboxIQ card → **Remove**.
- **Fully quit Chrome** — ⌘Q (not just closing the window).
- Reopen Chrome → `chrome://extensions` → Developer mode ON →
  **Load unpacked** → `/Users/fenildedhia/Code/Projects/OutboxIQ/extension/dist`.
- Click the **service worker** link → DevTools → **Console** tab.
- On the card, click the **↻ reload** icon once and watch the console.

**3. Look for the marker FIRST** (before typing anything):

> `[OutboxIQ] ✅ OAuth smoke harness ready — type __oqAuth in this console`

- **Marker present** → the new code is running; proceed to the tests.
- **Marker absent** (even after the ↻ reload, with ✅ BUILD OK from
  step 1) → you loaded a different folder or profile: re-check the
  Load-unpacked path is exactly `…/extension/dist`, and that you don't
  have a second OutboxIQ in another Chrome profile. Send a screenshot.

## Tests (run in order; copy-paste each line)

### A. First authorization (interactive — the consent screen)

```js
await __oqAuth.clear();           // start clean
await __oqAuth.authorize();
```

A Google window opens. **Expected:**

- It shows an **account chooser** (because `prompt=select_account`). If
  you have **multiple Google accounts signed in, all are listed and you
  can pick** — this is the multi-account requirement; confirm it.
- Pick a test-list account → consent screen lists the **4 scopes**
  (Gmail compose, Gmail modify, Calendar settings readonly, Contacts
  readonly) → **Allow**.
- The console result is `{ ok: true, token: "ya29.…" }`.

✅ Pass: `ok: true` and a token string.
❌ If `{ ok:false, reason:"denied" }` only when you actually clicked
   Allow → record it and stop (surface).

### B. The token actually works (People API — Free v1's only API)

```js
await __oqAuth.testPeople("someone-in-your-contacts@example.com");
```

(Session-8 update: the old `testCalendar` probe is gone — Calendar was
removed from v1 scope, §5.1.3 amendment. People `searchContacts` is
Free v1's only real Google call.)

**Expected:** `{ status: 200, body: { … } }` (a results object, possibly
empty if that email isn't a contact — 200 is the pass signal). This
proves the `contacts.readonly` token **and** the
`people.googleapis.com` host permission both work — the Session-9
cascade dependency.

✅ Pass: `status: 200`. (401/403 ⇒ scope/consent problem; a network
error ⇒ host-permission problem — report it.)

### C. Cached token is reused (no second prompt)

```js
await __oqAuth.authorize();       // again, immediately
```

**Expected:** returns `{ ok:true, token }` **with no Google window**
(the cached token is still valid). Same token value as test A.

### D. Silent re-issue after expiry

```js
await __oqAuth.expireNow();       // artificially expire the cached token
await __oqAuth.silent();          // silent-only attempt (interactive:false)
```

**Expected:** `{ ok:true, token: "ya29.…" }` **with no window** — Chrome
silently re-issued because your Google session + consent still hold.
The token value should be **new** (differs from test A).

✅ Pass: `ok:true`, no UI, fresh token.
⚠️ If it returns `{ ok:false, reason:"needs_interactive" }`: silent
   re-auth needs UI in your setup (e.g. session cookie cleared). Note
   it — the design escalates correctly (`authorize()` would fix it),
   but record the environment.

### E. Revocation degrades cleanly (no crash)

```js
// Revoke at https://myaccount.google.com/permissions (remove "OutboxIQ"),
// then back in the console:
await __oqAuth.clear();
await __oqAuth.silent();
```

**Expected:** `{ ok:false, reason:"needs_interactive" }` — a clean
typed failure, **no exception**. (`authorize()` then re-consents.)

---

## Result log (fill in when you run it)

```
Date:
Chrome version:
Account(s) used:

A first authorize  :  PASS / FAIL  — notes:
B testPeople       :  PASS / FAIL  — status:
C cached reuse     :  PASS / FAIL
D silent re-issue  :  PASS / FAIL
E revoke degrade   :  PASS / FAIL
Multi-account chooser seen with >1 account signed in:  YES / NO / N/A (only 1 account)
```

> Phase 3 (Calendar/People cascade) is **gated on A–D passing**. If
> anything fails, paste the console output back — do not proceed.
