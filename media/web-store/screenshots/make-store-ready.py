#!/usr/bin/env python3
# Copyright 2026 Fenil Dedhia
# SPDX-License-Identifier: Apache-2.0
#
# Standalone asset utility (NOT a build step, NOT a project dependency).
# Makes the raw Web Store screenshots store-ready: scale-to-fit (contain,
# no distortion, no crop) into exactly 1280x800, then pad with a per-image
# edge-sampled background so the letterbox blends instead of showing a hard
# white seam. Outputs 24-bit RGB PNG (no alpha) to store-ready/.
#
# Originals are never modified — outputs go to a NEW subfolder.

import sys
from pathlib import Path
from statistics import median

from PIL import Image

TARGET_W, TARGET_H = 1280, 800
SRC_DIR = Path(__file__).resolve().parent
OUT_DIR = SRC_DIR / "store-ready"
IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
WHITE = (255, 255, 255)


def median_edge_color(img: Image.Image, row: str) -> tuple[int, int, int]:
    """Median RGB of the top or bottom edge row. White fallback on failure."""
    try:
        w, h = img.size
        y = 0 if row == "top" else h - 1
        px = [img.getpixel((x, y)) for x in range(w)]
        return (
            int(median(p[0] for p in px)),
            int(median(p[1] for p in px)),
            int(median(p[2] for p in px)),
        )
    except Exception:
        return WHITE


def process(src_path: Path) -> dict:
    with Image.open(src_path) as im:
        img = im.convert("RGB")  # drops any alpha

        w, h = img.size
        factor = min(TARGET_W / w, TARGET_H / h)  # contain
        new_w, new_h = max(1, round(w * factor)), max(1, round(h * factor))
        scaled = img.resize((new_w, new_h), Image.LANCZOS)

        top_color = median_edge_color(img, "top")
        bottom_color = median_edge_color(img, "bottom")

        # Canvas: top bar = top edge color, bottom bar = bottom edge color.
        canvas = Image.new("RGB", (TARGET_W, TARGET_H), top_color)
        off_x = (TARGET_W - new_w) // 2
        off_y = (TARGET_H - new_h) // 2
        # Fill the area below the pasted image with the bottom color so each
        # letterbox bar matches its own side of the screenshot.
        if off_y + new_h < TARGET_H:
            bottom_bar = Image.new(
                "RGB", (TARGET_W, TARGET_H - (off_y + new_h)), bottom_color
            )
            canvas.paste(bottom_bar, (0, off_y + new_h))
        canvas.paste(scaled, (off_x, off_y))

        out_path = OUT_DIR / f"{src_path.stem}-1280x800.png"
        # 24-bit RGB PNG, no alpha. (Mode is already RGB; PNG from RGB has no
        # alpha channel.)
        canvas.save(out_path, format="PNG")

    return {
        "src": src_path.name,
        "out": out_path,
        "scaled_to": (new_w, new_h),
        "top_color": top_color,
        "bottom_color": bottom_color,
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
    print(f"{'file'.ljust(name_w)}  {'size':>11}  {'mode':>4}  {'alpha':>5}  pad(top→bottom)")
    for r in results:
        pad = f"{r['top_color']}→{r['bottom_color']}"
        flag = "✓" if r["ok"] else "✗"
        print(
            f"{r['out'].name.ljust(name_w)}  {str(r['size']):>11}  "
            f"{r['mode']:>4}  {str(r['has_alpha']):>5}  {pad}  {flag}"
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
