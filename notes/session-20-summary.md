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

**None.** The CTA approach (honest "coming soon" pending button + GitHub
secondary + marked swap site) was specified in the owner's session prompt, not a
mid-build trajectory fork — no counterfactual to record. Logged as
`Session 20 — no entries this session.` per the close-out obligation.

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

## §k — Store-ready screenshot fix: contain+pad → cover (fourth round)

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

**Final approach (contain + blurred edge-extension):** the screenshot is
*contained* (scaled to fit, nothing cropped), and each letterbox bar is filled
by sampling a thin strip of the screenshot's **own adjacent edge**, stretching
it across the bar, and heavily Gaussian-blurring it (radius 18). So the padding
is built from the image's own colors, softened into an out-of-focus
continuation — which solves the two failure modes of a flat fill: a busy edge
(white dropdown over dark chrome) has no single matching color, and the blur
blends them rather than picking one wrong hue; and any hard white-spots at the
seam dissolve in the blur. The vertical slack is split **bottom-heavy**
(`TOP_FRAC=0.40` → ~40% above / ~60% below) so low-sitting content like an open
dropdown gets comfortable room beneath it (~35px on the hero shot). A 2px
`EDGE_TRIM` first drops the window-border/scrollbar ring. Regenerated all six
store-ready PNGs and refreshed `docs/assets/screenshots/schedule-optimize.png`;
raw originals untouched (originals-unchanged guard re-verified). Visually
confirmed against three candidates (old flat-median, uniform-grey, blurred) —
the blurred bottom-biased fill read as the most natural.
