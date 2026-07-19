/* Generates icons/icon-192.png and icons/icon-512.png with no dependencies.
   Draws the Dead Line icon (zombie head + crosshair) into an RGBA buffer and
   encodes a valid PNG using Node's built-in zlib. Run: node assets/make-icons.js */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function makeIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const S = size / 512; // design authored at 512

  function set(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const na = a / 255;
    buf[i] = Math.round(buf[i] * (1 - na) + r * na);
    buf[i + 1] = Math.round(buf[i + 1] * (1 - na) + g * na);
    buf[i + 2] = Math.round(buf[i + 2] * (1 - na) + b * na);
    buf[i + 3] = Math.max(buf[i + 3], a);
  }
  function disc(px, py, rad, r, g, b) {
    const r2 = rad * rad;
    for (let y = Math.floor(py - rad); y <= py + rad; y++)
      for (let x = Math.floor(px - rad); x <= px + rad; x++) {
        const dx = x - px, dy = y - py;
        if (dx * dx + dy * dy <= r2) set(x, y, r, g, b, 255);
      }
  }
  function ellipse(px, py, rx, ry, r, g, b) {
    for (let y = Math.floor(py - ry); y <= py + ry; y++)
      for (let x = Math.floor(px - rx); x <= px + rx; x++) {
        const dx = (x - px) / rx, dy = (y - py) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, r, g, b, 255);
      }
  }
  function ring(px, py, rad, w, r, g, b) {
    const outer = rad + w / 2, inner = rad - w / 2;
    for (let y = Math.floor(py - outer); y <= py + outer; y++)
      for (let x = Math.floor(px - outer); x <= px + outer; x++) {
        const dx = x - px, dy = y - py, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= outer && d >= inner) set(x, y, r, g, b, 235);
      }
  }
  function line(x1, y1, x2, y2, w, r, g, b) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let s = 0; s <= steps; s++) {
      const x = x1 + ((x2 - x1) * s) / steps;
      const y = y1 + ((y2 - y1) * s) / steps;
      disc(x, y, w / 2, r, g, b);
    }
  }

  // Background: radial dark gradient with rounded corners
  const radius = 96 * S;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      // rounded-corner mask
      const rx = Math.min(x, size - 1 - x);
      const ry = Math.min(y, size - 1 - y);
      if (rx < radius && ry < radius) {
        const dx = radius - rx, dy = radius - ry;
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      const d = Math.sqrt((x - cx) ** 2 + (y - cy * 0.76) ** 2) / (size * 0.7);
      const t = Math.min(1, d);
      const r = Math.round(22 * (1 - t) + 5 * t);
      const g = Math.round(48 * (1 - t) + 7 * t);
      const b = Math.round(63 * (1 - t) + 10 * t);
      const i = (y * size + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }

  // Zombie head + torso
  disc(cx, 250 * S, 120 * S, 111, 158, 90);
  ellipse(cx, 320 * S, 96 * S, 66 * S, 84, 122, 68);
  disc(212 * S, 228 * S, 20 * S, 196, 0, 0);
  disc(300 * S, 228 * S, 20 * S, 196, 0, 0);
  // mouth
  for (let x = 214 * S; x <= 298 * S; x++)
    for (let y = 300 * S; y <= 312 * S; y++) set(x, y, 44, 61, 38, 255);

  // Crosshair
  ring(cx, cy, 150 * S, 10 * S, 70, 224, 90);
  line(cx, 70 * S, cx, 130 * S, 10 * S, 70, 224, 90);
  line(cx, 382 * S, cx, 442 * S, 10 * S, 70, 224, 90);
  line(70 * S, cy, 130 * S, cy, 10 * S, 70, 224, 90);
  line(382 * S, cy, 442 * S, cy, 10 * S, 70, 224, 90);

  return buf;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // rest zero
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const png = encodePNG(makeIcon(size), size);
  const out = path.join(__dirname, "..", "icons", "icon-" + size + ".png");
  fs.writeFileSync(out, png);
  console.log("wrote", out, png.length, "bytes");
}
