/**
 * AccessiScan PWA İkon Üreticisi
 * Bağımlılık gerektirmez — saf Node.js + built-in zlib
 * Çalıştır: node generate-icons.cjs
 */
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 hesaplayıcı (PNG chunk doğrulaması için) ────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf  = Buffer.allocUnsafe(4); lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf  = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function clamp(v) { return Math.max(0, Math.min(255, v)); }

// ── Piksel tabanlı ikon çizici ─────────────────────────────────────────────────
function renderIcon(size) {
  const px   = Buffer.alloc(size * size * 4);   // RGBA piksel tamponu
  const cx   = size / 2, cy = size / 2;
  const R    = size * 0.370;                    // daire yarıçapı
  const sw   = Math.max(3, size * 0.068);       // stroke kalınlığı
  const arm  = R * 0.500;                       // + kolu yarı uzunluğu
  const cr   = size * 0.200;                    // köşe yarıçapı (yuvarlatma)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i  = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const d  = Math.sqrt(dx * dx + dy * dy);

      // ── Yuvarlatılmış köşe maskesi ────────────────────────────────────────
      const qx = Math.max(0, Math.abs(dx) - (size / 2 - cr));
      const qy = Math.max(0, Math.abs(dy) - (size / 2 - cr));
      if (Math.sqrt(qx * qx + qy * qy) > cr) {
        px[i] = px[i+1] = px[i+2] = px[i+3] = 0;   // şeffaf
        continue;
      }

      // ── Arka plan ─────────────────────────────────────────────────────────
      px[i]   = 10;  px[i+1] = 10;  px[i+2] = 15;  px[i+3] = 255;

      // ── Daire iç dolgu (biraz daha açık) ──────────────────────────────────
      if (d < R - sw * 0.55) {
        px[i]   = 16;  px[i+1] = 16;  px[i+2] = 24;
      }

      // ── Glow: daire etrafı yumuşak parıltı ───────────────────────────────
      const gd = Math.abs(d - R);
      if (gd < sw * 3.0) {
        const g = Math.pow(Math.max(0, 1 - gd / (sw * 3.0)), 2) * 70;
        px[i+1] = clamp(px[i+1] + g * 0.83);
        px[i+2] = clamp(px[i+2] + g);
      }

      // ── Daire stroke (anti-alias) ─────────────────────────────────────────
      if (gd < sw * 0.6) {
        const a = Math.min(1, 1 - gd / (sw * 0.6));
        px[i]   = clamp(px[i]   * (1 - a));
        px[i+1] = clamp(px[i+1] * (1 - a) + 212 * a);
        px[i+2] = clamp(px[i+2] * (1 - a) + 255 * a);
      }

      // ── + kolu (daire içinde) ─────────────────────────────────────────────
      const inCircle = d < R - sw * 0.5;
      const hw = sw * 0.48;                    // kolların yarı kalınlığı
      if (inCircle) {
        const onH = Math.abs(dy) < hw && Math.abs(dx) < arm;
        const onV = Math.abs(dx) < hw && Math.abs(dy) < arm;
        if (onH || onV) {
          const aa = onH
            ? Math.min(1, (hw - Math.abs(dy) + 0.8) / 1.5)
            : Math.min(1, (hw - Math.abs(dx) + 0.8) / 1.5);
          px[i]   = clamp(px[i]   * (1 - aa));
          px[i+1] = clamp(px[i+1] * (1 - aa) + 212 * aa);
          px[i+2] = clamp(px[i+2] * (1 - aa) + 255 * aa);
        }
      }
    }
  }

  // ── PNG binary oluştur ────────────────────────────────────────────────────
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);   // PNG imzası
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);   ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;  // RGBA-8

  // Her satır başına 0 (None) filtre baytı ekle
  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(0);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      rows.push(px[i], px[i+1], px[i+2], px[i+3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rows), { level: 9 });

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── Dosyaları yaz ─────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'client', 'public');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, renderIcon(size));
  console.log(`✓  icon-${size}.png  (${size}×${size})`);
}

console.log('\nİkonlar client/public/ klasörüne yazıldı.');
