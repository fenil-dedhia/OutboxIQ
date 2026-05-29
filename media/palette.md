# Moonstone palette (Entry 57)

Brand primary **`#5EB1BF`** (Moonstone). Scale generated in HSL — hue 188.7°,
saturation 43.1% held constant, lightness varied. All ratios are WCAG 2.1,
computed (not eyeballed). The drift guard is `extension/src/brand-palette.test.ts`.

| Step | Hex | Role in UI |
|------|-----|------------|
| 50  | `#EFF7F8` | Chip / light-tint backgrounds, sidebar active bg, hover bg, confirm box |
| 100 | `#DBEDF0` | (reserved — alt tint) |
| 200 | `#B6DCE2` | Chip / tinted borders |
| 300 | `#92CAD3` | (reserved) |
| 400 | `#7ABECA` | (reserved — light accent) |
| 500 | `#5EB1BF` | **Brand color** — logo, large decorative fills, promo tiles. NOT for white-text buttons or as text on white (fails AA: 2.47:1). |
| 600 | `#4399A8` | (reserved — passes UI/large 3:1 only) |
| 700 | `#367B87` | **Primary button bg; link/accent text & icons on white; focus rings.** White text 4.84:1 ✅ AA. |
| 800 | `#295F68` | Primary button hover/pressed; chip text; sidebar active text. White text 7.16:1 ✅ |

## The #5EB1BF trade-off (owner decision, Phase 1 gate)
White text on `#5EB1BF` is only **2.47:1** — fails AA. Owner chose the
AA-safe path: the brand color stays the *logo/accent*, and the *accessible*
700 (`#367B87`, 4.84:1) is the primary-button + text shade. Keeps the S14
accessibility commitment.

## Disabled state
Disabled affordances stay **neutral grey** (not brand-tinted): the old
blue-grey `#b6c6e0` → `#b8bcc0`. Semantic colors untouched — error `#c5221f`,
warning-orange `#b06000`, greys, disabled grey.

## Old → new mapping (the S18 swap)
| Old (blue) | New (teal) | Was |
|------------|-----------|-----|
| `#1a73e8` | `#367b87` | primary bg / accent text / focus ring |
| `#1b66c9` | `#295f68` | button hover |
| `#e8f0fe` | `#eff7f8` | light background |
| `#f8fafe` | `#eff7f8` | secondary-button hover |
| `#d2e3fc` | `#b6dce2` | chip / tinted border |
| `#1a3a6b` | `#295f68` | chip text |
| `#b6c6e0` | `#b8bcc0` | disabled icon (neutralized to grey) |
