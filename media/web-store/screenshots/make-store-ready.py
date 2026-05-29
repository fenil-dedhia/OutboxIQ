#!/usr/bin/env python3
# Copyright 2026 Fenil Dedhia
# SPDX-License-Identifier: Apache-2.0
#
# Standalone asset utility (NOT a build step, NOT a project dependency).
# Makes the raw Web Store screenshots store-ready: exactly 1280x800, 24-bit RGB
# PNG (no alpha), output to store-ready/.
#
# Strategy: CONTAIN (scale-to-fit, no crop) + BLURRED EDGE-EXTENSION padding.
# The screenshot is scaled to fit fully inside 1280x800 (nothing cropped), then
# the leftover letterbox is filled by taking a thin strip of the screenshot's
# own adjacent edge, stretching it across the bar, and heavily Gaussian-blurring
# it. So the padding is built from the screenshot's *own* colors, softened — it
# reads as a natural, out-of-focus continuation rather than a flat bar. This
# fixes the two ways the earlier flat-median-fill looked sloppy: (1) no single
# wrong-hue band (a busy edge — e.g. white timezone dropdown over dark Gmail
# chrome — has no one matching color; the blur blends them), and (2) no hard
# white-spots at the seam (the blur dissolves them).
#
# The vertical slack is split bottom-heavy (TOP_FRAC below) so content that
# tends to sit low — like an open dropdown — gets comfortable breathing room
# beneath it instead of being jammed against the edge. A small EDGE_TRIM first
# drops the 1px window-border / scrollbar artifacts that ring a raw capture.
#
# (Supersedes both the original flat-median-pad and the interim full-bleed cover
# crop: cover removed the padding entirely and pushed content to the edge.)
#
# Originals are never modified — outputs go to a NEW subfolder.

import sys
from pathlib import Path
from statistics import median

from PIL import Image, ImageFilter

TARGET_W, TARGET_H = 1280, 800
EDGE_TRIM = 2          # px shaved off each raw edge (window-border/scrollbar junk)
TOP_FRAC = 0.40        # share of vertical slack put ABOVE the image (rest below)
EDGE_SRC = 28          # px-deep source strip sampled to build each blurred bar
BLUR_RADIUS = 18       # Gaussian blur applied to the stretched bar
SRC_DIR = Path(__file__).resolve().parent
OUT_DIR = SRC_DIR / "store-ready"
IMAGE_EXTS = {".jpg", ".jpeg", ".png"}


def _top_median(img: Image.Image) -> tuple[int, int, int]:
    """Median RGB of the top edge row — the corner/base fallback color."""
    w, _ = img.size
    px = [img.getpixel((x, 0)) for x in range(w)]
    return tuple(int(median(p[i] for p in px)) for i in range(3))


def _blurred(strip: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Stretch an edge strip to fill a bar, then blur it into a soft continuation."""
    return strip.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(BLUR_RADIUS))


def process(src_path: Path) -> dict:
    with Image.open(src_path) as im:
        img = im.convert("RGB")  # drops any alpha

        # Trim the noisy outermost ring (window border / scrollbar / AA edge).
        w, h = img.size
        if EDGE_TRIM and w > 2 * EDGE_TRIM and h > 2 * EDGE_TRIM:
            img = img.crop((EDGE_TRIM, EDGE_TRIM, w - EDGE_TRIM, h - EDGE_TRIM))
        w, h = img.size

        # CONTAIN: fit fully inside the target, nothing cropped.
        factor = min(TARGET_W / w, TARGET_H / h)
        new_w, new_h = max(1, round(w * factor)), max(1, round(h * factor))
        scaled = img.resize((new_w, new_h), Image.LANCZOS)

        canvas = Image.new("RGB", (TARGET_W, TARGET_H), _top_median(img))
        off_x = round((TARGET_W - new_w) * 0.5)
        off_y = round((TARGET_H - new_h) * TOP_FRAC)  # bottom-heavy split
        canvas.paste(scaled, (off_x, off_y))

        # Blurred edge-extension into each letterbox bar (built from the
        # screenshot's own adjacent pixels).
        top_bar = off_y
        bottom_bar = TARGET_H - (off_y + new_h)
        left_bar = off_x
        right_bar = TARGET_W - (off_x + new_w)
        if top_bar > 0:
            src = scaled.crop((0, 0, new_w, min(EDGE_SRC, new_h)))
            canvas.paste(_blurred(src, (new_w, top_bar)), (off_x, 0))
        if bottom_bar > 0:
            src = scaled.crop((0, new_h - min(EDGE_SRC, new_h), new_w, new_h))
            canvas.paste(_blurred(src, (new_w, bottom_bar)), (off_x, off_y + new_h))
        if left_bar > 0:
            src = scaled.crop((0, 0, min(EDGE_SRC, new_w), new_h))
            canvas.paste(_blurred(src, (left_bar, new_h)), (0, off_y))
        if right_bar > 0:
            src = scaled.crop((new_w - min(EDGE_SRC, new_w), 0, new_w, new_h))
            canvas.paste(_blurred(src, (right_bar, new_h)), (off_x + new_w, off_y))

        out_path = OUT_DIR / f"{src_path.stem}-1280x800.png"
        canvas.save(out_path, format="PNG")

    return {
        "src": src_path.name,
        "out": out_path,
        "scaled_to": (new_w, new_h),
        "pad": (top_bar, bottom_bar, left_bar, right_bar),  # t,b,l,r px
    }


def main() -> int:
    if not SRC_DIR.is_dir():
        print(f"✗ source dir missing: {SRC_DIR}", file=sys.stderr)
        return 1

    originals_before = sorted(
        p.name for p in SRC_DIR.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )

    OUT_DIR.mkdir(exist_ok=True)

    sources = sorted(
        p
        for p in SRC_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if not sources:
        print(f"✗ no images found in {SRC_DIR}", file=sys.stderr)
        return 1

    print(f"→ Processing {len(sources)} image(s) → {OUT_DIR}\n")

    results = []
    failures = []
    for src in sources:
        info = process(src)
        # Verify each output immediately, fail loudly.
        with Image.open(info["out"]) as out_im:
            size_ok = out_im.size == (TARGET_W, TARGET_H)
            mode_ok = out_im.mode == "RGB"
            has_alpha = "A" in out_im.getbands() or out_im.mode in ("RGBA", "LA", "PA")
        ok = size_ok and mode_ok and not has_alpha
        info.update(size=out_im.size, mode=out_im.mode, has_alpha=has_alpha, ok=ok)
        results.append(info)
        if not ok:
            failures.append(info)

    # ── Summary table ──────────────────────────────────────────────────────
    print("── Output summary ───────────────────────────────────────────────")
    name_w = max(len(r["out"].name) for r in results)
    print(f"{'file'.ljust(name_w)}  {'size':>11}  {'mode':>4}  {'alpha':>5}  pad(t,b,l,r px)")
    for r in results:
        flag = "✓" if r["ok"] else "✗"
        print(
            f"{r['out'].name.ljust(name_w)}  {str(r['size']):>11}  "
            f"{r['mode']:>4}  {str(r['has_alpha']):>5}  {str(r['pad'])}  {flag}"
        )
    print("─────────────────────────────────────────────────────────────────")

    # ── Originals-unchanged check ────────────────────────────────────────────
    originals_after = sorted(
        p.name for p in SRC_DIR.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if originals_after != originals_before:
        print(
            f"\n✗ ORIGINALS CHANGED!\n  before: {originals_before}\n  after:  {originals_after}",
            file=sys.stderr,
        )
        return 1
    print(
        f"\n✓ Originals unchanged: {len(originals_after)} files in parent "
        f"({', '.join(originals_after)})"
    )

    if failures:
        print(f"\n✗ {len(failures)} output(s) FAILED spec checks.", file=sys.stderr)
        return 1

    print(f"\n✓ All {len(results)} outputs are exactly 1280x800, RGB, no alpha.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
