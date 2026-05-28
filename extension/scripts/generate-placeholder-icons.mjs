// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Generates DEV PLACEHOLDER extension icons — a garish magenta square with
// "OQ" in white. Deliberately ugly so it can never be mistaken for final
// branding. Real brand assets are a pre-launch task (PRE_LAUNCH_CHECKLIST.md);
// do not treat these as designed icons.
//
// Zero dependencies on purpose: a hand-rolled PNG encoder (Node's built-in
// zlib only) is the right amount of tooling for throwaway placeholders — no
// image library is added to the project for files that get deleted at brand
// time. Regenerate with `npm run icons`.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);
mkdirSync(outDir, { recursive: true });

const SIZES = [16, 32, 48, 128];
const BG = [255, 0, 144]; // unmistakable "placeholder" magenta
const FG = [255, 255, 255];

// 5x7 bitmap glyphs — only the two letters we need.
const GLYPHS = {
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
};
const TEXT = "OQ";
const GLYPH_W = 5;
const GLYPH_H = 7;
const GAP = 1;

// --- minimal PNG encoder (RGBA, 8-bit, no interlace) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // bytes 10-12 (compression, filter, interlace) stay 0

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function setPixel(rgba, size, x, y, [r, g, b]) {
  const i = (y * size + x) * 4;
  rgba[i] = r;
  rgba[i + 1] = g;
  rgba[i + 2] = b;
  rgba[i + 3] = 255;
}

for (const size of SIZES) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPixel(rgba, size, x, y, BG);
  }

  const blockW = TEXT.length * GLYPH_W + (TEXT.length - 1) * GAP;
  const scale = Math.max(
    1,
    Math.floor(Math.min((size * 0.62) / blockW, (size * 0.62) / GLYPH_H)),
  );
  const ox = Math.floor((size - blockW * scale) / 2);
  const oy = Math.floor((size - GLYPH_H * scale) / 2);

  for (let gi = 0; gi < TEXT.length; gi++) {
    const glyph = GLYPHS[TEXT[gi]];
    const gOriginX = gi * (GLYPH_W + GAP);
    for (let gy = 0; gy < GLYPH_H; gy++) {
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (glyph[gy][gx] !== "1") continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = ox + (gOriginX + gx) * scale + sx;
            const py = oy + gy * scale + sy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              setPixel(rgba, size, px, py, FG);
            }
          }
        }
      }
    }
  }

  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, rgba));
  console.log(`wrote ${file}`);
}
