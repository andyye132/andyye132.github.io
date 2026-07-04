# andyye.bio — Build Summary

_Living doc of what's been built and how. Last updated 2026‑07‑02._

This is a personal portfolio (**Astro 5**, static, deployed to GitHub Pages at **andyye.bio**). It has three front‑door experiences:

1. **Standard site** (`/`, `src/pages/index.html`) — **REDESIGNED 2026‑07‑02 (second pass): "old web, but clearly modern"** after Ali Farhadi's barebones academic page. Shared system across **home / blog‑archive / creative{index,art,games,music} / blog/[slug] / cv / gamedev**: warm‑white paper `#fbfaf6`, **Georgia serif**, big muted‑gray centered masthead name, the classic **double‑rule nav bar** (3px gray rules, navy `#1c3aa9` links, bold current page): **home · blog · cs portfolio ▾ · creative · cv** — "cs portfolio" is a CSS‑hover dropdown (research ▸ robotics / ubiquitous computing / misc — all pointing at `/research` until those pages are written — plus game development → `/gamedev` stub). Courier accents for dates/footers, framed photos (white mat + 1px border), tiny "© andy ye" Courier footer. Blog archive shows each post's **framed image thumbnail** and a large dark italic tagline. **`/cv` renders the resume PDF inline in an iframe + a [download] link** (nav no longer opens the raw PDF in a new tab). No hero, no clouds, no custom cursor, no grain — the earlier 2D pixel world AND its interim voxel‑hero replacement are both gone. (The 2D engine deletion also took the never‑committed raw‑WebGL water — its evolved port lives on in voxmap.)
2. **CRT lobby** (`/crt3d`) — a 3D Three.js room: a beige CRT monitor boots up with green terminal text. **Click the screen → a 1.5s zoom+boot COMBO** (time‑based dolly to z 6.6 while the screen's 24‑segment "booting.." bar fills with the zoom, per‑segment ticks; the site loads meanwhile in a hidden same‑origin iframe) → **the site is revealed ON the monitor**: `#siteScreen` iframe pinned to the projected screen quad (`screenRectPx()`; camera driven exactly during the transition so the rect lands pixel‑true; re‑placed on resize) with a **slight CRT treatment** (scanlines + inset vignette + glass glare + the page grain above it, z 15 < grain 30) — the bezel stays visible and you browse the whole site inside the monitor, **no page navigation**. **Click the room around the screen → 0.9s dolly back out** to the lobby (`exitScreen()`/`screenOut`). Click the window → `/voxmap`; the window shows the **voxel island** snapshots (`/voxworld-*.jpg`, cover×1.3 and shifted down 12% so the island sits low in the frame).
3. **The voxel world** (`/voxmap`) — a hand‑authored 3D voxel island you explore. **This doc focuses here — it's where most recent work went.**

---

## 1. The voxel world (`/voxmap`)

A chunky‑toy voxel island floating in gorgeous animated water, lit by a moving sun/moon, with a drill‑down navigation (overview → zone → building → file folder), all synced to the visitor's local clock. Recent work made it **warmer at night, cooler at dusk, brighter by day, and faster.**

### Files
| File | Role |
|---|---|
| `src/voxbuildings.js` | **Source of truth for models.** The `Model()` voxel toolkit (`set/setT/del/box/gableZ` + `winZ/winX/roofGableZ` helpers), the 11 hand‑authored building functions (`MODELS`), the 4 tree functions (`TREES`), the `PROPS` (a London‑style **street lamp**), and exports `buildVox`/`buildTree`/`NAMES`. Voxels can be tagged `'g'` (glass), `'e'` (emissive), or **`'w'` (warm night‑light)**. |
| `src/voxmap.js` | **The island layout.** `buildMap()` returns one voxel list: terrain (grass / gray roads / sand beaches / pond water) generated at voxel resolution from the 2D grid (`GRID=18`, `TILE=6`, `SPANV=108`), a smooth sine‑harmonic coastline, a layered underwater base, the 11 buildings placed at their grid positions, **8 street lamps down the road centerlines**, and dotted trees. Also `ZONES` + `zoneAt()` + `depthAt()` (signed land/sea depth). |
| `src/voxrender.js` | **Greedy mesher.** `makeVoxels(vox)` → merges opaque voxels into one static `BufferGeometry` (only exposed faces, coplanar merged, per‑vertex AO baked in) + small instanced meshes for glass, emissive, and **warm lights** (`warmlights`). This is the perf foundation. |
| `src/pages/voxmap.astro` | **The scene + everything dynamic:** camera, water, time‑of‑day, god rays, night lights, interaction, post‑processing. |
| `src/pages/voxtest.astro` / `voxgallery.astro` | Dev previews: single building (`/voxtest?b=<key>`) and the spinning grid (`/voxgallery`). |

### Buildings & trees
Hand‑authored in `voxbuildings.js` (see `VOXEL_GUIDE.md` for the authoring recipe). 11 buildings map to zones: **creative** (art/blog/games/archive), **projects** (office + a glowing glass **lightbulb** = "the idea"), **research**, **materials**, **about**. Trees: `palm` (beaches), `tall`/`pine`/`bush` (grass). The lightbulb uses tagged glass + emissive voxels (translucent envelope + a bright glowing filament, `emissiveIntensity 2.2`).

Window helpers now branch on size: **large windows (≥5×5)** get a full border + mullion cross (4 panes); **small windows** frame only the lintel + sill so the glass fills the full width. The **about** and **research** buildings had their windows enlarged so they read at a distance and glow more at night.

### Rendering — greedy meshing
The island renders as **one merged mesh in a handful of draw calls**: only exposed faces are emitted, coplanar same‑color+AO faces merge into big quads, and ambient occlusion is baked into vertex colors (AO floor lifted to `[0.87,0.92,0.96,1.0]` so shaded sides stay readable). Flat‑shaded chunky look, cheap. (Trade: no rounded‑voxel bevel — "smoothness over detail".)

### Night warm lights
The cozy centerpiece of this pass. Voxels tagged **`'w'`** collect into a `warmlights` instanced mesh whose `warmMat` emits a warm amber (`#ffbf6a`), and its `emissiveIntensity` **ramps with the local clock**: a `dayness` smoothstep (`5.5→8.0` up, `17.0→19.5` down) drives `0.10 + (1 − dayness) * 2.15`, so lights sit near‑off by day (≈0.10) and glow (≈2.25) from dusk through dawn.

- **8 London‑style street lamps** run down the road centerlines (`PROPS.lamp`: iron post + frosted warm globe tagged `'w'`).
- **Windows glow warm at night** — about, research, projects, and resume buildings have `'w'`‑tagged window glass.
- The projects **lightbulb** glows on its own (emissive, always lit).
- All of this **reflects on the water** through the screen‑space reflection pass, so the sea catches the lamps and windows after dark.
- (Campfires were tried and **removed** — the lamps + lit windows carried the night better.)

### Water — the centerpiece
The single biggest earlier effort. It's a **screen‑space planar‑reflection** water (index.html's technique, ported to 3D).

- **Why screen‑space, not `THREE.Water`:** `THREE.Water`/`Reflector`'s oblique‑clip math is perspective‑only and **breaks under our orthographic camera** (reflection vanishes/flickers). Since our camera is a *fixed dimetric ortho* projection, a **screen‑space vertical mirror about the waterline is mathematically exact** — and cheaper. So: render the island + sky to textures, and a fullscreen water shader reflects them.
- **Features:** Fresnel sky reflection (with a "floor" so the pastel sky always shows → luminous) · thin island reflection at the shore · **depth‑driven color** (shallow→deep gradient) · **see‑through shallows** (refracted sandy bottom) · **soft shoreline foam** · **stochastic FBM waves** (2 slow swells + 3‑octave scrolling fbm → finite‑diff normals) with white crests · a shared **sun/moon diffuse + glint** so the lit side brightens.
- **Cursor ripples:** a real **height‑field wave simulation** (ping‑pong render targets + wave equation, `SIMN=512`, `uRippleAmp=2.0`, damping `0.991`, injection along the drag segment). **Now gated to SEA ONLY** — if the cursor is over the island (via `depthAt`) it returns early and injects nothing, so the ripple field only disturbs the water, not the land.

### Time of day (cooler palette)
`TIMEKF` keyframes (night / dawn / **day** / **afternoon 4pm** / dusk) are lerped by the **viewer's local clock** (`applyTime` every minute; `?t=day|night|dawn|dusk` or a number like `?t=15.7` to preview). The whole palette went **cooler and brighter**:

- **Brighter days** — more ambient/hemisphere/environment light (`environmentIntensity` up to 1.22 midday) and a lifted AO floor make midday read as bright tropical turquoise.
- **Blue‑hour dusk** — the old warm red "blood‑moon" sunset is gone; dusk (18.5h) is now a **cool indigo‑slate** blue hour, with reflection amount dropped low (`refl=0.5`) so the water's blue body shows through the warm sky reflection.
- **Cool lilac grade** — the fullscreen color‑grade shifted from the old dusty‑rose to **cool lilac**: shadow tint a cool purple‑blue, mids and highlights a cool blue / blue‑white.
- One knob (`P.sun`) still drives the sun/moon color (warm‑white ↔ blue‑white) across the sky, the water tint, and the god rays.

### God rays (invisible sun)
Screen‑space radial‑scatter shafts (GPU Gems technique). The **sun is invisible** (no disc) — the island's silhouette (from the render target's alpha) acts as a hard occluder so shafts break around it and fall on the water; slowly drifting sine modulation makes distinct golden‑hour fingers. It moves with the sun's arc and lights both island and water. **`SAMPLES` halved to 28** for perf; per‑keyframe strength is dampened at dusk (`gray=0.055`) so shafts don't wash the cool blue sea warm.

### Shadows
One `DirectionalLight` (PCF soft shadows, 2048² map). The sun direction is built from the **camera's screen axes** so the sun sits high on screen and shadows fall **down/away from it** consistently.

### Interaction (drill‑down → file folder)
- **Overview:** hover a quadrant → a glowing raised **zone border** + a big floating **label** ("creative", "research", …). Labels are now **larger and glowing, colored per zone** (46px zone labels, 30px building labels, each with a layered per‑color text‑shadow glow). Click → fly into that zone.
- **Zone:** hover a building → base glow ring; click → zoom in + a **manila file folder** opens.
- **The folder (`#panel`) — pure CSS, no WebGL.** Clicking a building opens a manila **file folder** filling ~70% of the screen (`min(72vw,1200px)` × `82vh`), tinted **per zone**: creative **beige**, about **pastel green**, projects **pastel orange**, materials **pastel blue**, research **pastel purple** (set via a `--folder` CSS var). On open, the folder's **cover sheet slides down** (~0.9s eased) to reveal the page beneath; on close, the **whole folder slides down off‑screen** (`translateY(122vh)`, then hidden). The page inside is a **live interactive iframe** of the real same‑origin page (generalizable to any page) or inline HTML for placeholders. It has a folder tab, a header bar (darker tint of the folder color) with a `>`‑prefixed title and a `× close` button, and a dark content body.
  - _This is the third iteration:_ parchment scroll → 3D voxel rods → **this folder**, which won for being cheap (CSS only), legible, and fitting the "pull a file from the drawer" metaphor.
- Camera is fixed dimetric ortho with an eased tween (no free orbit); back / Esc / click‑ground steps out.

### Performance
Built to stay smooth for the layered effects, and this pass cut the budget further:

- **Removed the second WebGL renderer** — now a single renderer.
- **God‑ray samples halved** (28), and the march now runs in a **half‑res prepass** (`rayGenMat` → `rayRT`, skipped when the light is off‑frame) with a 1‑tap composite — shafts are soft, so the upsample is invisible at ~¼ the cost. **Lower island‑RT MSAA** (`samples=2`); **backbuffer MSAA off** (`antialias:false` — the canvas only receives fullscreen quads). NOTE: `UnrealBloomPass`'s constructor resolution is a **no‑op** (`addPass` re‑sizes every pass to device res; bloom internally halves) — don't bother "half‑res bloom" via the constructor.
- **Ripple sim sleeps** — 8s after the last sea touch the field is cleared once and stepping stops (`uRippleOn` also skips the water shader's 5 ripple taps); first touch wakes it. Pointer raycasts are **coalesced to once per frame** (pointermove can fire at 120–250Hz), and a 250ms sea‑gap rule snaps the injection segment so re‑entering the water can't streak a ripple line across the map.
- greedy‑meshed island · **frozen shadow map** (static scene) · **render‑target caching** (the expensive island/sky renders only re‑run on camera move / time change / hover — idle frames just re‑run the cheap water + post chain; **hover pulse refreshes the island RT at half rate and skips the sky RT**; the sky RT is **half‑res** — it's a smooth gradient) · ripple **height‑field** (one sampled texture, not a loop) · DOM label/HUD writes only when something changed.
- Post chain: `waterPass` → `godrays` (composite of the half‑res prepass) → `bloom` → `vgPass` (cool‑lilac grade + lift + vignette + grain) → `OutputPass`.
- Measured (1440×810, GPU‑synced medians): idle 2.6→1.3 ms, hover 3.2→1.8 ms. `/crt3d` got the same treatment (half‑res 64‑tap march via a custom `GodraysPass`, frozen shadows refreshed by `refreshTime()` every 30s, `antialias:false`): 6.1→1.9 ms. `index.html`'s engine now **pauses entirely when invisible** (mobile, background tab, or hero preview scrolled out of view) and no longer updates the disabled clouds/rain.

### Tuning knobs (all in `voxmap.astro`)
- **Palette / brightness / day length / cool‑lilac dusk:** the `TIMEKF` table + the `PAL_SHADOW/MID/HIGH` grade uniforms.
- **Night lights:** the `warmMat` intensity ramp (`0.10 + (1 − dayness) * 2.15`).
- **Water:** `uReflAmt`, `uDeep`/`uShallow`, `uWaveAmt`, `uFoamW`, `uRippleAmp`, `uDrop`, `uDamp`, `uSunDiffuse`; ripple is sea‑gated by `depthAt`.
- **God rays:** `exposure`/`density`/`decay`, the per‑keyframe `gray`, `SAMPLES`.
- **Sun arc / shadows:** the `SUN_DIR` construction in `applyTime`.

---

## 2. The CRT lobby (`/crt3d`) and how the sites tie together

`crt3d.astro` is a vanilla Three.js room (beige CRT monitor, wood desk, plaster wall with a window, IBL + PBR, bloom/grade/grain post, synthesized boot audio, live day/night). It boots to a green terminal and offers two doors via `choose()`:

- **Click the screen → `/`** (the standard site) via the **boot‑up transition**: a time‑based ~2.8s ease dolly (camera z 9.4→6.6, lookAt eases to the screen center, parallax sway fades) until the monitor fills most of the frame; then `state='loading'` draws **"booting.." + a 24‑segment progress bar** on the screen canvas (~1.9s, soft key‑tick per segment, `/` prefetched at click); at 100% a 0.3s paper‑beige (`#f6f1ee`) fade hands off to the site.
- **Click the window → `/voxmap`** (the 3D voxel world), with the original dark fade.

Picking is a raycast against the `screen` and `worldBlur` meshes. The world beyond the glass is now the **voxel island** (`/voxworld-day.jpg` / `-night.jpg`, swapped live by the visitor's clock — the same snapshots the standard site's hero uses; the old `adventure-*.png` 2D‑world captures are orphaned).

---

## 3. How to run / preview
- `npm run dev` → Astro dev server (localhost:4321). Voxel world at `/voxmap`, lobby at `/crt3d`, previews at `/voxtest` / `/voxgallery`.
- Time preview: `/voxmap?t=day` `?t=night` `?t=dawn` `?t=dusk` or a number `?t=15.7`.
- Visual iteration is done with headless Chromium (Playwright) + the GL flags `--use-gl=angle --ignore-gpu-blocklist --enable-unsafe-swiftshader`.

## 4. Open / next
- **Real content** for the **about / projects** folder panels — still placeholder inline HTML (art / blog / research load the real pages via live iframe; **resume / transcript now render their PDFs** via the same iframe mechanism).
- **Night lantern glow on buildings** — partly addressed now (lit windows + street lamps glow warm at night); could still add per‑building lantern accents.
- **Mobile** story for the voxel world (the standard site hides the hero ≤768px, so mobile visitors get the about/news column and never hit /voxmap).
- ~~The homepage swap~~ **DONE (2026-07-03)**: the CRT lobby serves `/` (`src/pages/index.astro`), the standard site lives at `/site` (`src/pages/site.html`), every internal "home" link points at `/site`, `/crt3d` is a redirect stub, and mobile visitors to `/` are auto-redirected to `/site`.
- All voxel/lobby files are still **untracked** — commit as a feature when ready (include `public/voxworld-day.jpg` / `voxworld-night.jpg`, `public/voxsprites.json`, and `package.json` + `package-lock.json` together). Newly orphaned by the 2D world's removal: `public/adventure-*.png`, `public/sprites/`, the sprite scripts (`png2rle.cjs`, `png-to-sprite.*`, `gen-library-sprite.mjs`), and `public/Pages/Research/Ai2/Bristle/demo.mp4`; `/api/posts.json`'s only consumer is now `blog-archive.html`.
