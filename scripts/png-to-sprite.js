#!/usr/bin/env node
// Usage: node scripts/png-to-sprite.js <path-to-png> <sprite-name>
// Outputs a JS object you can paste into the SPRITES dict in index.html

const sharp = require('sharp');
const [,, pngPath, name] = process.argv;

if (!pngPath || !name) {
  console.error('Usage: node scripts/png-to-sprite.js <path-to-png> <sprite-name>');
  process.exit(1);
}

(async () => {
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
    console.error(`Warning: ${palette.length} colors (max 35 for single-char encoding). Consider reducing colors.`);
  }

  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let encoded = '';
  for (const ci of grid) encoded += chars[ci];

  // RLE compress runs of '0' (transparent)
  const rle = encoded.replace(/0{3,}/g, m => '!' + m.length.toString(36) + '.');

  console.log(`${name}:{w:${w},h:${h},`);
  console.log(`pal:${JSON.stringify(palette)},`);
  console.log(`d:"${rle}"},`);
  console.log(`\n// ${palette.length} colors, ${grid.filter(x=>x>0).length} opaque pixels, ${rle.length} chars encoded`);
})();
