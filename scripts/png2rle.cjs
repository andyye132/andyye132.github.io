// Convert 64x64 PNG with transparency to RLE sprite format
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function convert(filePath) {
  const img = await loadImage(filePath);
  const w = img.width, h = img.height;
  const cv = createCanvas(w, h);
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  // Build palette (unique opaque colors)
  const colorMap = new Map();
  const pixels = [];
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (data[o + 3] < 128) { pixels.push(0); continue; }
    const hex = '#' + ((data[o] << 16) | (data[o+1] << 8) | data[o+2]).toString(16).padStart(6, '0');
    if (!colorMap.has(hex)) colorMap.set(hex, colorMap.size + 1);
    pixels.push(colorMap.get(hex));
  }

  if (colorMap.size <= 35) {
    return buildOutput(filePath, w, h, [...colorMap.keys()], pixels);
  }

  // Quantize: progressively coarser until <= 35 colors
  console.error(`Warning: ${colorMap.size} colors, quantizing...`);
  for (let step = 8; step <= 128; step *= 2) {
    const qMap = new Map();
    const remap = new Map();
    for (const [hex, idx] of colorMap) {
      const v = parseInt(hex.slice(1), 16);
      const r = Math.round(((v >> 16) & 255) / step) * step;
      const g = Math.round(((v >> 8) & 255) / step) * step;
      const b = Math.round((v & 255) / step) * step;
      const qHex = '#' + ((Math.min(r,255) << 16) | (Math.min(g,255) << 8) | Math.min(b,255)).toString(16).padStart(6, '0');
      if (!qMap.has(qHex)) qMap.set(qHex, qMap.size + 1);
      remap.set(idx, qMap.get(qHex));
    }
    if (qMap.size <= 35) {
      console.error(`Quantized to ${qMap.size} colors (step=${step})`);
      const newPixels = pixels.map(p => p === 0 ? 0 : remap.get(p));
      return buildOutput(filePath, w, h, [...qMap.keys()], newPixels);
    }
  }
  console.error('ERROR: Could not quantize below 35 colors');
}

function buildOutput(filePath, w, h, pal, pixels) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let rle = '';
  let i = 0;
  while (i < pixels.length) {
    if (pixels[i] === 0) {
      let count = 0;
      while (i < pixels.length && pixels[i] === 0) { count++; i++; }
      rle += '!' + count.toString(36) + '.';
    } else {
      rle += chars[pixels[i]];
      i++;
    }
  }

  const name = require('path').basename(filePath, '.png');
  const palStr = pal.map(c => `"${c}"`).join(',');
  console.log(`${name}:{w:${w},h:${h},`);
  console.log(`pal:[${palStr}],`);
  console.log(`d:"${rle}"},`);
}

const args = process.argv.slice(2);
const dir = __dirname + '/../public/sprites';
const files = args.length ? args : fs.readdirSync(dir).filter(f => f.endsWith('.png')).map(f => dir + '/' + f);
(async () => {
  for (const f of files.sort()) {
    await convert(f);
    console.log('');
  }
})();
