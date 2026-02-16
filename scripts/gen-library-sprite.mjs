#!/usr/bin/env node
// Generate a tall gothic library pixel art sprite (64x64)
// for the blog archive building

const W = 64, H = 64;
const grid = new Array(W * H).fill(0);
const colorMap = new Map();
const palette = [];

function col(hex) {
  if (!colorMap.has(hex)) { palette.push(hex); colorMap.set(hex, palette.length); }
  return colorMap.get(hex);
}
function set(x, y, hex) {
  x = Math.round(x); y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) grid[y * W + x] = col(hex);
}
function rect(x1, y1, w, h, hex) {
  for (let y = y1; y < y1 + h; y++)
    for (let x = x1; x < x1 + w; x++) set(x, y, hex);
}

// ── COLOR PALETTE ──
const WL  = '#1e1835';  // wall left face (darkest)
const WM  = '#2a2245';  // wall mid
const WF  = '#353058';  // wall front face
const WH  = '#40386a';  // wall highlight
const RD  = '#221440';  // roof dark
const RM  = '#321e52';  // roof mid
const RL  = '#422865';  // roof light
const RF  = '#523878';  // roof front highlight
const TR  = '#3a3555';  // stone trim dark
const TL  = '#4a4568';  // stone trim light
const WN  = '#85a8c8';  // window blue
const WB  = '#a0c0e0';  // window bright
const WD  = '#0e0c1a';  // window dark
const WG  = '#c8953d';  // warm glow
const DR  = '#08060f';  // door
const BR  = '#6a2525';  // book red
const BN  = '#5a3a18';  // book brown
const BG  = '#1e4a28';  // book green
const BB  = '#1e3050';  // book blue
const BK  = '#100e18';  // bookshelf dark

// ── BUILDING GEOMETRY ──
// Front face: x 14-39 (26px wide), Side face: x 40-50 (11px wide)
const FL = 14, FR = 39;  // front left/right
const SL = 40, SR = 50;  // side left/right
const WALL_TOP = 10;     // where walls start (below roof)

// ── MAIN WALLS ──
// Front face
rect(FL, WALL_TOP, FR - FL + 1, H - WALL_TOP, WF);
// Left edge gradient (darker)
for (let y = WALL_TOP; y < H; y++) { set(FL, y, WL); set(FL+1, y, WL); set(FL+2, y, WM); }
// Right side face
rect(SL, WALL_TOP + 2, SR - SL + 1, H - WALL_TOP - 2, WM);
// Side face right edge (darker)
for (let y = WALL_TOP + 2; y < H; y++) { set(SR, y, WL); set(SR-1, y, WL); }

// ── POINTED ROOF ──
const peakX = 27, peakY = 1;
// Front face of roof (triangle)
for (let y = peakY; y <= WALL_TOP; y++) {
  const t = (y - peakY) / (WALL_TOP - peakY);
  const lx = Math.round(peakX - t * (peakX - FL));
  const rx = Math.round(peakX + t * (FR - peakX));
  for (let x = lx; x <= rx; x++) {
    if (x < peakX - 2) set(x, y, RD);
    else if (x < peakX + 2) set(x, y, RL);
    else set(x, y, RM);
  }
}
// Side face of roof (angled parallelogram)
for (let y = peakY + 1; y <= WALL_TOP + 2; y++) {
  const t = (y - peakY) / (WALL_TOP + 2 - peakY);
  const lx = Math.round(peakX + t * (FR - peakX)) + 1;
  const rx = Math.round(lx + t * (SR - SL));
  for (let x = lx; x <= Math.min(rx, SR); x++) set(x, y, RF);
}
// Finial/spire
set(peakX, 0, TL); set(peakX, 1, RL);
set(peakX - 1, 1, RD); set(peakX + 1, 1, RM);

// ── ROOF RIDGE LINE ──
for (let y = peakY; y <= WALL_TOP; y++) {
  const t = (y - peakY) / (WALL_TOP - peakY);
  set(Math.round(peakX + t * (FR - peakX)) + 1, y, TL);
}

// ── TRIM BANDS ──
const trimRows = [WALL_TOP, 24, 38, 52, 63];
for (const ty of trimRows) {
  rect(FL, ty, FR - FL + 1, 1, TR);
  rect(SL, ty + (ty === WALL_TOP ? 2 : 1), SR - SL + 1, 1, TL);
}
// Cornice detail under roof
rect(FL - 1, WALL_TOP, FR - FL + 3, 1, TL);
rect(FL, WALL_TOP + 1, FR - FL + 1, 1, TR);

// ── UPPER FLOOR WINDOWS (rows 12-22) — tall arched ──
for (let wi = 0; wi < 3; wi++) {
  const wx = FL + 4 + wi * 8;
  // Window opening
  rect(wx, 14, 4, 9, WD);
  // Arch top pixels
  set(wx + 1, 13, WD); set(wx + 2, 13, WD);
  // Window glass
  rect(wx + 1, 15, 2, 7, WN);
  set(wx + 1, 14, WN); set(wx + 2, 14, WN);
  // Bright center highlight
  set(wx + 1, 17, WB); set(wx + 2, 18, WB);
  // Mullion (vertical divider)
  for (let y = 15; y < 22; y++) set(wx + 2, y, TR);
}
// Side face windows (upper)
rect(SL + 3, 15, 3, 7, WD);
rect(SL + 4, 16, 1, 5, WN);

// ── MIDDLE FLOOR — BOOKSHELVES (rows 26-36) ──
for (let wi = 0; wi < 3; wi++) {
  const wx = FL + 4 + wi * 8;
  rect(wx, 27, 4, 10, WD);
  // Bookshelf rows (5 shelves of books)
  const bookColors = [BR, BB, BG, BN, BR, BB];
  for (let shelf = 0; shelf < 4; shelf++) {
    const sy = 28 + shelf * 2;
    for (let bx = 0; bx < 4; bx++) {
      set(wx + bx, sy, bookColors[(bx + shelf) % bookColors.length]);
    }
    // Shelf divider
    rect(wx, sy + 1, 4, 1, BK);
  }
  // Warm reading light glow
  set(wx + 1, 29, WG); set(wx + 2, 33, WG);
}
// Side face windows (middle)
rect(SL + 3, 28, 3, 8, WD);
for (let s = 0; s < 3; s++) {
  set(SL + 3, 29 + s * 2, BR);
  set(SL + 4, 29 + s * 2, BG);
  set(SL + 5, 29 + s * 2, BB);
  rect(SL + 3, 30 + s * 2, 3, 1, BK);
}

// ── LOWER FLOOR WINDOWS (rows 40-50) ──
for (let wi = 0; wi < 3; wi++) {
  const wx = FL + 4 + wi * 8;
  rect(wx, 40, 4, 10, WD);
  rect(wx + 1, 41, 2, 8, WN);
  // Cross mullion
  rect(wx, 45, 4, 1, TR);
  for (let y = 40; y < 50; y++) set(wx + 2, y, TR);
  // Warm glow in lower panes
  set(wx + 1, 47, WG); set(wx + 1, 48, WG);
}
// Side face windows (lower)
rect(SL + 3, 41, 3, 8, WD);
rect(SL + 4, 42, 1, 6, WN);

// ── ENTRANCE ──
// Large arched doorway in center
const dx = 24;
rect(dx, 55, 7, 8, DR);
// Arch
set(dx + 1, 54, DR); set(dx + 2, 53, DR); set(dx + 3, 53, DR);
set(dx + 4, 53, DR); set(dx + 5, 54, DR);
// Door panels
set(dx + 2, 57, WL); set(dx + 4, 57, WL);
set(dx + 2, 59, WL); set(dx + 4, 59, WL);
// Door handle
set(dx + 5, 59, WG);
// Warm light from inside
set(dx + 3, 56, WG); set(dx + 3, 57, '#a07830');
// Steps
rect(dx - 1, 63, 9, 1, TL);
rect(dx, 62, 7, 1, TR);

// ── DECORATIVE DETAILS ──
// Small circular window in upper gable (rose window)
set(peakX, 6, WD); set(peakX - 1, 6, WD); set(peakX + 1, 6, WD);
set(peakX, 5, WD); set(peakX, 7, WD);
set(peakX, 6, WB); // bright center

// Buttress pillars on front face edges
for (let y = WALL_TOP + 2; y < 63; y += 2) {
  set(FL + 1, y, TR); set(FR - 1, y, TR);
}

// ── ENCODE ──
const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
let encoded = '';
for (const ci of grid) encoded += chars[ci];
const rle = encoded.replace(/0{3,}/g, m => '!' + m.length.toString(36) + '.');

const opaque = grid.filter(x => x > 0).length;
console.log(`library:{w:${W},h:${H},`);
console.log(`pal:${JSON.stringify(palette)},`);
console.log(`d:"${rle}"},`);
console.log(`\n// ${palette.length} colors, ${opaque} opaque pixels, ${rle.length} chars encoded, ${W}x${H}`);
