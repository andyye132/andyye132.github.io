#!/usr/bin/env node
// Usage: node scripts/png-to-sprite.mjs <path-to-png> <sprite-name>
// Outputs a JS object you can paste into the SPRITES dict in index.html
// Supports any dimensions (64x64, 128x128, 256x256, etc.)

import sharp from 'sharp';

const [,, pngPath, name] = process.argv;

if (!pngPath || !name) {
  console.error('Usage: node scripts/png-to-sprite.mjs <path-to-png> <sprite-name>');
  process.exit(1);
}

const { data, info } = await sharp(pngPath)
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const w = info.width, h = info.height;
const colorMap = new Map();
const grid = [];

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const a = data[i + 3];
    if (a > 10) {
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      if (!colorMap.has(key)) colorMap.set(key, colorMap.size + 1);
      grid.push(colorMap.get(key));
    } else {
      grid.push(0);
    }
  }
}

const palette = [];
for (const [color] of colorMap) {
  palette.push('#' + color.toString(16).padStart(6, '0'));
}

if (palette.length > 35) {
  console.error(`ERROR: ${palette.length} unique colors exceeds max 35 for single-char encoding.`);
  console.error('Reduce the image colors (e.g., posterize in an image editor) before converting.');
  process.exit(1);
}

const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
let encoded = '';
for (const ci of grid) encoded += chars[ci];
const rle = encoded.replace(/0{3,}/g, m => '!' + m.length.toString(36) + '.');

const opaque = grid.filter(x => x > 0).length;
console.log(`${name}:{w:${w},h:${h},`);
console.log(`pal:${JSON.stringify(palette)},`);
console.log(`d:"${rle}"},`);
console.log(`\n// ${palette.length} colors, ${opaque} opaque pixels, ${rle.length} chars encoded, ${w}x${h}`);
