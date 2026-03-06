#!/usr/bin/env node
/**
 * Generates PNG icons for the PWA without any third-party dependencies.
 * Outputs:
 *   public/apple-touch-icon.png  (180×180 – required by iOS Safari)
 *   public/icon-192.png          (192×192 – Android / manifest)
 *   public/icon-512.png          (512×512 – splash / maskable)
 *
 * Run: node scripts/gen-icons.mjs
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── CRC-32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  return ((c ^ 0xffffffff) >>> 0);
}

// ── PNG chunk builder ────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

// ── Scanline polygon fill (handles concave/convex) ───────────────────────────
function fillPolygon(px, W, verts, r, g, b) {
  const H = (px.length / (W * 4)) | 0;
  const minY = Math.max(0, Math.floor(Math.min(...verts.map(v => v[1]))));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...verts.map(v => v[1]))));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < verts.length; i++) {
      const [x1, y1] = verts[i];
      const [x2, y2] = verts[(i + 1) % verts.length];
      if (Math.min(y1, y2) <= y && y < Math.max(y1, y2)) {
        xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let p = 0; p + 1 < xs.length; p += 2) {
      const xL = Math.max(0, Math.ceil(xs[p]));
      const xR = Math.min(W - 1, Math.floor(xs[p + 1]));
      for (let x = xL; x <= xR; x++) {
        const idx = (y * W + x) * 4;
        px[idx] = r; px[idx + 1] = g; px[idx + 2] = b; px[idx + 3] = 0xff;
      }
    }
  }
}

// ── Icon renderer ────────────────────────────────────────────────────────────
function makePng(size) {
  const W = size, H = size;
  const px = new Uint8Array(W * H * 4);

  // Pocket red background
  for (let i = 0; i < W * H; i++) {
    px[i * 4] = 0xef; px[i * 4 + 1] = 0x40; px[i * 4 + 2] = 0x56; px[i * 4 + 3] = 0xff;
  }

  // White pocket icon shape — based on the pocket-icon.svg (viewBox 0 0 24 24)
  // The icon has a rectangular top section and a chevron/checkmark inside.
  // We draw the outer pocket shape (U-shaped with rounded bottom) as white,
  // then cut out the chevron in the accent color.
  const sc = size / 24;
  const pad = 5; // padding around icon within the square

  // Outer pocket body: rectangle top + rounded bottom (approximated)
  // Original path: M3 3 ... v7 c0 5.523 4.477 10 10 10s10-4.477 10-10V4
  // Scaled to icon with padding
  const osc = (size - pad * 2) / 24;
  const ox = pad;
  const oy = pad;

  // Draw the pocket outline as a filled white shape
  // Top rectangle part: from (2,3) to (22,11) in SVG coords
  // Bottom semicircle: center (12,11), radius 10
  // We approximate the semicircle with polygon segments
  const pocketVerts = [];
  // Top-left
  pocketVerts.push([ox + 2 * osc, oy + 3 * osc]);
  // Top-right
  pocketVerts.push([ox + 22 * osc, oy + 3 * osc]);
  // Right side down to curve start
  pocketVerts.push([ox + 22 * osc, oy + 11 * osc]);
  // Bottom semicircle (from right to left)
  const cx = ox + 12 * osc;
  const cy = oy + 11 * osc;
  const r = 10 * osc;
  for (let angle = 0; angle <= 180; angle += 5) {
    const rad = (angle * Math.PI) / 180;
    pocketVerts.push([cx + r * Math.cos(rad), cy + r * Math.sin(rad)]);
  }
  // Left side up
  pocketVerts.push([ox + 2 * osc, oy + 11 * osc]);

  fillPolygon(px, W, pocketVerts, 0xff, 0xff, 0xff);

  // Draw the chevron/checkmark inside in the accent color (cutting it out)
  // Chevron points: (7.293, 9.707) -> (12, 14.414) -> (16.707, 9.707)
  // We draw a thick chevron by creating a polygon for the stroke
  const sw = 1.4 * osc; // stroke width
  const chevron = [
    // Outer top-left
    [ox + 6.3 * osc, oy + 9.3 * osc],
    // Outer bottom center
    [ox + 12 * osc,  oy + 15.0 * osc],
    // Outer top-right
    [ox + 17.7 * osc, oy + 9.3 * osc],
    // Inner top-right
    [ox + 16.3 * osc, oy + 9.3 * osc],
    // Inner bottom center
    [ox + 12 * osc,  oy + 13.0 * osc],
    // Inner top-left
    [ox + 7.7 * osc, oy + 9.3 * osc],
  ];
  fillPolygon(px, W, chevron, 0xef, 0x40, 0x56);

  // ── Encode RGBA pixels → PNG ─────────────────────────────────────────────
  const stride = 1 + W * 4;
  const raw = Buffer.allocUnsafe(H * stride);
  for (let y = 0; y < H; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4;
      const di = y * stride + 1 + x * 4;
      raw[di] = px[si]; raw[di + 1] = px[si + 1]; raw[di + 2] = px[si + 2]; raw[di + 3] = px[si + 3];
    }
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Write icons ──────────────────────────────────────────────────────────────
mkdirSync(join(ROOT, 'public'), { recursive: true });

const icons = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
];

for (const { size, name } of icons) {
  const path = join(ROOT, 'public', name);
  writeFileSync(path, makePng(size));
  console.log(`✓  public/${name}  (${size}×${size})`);
}
