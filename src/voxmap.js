// ════════════════════════════════════════════════════════════════
// VOXEL MAP — the island terrain + building & tree placement.
// Translates the live 2D isometric world (src/pages/index.html) into a
// single voxel scene: grass + gray roads + sand beaches (replacing the
// old cloud base) + pond water + dotted trees, with the 11 hand-authored
// buildings placed at their grid positions. Consumed by /voxmap.
//
// The coastline is evaluated at VOXEL resolution from a smooth radial
// profile (sine harmonics), so shores are wavy + sloped, not blocky tile
// steps. Interior classification (road / pond / grass) is still per-tile.
// ════════════════════════════════════════════════════════════════
import { Model, PAL, buildVox, buildTree, buildProp } from './voxbuildings.js';

export const GRID = 18;     // 18×18 tile island (matches index.html MS=18)
export const TILE = 6;      // voxels per grid tile
const SPANV = GRID * TILE;  // 108 voxels across
const cV = 8.5 * TILE;      // island center in voxels (51 — matches the old tile layout)
const baseR = 8.6 * TILE;   // ~51.6 voxel base radius
const beachW = 7;           // beach band width (voxels) inside the shore
const padR = 9;             // forced flat land radius (voxels) under each building

// Building voxel-key → grid footprint origin (gx,gy); footprint is 2×2,
// so the placed center is (gx+1, gy+1). Mirrors buildings[] in index.html.
export const LAYOUT = [
  ['art', 2, 2], ['blog1', 6, 2], ['cards', 2, 6], ['blog4', 6, 6],   // NW — creative
  ['project2', 11, 2], ['project1', 15, 4],                            // NE — office (W) + lightbulb (E, spaced apart)
  ['research1', 2, 12], ['research2', 6, 12],                          // SW — research
  ['resumeBuilding', 11, 12], ['transcript', 14, 12],                  // SE — materials
  ['infobuilding', 15, 7.4],                                           // mid-right — about (off the road row)
];

export const RAFT = { X: 34, Z: 119 };   // raft center (voxel coords) — off the SW shore, screen bottom-left

// zones: label + accent color + member building keys (for overview→zone→building navigation)
export const ZONES = {
  creative:  { label: 'creative',  color: '#e6bf72', members: ['art','blog1','cards','blog4'] },
  projects:  { label: 'projects',  color: '#ee9663', members: ['project2','project1'] },
  research:  { label: 'research',  color: '#d493d6', members: ['research1','research2'] },
  materials: { label: 'materials', color: '#8ab6df', members: ['resumeBuilding','transcript'] },
  about:     { label: 'about',     color: '#83cda6', members: ['infobuilding'] },
};
// which zone a grid cell belongs to — info sub-region first, then quadrants (ported from index.html)
export function zoneAt(gx, gy){
  if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return null;
  if (gx >= 14 && gx <= 17 && gy >= 7 && gy <= 10) return 'about';
  if (gx < 9 && gy < 9) return 'creative';
  if (gx >= 9 && gy < 9) return 'projects';
  if (gx < 9 && gy >= 9) return 'research';
  return 'materials';
}

const PONDS = [[6,7],[7,7],[7,6],[2,12],[3,12],[4,12],[2,13],[3,13],[4,13],[2,14],[3,14],[4,14],[5,13]];
const FLOWERS = [[1,1],[16,1],[1,16],[16,16],[6,3],[11,3],[3,11],[15,11]];

// building footprint tiles (2×2) carved out of ponds; halo keeps trees clear
const FOOT = new Set(), HALO = new Set();
const BCENTERS = [];  // building centers in voxel coords (for the flat pads)
for (const [, gx0, gy0] of LAYOUT){
  const gx = Math.round(gx0), gy = Math.round(gy0);
  BCENTERS.push([(gx0 + 1) * TILE, (gy0 + 1) * TILE]);
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) FOOT.add((gx+dx) + ',' + (gy+dy));
  for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) HALO.add((gx+dx) + ',' + (gy+dy));
}
const pondSet = new Set(PONDS.map(([x,y]) => x+','+y).filter(k => !FOOT.has(k)));
const flowerSet = new Set(FLOWERS.map(([x,y]) => x+','+y));

// ── colors ──
const GRASS = ['#5aa83a', '#3f8a2c', '#69bf46', '#4f9a33'];
const SAND  = ['#eaddb2', '#e0d09c', '#f3e8c8', '#dccb96'];   // paler, sandier (less brown)
const WETSAND = ['#cdbd91', '#c4b385'];
const ROAD  = ['#8b8f96', '#787c84', '#9aa0a8'];
const WATER = ['#3f86b8', '#356f9c'];
const PETAL = ['#e85a7a', '#f4d85a', '#f2f1f6', '#c77ad0'];

function rand(a, b){ const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); }

// smooth shore radius at the angle of a voxel column (sine harmonics = wavy bays/points)
function edgeR(X, Z){
  const th = Math.atan2(Z - cV, X - cV);
  return baseR + 3.6*Math.sin(3*th + 0.7) + 2.2*Math.sin(7*th + 2.2) + 1.2*Math.sin(15*th + 4.1) - 1.4;
}
// signed depth into the island (>0 land, <0 sea) at a voxel column
export function depthAt(X, Z){ return edgeR(X, Z) - Math.hypot(X - cV, Z - cV); }
// distance to the nearest building center (for forced flat pads / sandy peninsulas)
function padDepth(X, Z){ let best = -1e9; for (const [bx, bz] of BCENTERS){ const d = padR - Math.hypot(X - bx, Z - bz); if (d > best) best = d; } return best; }

// place a building/tree voxel list onto the terrain, centered on a tile
function place(m, vox, gx, gy){
  const v = vox.filter(p => p.y >= 0);                            // drop each model's own ground patch
  let mnx=1e9, mxx=-1e9, mnz=1e9, mxz=-1e9;
  v.forEach(p => { mnx=Math.min(mnx,p.x); mxx=Math.max(mxx,p.x); mnz=Math.min(mnz,p.z); mxz=Math.max(mxz,p.z); });
  const ox = Math.round((gx + 1) * TILE - (mnx + mxx) / 2);
  const oz = Math.round((gy + 1) * TILE - (mnz + mxz) / 2);
  v.forEach(p => m.setT(p.x + ox, p.y, p.z + oz, p.c, p.t));      // preserve glass/emissive tags
}
// place a prop centered on an exact voxel (X,Z) — for road-dressing (lamps) not tied to tiles
function placeAt(m, vox, X, Z){
  const v = vox.filter(p => p.y >= 0);
  let mnx=1e9, mxx=-1e9, mnz=1e9, mxz=-1e9;
  v.forEach(p => { mnx=Math.min(mnx,p.x); mxx=Math.max(mxx,p.x); mnz=Math.min(mnz,p.z); mxz=Math.max(mxz,p.z); });
  const ox = Math.round(X - (mnx + mxx) / 2), oz = Math.round(Z - (mnz + mxz) / 2);
  v.forEach(p => m.setT(p.x + ox, p.y, p.z + oz, p.c, p.t));
}

export function buildMap(){
  const m = Model();

  // ── terrain (voxel resolution) ──
  for (let Z = -4; Z < SPANV + 4; Z++) for (let X = -4; X < SPANV + 4; X++){
    const d = depthAt(X, Z), pd = padDepth(X, Z);
    const onPad = pd > 0;
    if (d <= 0 && !onPad){
      // underwater beach slope: sand descends away from the shore + dirt under it → the island has a
      // sloping edge you can see through the shallows, not a cut-off platform.
      if (d > -beachW*1.8){
        const sandY = -2 - Math.round((-d) * 0.55);
        m.set(X, sandY, Z, WETSAND[(X+Z)&1]);
        m.set(X, sandY-1, Z, '#9a7c52'); m.set(X, sandY-2, Z, '#6a5236'); m.set(X, sandY-3, Z, '#4a3a28');
      }
      continue;
    }
    const gx = Math.floor(X / TILE), gy = Math.floor(Z / TILE), key = gx + ',' + gy;
    const inGrid = gx >= 0 && gy >= 0 && gx < GRID && gy < GRID;
    const r = rand(X * 0.7 + 3, Z * 0.9 + 5);

    m.set(X, -3, Z, PAL.dirt); m.set(X, -2, Z, PAL.dirt);          // dirt body
    if (d < 15){ m.set(X,-4,Z,'#6a5236'); m.set(X,-5,Z,'#4e3d28'); if (d < 8){ m.set(X,-6,Z,'#3e3020'); m.set(X,-7,Z,'#33281a'); } }  // deeper hull near the coast → island mass

    // pond (interior only)
    if (inGrid && pondSet.has(key) && d > beachW){
      m.set(X, -2, Z, r > 0.5 ? WATER[0] : WATER[1]); m.set(X, -3, Z, '#5a4530'); continue;
    }

    const road = inGrid && (gx === 9 || gy === 9);
    const shore = d < beachW && !onPad;                            // sloped beach band (pads stay flat)
    // beach: real shore band, OR pad land that's actually past the smooth coast (sandy peninsula edge)
    const beach = shore || (onPad && d <= 1);

    if (road && d > 2){                                            // road, but fades to sand at the very shore
      let col = r < 0.18 ? ROAD[1] : ROAD[0];
      const c = (gx === 9) ? ((X % TILE) | 0) : ((Z % TILE) | 0);
      const dash = ((gx === 9 ? Z : X) % 4) < 2;
      if (c >= 2 && c <= 3 && dash && !(gx === 9 && gy === 9)) col = ROAD[2];
      m.set(X, -1, Z, col); continue;
    }
    if (beach){
      const topY = shore ? (d >= 3 ? -1 : -2) : -1;                // slope the shore down by a voxel
      let col = SAND[0];
      if (topY === -2) col = WETSAND[(X+Z)&1];
      else if (r < 0.16) col = SAND[1]; else if (r > 0.84) col = SAND[2]; else if (r > 0.6) col = SAND[3];
      m.set(X, topY, Z, col);
      if (topY === -1 && r > 0.97) m.set(X, 0, Z, '#b0a585');      // occasional pebble
      continue;
    }
    // grass
    let col = GRASS[0];
    if (r < 0.13) col = GRASS[1]; else if (r > 0.9) col = GRASS[2]; else if (r > 0.62) col = GRASS[3];
    m.set(X, -1, Z, col);
  }

  // flower accents (sample at tile centers that are solidly inland grass)
  for (const key of flowerSet){
    const [gx, gy] = key.split(',').map(Number);
    if (gx === 9 || gy === 9 || pondSet.has(key)) continue;
    const X = gx * TILE + 3, Z = gy * TILE + 3;
    if (depthAt(X, Z) < beachW) continue;
    m.set(X, 0, Z, GRASS[1]); m.set(X, 1, Z, PETAL[(gx + gy) % PETAL.length]);
    m.set(X + 2, 0, Z + 1, GRASS[1]); m.set(X + 2, 1, Z + 1, PETAL[(gx + gy + 2) % PETAL.length]);
  }

  // ── buildings ──
  for (const [keyName, gx, gy] of LAYOUT) place(m, buildVox(keyName), gx, gy);

  // ── trees: palms on the beach, leafy/pine/bush dotted across the grass ──
  for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++){
    if ((gx === 9 || gy === 9) || HALO.has(gx + ',' + gy) || pondSet.has(gx + ',' + gy)) continue;
    const X = gx * TILE + 3, Z = gy * TILE + 3, d = depthAt(X, Z), onPad = padDepth(X, Z) > 0;
    if (d <= 0 && !onPad) continue;                               // not land
    const roll = rand(gx * 9.1 + 7, gy * 4.3 + 11);
    if (d > 0 && d < beachW){
      if (roll > 0.5) place(m, buildTree('palm'), gx, gy);        // beach palms
    } else if (d >= beachW){
      if (roll > 0.78){
        const kind = roll > 0.93 ? 'bush' : (roll > 0.86 ? 'pine' : 'tall');
        place(m, buildTree(kind), gx, gy);
      }
    }
  }

  // ── street lamps: warm London-style lamps down the two main roads (voxels; road centerline x/z ≈ 57) ──
  const LAMPS = [[27,57],[42,57],[72,57],[87,57], [57,27],[57,42],[57,72],[57,87]];
  for (const [X, Z] of LAMPS) placeAt(m, buildProp('lamp'), X, Z);

  // ── log raft floating off the SW shore (screen bottom-left) — the "back to the monitor"
  //    affordance; voxmap.astro hit-tests RAFT and labels it. Log tops poke ~0.7 above the waterline. ──
  const LOGC = ['#8a6238','#75522e','#936b3e','#7c5732','#86603a','#6f4e2c'];
  for (let i=0;i<6;i++) for (let l=0;l<7;l++) m.set(RAFT.X-3+i, -2, RAFT.Z-3+l, LOGC[i]);
  for (const zz of [RAFT.Z-2, RAFT.Z+2]) for (let i=-4;i<=3;i++) m.set(RAFT.X+i, -1, zz, '#a3754a');   // lashing planks

  return m.list();
}
