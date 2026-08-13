// Membuat ikon PWA dari SVG asli (bukan emoji yang di-screenshot).
// Motif: garis pulsa (ikon "Activity" dari Lucide) di atas lingkaran navy,
// sesuai elemen signature & palet di DESIGN.md.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.resolve(import.meta.dirname, "..", "public", "icons");
const PRIMARY = "#0F1E3D";
const PRIMARY_DARK = "#081226";

// path persis dari lucide-react "Activity" icon (viewBox 0 0 24 24)
const PULSE_PATH = "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2";

function iconSvg({ size, safeZonePadding = 0 }) {
  const contentSize = size - safeZonePadding * 2;
  const scale = (contentSize / 24) * 0.62;
  const strokeWidth = 24 / scale / 10; // proporsional terhadap skala path 24x24
  const translate = size / 2 - (24 * scale) / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PRIMARY}" />
      <stop offset="1" stop-color="${PRIMARY_DARK}" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)" />
  <g transform="translate(${translate} ${translate}) scale(${scale})">
    <path d="${PULSE_PATH}" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;
}

async function renderPng(svg, size, filename) {
  const buffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(path.join(OUT_DIR, filename), buffer);
  console.log("wrote", filename);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await renderPng(iconSvg({ size: 192 }), 192, "icon-192.png");
  await renderPng(iconSvg({ size: 512 }), 512, "icon-512.png");
  // maskable: beri padding aman lebih besar supaya tidak terpotong saat OS crop ke bentuk lain
  await renderPng(iconSvg({ size: 512, safeZonePadding: 64 }), 512, "icon-512-maskable.png");
  await renderPng(iconSvg({ size: 180 }), 180, "apple-touch-icon.png");

  // favicon: versi sederhana, tanpa gradient supaya tetap jelas di ukuran kecil
  const faviconSvg = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="14" fill="${PRIMARY}" />
  <g transform="translate(8 8) scale(1.5)">
    <path d="${PULSE_PATH}" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;
  await writeFile(path.resolve(import.meta.dirname, "..", "public", "favicon.svg"), faviconSvg);
  console.log("wrote favicon.svg");
}

main();
