// Shared voxel renderer for /voxtest and /voxmap.
// Opaque voxels are GREEDY-MESHED into a single static BufferGeometry:
//   • only exposed faces are emitted (interior faces never exist)
//   • coplanar faces of the same color + AO merge into big quads
//   • per-vertex ambient occlusion is baked into vertex colors
//   → one draw call, a fraction of the triangles, flat-shaded chunky look.
// Glass ('g') + emissive ('e') voxels stay as small InstancedMeshes (few,
// and they look better as little cubes — e.g. the lightbulb).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ROUND = new RoundedBoxGeometry(1, 1, 1, 1, 0.085);
const AOB = [0.87, 0.92, 0.96, 1.0];                                // brightness per AO level 0..3 (gentle; floor lifted so shaded sides stay readable)
// pastel transform: lift toward white + slightly desaturate, so the palette reads softer/lighter
const PASTEL = 0.15, DESAT = 0.13;
function lin(h){ const c = new THREE.Color(h);
  const l = 0.299*c.r + 0.587*c.g + 0.114*c.b;                      // perceived luminance
  c.r += (l-c.r)*DESAT; c.g += (l-c.g)*DESAT; c.b += (l-c.b)*DESAT;  // desaturate toward grey
  c.r += (1-c.r)*PASTEL; c.g += (1-c.g)*PASTEL; c.b += (1-c.b)*PASTEL; // lighten toward white
  return c.convertSRGBToLinear(); }

export function makeVoxels(vox){
  const opaque = [], glass = [], emis = [], warm = [];
  for (const v of vox) (v.t === 'g' ? glass : v.t === 'e' ? emis : v.t === 'w' ? warm : opaque).push(v);

  const root = new THREE.Group();
  let tris = 0;

  // ── opaque → greedy mesh ──
  if (opaque.length){
    const geo = greedyGeometry(opaque);
    tris = geo.getIndex().count / 3;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.0, vertexColors: true }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh);
  }

  // ── glass + emissive → instanced cubes ──
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  function instanced(list, mat){
    if (!list.length) return;
    const m = new THREE.InstancedMesh(ROUND, mat, list.length);
    list.forEach((v, i) => { dummy.position.set(v.x, v.y, v.z); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, col.copy(lin(v.c || '#ffffff'))); });
    m.instanceColor.needsUpdate = true; root.add(m); return m;
  }
  const g = instanced(glass, new THREE.MeshPhysicalMaterial({
    roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.5, envMapIntensity: 1.8, clearcoat: 0.6, clearcoatRoughness: 0.15 }));
  if (g) { g.castShadow = false; g.renderOrder = 2; }
  const e = instanced(emis, new THREE.MeshStandardMaterial({ roughness: 0.5, emissive: new THREE.Color('#ffc25a'), emissiveIntensity: 2.2 }));
  if (e) e.castShadow = false;

  // ── warm night lights ('w'): lamp globes + lit windows. Base color per-voxel; a shared warm emissive
  //    whose intensity the caller ramps by time-of-day (≈0 by day → bright at night, bloomed into a halo). ──
  const warmMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.0,
    emissive: new THREE.Color('#ffbf6a'), emissiveIntensity: 0.5 });
  const w = instanced(warm, warmMat);
  if (w) { w.castShadow = false; w.name = 'warmlights'; }

  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9,mnz=1e9,mxz=-1e9;
  for (const v of vox){ mnx=Math.min(mnx,v.x); mxx=Math.max(mxx,v.x); mny=Math.min(mny,v.y); mxy=Math.max(mxy,v.y); mnz=Math.min(mnz,v.z); mxz=Math.max(mxz,v.z); }
  return { root, bounds: { mnx, mxx, mny, mxy, mnz, mxz }, counts: { opaque: opaque.length, glass: glass.length, emis: emis.length, warm: warm.length, tris }, warmMat };
}

// ── greedy mesher (0fps "Meshing in a Minecraft Game" + per-vertex AO) ──
function greedyGeometry(voxels){
  let mnx=1e9,mny=1e9,mnz=1e9,mxx=-1e9,mxy=-1e9,mxz=-1e9;
  for (const v of voxels){ mnx=Math.min(mnx,v.x);mny=Math.min(mny,v.y);mnz=Math.min(mnz,v.z);mxx=Math.max(mxx,v.x);mxy=Math.max(mxy,v.y);mxz=Math.max(mxz,v.z); }
  const dims = [mxx-mnx+1, mxy-mny+1, mxz-mnz+1];
  const sx = dims[0], sy = dims[1], sz = dims[2];
  const grid = new Int32Array(sx*sy*sz);                            // 0 empty, else colorId+1
  const pal = [], pmap = new Map();
  const at = (x,y,z) => x + y*sx + z*sx*sy;
  for (const v of voxels){ let id = pmap.get(v.c); if (id===undefined){ id=pal.length; pal.push(lin(v.c)); pmap.set(v.c,id); }
    grid[at(v.x-mnx, v.y-mny, v.z-mnz)] = id+1; }
  const cell = (x,y,z) => (x<0||y<0||z<0||x>=sx||y>=sy||z>=sz) ? 0 : grid[at(x,y,z)];
  const solid = (x,y,z) => cell(x,y,z) !== 0 ? 1 : 0;
  const vAO = (s1,s2,c) => (s1 && s2) ? 0 : 3 - (s1 + s2 + c);

  const positions=[], normals=[], colors=[], indices=[]; let vc=0;

  for (let d=0; d<3; d++){
    const u=(d+1)%3, v=(d+2)%3;                                     // (d,u,v) cyclic → right-handed, u×v=+d
    const W=dims[u], H=dims[v];
    const x=[0,0,0], q=[0,0,0]; q[d]=1;
    const eu=[0,0,0], ev=[0,0,0]; eu[u]=1; ev[v]=1;
    const mask = new Array(W*H);
    for (x[d]=-1; x[d]<dims[d]; ){
      let n=0;
      for (x[v]=0; x[v]<H; x[v]++) for (x[u]=0; x[u]<W; x[u]++, n++){
        const a = (x[d]>=0) ? cell(x[0],x[1],x[2]) : 0;
        const b = (x[d]<dims[d]-1) ? cell(x[0]+q[0],x[1]+q[1],x[2]+q[2]) : 0;
        if ((a!==0) === (b!==0)) { mask[n]=null; continue; }         // both solid or both empty → no face
        const sign = a!==0 ? 1 : -1;
        const vx = a!==0 ? [x[0],x[1],x[2]] : [x[0]+q[0],x[1]+q[1],x[2]+q[2]];
        const cid = (a!==0 ? a : b) - 1;
        // front layer = voxel + sign*normal; sample its 8 in-plane neighbors for AO
        const f = [vx[0]+sign*q[0], vx[1]+sign*q[1], vx[2]+sign*q[2]];
        const S = (du,dv) => solid(f[0]+eu[0]*du+ev[0]*dv, f[1]+eu[1]*du+ev[1]*dv, f[2]+eu[2]*du+ev[2]*dv);
        const L=S(-1,0),R=S(1,0),B=S(0,-1),T=S(0,1),BL=S(-1,-1),BR=S(1,-1),TL=S(-1,1),TR=S(1,1);
        mask[n] = { c: cid, s: sign, a: [vAO(L,B,BL), vAO(R,B,BR), vAO(R,T,TR), vAO(L,T,TL)] };
      }
      x[d]++;
      // merge mask into quads
      n=0;
      for (let j=0; j<H; j++) for (let i=0; i<W; ){
        const m = mask[n];
        if (!m){ i++; n++; continue; }
        let w=1; while (i+w<W && eq(mask[n+w], m)) w++;
        let h=1; loop: while (j+h<H){ for (let k=0;k<w;k++) if (!eq(mask[n+k+h*W], m)) break loop; h++; }
        emit(d,u,v, eu,ev, x[d], i, j, w, h, m);
        for (let l=0;l<h;l++) for (let k=0;k<w;k++) mask[n+k+l*W]=null;
        i+=w; n+=w;
      }
    }
  }

  function eq(m, c){ return !!m && m.c===c.c && m.s===c.s && m.a[0]===c.a[0] && m.a[1]===c.a[1] && m.a[2]===c.a[2] && m.a[3]===c.a[3]; }

  function emit(d,u,v, eu,ev, slab, i, j, w, h, m){
    const base=[0,0,0]; base[d]=slab; base[u]=i; base[v]=j;
    const P = (du,dv) => [ base[0]+eu[0]*du+ev[0]*dv + mnx-0.5, base[1]+eu[1]*du+ev[1]*dv + mny-0.5, base[2]+eu[2]*du+ev[2]*dv + mnz-0.5 ];
    const corners = [ P(0,0), P(w,0), P(w,h), P(0,h) ];             // matches AO order a[0..3]
    const nrm=[0,0,0]; nrm[d]=m.s;
    const cc = pal[m.c];
    const start=vc;
    for (let k=0;k<4;k++){ const p=corners[k], br=AOB[m.a[k]];
      positions.push(p[0],p[1],p[2]); normals.push(nrm[0],nrm[1],nrm[2]); colors.push(cc.r*br, cc.g*br, cc.b*br); }
    vc+=4;
    const o = m.s>0 ? [0,1,2,3] : [0,3,2,1];                        // CCW for the face normal
    const flip = (m.a[0]+m.a[2]) < (m.a[1]+m.a[3]);                 // split along the brighter diagonal
    if (!flip) indices.push(start+o[0],start+o[1],start+o[2], start+o[0],start+o[2],start+o[3]);
    else       indices.push(start+o[1],start+o[2],start+o[3], start+o[1],start+o[3],start+o[0]);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  return g;
}
