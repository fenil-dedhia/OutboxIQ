# Session 16 — Security audit (end-to-end, pre-submission gate)

> **State at close (2026-05-28):** Free v1 remains feature-complete,
> a11y-passed (Session 14), Workspace-verified (Session 15). This session
> was the **third** of the four pre-launch hardening sessions
> (14 a11y → 15 Workspace → **16 security** → 17 comprehensive hands-on).
> Per the session prompt's fix policy: clear-cut issues fixed in-session
> with regression tests; judgment calls flagged for owner decision; the
> two reason-about-only items (admin-policy, page-ownership forging)
> documented honestly as **NOT** definitively closed.
>
> **Outcome:** **zero exploitable vulnerabilities found in production
> source.** Two defensive XSS regression tests added (commit `2e23394`) —
> not because an unsafe sink existed, but to pin React's escape-by-default
> guarantee on the one attacker-influenceable data path (recipient
> name/email from Gmail's compose DOM) so a future refactor introducing
> an unsafe sink would fail loudly. Four findings **flagged** for owner
> judgment, none individually launch-blocking; the most material are the
> known CRXJS dev-dependency advisory (build-only, not shipped) and the
> structural page-ownership forging surface (low-severity, MV3-forced).
> Test count 354 → **356** (+2). `SCHEMA_VERSION` unchanged at 3;
> manifest permissions unchanged; no production code changed.

## §a — What was audited + what landed (findings table first)

| # | Area | Severity | Disposition |
|---|------|----------|-------------|
| 1 | DOM-injection / XSS in production source | — (none found) | **CLEAN** — zero `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `dangerouslySetInnerHTML` / `eval` / `new Function` / `DOMParser.parseFromString` / `Range.createContextualFragment` in `src/`. The only attacker-influenceable data path (compose-DOM-read recipient name/email) renders through React `{value}` text rendering. |
| 2 | XSS regression coverage (defensive add) | — | **FIXED in-session** (commit `2e23394`) — two affirmative-guard tests (`ScheduleModal` Optimize dropdown + `CacheSection` cache list) confirm an attacker-flavored display name renders as escaped text, no `<img>`/`<script>` parsed, no `onerror` payload fires. |
| 3 | Message-passing surfaces | — (none found) | **CLEAN** — `chrome.runtime.onMessage` only (which is same-extension by Chrome's MV3 contract); no `externally_connectable` manifest entry, no `onMessageExternal`, no `chrome.runtime.connect`/`onConnect`, no `window.postMessage` / `MessageChannel` / `BroadcastChannel` listeners. The SW's two listeners handle three typed messages (`MSG_OPEN_ONBOARDING`/`MSG_OPEN_SETTINGS`/`MSG_RESOLVE_RECIPIENT_TZ`), each scoped to a side-effect that reads only local storage. |
| 4 | Storage hygiene (`chrome.storage.local`) | — (none found) | **CLEAN** — writes only the three documented keys (`outboxiqState` / `outboxiqOnboardingDraft` / `outboxiqAuth` — the last inert in Free v1 per Entry 39). No tokens, no secrets. Export embeds the documented payload (anti-omission); Delete is per-key removal of exactly the owned set (`OWNED_STORAGE_KEYS`), partial-failure surfaced. |
| 5 | Permissions / manifest / CSP / WAR | — (none found) | **CLEAN** — manifest requests `storage` + `scripting` and `host_permissions: ["https://mail.google.com/*"]` and nothing else; content-script `matches` scoped to Gmail only; no `web_accessible_resources` over-exposure (the resources Vite/CRXJS declares are scoped to `mail.google.com/*`); no `unsafe-eval` / remote script source (default MV3 CSP); React is bundled, never loaded from a CDN at runtime. |
| 6 | §11 invariants (no network / no analytics / no backend) | — (none found) | **CLEAN AFFIRMATIVE** — zero `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `new WebSocket` / `EventSource` / `importScripts` / `new Image` / dynamic `import()` / `<script>`-element-creation in production source. The only `fetch` references are in test files (mocked-and-asserted-not-called by `data-management.test.ts`). |
| 7 | Page-ownership forging (Session 13 mechanism) | **Low** | **FLAGGED** — a malicious co-installed extension or Gmail-side compromise could write `documentElement[data-fashionably-late-owner]` and force all our hot-path handlers inert via `isCurrentOwner()`. Blast radius: §5.5.1 outside-hours safety prompt is suppressed; Schedule Send falls through to Gmail's native UI. **No data exfiltration, no privilege escalation, no impersonation.** The DOM-attribute coordination is structurally forced by MV3's isolated-worlds model; "hardening" options all touch the gated hot paths and aren't worth the regression risk for a UX-prompt-suppression attack that already requires a foothold the user has bigger problems with. See §c. |
| 8 | Admin-policy interaction surface (Workspace DLP / send-event hooks) | **Unknown — cannot close** | **FLAGGED + REASONED, NOT DEFINITIVELY CLOSED.** Carried from Session 15 §"What was NOT verified". Reasoning (axis-by-axis) below in §c; structural assessment is that Free v1's gesture replay does not expand the data perimeter (no API calls — Entry 39), but a real Workspace tenant with a Send-event hook was not driven, so this remains a known gap, not a clean bill of health. |
| 9 | Dependency / supply-chain (`npm audit`) | High (runtime: none) | **FLAGGED — pre-existing, documented.** 2 high-sev advisories in **dev/build-only** deps (`rollup` < 2.80.0 path-traversal via `@crxjs/vite-plugin`); `npm audit --omit=dev` is **0 vulnerabilities**. Production dep tree is just `react@19.2.6` + `react-dom@19.2.6`. The advisory affects build tooling only and is not reachable in the shipped extension. **No `npm audit fix` applied** (the only fix is a SemVer-major DOWNgrade of `@crxjs/vite-plugin` from 2.x to 1.x, which would break the build) — this is the same "accepted CRXJS community-plugin tax" already documented in CLAUDE.md gotchas, restated here for owner visibility. |

**Commits this session:**
- `2e23394` — `test(security): Session 16 — XSS regression guards for attacker-influenceable recipient data` (+94 lines across two test files; no production code changed).
- (Close-out commit deferred — `notes/` + `PRE_LAUNCH_CHECKLIST.md` + `CLAUDE.md` + owner-decisions-log updates will land after owner reads §c flagged findings.)

**Totals:** **356** tests green (was 354 at S15 close → +2 defensive guards); `typecheck` / `lint` / `format:check` / `npm run build` all clean (only the documented benign CRXJS-on-Vite-8 warning); `dist/service-worker-loader.js` correctly imports the `service-worker.ts-*` chunk (MV3 entry-basename gotcha holds); `SCHEMA_VERSION` unchanged at **3**; manifest permissions unchanged (`storage` + `scripting` + `host_permissions: https://mail.google.com/*`); no `premium-v1` imports in production source (the two greps showing "premium-v1" are a comment string in `CacheSection.tsx` and the bundled copy of that string in `dist/`, intentional — see CLAUDE.md gotcha).

## §b — Confidence per area

- **DOM-injection / XSS (Area 1):** **High.** The grep audit covers every standard unsafe-HTML sink (incl. less-common ones like `DOMParser.parseFromString` and `Range.createContextualFragment`); React `{value}` text rendering escapes by default; the two new regression tests pin that property for the one attacker-influenceable data path (recipient name + email from the compose DOM).
- **Message passing (Area 3):** **High.** The "MV3 same-extension-only" property of `chrome.runtime.onMessage` is a Chrome-platform invariant (not our code), and we declare no `externally_connectable` in the manifest. The three message types are typed (`RuntimeMessage` union); the only one that takes a parameter (`MSG_RESOLVE_RECIPIENT_TZ`'s `email`) is consumed by a function that only reads from local storage — no network, no shell, no template.
- **Storage hygiene (Area 4):** **High.** The three storage keys are the documented schema-7.2 set + the inert auth key; Export/Delete are unit-tested for anti-omission / typed-confirmation / exact-key removal (Session 13 coverage, S16 didn't need to extend it).
- **Manifest / permissions / CSP / WAR (Area 5):** **High.** Read from `dist/manifest.json` (the generated output, not the source config alone) — permissions exactly `storage` + `scripting`, host exactly `mail.google.com`, WAR scoped to `mail.google.com`, no `unsafe-eval` / remote script source. Bundled React confirmed (no CDN reference in source).
- **§11 invariants (Area 6):** **High** for the static-analysis sense ("no network primitive anywhere in source code"). The only path that could escape this is dynamic code execution, which is also ruled out (no `eval` / `new Function` / `import()` from string).
- **Page-ownership forging (Area 7):** **Medium** — the *risk* model is reasoned, the *severity* assessment ("UX prompt suppression at worst, no data harm") is reasoned, but a structural DOM-coordination scheme cannot be "verified secure" against an in-page attacker that already has DOM-write access. The structural answer is: any cross-isolated-world coordination channel in MV3 has this property, so a clean fix doesn't exist without redesigning around the problem.
- **Admin-policy surface (Area 8):** **Low** for definitive closure — this is a reason-with-acknowledged-limits item that needs a real Workspace tenant with the relevant policies to actually drive. The structural argument that Free v1's no-API-call posture doesn't expand the data perimeter is sound; the structural argument that gesture replay doesn't collide badly with Send hooks is reasoning, not testing. **Honestly noted as not definitively closed.**
- **Dependency audit (Area 9):** **High** for the finding itself (`npm audit --omit=dev` is `0 vulnerabilities`; the dev-only advisory is not reachable in the shipped extension); **Medium** for the residual risk that a build-tool path-traversal could in theory affect a future build operator (e.g. if `npm run build` is ever pointed at attacker-controlled source — which is not how we use it, but worth owner awareness).

## §c — Flags for a senior reviewer (the load-bearing section of this session)

### Flag 1 — Page-ownership forging (Area 7, severity: **low**)

**Setup.** Session 13 (`page-install-latch.ts`) coordinates "newest live content-script instance wins" via a token stored in `<html>[data-fashionably-late-owner]`. The DOM is the only channel shared across MV3 isolated worlds in the same tab, so a JS-property latch on `window` doesn't work (Session 13 §c documents this).

**Question.** Could a malicious script with DOM-write access on the Gmail page (another extension, or a Gmail-side compromise) forge or clear that attribute to **hijack ownership** and disable Fashionably Late?

**Answer.** Yes, structurally:
- **Forge** (set the attribute to some other value): `isCurrentOwner()` returns false for every live instance → all three hot-path handlers (§5.2 compose interceptor, relabel observer, §5.5.1 send guard) go inert. Schedule Send falls through to Gmail's native UI (still works); the §5.5.1 outside-hours soft-warning prompt is suppressed.
- **Clear** (remove the attribute): `isCurrentOwner()` treats `null` as "act", so every live instance wakes back up — this re-introduces the original double-instance bug temporarily until the next `claimPageOwnership()` re-establishes a single owner.

**Blast radius.** **The §5.5.1 outside-hours safety prompt being suppressed is the only material impact.** No data exfiltration (we have no API token, no network call, no PII in flight). No privilege escalation (the attacker has DOM-write already; nothing to escalate to). No impersonation (we never act on the user's behalf in any visible-to-third-parties channel). The user's email still sends normally via Gmail's native Send.

**Attacker prerequisites.** Another malicious browser extension installed in the user's Chrome profile, or a Gmail-side script compromise. Both of those are bigger problems for the user than losing a UX prompt.

**Hardening options considered (all rejected).**
1. `WeakMap<Document, string>` instead of DOM attribute → doesn't work, can't cross isolated worlds.
2. Cryptographic signature on the token → pointless, attacker has the same crypto access.
3. Closure-private symbol → can't share across isolated worlds, defeats the design.
4. `MutationObserver` re-claiming on attribute change → adds an observer on the `<html>` element, fights other extensions doing the same, churn on a hot path; could regress the careful "newest-live-claim-wins" semantics.
5. Don't use shared coordination at all → re-introduces the duplicate-instance bug that Session 13 fixed (Entry 51).

**Recommendation.** **Accept the risk + document it in CLAUDE.md.** The hardening options either don't work (the closure/WeakMap ones, structurally) or touch the gated hot paths and risk regressing Session 13's fix for a low-severity attack that requires another foothold. A defensive `MutationObserver` re-claim is the only mechanical option worth re-evaluating in a future session if a real attack ever materializes — for Free v1 launch this is below the threshold for hot-path changes.

**Owner decision needed:** Accept the documented risk? Or want a defensive `MutationObserver` re-claim explored in a focused session (not this one)? Default recommendation: **accept**.

---

### Flag 2 — Admin-policy interaction surface (Area 8, severity: **unknown, cannot close**)

**Setup.** Session 15 explicitly carried forward: Workspace tenants with DLP / content-compliance / send-event hooks could intercept or modify Send gestures; whether they collide with the §5.5.1 capture-phase guard or the §5.2 gesture-replay was unknown.

**Reasoning, axis by axis:**

- **Data-perimeter axis (the DLP-classic concern):** Free v1 makes **no Google API calls** (Entry 39) and **no network calls of any kind** (the §11 invariant, affirmatively verified this session — Area 6). A DLP rule that scans outbound API traffic from third-party apps has **no traffic from us to scan**. A DLP rule that scans email body content on Send is operating on Gmail's own send pipeline, not ours; we don't alter the body or the recipient list (we drive the schedule picker / send button, both Gmail's own UI). **Low collision risk.**
- **Send-event-hook axis (a tenant policy that intercepts `click` on the Send button):** This is the realistic collision shape. The §5.5.1 guard runs at document capture phase and `preventDefault`s the gesture only on a certain violation. A tenant Send hook also running at capture would either run **before** us (if registered earlier — Chrome's capture-phase order is registration-order) or **after**. If it runs first and blocks, our guard never sees the event (no harm). If our guard runs first and blocks, the tenant hook never sees it either — which **might** be considered hostile by a tenant that expects to see every Send attempt for compliance logging. **Genuine unknown** — we can't enumerate every tenant policy shape and the relevant test would need a real tenant with a real Send hook.
- **Gesture-replay axis (when we replay the native Send via `fireFull`):** This is the same shape Gmail itself produces on a real user click — it goes through Gmail's normal jsaction delegate. A tenant policy hooking Send sees the same event Gmail's own UI would produce. **Low collision risk by construction**, but there's a known caveat: our replay carries `isTrusted: false` (synthetic events do). A tenant policy that *only* honors trusted events would ignore both our blocked-then-replayed Send AND the user's original click that we re-fired — which would manifest as "Send didn't go through" in our §5.5.1 "Send now anyway" path. This is a **functional bug shape** more than a security bug shape, but it lands on a security session's plate because of the policy-interaction question.

**What this session can NOT close.** Without a real Workspace tenant with the relevant policies, the above is reasoning, not testing. We did not exercise:
- A tenant with content-compliance Send hooks installed.
- A tenant where Schedule Send itself is admin-disabled (S15 §"Honest gap" — owner isn't the tenant admin on the test account).
- A tenant with third-party app restrictions that might block content-script injection on `mail.google.com` (CSP nonces, frame ancestors).

**Recommendation.** **Document the residual unknown + carry forward.** The structural answer (no API calls, no network, gesture-replay matches Gmail's own shape) is the best we can give from inside the codebase. The empirical answer needs a real-tenant test plan slot — fits Session 17 if access becomes available, or is acceptable as a Free-v1 launch gap given Free v1 fails-toward-native-Gmail on every ambiguous path. **Not individually launch-blocking.**

**Owner decision needed:** Accept as a documented post-launch-discoverable gap? Or hold launch until a real-tenant probe is possible? Default recommendation: **accept** (Free v1 launches to consumer Gmail anyway; Workspace tenant adoption is post-launch).

---

### Flag 3 — `npm audit` advisory (Area 9, severity: **runtime: none; build-time: documented**)

**Finding.** `npm audit` reports 2 high-severity advisories — both `rollup` < 2.80.0 (GHSA-mw96-cpmx-2vgc, "Rollup 4 has Arbitrary File Write via Path Traversal"), reached transitively through `@crxjs/vite-plugin`. `npm audit --omit=dev` reports **0 vulnerabilities**.

**Reachability in the shipped extension.** None — rollup is build tooling; it does not ship to users. The shipped extension's runtime dep tree is exactly `react@19.2.6` + `react-dom@19.2.6` (`npm ls --omit=dev`).

**Reachability in our build process.** The CVE is exploitable when rollup is run against attacker-controlled module specifiers (a build that imports paths from an untrusted source). Our build imports only from `extension/src/` and our `node_modules/`; neither is attacker-controlled. **Not reachable in our build either.**

**Why no auto-fix.** The only `fixAvailable` from `npm audit` is `@crxjs/vite-plugin@1.0.14` — a SemVer-major **downgrade** from the 2.x line we use. CLAUDE.md gotcha already warns: "Do **not** run `npm audit fix --force` (it breaks the build)." Session 16 holds to that.

**Recommendation.** **Accept + log + monitor.** Status is unchanged from CLAUDE.md's existing locked-decision note ("the accepted CRXJS community-plugin tax (a locked, eyes-open trade-off)"); this session restates that for security-pass visibility but proposes no change. When `@crxjs/vite-plugin` ships a 2.x release that pulls in a patched rollup, take the bump. **Not launch-blocking.**

**Owner decision needed:** Confirm the accept-and-monitor stance for Web Store submission? Default recommendation: **accept** (status quo).

---

### Flag 4 — `console.info` from compose-integration is intentionally NOT DEV-gated

**Finding.** `extension/src/content/compose/compose-integration.ts:266` writes `console.info("[Fashionably Late] multi-compose detected, falling back to native Schedule Send")` even in production builds. Comment explains: "the owner wants visibility into how often this path fires with real test users (a single, deliberate diagnostic line — not the DEV-gated debug noise; console output is local, so no conflict with the zero-telemetry rule)."

**Risk assessment.** No security risk — console output is local, never transmitted, no PII (the message is a fixed string). The §11 zero-telemetry invariant is about *outbound* data; local console writes are fine. The note exists only to confirm the audit considered and ratified the prior intentional design.

**Recommendation.** **No action — confirmed intentional, no security impact.** Flagged here only for audit-trail completeness so the owner doesn't later wonder whether the security pass missed it.

## §d — Stale docs surfaced / handled

- `PRE_LAUNCH_CHECKLIST.md` — adds a new `## Security audit` section recording: the Session-16 verification table, the four flagged items linked to this summary's §c, the affirmative §11 invariants, the npm-audit status restatement.
- `CLAUDE.md` "Current state" prelude — bumped to **Session 16 close, 2026-05-28**; added a new Session-16 paragraph at the top (audit clean, +2 regression tests, four flags for owner); preserved the Session-15 paragraph below.
- `CLAUDE.md` "Remaining sessions to public launch" — Session 16 line struck through with `**DONE (2026-05-28; …)**` and a one-paragraph result line citing this summary.
- `CLAUDE.md` gotchas — the existing page-ownership gotcha (Session 13) gets a short security-flag breadcrumb appended pointing to §c Flag 1 of this summary; the existing `npm audit` gotcha gets a Session-16-verified breadcrumb.
- `notes/owner-decisions-log.md` — see §g.

PRD §11 unchanged (affirmatively verified, not amended); PRD §6.x unchanged; manifest unchanged.

## §e — Deferred into Session 17+

- **Real-tenant Workspace admin-policy probe** (Flag 2 above) — if Session 17 has access to a tenant with DLP / content-compliance / send-event hooks, drive Fashionably Late through it and confirm graceful fallback. If not, acceptable as a Free-v1-launch gap (per Free v1's fail-toward-native-Gmail design).
- **Admin-disabled Schedule Send graceful-degradation** (carried from S15) — same disposition: Session 17 hands-on if a tenant becomes available, else acceptable launch gap.
- **`@crxjs/vite-plugin` 2.x → patched-rollup upgrade** — owner-gated dependency bump, take whenever upstream ships it. Not launch-blocking (build-only advisory, not reachable in shipped extension).
- **Defensive `MutationObserver` re-claim on the ownership token** (Flag 1) — explore in a focused session **only** if a real page-ownership-forging attack materializes post-launch. For launch, the documented accept-the-risk stance stands.
- **Duplicate-instance regression test plan** (already on the books for Session 17 per `PRE_LAUNCH_CHECKLIST.md`) — Session 16 did not exercise it.

## §f — Honest gaps (the reason-about-only items)

This section deliberately separates what was **definitively closed** from what was **only reasoned about**:

- **Definitively closed (this session's audit verified):** DOM-injection / XSS surface; message-passing surfaces; storage hygiene; permissions / manifest / CSP / WAR; §11 no-network / no-analytics / no-backend invariants; dependency audit reachability in shipped extension.
- **Reasoned but NOT definitively closed:**
  - **Page-ownership forging (Flag 1):** the *severity* assessment is reasoned ("UX prompt suppression at worst, no data harm"), but a structural in-page-attacker model cannot be "verified secure" by code review alone. A real attack would manifest post-launch; the mitigation options were reviewed and (recommended) deferred unless one does.
  - **Admin-policy interaction surface (Flag 2):** axis-by-axis structural reasoning suggests low collision risk (no API calls, gesture-replay matches Gmail's own shape), but **no real Workspace tenant with the relevant policies was driven**. Carried forward.
- **What was NOT exercised at all this session:**
  - Duplicate-instance re-test (already on the Session-17 plan).
  - Admin-disabled Schedule Send graceful-degradation (S15 carry-forward, again not exercised — owner not a tenant admin).
  - Screen-reader walkthrough (S14 carry-forward, unrelated to security).

This session's verdict is **NOT** "Free v1 is provably secure" — it is "the static and reasoning-level audit found zero exploitable vulnerabilities and four flagged items, three of which are accepted-and-documented with structural justifications, one of which (admin-policy) is honestly carried forward as a known unknown."

## §g — Owner-decisions-log entries this session

**Entry 55** — *Conscious owner acceptance of three pre-launch security items as documented Free-v1 launch gaps.* The owner accepted Flags 1/2/3 (page-ownership forging Low, admin-policy surface Unknown, `npm audit` build-only) as documented launch gaps, with the framing that *in each case the fix is worse than the risk* (regressing the Session-13 hot-path fix / acquiring an unavailable test environment / breaking the build on a non-shipped dep). The owner explicitly overruled an initial `Session 16 — no entries this session.` draft, on the reasoning that for a pre-launch **security gate** the load-bearing artifact is the conscious acceptance itself — a future reviewer asking "did you know about these at launch?" must be able to see the answer in the owner's voice, on the record, with the counterfactuals named, not inferred from the absence of a counter-decision. Flag 4 (`console.info` multi-compose line) — no entry, confirmed intentional, no change. Per-flag full reasoning, severity assessment, and hardening-options analysis live in §c above; Entry 55 is the decision-provenance record. (Entry-17 honesty rule binding: this is owner-confirmation of Claude's recommendation, not owner-correction; the direction was Claude's, the *recorded acceptance* is the owner's.)

## §h — Session 17 opening sequence

**Session 17 = Comprehensive hands-on testing of all scenarios** (the final pre-submission gate). Owner-locked. Suggested order:

1. Re-read `PRE_LAUNCH_CHECKLIST.md` "Compatibility & Verification" — the duplicate-instance regression test plan (currently documented as the explicit Session-17 hands-on) is the most-important new coverage.
2. Drive every §5.x feature end-to-end in real Gmail one more time: onboarding (incl. resume-mid-flow); Settings (every section, incl. Export/Delete); Schedule Send (Quick Options, Pick Custom, "Last scheduled time", Optimize-for-X cache-hit + cache-miss); §5.5.1 regular-Send outside-hours warning + each of its three resolutions; multi-compose safety-net handoff.
3. Drive the duplicate-instance regression: reload the extension with Gmail open, no refresh, exercise Schedule Send + Send-now-anyway + relabel — confirm only the newest live copy acts (the Session-13 ownership fix).
4. **If access becomes available:** the two real-tenant Workspace probes deferred from S15/S16 — admin-disabled Schedule Send graceful-degradation; admin-policy / DLP / send-event-hook interaction.
5. Cross-check the four S16 flags against the hands-on session: no behaviour change should be observable that contradicts §c reasoning.
6. Final pre-submission gates: brand/icons (owner-parallel), Chrome Web Store listing assets (owner-parallel), legal-doc date fill-in (owner-parallel, **done** as of 2026-05-27 per CLAUDE.md), Apache 2.0 + COMMERCIAL.md (**done** as of 2026-05-27).

After Session 17, Free v1 is ready for Chrome Web Store submission. Premium v1 remains **out of scope of this project** (Entry 52).
