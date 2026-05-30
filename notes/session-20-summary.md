# Session 20 — Marketing landing page for fashionablylate.app

> Site/web work, NOT extension code. No changes under `extension/src/`; no §11 /
> manifest / schema impact; test count, `SCHEMA_VERSION` (4), and version
> (`1.0.0`) all unchanged. A deliberate new artifact: the apex landing page at
> `fashionablylate.app`, built with inboxymail.com as a *structural* reference
> (skeleton only, our own content/brand). Built entirely from shipped,
> customer-facing copy — no new product claims invented.

## §a — What landed

1. **`docs/index.html` — standalone marketing landing page.** Front matter
   `layout: null` opts the page OUT of the `_config.yml` `defaults` block (which
   applies the Primer `default` layout to every other page). Fully
   self-contained: its own `<head>`, its own `<style>` block (no Primer CSS, no
   external fonts/CDNs, no analytics, no third-party scripts — mirrors the
   product's no-tracking promise). Every CSS rule is namespaced under `.fl-page`
   as a belt-and-suspenders scope guard. Sections, in inboxy's order with our
   content: header (logo + wordmark / "Open source" GitHub link) → hero
   (tagline + benefit headline + lede + two CTAs + hero screenshot) → "What it
   does" (3 alternating blocks) → Highlights (6-card grid, inline brand-color
   SVG icons) → "Private by design" (4-point checklist + legal links) → "A
   closer look" (3 real screenshots + captions) → footer (repeat CTA + Privacy ·
   Terms · GitHub + "Built by Fenil Dedhia").

2. **Removed the old stub `docs/index.md`** (it held only a one-line blurb +
   legal links). Necessary: Jekyll cannot have both `index.md` and `index.html`
   at the same path. Its legal links are superseded by the richer page's footer
   + privacy section.

3. **Assets copied into `docs/` (GitHub Pages serves only from `docs/`).**
   `docs/assets/symbol.svg` (the teal SymbolMark, from `media/logo/`),
   `docs/assets/og-image.png` (the real 1400×560 promo marquee, reused as the
   OG/Twitter card image), and five **raw** screenshots (NOT the store-ready
   1280×800 padded versions) into `docs/assets/screenshots/`:
   `schedule-optimize`, `schedule-modal`, `pinned-timezones`, `privacy-data`,
   `onboarding`.

4. **Copy is reused/adapted from shipped surfaces** — onboarding Welcome
   ("land at the right moment, in your recipients' time, not yours"; "what you
   get in return"), the README ("right local time, per recipient"; the
   working-hours-guard paragraph; the privacy bullets), the tagline "Schedule
   emails at their perfect time", and the manifest single-purpose framing. Voice:
   warm, plain, benefit-first.

5. **SEO/GEO.** Descriptive `<title>` + meta description using natural search
   terms ("schedule Gmail emails in your recipient's time zone"); honest Open
   Graph + Twitter tags pointing at a real asset; `<link rel="canonical">`.
   Declarative, factual sentences in the hero + privacy section so an AI summary
   gets "what it is / who it's for / privacy posture" right. No keyword-stuffing.

## §b — The CTA decision (honest, per the prompt)

The extension is **not** live on the Chrome Web Store yet, so the primary CTA is
a **non-clickable** "Coming soon to the Chrome Web Store" pending button —
styled as *awaiting launch* (white/muted surface, dashed teal border, clock
icon, `role="button" aria-disabled="true"`, default cursor, **no `href`**), not
a dead link. The genuinely-clickable action is the secondary **"View source on
GitHub"** (real link to `https://github.com/fenil-dedhia/fashionably-late`),
rendered as the solid AA-safe teal button so the real action reads as primary.

**The one pending swap at launch:** replace the pending `<span>` with the live
Web Store link/badge. The exact swap site is marked with a prominent code
comment in `docs/index.html` (hero), and an identical pending CTA in the footer
carries a pointer comment to swap both together. Owner may instead prefer the
official "Available in the Chrome Web Store" badge image — drop-in at the same
spot, a one-element change.

## §c — Brand fidelity

Mirrors the extension per `media/palette.md` (Entry 57/58): **Moonstone
`#5EB1BF`** used only as logo/accent + the hero background (never as white-text
or link color — it fails AA at 2.47:1); **`#367B87` (700)** for buttons, links,
and icons on white (4.84:1 AA); `#295F68` (800) for hover/strong-accent text;
`#EFF7F8` (50) tint backgrounds; `#B6DCE2` (200) borders. The hero uses **dark
ink** on Moonstone (`#0e2c31` on `#5EB1BF` ≈ 8.5:1) — accessible. System font
stack (the wordmark is the only typeset brand element). Real logo SVG reused, not
redrawn.

## §d — Confidence / verification (programmatic vs live — honest split)

- **Verified programmatically:** valid YAML front matter; **no Liquid tokens**
  (`{{`/`{%`) anywhere in the body or CSS (won't break the Jekyll build); HTML
  tag balance (parser, zero unclosed); every `/assets` + `/favicon` reference
  resolves to a file under `docs/`. Rendered the page in headless Chrome (Beta)
  at desktop + mobile widths — layout, palette, type, all six highlight icons,
  the alternating feature blocks, the privacy checklist, the screenshot grid,
  and the dark footer all render correctly. Measured `scrollWidth` to catch
  horizontal overflow; added a ≤480px breakpoint (smaller headline, full-width
  buttons) + `overflow-wrap` so it fits true ~360px phones.
- **NOT verifiable locally (S18 gap, stated honestly):** there is **no Jekyll
  toolchain in this environment**, so the real `layout: null` opt-out, the
  `{% seo %}`-free head, and GitHub Pages routing can only be proven by the live
  Pages rebuild. The headless render used a front-matter-stripped copy with
  rewritten relative asset paths — it proves the HTML/CSS, not the Jekyll build.
  **Owner must confirm on the live site:** (1) `fashionablylate.app` shows the
  new landing page (not the Primer-wrapped stub); (2) `/legal/privacy` and
  `/legal/terms` still render **unchanged** with the Primer layout + logo header.

## §e — Scope discipline

No new product features or claims (§11 still bounds what we can say) — every
benefit on the page maps to a shipped surface. No screenshot is mislabeled: the
after-hours-warning shot isn't in the captured set, so the "gentle nudge" block
uses an inline clock **illustration** (clearly decorative) rather than passing
off an unrelated screenshot. No extension code touched.

## §f — Files added / changed

- **Added:** `docs/index.html`; `docs/assets/symbol.svg`;
  `docs/assets/og-image.png`; `docs/assets/screenshots/{schedule-optimize,
  schedule-modal,pinned-timezones,privacy-data,onboarding}.jpg`.
- **Removed:** `docs/index.md` (stub, superseded).
- **Edited:** `CLAUDE.md` (current-state line — landing page + the one pending
  CTA swap); `notes/owner-decisions-log.md` (close-out line); this summary.
- **Untouched (verified):** `docs/_config.yml`, `docs/_layouts/default.html`,
  `docs/_includes/head-custom.html`, `docs/legal/*`.

## §g — Owner-decisions-log entries this session

**Entry 60.** Initially logged as "no entries" (a new artifact, not a trajectory
fork), but the session's iterative owner input grew into three forward-binding
decisions worth recording: (1) the honest pre-launch CTA posture + marked swap
site; (2) the public **"Schedule send"** naming convention (unquoted,
Gmail-label-matching, distinct from the in-product relabel string); and (3) the
screenshot-framing fix, where owner judgment corrected two wrong turns of mine
(median-pad band → over-corrected cover crop) and landed on solid `#616065` +
bottom-bias + rounded-corner trim. Entry 60 carries the honest counterfactual.

## §h — Post-session: what's left before public launch

Owner-parallel, unchanged from S19 except the site is now built:

1. **Confirm the live Pages rebuild** (the §d two-point check) — this is the
   only outstanding verification for the page itself.
2. Chrome Web Store **listing copy** + **submission** (the screenshots are
   captured; assets generated S18).
3. At launch: **swap the pending CTA** for the live Web Store badge/URL in
   `docs/index.html` (hero + footer; swap site comment-marked).

No code/doc-hardening session is planned; the extension remains
feature-complete at 376 tests, `SCHEMA_VERSION` 4, v1.0.0.

## §i — Post-build owner refinements (same session, after first push)

Owner reviewed the live page and requested seven tweaks; all applied to
`docs/index.html`:

1. Footer "Built by Fenil Dedhia" LinkedIn link now opens in a new tab
   (`target="_blank" rel="noopener noreferrer"`).
2. Highlights copy: "Time-zone-aware suggestions" → "Time zone aware
   suggestions"; "Native Gmail feel" description → "Enhances Gmail's own
   'Schedule Send' feature rather than replacing it."
3. **New 4th "What it does" block** — Pinned Timezones value prop ("The time
   zones you work across, one tap away"), inserted before "Built into Gmail's
   own Schedule Send", using the `pinned-timezones` screenshot. Re-flowed the
   alternating image side so the pattern stays right/left/right/left ("Built
   into Gmail" gained `fl-feature--reverse`).
4. **Screenshots are now clickable** → open in a full-res **lightbox** with a
   graceful fade-backdrop + scale-in/out (self-contained first-party inline JS
   + CSS, no third-party scripts; keyboard-openable, Esc/✕/backdrop/image to
   close, focus restored, honours `prefers-reduced-motion`). Applies to all 8
   screenshots (hero, the four feature shots, the three "closer look" shots).
5. The "gentle nudge before after-hours sends" block now uses the **real**
   after-hours-warning screenshot instead of the placeholder clock illustration
   (the shot now exists in the captured set) — the `.fl-illus` styles were
   removed.
6. Hero + feature-block-1 image swapped from the raw 1863px JPEG to the
   store-ready **1280×800 PNG** (`schedule-optimize.png`); the orphaned
   `schedule-optimize.jpg` was deleted.

New assets: `docs/assets/screenshots/after-hours-warning.jpg`,
`docs/assets/screenshots/schedule-optimize.png`. No new product claims; still no
extension-code/§11/schema impact. Re-verified (headless render + a forced-open
lightbox state). Same live-Pages confirmation applies to the redeploy.

## §j — CSS specificity fix + nav change (third round)

Owner spotted the "View source on GitHub" button text was invisible in the hero
and faint in the footer. **Root cause: CSS specificity.** The generic link rules
`.fl-page a { color:#367b87 }` and `.fl-footer a { color:#9fd2db }` are
specificity (0,1,1); the button color rules (`.fl-btn-primary`/`.fl-btn-ghost`,
0,1,0) lost to them, so an `<a class="fl-btn-*">` inherited the *link* color —
teal text on the teal hero button (invisible), light-teal on the white footer
button (faint). **Fix:** scoped the button color rules under `.fl-page`
(→ 0,2,0) so they win, and pinned `color` explicitly in the `:hover` states; a
code comment documents why the prefix must stay. (Lesson for future edits to
this file: any rule setting a button's text color must out-specify the broad
link-color rules.)

Also per owner: the top-right nav **"Open source" GitHub link → "Built by Fenil
Dedhia"**, with "Fenil Dedhia" linking to LinkedIn in a new tab
(`target="_blank" rel="noopener noreferrer"`). GitHub stays reachable via the
hero + footer buttons. Re-verified in headless render (hero + footer crops).

## §k — Store-ready screenshot fix: landed on solid #616065 padding (fourth round, several iterations)

Owner flagged the hero/feature image (`schedule-optimize.png`, the store-ready
1280×800) had **white spots and a mismatched light band at the bottom** — an
obvious sloppy letterbox. **Root cause** (`media/web-store/screenshots/make-store-ready.py`):
it used *contain* (scale-to-fit + pad to 1280×800) and filled the letterbox
bars with the **median color of the screenshot's extreme edge row**. The raw's
bottom edge is intrinsically busy (dark Gmail chrome + the white timezone
dropdown + a scrollbar/inbox peek), and its very last row was an anomalous light
`(114,113,118)` — so the bottom bar came out lighter than its surroundings (the
band) and the near-white dropdown pixels sat right at the seam (the spots).

**First attempt (cover):** rewrote the script to *cover* (scale-to-fill +
center-crop) — full-bleed, no bars. Owner then pointed out it removed the
breathing room: the open dropdown sat jammed against the bottom edge. They
wanted the padding *back*, just executed naturally.

**Iterations toward the final fill:** tried a contain + blurred edge-extension
pad (build the bar from a blurred strip of the screenshot's own edge). Owner
preferred a **solid fill** and specified the exact color **`#616065`** (which is
Gmail's chrome grey, so it reads as a clean extension of the app background).

**Final approach (contain + solid `#616065`):** the screenshot is *contained*
(scaled to fit, nothing cropped) on a flat `#616065` canvas, pasted **bottom-heavy**
(`TOP_FRAC=0.40`) so low-sitting content like the open dropdown gets comfortable
room beneath it (~29px on the hero). Per-edge trim: 2px top/bottom, **14px
left/right** — the wider side-trim cuts past the **browser window's rounded
bottom corners**, whose white page-background (captured outside the corner
curve) otherwise survived as little white triangles sitting against the grey pad
(the "rounding / white spots on the padding" the owner flagged). White-page
screenshots (onboarding/settings) have legitimately white corners and need no
fix. Previewed each step in macOS Preview for owner sign-off. Regenerated all
six store-ready PNGs and refreshed `docs/assets/screenshots/schedule-optimize.png`;
raw originals untouched (originals-unchanged guard re-verified); confirmed the
hero's bottom corners are clean grey (no white triangle).

## §l — Final hero copy + "Schedule send" naming sweep (fifth round)

Owner supplied final hero strings (exact): title **"Your emails arrive when your
recipients are actually reading."** and a subhead leading with the recipient
benefit, then the working-hours check, then "Enhances Gmail's own Schedule send
feature rather than replacing it. No account, no tracking." Constraints honored:
eyebrow/layout/styling unchanged, **no em dashes in the hero**, text-only.

Per the same instruction, applied Gmail's-label treatment — **"Schedule send"**,
capitalized and **unquoted** — to *every* feature mention on the page: the
What-it-does heading + body (including the relabel sentence, de-quoted), the
Native-Gmail-feel highlight, all three screenshot `alt` texts, and the
meta/OG/Twitter descriptions. Verified live: zero capital-S "Schedule Send"
remains; the in-product relabel string ("Schedule Send (powered by Fashionably
Late)") is unchanged in the extension — this was a marketing-copy convention
only. (Decision recorded as Entry 60 (2).)

## §m — Net session outcome

`docs/index.html` is live at `fashionablylate.app` — header, hero (final copy +
honest pending CTA), four-block What-it-does, highlights, privacy, clickable
full-res screenshot lightbox, footer. Legal pages verified unchanged (Primer,
no CSS leak). Store-ready screenshots regenerated with the solid `#616065`
padding. All customer-facing; **zero extension-code / manifest / `SCHEMA_VERSION`
(4) / test-count (376) / permissions / §11 impact.** Remaining pre-launch work
unchanged from §h: confirm CTA swap at listing-go-live; listing copy +
submission.

## §n — Landing-page copy + screenshot refinement (sixth round)

Text/asset polish on `docs/index.html`; no extension code, no layout change.

**Hero subhead rewrite.** Owner supplied a new subhead leading with the
**brand wordplay** — "Being fashionably late is a good thing for email, too." —
then the schedule-to-land-at-the-right-local-time benefit, then the
working-hours check, then "No account, no tracking." H1 + eyebrow unchanged; no
em dashes (constraint honored).

**"The right local time" accuracy fix.** Header changed from *"The right local
time, for every recipient"* → **"The right local time for your recipient"** —
the feature optimizes for **one chosen** recipient, not all of them; the old
"every recipient" phrasing overstated it. Body rewritten to say Fashionably Late
"lets you pick the one you're writing to," keeps the brand wordplay
**"fashionably late (😉)"** (emoji intentional), and **bolds** the value-prop
hook *"Pick someone's time zone once and it's remembered"* (the consequence
clause ", so you never re-pick it for the same person." is regular weight). Do
not reintroduce "every"/"all" phrasing here.

**Two screenshot swaps** — both processed through the existing
`media/web-store/screenshots/make-store-ready.py` (folder-scan; contain-fit +
solid `#616065` pad, 1280×800 RGB no alpha — the §k method, unchanged), output
to `store-ready/`, then copied into `docs/assets/screenshots/`:
- **Hero / top:** `Product - Optimize for X.jpg` → `store-ready/Product - Optimize
  for X-1280x800.png` → `docs/assets/screenshots/optimize-for-x.png`.
- **"Built into Gmail's own Schedule send" section:** `Product - Native Schedule
  Send powered by Fashionably Late.jpg` → `store-ready/Product - Native Schedule
  Send powered by Fashionably Late-1280x800.png` →
  `docs/assets/screenshots/native-schedule-send.png` (img `width/height` updated
  1863×1080 → 1280×800). Section header keeps Gmail's lowercase "Schedule send".

**Copy sharpening (seventh round, text-only).** Three placements, no new section:
(1) **hero subhead** settled on a tight *who/why + payoff* line — "…If you work
across time zones and keep doing the mental math on when to hit send, this free
Chrome extension helps you schedule emails in Gmail at the right time,
automatically. No account, no tracking." (iterated through several longer drafts
and a "Here's how." teaser before landing here; the smarter-not-replacement
point now lives in the "Built into Gmail's own Schedule Send" section); H1 +
eyebrow unchanged, no em dashes. (2) **"The right
local time" section** gained one concrete pain line at the top of the body — "No
more working out what 2 p.m. your time means for someone three zones away." —
header/bold/"research-backed"/"fashionably late (😉)" otherwise unchanged. (3)
**"Built into Gmail's own Schedule Send" section** rewritten to give the
works-WITH-Gmail idea real estate: "Fashionably Late works with Gmail, it
doesn't replace it… your scheduled emails stay right where Gmail puts them, in
the Scheduled folder… Nothing new to learn." The time-zone-pain and
not-a-replacement ideas were deliberately kept OUT of the highlights grid and
privacy section (those keep their own focus). *(Owner later capitalized this one
section HEADER to "Schedule Send" — a deliberate exception to the §l
lowercase-"Schedule send" marketing convention, scoped to this `<h3>` title
only; the body keeps lowercase "Schedule send".)*

**Immutable-originals rule reaffirmed:** the two source `.jpg` originals in
`media/web-store/screenshots/` are never edited or overwritten — every padded
variant goes only into `store-ready/`. Verified: both source originals'
SHA-256 unchanged across the run (script's originals-unchanged guard also
passed); both new store-ready PNGs confirmed exactly 1280×800, RGB, no alpha.
The old `schedule-modal.jpg` (now unreferenced) and `schedule-optimize.png`
(still used by the "right local time" feature block, deliberately unchanged)
remain in place. Live GitHub Pages rebuild is the real proof (owner to confirm
the page + that `/legal/{privacy,terms}` still render unchanged).

## §o — Privacy & data settings redesign + 1.0.1 cut (STAGED post-launch update)

First extension-code change since 1.0.0 was packaged for the Web Store. The 1.0.0
zip is in review and was left untouched; this ships as a **staged 1.0.1** the
owner uploads after 1.0.0 clears (rationale + the cut-and-stage discipline:
**Entry 61**).

**Privacy & data redesign (copy + layout only).** `PrivacyDataSection.tsx` was
restructured so each action *earns itself* with a one-line scenario above its
button: Export — "Switching to a new computer or Chrome profile? Take your
timezones and settings with you." — and Delete — "Moving off a shared or work
computer, or want a clean slate? Remove everything Fashionably Late has saved."
The opening reassurance line and the Privacy Policy · Terms links are kept. Each
scenario `<p>` is the button's accessible description (`aria-describedby`) and
precedes it in DOM order, so reading + tab order is scenario→action (consistent
with the S14 a11y work); scenario text uses `--fl-fg` on white (AA). New CSS:
`.fl-set-privacy-action` (block) + `.fl-set-privacy-scenario`, replacing the old
single `.fl-set-privacy-actions` flex-row. **No logic touched:** `handleExport`,
`handleConfirmDelete`/`deleteAllData`, and the typed-"delete" `DeleteDataModal`
(with its focus trap) are byte-for-byte unchanged — **Delete still confirms
before wiping.** No other settings section or hot path touched; §11 invariants
stand.

**Version bump 1.0.0 → 1.0.1** in `manifest.config.ts` (source of truth) and
`package.json` (kept in sync). About-page version is read dynamically from the
manifest, so no section edit was needed. **`npm run package`** produced
`extension/release/fashionably-late-1.0.1.zip` (108.9 KB, 27 entries) — all
verifications passed: `key` stripped from the zipped manifest, `dist/manifest.json`
still has its `key`, `manifest.json` at zip root, **permissions `["storage","scripting"]`
+ host `["https://mail.google.com/*"]` unchanged**, version 1.0.1. The
`fashionably-late-1.0.0.zip` in `release/` is untouched.

**Verify:** typecheck / lint / format:check / build all clean; **test count 376
(no delta** — the existing PrivacyDataSection tests query by button name, dialog,
and links, all preserved). `SCHEMA_VERSION` still 4.

**Spacing follow-up (same staged 1.0.1, copy/layout only).** The Privacy & data
vertical rhythm was uneven (intro hugged the first scenario; the two blocks drifted
apart by more than the intro gap). Restructured into a deliberate three-tier scale
on the existing 8/16/24 tokens: **24px after the intro** (new `.fl-set-privacy-intro`
modifier on the intro `<p>`, leaving the shared `.fl-set-help` untouched), **16px
equal between the Export and Delete blocks** (`.fl-set-privacy-action` 20→16), and
**8px scenario→button** within each block (unchanged) so each line+button reads as a
pair; legal links stay spaced below Delete. No new arbitrary margins. The staged
`fashionably-late-1.0.1.zip` was rebuilt to include it (still 1.0.1, not yet
uploaded; verifications re-passed, permissions/host unchanged).

**Policy-links separation (same staged 1.0.1, copy/layout only).** The Privacy
Policy · Terms links read as a sub-action of Delete (too close beneath it). Added
a thematic `<hr className="fl-set-privacy-divider">` between the Delete block and
the links — a 0.5px hairline driven by the existing `var(--fl-border)` token (so
it adapts if the page ever gains a dark theme; the page is light-only today),
with **equal 24px above and below**. To keep one even rhythm down the whole
section the inter-group gap was unified to **24px** (`.fl-set-privacy-action`
16→24, matching the intro's 24), leaving the 8px scenario→button pair intact.
Per owner instruction the optional "RESOURCES" label was **skipped** — the
divider alone does the separating. Links unchanged. Zip rebuilt (1.0.1); bundle
verified to contain the divider + 24px rhythm; permissions/host unchanged.
