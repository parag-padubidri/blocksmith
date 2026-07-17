// Generates the PWA icon set into public/icons/ with zero dependencies.
// Run: node scripts/gen-icons.mjs
// The mark is an isometric grass voxel on the app's dark background.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// ---- minimal PNG encoder (RGBA, no filter) ----
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePNG(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- tiny software rasterizer ----
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function inPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function drawIcon(size, pad) {
  const SS = 2; // supersample for smooth edges
  const W = size * SS;
  const cx = W / 2;
  const cy = W / 2 + W * 0.04;
  const s = (W / 2 - pad * SS) * 0.92;
  const faces = [
    // top, left, right — grass green with the app's face shading
    { c: hex("#6abe30"), pts: [[cx, cy - s], [cx + s, cy - s / 2], [cx, cy], [cx - s, cy - s / 2]] },
    { c: hex("#3f7a1e"), pts: [[cx - s, cy - s / 2], [cx, cy], [cx, cy + s], [cx - s, cy + s / 2]] },
    { c: hex("#559826"), pts: [[cx + s, cy - s / 2], [cx, cy], [cx, cy + s], [cx + s, cy + s / 2]] },
  ];
  const bg = hex("#1a1d24");
  const big = Buffer.alloc(W * W * 4);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      let c = bg;
      for (const f of faces) if (inPoly(x + 0.5, y + 0.5, f.pts)) c = f.c;
      const i = (y * W + x) * 4;
      big[i] = c[0];
      big[i + 1] = c[1];
      big[i + 2] = c[2];
      big[i + 3] = 255;
    }
  // box-downsample SS x SS
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sums = [0, 0, 0];
      for (let dy = 0; dy < SS; dy++)
        for (let dx = 0; dx < SS; dx++) {
          const i = ((y * SS + dy) * W + x * SS + dx) * 4;
          sums[0] += big[i];
          sums[1] += big[i + 1];
          sums[2] += big[i + 2];
        }
      const o = (y * size + x) * 4;
      out[o] = sums[0] / (SS * SS);
      out[o + 1] = sums[1] / (SS * SS);
      out[o + 2] = sums[2] / (SS * SS);
      out[o + 3] = 255;
    }
  return encodePNG(out, size, size);
}

mkdirSync(OUT, { recursive: true });
const specs = [
  ["icon-192.png", 192, 18],
  ["icon-512.png", 512, 48],
  ["apple-touch-icon.png", 180, 26],
  ["icon-maskable-512.png", 512, 110], // extra padding for the maskable safe zone
];
for (const [name, size, pad] of specs) {
  writeFileSync(join(OUT, name), drawIcon(size, pad));
  console.log("wrote", name);
}
