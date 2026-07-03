# Voxel Buildings — Complete Authoring Guide

> Handoff doc. Assume the reader has **zero prior context**. Goal: anyone can keep making
> the chunky-toy voxel buildings (and the spin gallery) that match this site's hand-pixel sprites.

---

## 0. THE BIG TRUTH (read this first)

**There is no automatic "sprite → voxel" generator. The buildings are HAND-AUTHORED in code.**
The "skill" is not a converter — it is: (1) a tiny voxel toolkit, (2) a set of conventions,
(3) a copy of the monitor's lighting recipe, and (4) a tight **edit → screenshot → look → fix** loop.

Two automated paths were tried and are **dead ends — do not waste time on them**:

- **Auto un-projection (heightfield from one iso sprite):** a single isometric sprite only shows the
  *top + two front faces*; the back, sides, depth, and interior are simply **not in the pixels**. Any
  reconstruction collapses every building into a **central pyramid/spire**. Confirmed empirically on
  3 buildings. Dead end for faithful shapes.
- **AI single-image-to-3D** (TripoSR / Microsoft TRELLIS / Tencent Hunyuan3D / Stable Fast 3D / Meshy /
  Tripo / Rodin): trained on photos & realistic objects, so flat low-res iso pixel art is their
  *worst-case* input — they produce mushy, melted, unrecognizable blobs and **bake the sprite's painted
  shading into the albedo** (which then double-shades under our IBL sun). They also need a 16GB+ NVIDIA
  GPU (we're on Apple Silicon → can't run locally) or a paid hosted API. Not worth it for 11 hero assets.

**The reliable path** = hand-author. Either in code (this repo's toolkit — what we do), or in
**MagicaVoxel** (free GUI; load the sprite as a reference plane, sculpt, export `.vox`/`.gltf`).
Aesthetic target = **chunky toy diorama** (think *Townscaper* / cozy-voxel / Monument Valley), achieved by
**IBL + soft shadows + per-voxel ambient occlusion + rounded voxels + a restrained, sprite-matched palette.**

---

## 1. FILES & LOCATIONS

| File | What it is |
|---|---|
| `src/voxbuildings.js` | **The model library. Source of truth.** Toolkit + `MODELS{}` (one fn per building) + `buildVox(name)` + `NAMES`. Edit buildings here. |
| `src/pages/voxtest.astro` | Single-building preview. `/voxtest?b=<key>&spin=1`. Imports `buildVox`. Shows the source sprite top-right for comparison. |
| `src/pages/voxgallery.astro` | Grid gallery of all buildings; **hover a tile to spin it 360°**. `/voxgallery`. Imports `buildVox` + `NAMES`. |
| `public/voxsprites.json` | The 11 decoded source sprites `{w,h,px:[hexOrNull]}`. Used as the preview thumbnail + your color/shape reference. (Re-generate with the decode script in §6.) |
| `src/pages/index.html` | The live 2D world. The sprites' RLE lives in its inline `SPRITES{}` table; `decodeSprite()` (~line 1378) is the decoder. |

**Building keys (11):** `art`(upright piano), `blog1`(mailbox), `blog4`(dresser w/ books),
`cards`(card table), `infobuilding`(pink cottage), `project1`(glowing lightbulb), `project2`(lavender office),
`research1`(tin toy robot — "robotics"), `research2`(2-storey house — "wearables"), `resumeBuilding`(sandstone hut), `transcript`(marble shrine).

Run the dev server with `npm run dev` (serves `http://localhost:4321`).

---

## 2. THE ITERATE LOOP (how you actually work)

You **cannot** author blind — you must render and look every few edits. The loop:

1. Edit a model function in `src/voxbuildings.js`.
2. Screenshot it headless with Playwright (script below).
3. **Read the PNG** (look at it). Fix proportions/colors/missing faces. Repeat.

Screenshot harness — save as e.g. `scratchpad/shoot_one.js`:

```js
const { chromium } = require('playwright');
const OUT = '/tmp/voxshots';                      // any writable dir
const b = process.argv[2] || 'infobuilding';
(async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const page = await br.newPage({ viewport: { width: 800, height: 760 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:4321/voxtest?b='+b, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT+'/one_'+b+'.png' });
  await br.close(); console.log('shot', b);
})().catch(e=>{ console.error(e); process.exit(1); });
```

Run it with the project's node_modules on the path:
```bash
mkdir -p /tmp/voxshots
NODE_PATH=./node_modules node scratchpad/shoot_one.js infobuilding
```
The headless WebGL args (`--use-gl=angle --ignore-gpu-blocklist --enable-unsafe-swiftshader`) are
**required** or the canvas is blank. Then open `/tmp/voxshots/one_infobuilding.png`.

To eyeball the gallery: `NODE_PATH=./node_modules node scratchpad/shoot_gallery.js` (same idea, goto
`/voxgallery`, screenshot fullPage; hover a `.tile` to test the spin).

---

## 3. COORDINATE SYSTEM & CAMERA (critical — get this wrong and nothing reads)

- Voxel space is an integer grid: **x = width (east), y = up, z = depth (south).**
- The render camera is **orthographic dimetric** at `(20,16,20)` looking at the origin. It therefore sees
  exactly the **+x face, the +z face, and the top**. The −x face, −z face, and underside are **never visible.**
- ⇒ **Put ALL detail (doors, windows, signs) on the +z (front) and +x (side) faces only.** Don't bother
  detailing hidden faces.
- Convention in the code: a body placed at `bx,bz` with size `bw,bd` has its **front (+z) face at
  `fz = bz+bd-1`** and its **side (+x) face at `x = bx+bw-1`**.
- The **sun is on the camera side** `(9,15,6)` so the two visible faces are lit (one brighter, top brightest)
  and the shadow falls away behind. **Do NOT bake directional shading into voxel colors** — let the sun do it
  (baked face-shading looks muddy; we removed it).

---

## 4. THE TOOLKIT  (`Model()` in `src/voxbuildings.js`)

```
const m = Model();
m.set(x,y,z,color)                         // one voxel ('#rrggbb'); falsy color = no-op
m.del(x,y,z)                               // remove a voxel (e.g. carve a niche)
m.box(x,y,z, w,h,d, color)                 // filled box
m.gableZ(x,y,z, w,d, color, oh)            // simple gable roof, ridge along z
m.list()                                   // -> [{x,y,z,c}]  (what the renderer consumes)

// free helper fns in the same file:
winZ(m, x,y,z, w,h, glass, frame)          // framed window + cross-mullion on the +z face
winX(m, x,y,z, d,h, glass, frame)          // same on the +x face
roofGableZ(m, x,y,z, w,d, a,b, barge, ridge, oh)  // SHINGLED gable: alternating courses (a/b),
                                           // barge-board gable ends, ridge cap, eave overhang `oh`.
                                           // returns the apex Y (use it to place chimneys/banners)
```

`buildVox(name)` just calls `MODELS[name]()` and returns `.list()`.

---

## 5. HOW TO AUTHOR A BUILDING (the recipe + a worked example)

**Scale:** "high-detail" bodies are ~`14w × 10h × 12d` (~4–5k voxels). That's the locked fidelity. (Chunky
drafts were ~`7×5×6`.) Bigger = more room for mullions, shingles, trim.

**Step-by-step:**
1. **Reference the sprite.** Look at it: render `public/voxsprites.json` big (montage script §6) or just open
   `/voxtest?b=<key>` (sprite shows top-right). Note silhouette, palette (sample 3 shades per material:
   base / darker / lighter), and parts (walls, roof type, door, windows, props).
2. **Ground:** `box()` dirt then grass/sand; sprinkle a darker speckle (`if ((i*7+j*5)%6===0) set(...)`),
   add a few flowers as 2-voxel stems.
3. **Body:** `box()` in the wall color. Add subtle texture: speckle ~1-in-5 voxels on the **+x and +z**
   faces with a shade variant.
4. **Door** on the front (+z): a `box()`, a darker frame around it, a handle dot, maybe an awning lip.
5. **Windows:** `winZ`/`winX` (gives frame + 4 panes + mullion), a `box()` sill under it, optional flower box.
6. **Roof:** `roofGableZ(...)` for a pitched shingled roof **with an overhang (`oh=1`)** — overhang is what
   makes it read as a real roof. For flat-roof buildings: a thin overhanging "lip" box + a raised top box.
7. **Character details:** chimney + smoke (white voxels), banner on a pole, ivy up a corner, a barrel, books.
8. **Render → look → fix.** Common fixes: roof too steep (lower the pitch), front too dark (it's fine — the
   side is the lit one), colors off (re-sample the sprite), proportions stubby (taller body).

**Worked example (the abbreviated real `infobuilding`):**
```js
infobuilding(){ const m=Model();
  const pink='#e7a7af', pink2='#dc95a0', roofA='#4f9e90', roofB='#458d80', ridge='#6cc0b1', barge='#39756b',
        doorW='#7a4d34', doorD='#5d3a27', glass='#f6dd6a', frame='#f1e3db', sill='#c8a079', pole='#6a4a30', banner='#e87f9a';
  m.box(0,-3,0, 26,2,26, PAL.dirt); m.box(0,-1,0, 26,1,26, PAL.grass);   // ground
  const bx=6,bz=6,bw=14,bh=10,bd=12, fz=bz+bd-1;                          // body box; fz = front face
  m.box(bx,0,bz, bw,bh,bd, pink);
  for(let j=0;j<bh;j++)for(let l=0;l<bd;l++) if(((j*3+l*7)%5)===0) m.set(bx+bw-1,j,bz+l,pink2); // wall texture
  m.box(bx+5,0,fz, 4,6,1, doorW);                                        // door + frame
  m.box(bx+5,0,fz,1,6,1,doorD); m.box(bx+8,0,fz,1,6,1,doorD); m.box(bx+5,5,fz,4,1,1,doorD);
  winZ(m, bx+1,3,fz, 3,3, glass, frame); m.box(bx+1,2,fz,3,1,1,sill);    // windows (+z and +x)
  winX(m, bx+bw-1,3,bz+4, 3,3, glass, frame);
  const top = roofGableZ(m, bx-2,bh,bz-2, bw+4, bd+4, roofA, roofB, barge, ridge, 1);  // shingled roof
  const ax=bx+(bw>>1);                                                   // banner on a pole at the apex
  m.box(ax,top+2,bz+1, 1,5,1, pole); m.box(ax+1,top+5,bz+1, 4,3,1, banner);
  return m;
}
```
(The shipped version adds more: chimney+smoke, flowers, awning, extra window, more shade variants. Same shape.)

---

## 6. SPRITE DECODING (to get reference grids / add a new sprite)

The world sprites are RLE-encoded in `SPRITES{}` inside `src/pages/index.html`. Format (see `decodeSprite`
~line 1378): a base36 char = palette index (1-based; `pal[ci-1]` = `'#hex'`); `0` and a transparent run
`!<base36count>.` = empty. Easiest extraction is via the running page:

```js
// scratchpad/decode_sprites.js  →  writes public/voxsprites.json
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const br=await chromium.launch({args:['--use-gl=angle','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const page=await br.newPage(); await page.goto('http://localhost:4321/?adventure',{waitUntil:'networkidle'}); await page.waitForTimeout(2500);
  const out=await page.evaluate(()=>{ const chars='0123456789abcdefghijklmnopqrstuvwxyz';
    const dec=n=>{const sp=SPRITES[n];if(!sp)return null;const g=[];let i=0,d=sp.d;
      while(i<d.length){ if(d[i]==='!'){i++;let s='';while(d[i]!=='.')s+=d[i++];i++;const c=parseInt(s,36);for(let j=0;j<c;j++)g.push(0);} else {g.push(chars.indexOf(d[i]));i++;} }
      const px=new Array(sp.w*sp.h).fill(null); for(let p=0;p<sp.w*sp.h;p++){const ci=g[p]||0; if(ci)px[p]=sp.pal[ci-1];} return {w:sp.w,h:sp.h,px};};
    const s={}; for(const b of buildings){ if(typeof b.pixelSprite==='string'&&SPRITES[b.pixelSprite]&&!s[b.pixelSprite]) s[b.pixelSprite]=dec(b.pixelSprite); } return s; });
  fs.writeFileSync('public/voxsprites.json', JSON.stringify(out)); await br.close();
})();
```

To **study** the sprites, render them big with `node-canvas` (a devDependency): load `voxsprites.json`,
draw each `px[]` at ~6× scale into a grid, save a montage PNG, and look at it.

---

## 7. THE RENDER / LIGHTING RECIPE (the "gorgeous" part — copied from the CRT monitor page)

Both `voxtest.astro` and `voxgallery.astro` use the same recipe. Three.js is already a dependency.

- **Voxels:** `RoundedBoxGeometry(1,1,1,2,0.09)` (the small bevel is the toy look) + `MeshStandardMaterial({roughness:0.82})`,
  drawn as ONE `InstancedMesh`. Per-voxel color via `setColorAt`, **`.convertSRGBToLinear()`** (or colors wash out).
- **Per-voxel AO:** darken each voxel by how many of its 6 neighbors are empty:
  `ao = 0.84 + 0.16*(openNeighbors/6)`. Keep it subtle — stronger = muddy.
- **IBL (soft ambient):** a vertical-gradient `CanvasTexture` (sky→horizon→floor) → `PMREMGenerator.fromEquirectangular()`
  → `scene.environment`. This is most of the softness.
- **Sun:** `DirectionalLight(0xfff1da, ~2.7)` at `(9,15,6)` (camera side), `PCFSoftShadowMap`.
- **Fill:** a `HemisphereLight` (cool sky / warm ground).
- **Tone:** `renderer.toneMapping = NeutralToneMapping` (truer hues than ACES).
- **Ground:** a `ShadowMaterial` plane (single preview) OR a soft radial-gradient "blob" texture under each
  building (the gallery uses the blob — cheaper with many tiles, no per-tile shadow map).
- **Camera:** `OrthographicCamera` at `(20,16,20)` looking at the building center; size `span` from the bounds.

---

## 8. THE GALLERY (grid + hover-to-spin)

`/voxgallery` = one full-window `WebGLRenderer` *behind* a DOM CSS-grid of `.tile` divs.

- Each building gets its **own `THREE.Scene`** (InstancedMesh + its own lights + the *shared* PMREM env +
  a contact-shadow blob) and its own `OrthographicCamera`.
- **Render loop:** clear the whole canvas (transparent) once, then for each tile:
  `rect = tile.getBoundingClientRect()` → `setViewport`/`setScissor` to that rect
  (**WebGL y is bottom-up: `y = innerHeight - rect.bottom`**) → `renderer.render(scene, cam)`.
- **Hover:** `mouseenter` sets `hover=true`; spin velocity ramps up and the group rotates; on `mouseleave`
  velocity decays and the rotation eases back to a multiple of 2π (rest).
- **GOTCHA that cost an hour:** Astro **scopes** `<style>` in a full-document `.astro`, so CSS does NOT match
  DOM elements created in JS (the tiles) → the grid collapses. Fix: **`<style is:global>`**.

---

## 9. GOTCHAS (these will bite you)

- Astro full-doc `<style>` is **scoped** → use **`<style is:global>`** for any JS-created DOM.
- Astro `<script type="module">` in a full HTML doc is treated as **inline** → bare `import 'three'` fails to
  resolve. Use a **plain `<script>`** (Astro bundles it + resolves npm imports).
- **Never** extrude a sprite and view it through an iso camera → that's iso-of-iso = a **skewed cardboard
  slab**. The model must be genuine 3D.
- Detail only the **+z and +x** faces (camera-visible).
- AO subtle; `convertSRGBToLinear` on instance colors; sun on the **camera side**, not behind.
- Headless WebGL needs the chromium GL flags (§2) or the canvas is blank.

---

## 10. RESEARCH SOURCES (where the decisions came from)

Two 5-agent research workflows produced the conclusions above. Key references / tools:

- **Aesthetic target:** Townscaper, Monument Valley, cozy-voxel scenes; HD-2D (Octopath/Sea of Stars) for "lit
  low-res art." The look = baked-AO flat-shaded voxels under IBL + soft shadows + restrained palette.
- **Hand-modeling tool (the quality path if not coding):** **MagicaVoxel** (free) — load sprite as ref plane,
  sculpt, export `.vox`/`.gltf`. Also Goxel.
- **Mesh→voxel (only if you ever go the AI-mesh route):** `gkjohnson/three-mesh-bvh` (CPU raycast-fill,
  headless) + Codrops "Turning 3D Models to Voxel Art with three.js".
- **AI image-to-3D (evaluated, rejected for this input):** TripoSR, Microsoft TRELLIS (best open for
  hard-surface), Tencent Hunyuan3D-2 (emits PBR maps), Stable Fast 3D, Meshy / Tripo / Rodin (hosted).
- **Why hand-author wins here:** the gorgeousness of the water/monitor comes from **lighting real normals**,
  not pixel count. Same for voxels — geometry + IBL + AO does the work. Adding light beats adding pixels.

---

## 11. TODO / NEXT STEPS

- ~~Polish `project1` and `research1`~~ DONE: `project1` was re-authored as the glowing lightbulb;
  `research1` was re-authored (2026-07-02) as a **tin toy robot** (teal ribbed body, red dome + shoes,
  dark chest panel w/ springs, `'w'`-tagged eye lenses that glow at night, angled antennae).
- **The big one:** swap the live 2D canvas island for a real 3D voxel scene (these models in an ortho
  dimetric Three.js scene reusing `crt3d.astro`'s IBL/sun/grade). That needs the **interaction-layer rewrite**
  — clicking/picking (raycast), zone-zoom (camera tween), the content iframes, mobile. Do it **behind a flag**,
  building-by-building, so the shipping site stays intact.
- Keep `src/voxbuildings.js` as the single source of truth; the gallery + any future 3D world both consume it.
