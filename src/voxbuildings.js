// Hand-authored voxel building models (chunky toy style) for the iso world.
// Each model returns a list of {x,y,z,c}. Shared by /voxtest and /voxgallery.

export const PAL = { grass:'#5aa83a', grassD:'#3f8a2c', dirt:'#7a5a3a' };

export function Model(){
  const v = new Map();
  const K=(x,y,z)=>`${x|0},${y|0},${z|0}`;
  const set=(x,y,z,c)=>{ if(c) v.set(K(x,y,z),c); };
  // tagged voxel: t = 'g' (glass) | 'e' (emissive). Opaque voxels stay plain strings.
  const setT=(x,y,z,c,t)=>{ if(c) v.set(K(x,y,z), t?{c,t}:c); };
  const del=(x,y,z)=>{ v.delete(K(x,y,z)); };
  const box=(x,y,z,w,h,d,c)=>{ for(let i=0;i<w;i++)for(let j=0;j<h;j++)for(let l=0;l<d;l++) set(x+i,y+j,z+l,c); };
  const gableZ=(x,y,z,w,d,c,oh=0)=>{ const yOf=i=>Math.min(i,w-1-i);
    for(let i=0;i<w;i++){ const yy=y+yOf(i);
      for(let l=z-oh;l<z+d+oh;l++){ set(x+i,yy,l,c); set(x+i,yy+1,l,c); }
      for(let j=y;j<=yy;j++){ set(x+i,j,z,c); set(x+i,j,z+d-1,c); } } };
  return { set,setT,del,box,gableZ, list(){ return [...v].map(([k,val])=>{const[x,y,z]=k.split(',').map(Number);
    return (typeof val==='string')?{x,y,z,c:val}:{x,y,z,c:val.c,t:val.t};}); } };
}
// framed mullioned windows on the +z (winZ) or +x (winX) face.
// optional `tag` ('w' = warm night-light) makes the glass PANES glow at night; frame/mullion stay opaque.
// LARGE windows (≥5×5) get a full border + mullion cross (4 panes). SMALL windows frame only the top+bottom
// (lintel + sill) so the glass fills the FULL WIDTH → the whole window lights up, not just a center block.
function winZ(m,x,y,z,w,h,glass,frame,tag){ const big=w>=5&&h>=5; for(let i=0;i<w;i++)for(let j=0;j<h;j++){ const b= big?(i===0||i===w-1||j===0||j===h-1):(j===0||j===h-1), mu= big&&(i===(w>>1)||j===(h>>1)), pane=!(b||mu); m.setT(x+i,y+j,z, pane?glass:frame, pane?tag:undefined);} }
function winX(m,x,y,z,d,h,glass,frame,tag){ const big=d>=5&&h>=5; for(let l=0;l<d;l++)for(let j=0;j<h;j++){ const b= big?(l===0||l===d-1||j===0||j===h-1):(j===0||j===h-1), mu= big&&(l===(d>>1)||j===(h>>1)), pane=!(b||mu); m.setT(x,y+j,z+l, pane?glass:frame, pane?tag:undefined);} }
// shingled gable roof, ridge along z, alternating courses + barge ends + ridge cap + eave overhang
function roofGableZ(m,x,y,z,w,d,a,b,barge,ridge,oh){ const yOf=i=>Math.min(Math.min(i,w-1-i),Math.ceil(w*0.42));
  for(let i=0;i<w;i++){ const yy=y+yOf(i);
    for(let l=z-oh;l<z+d+oh;l++){ const c=(l%2===0)?a:b; m.set(x+i,yy,l,c); m.set(x+i,yy+1,l,c); }
    for(let j=y;j<=yy;j++){ m.set(x+i,j,z,barge); m.set(x+i,j,z+d-1,barge); } }
  const top=y+yOf((w-1)>>1); for(let l=z-oh;l<z+d+oh;l++) m.set(x+((w-1)>>1),top+2,l,ridge); return top; }

const MODELS = {
  // ── cute pink cottage ──
  infobuilding(){ const m=Model();
    const pink='#e7a7af', pink2='#dc95a0', pink3='#efb7be', roofA='#4f9e90', roofB='#458d80', ridge='#6cc0b1', barge='#39756b',
          doorW='#7a4d34', doorD='#5d3a27', glass='#f6dd6a', frame='#f1e3db', sill='#c8a079',
          banner='#e87f9a', bannerD='#d2698a', pole='#6a4a30', chim='#a9786a', chimT='#7e564b', smoke='#eef1f6', fA='#e85a7a', fB='#f4d85a', leaf='#7bd06a';
    m.box(0,-3,0, 26,2,26, PAL.dirt); m.box(0,-1,0, 26,1,26, PAL.grass);
    for(let i=2;i<24;i++)for(let j=2;j<24;j++){ if(((i*7+j*5)%6)===0) m.set(i,-1,j,PAL.grassD); }
    for(const [fx,fz0] of [[4,20],[7,22],[21,6],[23,10],[3,8],[20,21]]){ m.set(fx,0,fz0,leaf); m.set(fx,1,fz0,(fx%2)?fA:fB); }
    const bx=6,bz=6,bw=14,bh=10,bd=12, fz=bz+bd-1;
    m.box(bx,0,bz,bw,bh,bd,pink);
    for(let j=0;j<bh;j++)for(let l=0;l<bd;l++){ if(((j*3+l*7)%5)===0) m.set(bx+bw-1,j,bz+l,pink2); }
    for(let j=0;j<bh;j++)for(let i=0;i<bw;i++){ if(((j*5+i*3)%6)===0) m.set(bx+i,j,fz,pink3); }
    m.box(bx+5,0,fz, 4,6,1, doorW);
    m.box(bx+5,0,fz,1,6,1,doorD); m.box(bx+8,0,fz,1,6,1,doorD); m.box(bx+5,5,fz,4,1,1,doorD);
    m.set(bx+6,2,fz,doorD); m.set(bx+7,2,fz,doorD); m.set(bx+7,3,fz,fB);
    m.box(bx+4,6,fz, 6,1,1, frame); m.box(bx+4,6,fz-1,6,1,1,frame);
    winZ(m, bx+1,3,fz, 4,4, glass, frame, 'w'); m.box(bx+1,2,fz,4,1,1,sill); m.box(bx+1,1,fz,4,1,1,leaf);
    winZ(m, bx+9,3,fz, 4,4, glass, frame, 'w'); m.box(bx+9,2,fz,4,1,1,sill);
    winX(m, bx+bw-1,3,bz+4, 4,4, glass, frame, 'w'); for(let l=0;l<4;l++)m.set(bx+bw-1,2,bz+4+l,sill);
    const top=roofGableZ(m, bx-2,bh,bz-2, bw+4, bd+4, roofA, roofB, barge, ridge, 1);
    m.box(bx+1,bh+2,bz+2, 2,4,2, chim); m.box(bx+1,bh+5,bz+2,2,1,2,chimT);
    m.set(bx+1,bh+7,bz+2,smoke); m.set(bx+2,bh+8,bz+3,smoke); m.set(bx+1,bh+10,bz+2,smoke);
    const ax=bx+(bw>>1);
    m.box(ax,top+2,bz+1, 1,5,1, pole); m.box(ax+1,top+5,bz+1, 4,3,1, banner); m.box(ax+1,top+5,bz+1,4,1,1,bannerD);
    return m; },

  // ── 2-storey ivy cottage ──
  research2(){ const m=Model();
    const wall='#e6a7ad', wall2='#d895a0', roofA='#574668', roofB='#4a3b5a', ridge='#6a5882', barge='#3a2f4a',
          doorW='#5a3550', doorD='#43273c', glass='#bcd6f0', frame='#cfa9b3', sill='#b58a96', vine='#3f7a3a', vine2='#56a046', chim='#8a7088', chimT='#6a5468', fA='#e85a7a', fB='#f4d85a';
    m.box(0,-3,0, 26,2,26, PAL.dirt); m.box(0,-1,0, 26,1,26, PAL.grass);
    for(let i=2;i<24;i++)for(let j=2;j<24;j++){ if(((i*7+j*5)%6)===0) m.set(i,-1,j,PAL.grassD); }
    for(const [fx,fz0] of [[4,21],[22,7],[3,9],[21,22]]){ m.set(fx,0,fz0,vine2); m.set(fx,1,fz0,(fx%2)?fA:fB); }
    const bx=6,bz=7,bw=14,bh=16,bd=11, fz=bz+bd-1;
    m.box(bx,0,bz,bw,bh,bd,wall);
    for(let j=0;j<bh;j++)for(let l=0;l<bd;l++){ if(((j*3+l*7)%5)===0) m.set(bx+bw-1,j,bz+l,wall2); }
    m.box(bx+5,0,fz,4,6,1,doorW); m.box(bx+5,0,fz,1,6,1,doorD);m.box(bx+8,0,fz,1,6,1,doorD);m.box(bx+5,5,fz,4,1,1,doorD); m.set(bx+7,3,fz,fB);
    winZ(m,bx+1,3,fz,4,4,glass,frame,'w'); m.box(bx+1,2,fz,4,1,1,sill);
    winZ(m,bx+9,3,fz,4,4,glass,frame,'w'); m.box(bx+9,2,fz,4,1,1,sill);
    winZ(m,bx+1,9,fz,4,4,glass,frame,'w'); m.box(bx+1,8,fz,4,1,1,sill);
    winZ(m,bx+9,9,fz,4,4,glass,frame,'w'); m.box(bx+9,8,fz,4,1,1,sill);
    winX(m,bx+bw-1,3,bz+3,4,4,glass,frame,'w'); winX(m,bx+bw-1,9,bz+3,4,4,glass,frame,'w');
    const top=roofGableZ(m, bx-2,bh,bz-2, bw+4, bd+4, roofA, roofB, barge, ridge, 1);
    for(let j=0;j<bh-2;j++){ m.set(bx,j,fz,(j%2)?vine:vine2); if(j%3===0)m.set(bx+1,j,fz,vine); if(j<9)m.set(bx,j,fz-1,vine); }
    m.box(bx+bw-3,bh+1,bz+2,2,4,2,chim); m.box(bx+bw-3,bh+4,bz+2,2,1,2,chimT);
    return m; },

  // ── sandstone hut, flat roof, barrel ──
  resumeBuilding(){ const m=Model();
    const wall='#d8b07e', wall2='#c9a070', wall3='#e3c08c', lip='#8d86a0', top='#e7cf9f', topD='#d8bd87',
          doorW='#6a4226', doorD='#4e2f1a', glass='#cdbb86', frame='#9a8c78', sill='#8a7c68', barrel='#7a4a2a', barrelR='#5a3520', base='#cdb086', baseD='#bd9d6e';
    m.box(0,-3,0, 24,2,24, PAL.dirt); m.box(0,-1,0, 24,1,24, base);
    for(let i=2;i<22;i++)for(let j=2;j<22;j++){ if(((i*7+j*5)%7)===0) m.set(i,-1,j,baseD); }
    const bx=4,bz=4,bw=14,bh=10,bd=14, fz=bz+bd-1;
    m.box(bx,0,bz,bw,bh,bd,wall);
    for(let j=0;j<bh;j++)for(let l=0;l<bd;l++){ const r=(j*3+l*7)%5; if(r===0)m.set(bx+bw-1,j,bz+l,wall2); else if(r===2)m.set(bx+bw-1,j,bz+l,wall3); }
    for(let j=0;j<bh;j++)for(let i=0;i<bw;i++){ const r=(j*5+i*3)%5; if(r===0)m.set(bx+i,j,fz,wall2); else if(r===3)m.set(bx+i,j,fz,wall3); }
    m.box(bx-2,bh,bz-2, bw+4,1,bd+4, lip); m.box(bx-1,bh+1,bz-1, bw+2,2,bd+2, top);
    for(let i=0;i<bw+2;i++)for(let l=0;l<bd+2;l++){ if(((i*7+l*3)%6)===0) m.set(bx-1+i,bh+2,bz-1+l,topD); }
    m.box(bx+5,0,fz,4,6,1,doorW); m.box(bx+5,0,fz,1,6,1,doorD);m.box(bx+8,0,fz,1,6,1,doorD);m.box(bx+5,5,fz,4,1,1,doorD); m.set(bx+7,3,fz,'#c9bba0');
    winZ(m,bx+1,3,fz,3,3,glass,frame,'w'); m.box(bx+1,2,fz,3,1,1,sill);
    winZ(m,bx+10,3,fz,3,3,glass,frame,'w'); m.box(bx+10,2,fz,3,1,1,sill);
    winX(m,bx+bw-1,3,bz+5,3,3,glass,frame,'w'); for(let l=0;l<3;l++)m.set(bx+bw-1,2,bz+5+l,sill);
    m.box(bx-2,0,fz-2,3,4,3,barrel); m.box(bx-2,0,fz-2,3,1,3,barrelR); m.box(bx-2,2,fz-2,3,1,3,barrelR); m.box(bx-2,3,fz-2,3,1,3,barrelR);
    return m; },

  // ── lavender office building ──
  project2(){ const m=Model();
    const wall='#b9aed0', wall2='#a99dc4', wall3='#cabfe0', trim='#8d82a8', glass='#aecdee', glassL='#cfe4f8', frame='#9a8fb8', roof='#9d92ba', roofT='#8a7fa6', unit='#6f6f7a', door='#7a6f95';
    m.box(0,-2,0, 18,1,18, PAL.dirt); m.box(0,-1,0,18,1,18,'#8a7f6a');
    const bx=2,bz=2,bw=14,bh=16,bd=14, fz=bz+bd-1;
    m.box(bx,0,bz,bw,bh,bd,wall);
    for(let j=0;j<bh;j++)for(let l=0;l<bd;l++){ if(((j*3+l*7)%5)===0) m.set(bx+bw-1,j,bz+l,wall2); }
    for(let j=0;j<bh;j++)for(let i=0;i<bw;i++){ if(((j*5+i*3)%6)===0) m.set(bx+i,j,fz,wall3); }
    for(let r=0;r<4;r++)for(let cc=0;cc<3;cc++){ const wx=bx+1+cc*4, wy=2+r*3; if(wy+2<bh-1) winZ(m,wx,wy,fz,3,3,((r+cc)%2)?glass:glassL,frame,'w'); }
    for(let r=0;r<4;r++)for(let cc=0;cc<3;cc++){ const wz=bz+1+cc*4, wy=2+r*3; if(wy+2<bh-1) winX(m,bx+bw-1,wy,wz,3,3,((r+cc)%2)?glass:glassL,frame,'w'); }
    m.box(bx+5,0,fz,4,4,1,trim); m.box(bx+6,0,fz,2,3,1,glassL);
    m.box(bx-1,bh,bz-1,bw+2,1,bd+2,roof);
    for(let i=-1;i<bw+1;i++){ m.set(bx+i,bh+1,bz-1,roofT); m.set(bx+i,bh+1,bz+bd,roofT);} for(let l=-1;l<bd+1;l++){ m.set(bx-1,bh+1,bz+l,roofT); m.set(bx+bw,bh+1,bz+l,roofT);}
    // ── rooftop GAME CONTROLLER (xbox-style, lying face-up — this is the game-dev building) ──
    { const B='#2f333c', F='#3a3f49', K='#14171c', ry=bh+1;                    // base y sits on the roof slab
      m.box(3,ry,4, 12,1,5, B);  m.box(3,ry+1,4, 12,1,5, F);                   // main bar (2 tall, face on top)
      for(const gx of [3,12]){ m.box(gx,ry,9, 3,1,2, B); m.box(gx,ry+1,9, 3,1,1, F);  // grips reach forward
        m.set(gx+1,ry,11,B); }                                                 // rounded grip tips
      m.set(4,ry+1,6,K); m.set(5,ry+1,6,K); m.set(6,ry+1,6,K); m.set(5,ry+1,5,K); m.set(5,ry+1,7,K);   // d-pad cross
      m.set(11,ry+1,7,'#4fae52'); m.set(12,ry+1,6,'#c0453e'); m.set(10,ry+1,6,'#3f6fc4'); m.set(11,ry+1,5,'#d8b13c');   // A B X Y
      m.set(7,ry+2,7,K); m.set(9,ry+2,7,K);                                    // raised joystick knobs
      m.setT(8,ry+1,4,'#e8ecf2','e');                                          // glowing guide button
    }
    return m; },

  // ── chest of drawers (dresser) with books ──
  blog4(){ const m=Model();
    const wood='#c9885f', wood2='#b8754e', woodT='#d89a72', drawer='#bd7d56', handle='#5a3a22', bookA='#b5443a', bookB='#3f6a8a', bookC='#d8a23a';
    const bx=3,bz=4,bw=10,bh=13,bd=8, fz=bz+bd-1;
    for(const [lx,lz] of [[bx,bz],[bx+bw-2,bz],[bx,bz+bd-2],[bx+bw-2,bz+bd-2]]) m.box(lx,0,lz,2,2,2,wood2);
    m.box(bx,2,bz,bw,bh,bd,wood);
    for(let j=2;j<bh+2;j++)for(let l=0;l<bd;l++){ if(((j+l)%4)===0) m.set(bx+bw-1,j,bz+l,wood2); }
    for(let d=0;d<3;d++){ const dy=3+d*4; m.box(bx+1,dy,fz,bw-2,3,1,drawer); m.box(bx+1,dy,fz,1,3,1,wood2); m.box(bx+bw-2,dy,fz,1,3,1,wood2); m.box(bx+(bw>>1)-1,dy+1,fz,2,1,1,handle); }
    m.box(bx-1,bh+2,bz-1,bw+2,1,bd+2,woodT);
    m.box(bx+1,bh+3,bz+2,2,4,3,bookA); m.box(bx+3,bh+3,bz+2,2,5,3,bookB); m.box(bx+5,bh+3,bz+3,2,3,3,bookC); m.set(bx+7,bh+3,bz+3,bookA);
    return m; },

  // ── tin toy robot (vintage wind-up: teal ribbed body, red dome + feet, dark chest panel) ──
  research1(){ const m=Model();
    const T='#478299', T2='#3c6e82', R='#b8403a', RD='#a03530', panel='#262b33', hand='#2e333b',
          S='#c9cfd9', SB='#e9edf4', lens='#1a1e24', brass='#b1935e';
    m.box(-1,-3,-1, 18,2,9, PAL.dirt); m.box(-1,-1,-1, 18,1,9, PAL.grass);
    for(let i=1;i<16;i+=4){ m.set(i,-1,1,PAL.grassD); m.set(i+1,-1,6,PAL.grassD); }
    // red shoes (toes forward +z, taller at the ankle)
    for(const fx of [2,9]){ m.box(fx,0,0, 5,1,7, R); m.box(fx,1,0, 5,1,4, R); }
    // ribbed teal legs
    for(const lx of [3,10]) for(let j=2;j<=10;j++) m.box(lx,j,2, 3,1,3, (j%3===1)?T2:T);
    // torso + waist band + side texture on the visible +x face
    m.box(2,11,0, 12,10,6, T);
    m.box(2,11,0, 12,1,6, T2);
    for(let j=12;j<21;j++)for(let l=0;l<6;l++) if(((j*3+l*7)%6)===0) m.set(13,j,l,T2);
    // chest panel (front +z face): slot plate, coil springs, mechanism, buttons
    m.box(4,12,5, 8,8,1, panel);
    m.box(5,18,5, 6,1,1, S); m.set(7,18,5,SB); m.set(8,18,5,SB);
    m.box(5,13,5, 1,4,1, R); m.box(10,13,5, 1,4,1, R);
    m.box(7,14,5, 2,2,1, S);
    m.set(5,12,5,R); m.set(10,12,5,R); m.box(7,12,5, 2,1,1, S);
    // shoulder ledge + barrel arms at the sides + dark claw hands
    m.box(1,20,0, 14,1,6, T2);
    for(const ax of [0,14]){ for(let j=12;j<=19;j++) m.box(ax,j,1, 2,1,4, (j%3===0)?T2:T); m.box(ax,10,2, 2,2,2, hand); }
    // head: mouth slot, red-rimmed goggle eyes (lenses glow warm at night), brass ear discs
    m.box(3,21,0, 10,7,6, T);
    m.box(5,22,5, 6,1,1, S);
    for(const ex of [4,9]){ m.box(ex,24,5, 3,3,1, RD); m.setT(ex+1,25,5, lens, 'w'); }
    m.box(2,24,2, 1,2,2, brass); m.box(13,24,2, 1,2,2, brass);
    // red dome cap + angled silver antennae
    m.box(6,28,1, 4,1,4, R); m.box(7,29,2, 2,1,2, R);
    m.set(4,28,2,S); m.set(3,29,2,S); m.set(2,30,2,S); m.set(2,31,2,SB);
    m.set(11,28,2,S); m.set(12,29,2,S); m.set(13,30,2,S); m.set(13,31,2,SB);
    return m; },

  // ── card table with a stack of cards ──
  cards(){ const m=Model();
    const leg='#8a6038', wood='#b98a5a', wood2='#a3754a', card='#f4f1ea', card2='#e2dccf', spade='#222';
    const bx=2,bz=2,bw=12,bd=12, ty=7, fz=bz+bd-1;
    for(const[lx,lz] of [[bx+1,bz+1],[bx+bw-3,bz+1],[bx+1,bz+bd-3],[bx+bw-3,bz+bd-3]]) m.box(lx,0,lz,2,ty,2,leg);
    m.box(bx,ty,bz,bw,2,bd,wood); for(let i=0;i<bw;i++)for(let l=0;l<bd;l++){ if((i+l)%4===0)m.set(bx+i,ty+1,bz+l,wood2);}
    const cx=bx+3,cz=bz+2,cw=6,cd=8;
    for(let s=0;s<6;s++){ m.box(cx+(s%2),ty+2+s,cz,cw,1,cd, s%2?card2:card); }
    m.box(cx+2,ty+8,cz+3,2,1,2,spade); m.set(cx+2,ty+8,cz+2,spade); m.set(cx+3,ty+8,cz+2,spade);
    return m; },

  // ── mailbox on a post ──
  blog1(){ const m=Model();
    const post='#7a5230', postD='#5f3f22', boxc='#3f78c8', box2='#356bb0', boxIn='#cdd6e2', flag='#d23a3a', flagP='#c9c9c9', letter='#f0e8d8';
    m.box(0,-2,0, 11,1,11, PAL.dirt); m.box(0,-1,0, 11,1,11, PAL.grass);
    for(let i=1;i<10;i+=3){ m.set(i,-1,2,PAL.grassD); m.set(8,-1,i,PAL.grassD);}
    m.box(4,0,4,3,9,3,post); for(let j=0;j<9;j++) m.set(6,j,4,postD);
    const mx=2,my=9,mw=7,mh=5,md=8, mz=2, fz=mz+md-1;
    m.box(mx,my,mz,mw,mh,md,boxc);
    for(let j=0;j<mh;j++)for(let l=0;l<md;l++){ if((j+l)%3===0) m.set(mx+mw-1,my+j,mz+l,box2); }
    m.box(mx+2,my+1,fz,3,3,1,boxIn); m.box(mx+2,my+1,fz-1,3,2,1,letter);
    m.box(mx+mw,my+1,mz+2,1,4,1,flagP); m.box(mx+mw+1,my+3,mz+2,2,2,1,flag);
    return m; },

  // ── upright piano ──
  art(){ const m=Model();
    const wood='#7a4a2a', wood2='#643c22', woodT='#8a5832', keys='#efe9da', black='#1a1a1a', metal='#c9c9c9', splA='#e85a7a', splB='#56b0d0', splC='#f4d85a';
    const bx=3,bz=4;
    m.box(bx,0,bz, 12,12,5, wood);
    for(let j=0;j<12;j++)for(let l=0;l<5;l++){ if((j+l)%4===0) m.set(bx+11,j,bz+l,wood2); }
    m.box(bx-1,12,bz-1, 14,1,7, woodT);
    m.box(bx+1,8,bz+5, 10,3,1, wood2);
    const kz=bz+5; m.box(bx,5,kz, 12,2,4, wood);
    m.box(bx+1,6,kz+3, 10,1,1, keys);
    for(let i=0;i<10;i+=2) m.set(bx+1+i,7,kz+3,black);
    m.box(bx+1,0,kz+3,1,5,1,wood2); m.box(bx+10,0,kz+3,1,5,1,wood2);
    m.box(bx+5,0,kz+2,2,1,1,metal);
    for(const[sx,sy,col] of [[bx+2,9,splA],[bx+5,7,splB],[bx+8,10,splC],[bx+3,5,splB],[bx+9,6,splA],[bx+6,11,splC]]) m.set(sx,sy,bz+4,col);
    return m; },

  // ── glowing lightbulb ("the idea") — glass envelope + emissive filament + brass screw base ──
  project1(){ const m=Model();
    const ped='#6f6f7a', pedT='#8a8a96', cap='#c9a24e', capD='#a98438', capL='#e2bd66', cdark='#4a3a1c',
          glass='#d8e8f4', fil='#ffd27a', filH='#ffb43a';
    // round pedestal disc
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){ const r=dx*dx+dz*dz; if(r<=16){ m.set(dx,0,dz,ped); if(r<=9)m.set(dx,1,dz,pedT);} }
    m.box(-1,1,-1,3,1,3,cdark);                                              // dark collar
    // brass screw base with thread rings (y 2..6)
    for(let y=2;y<=6;y++)for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){ if(dx*dx+dz*dz<=7) m.set(dx,y,dz,(y%2)?cap:capD); }
    for(let y=2;y<=6;y+=2){ m.set(3,y,0,capL); m.set(0,y,3,capL); }          // thread highlights (lit faces)
    // glass envelope — hollow shell from a revolution profile (so the filament shows inside)
    const prof=[[7,2.4],[8,3.4],[9,4.3],[10,5.0],[11,5.3],[12,5.2],[13,4.7],[14,3.8],[15,2.7],[16,1.5]];
    for(const [y,r] of prof) for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){ const d=Math.hypot(dx,dz);
      if(d<=r && d>r-1.15) m.setT(dx,y,dz,glass,'g'); }
    m.setT(0,16,0,glass,'g'); m.setT(0,17,0,glass,'g');                      // top cap
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){ if(dx*dx+dz*dz<=4) m.setT(dx,7,dz,glass,'g'); } // neck collar
    // filament (emissive): glowing stem → split legs → coil → tip, centered inside
    m.setT(0,7,0,fil,'e'); m.setT(0,8,0,fil,'e');
    m.setT(-1,9,0,fil,'e'); m.setT(1,9,0,fil,'e');
    m.setT(-2,10,0,filH,'e'); m.setT(2,10,0,filH,'e');
    m.setT(-1,11,0,fil,'e'); m.setT(1,11,0,fil,'e'); m.setT(0,11,1,fil,'e'); m.setT(0,11,-1,fil,'e');
    m.setT(0,12,0,filH,'e'); m.setT(0,13,0,fil,'e');
    return m; },

  // ── marble shrine / monument ──
  transcript(){ const m=Model();
    const marble='#e6e4ec', marble2='#d2d0da', marble3='#f2f1f6', gold='#d8b048', dark='#241f2e', book='#7a3a4a', bookP='#caa', scroll='#e8dcc0';
    m.box(2,-1,2, 16,1,16, marble2); m.box(3,0,3,14,1,14,marble); m.box(4,1,4,12,1,12,marble3);
    const bx=4,bz=4,bw=12,bh=12,bd=10, fz=bz+bd-1;
    m.box(bx,2,bz, bw,bh,bd, marble);
    // dark arched niche carved into the front
    for(let i=0;i<6;i++)for(let j=0;j<9;j++){ const dx=i-2.5; const inArch = j<6 || (dx*dx+(j-6)*(j-6))<7; if(inArch){ m.del(bx+5+i,2+j,fz); m.del(bx+5+i,2+j,fz-1); m.set(bx+5+i,2+j,fz-2,dark);} }
    m.box(bx+4,2,fz,1,10,1,marble3); m.box(bx+11,2,fz,1,10,1,marble3);   // columns
    m.box(bx-1,bh+1,bz-1, bw+2,2,bd+2, marble2); m.box(bx,bh+3,bz, bw,1,bd, marble);
    // gold framed scroll on the +x face
    for(let l=0;l<4;l++)for(let j=0;j<5;j++){ const b=l===0||l===3||j===0||j===4; m.set(bx+bw-1,4+j,bz+3+l, b?gold:scroll); }
    m.box(bx+(bw>>1)-2,bh+4,bz+(bd>>1)-1,4,2,3,book); m.box(bx+(bw>>1)-2,bh+4,bz+(bd>>1)-1,1,2,3,bookP);
    return m; },
};

export const NAMES = ['infobuilding','research2','resumeBuilding','project2','blog4','research1','cards','blog1','art','project1','transcript'];
export function buildVox(name){ return (MODELS[name]||MODELS.infobuilding)().list(); }

// ════════════════════════════════════════════════════════════════
// TREES — hand-authored like the buildings; dot these around the map.
// Authored to sit on the grass (base at y=0), readable from all sides
// (the map view orbits), chunky-toy proportions to match the houses.
// ════════════════════════════════════════════════════════════════
const TREES = {
  // ── leaning palm: segmented trunk + drooping fronds + coconuts ──
  palm(){ const m=Model();
    const bk='#a9743f', bkD='#895c30', bkL='#c08a4f', frA='#3f9e54', frB='#5bbd6e', frD='#2c7a40', coco='#6a4a2a';
    const H=13; let lean=0;
    for(let y=0;y<H;y++){ lean=Math.round((y*y)*0.016);
      m.set(lean,y,0,(y%2)?bk:bkD); if(y%3===2) m.set(lean+1,y,0,bkL); }
    const tx=lean, ty=H-1;
    const card=[[1,0],[-1,0],[0,1],[0,-1]], diag=[[1,1],[-1,1],[1,-1],[-1,-1]], arc=[1,2,2,1,-1];
    for(const [dx,dz] of card){ for(let r=1;r<=5;r++){ const fy=ty+arc[r-1];
      m.set(tx+dx*r, fy, dz*r, (r%2)?frA:frB);
      if(r<=3){ const px=dz, pz=dx; m.set(tx+dx*r+px, fy, dz*r+pz, frB); m.set(tx+dx*r-px, fy, dz*r-pz, frB); } } }
    for(const [dx,dz] of diag){ for(let r=1;r<=4;r++) m.set(tx+dx*r, ty+arc[r-1], dz*r, (r%2)?frB:frA); }
    m.box(tx-1,ty,-1, 3,2,3, frD); m.set(tx,ty+2,0,frA);                 // crown core
    m.set(tx+1,ty-1,0,coco); m.set(tx-1,ty-1,1,coco);                    // coconuts
    return m; },

  // ── tall leafy tree: 2×2 trunk + big rounded ellipsoid canopy ──
  tall(){ const m=Model();
    const bk='#6d4a2a', bkD='#553a22', l1='#3f8f3a', l2='#57a84a', l3='#2f6f2c', l4='#74c265';
    m.box(0,0,0, 2,8,2, bk); for(let y=0;y<8;y++) m.set(1,y,1,bkD);
    const R=4.4;
    for(let dx=-5;dx<=5;dx++)for(let dy=-1;dy<=8;dy++)for(let dz=-5;dz<=5;dz++){
      const ex=(dx-0.5)/R, ey=(dy-4)/4.6, ez=(dz-0.5)/R;
      if(ex*ex+ey*ey+ez*ez<=1){ const r=(dx*7+dy*5+dz*3+99)%9;
        m.set(dx, 9+dy, dz, r<2?l3 : (dy>=5?l4 : (r<4?l2:l1))); } }
    return m; },

  // ── conical pine: stacked diamond tiers up a thin trunk ──
  pine(){ const m=Model();
    const bk='#5a3f26', g1='#2f7a3e', g2='#266a34', g3='#3f924c';
    m.box(0,0,0, 1,4,1, bk);
    const tiers=[{w:4,y:3,h:2},{w:3,y:5,h:2},{w:2,y:7,h:2},{w:1,y:9,h:2}];
    for(const t of tiers){ for(let dx=-t.w;dx<=t.w;dx++)for(let dz=-t.w;dz<=t.w;dz++){ if(Math.abs(dx)+Math.abs(dz)<=t.w+1){
      for(let dy=0;dy<t.h;dy++){ const r=(dx*5+dz*3+dy*7+99)%4; m.set(dx,t.y+dy,dz, r===0?g3:(r===1?g2:g1)); } } } }
    m.set(0,11,0,g3); m.set(0,12,0,g3);
    return m; },

  // ── round shrub with berries ──
  bush(){ const m=Model();
    const g1='#3f8f3a', g2='#57a84a', g3='#2f6f2c', berry='#d23a4a', stem='#5a3f26';
    m.set(0,0,0,stem);
    for(let dx=-3;dx<=3;dx++)for(let dy=0;dy<=4;dy++)for(let dz=-3;dz<=3;dz++){
      const ex=dx/3.2, ey=(dy-2)/2.6, ez=dz/3.2;
      if(ex*ex+ey*ey+ez*ez<=1){ const r=(dx*7+dy*3+dz*5+99)%5; m.set(dx,1+dy,dz, r<1?g3:(r<2?g2:g1)); } }
    m.set(2,3,1,berry); m.set(-2,2,-1,berry); m.set(1,4,2,berry);
    return m; },
};
export const TREE_NAMES = ['palm','tall','pine','bush'];
export function buildTree(name){ return (TREES[name]||TREES.tall)().list(); }

// ════════════════════════════════════════════════════════════════
// PROPS — small dressing objects placed directly on the map (by voxel
// position, not by tile). Centered on x=0,z=0 with the base at y=0.
// ════════════════════════════════════════════════════════════════
const PROPS = {
  // ── London-style street lamp: iron post + frosted globe that glows warm at night ('w', like the bulb) ──
  //    compact: ~12 tall, 3 wide.
  lamp(){ const m=Model();
    const iron='#33313b', ironD='#22202a', ironL='#4e4b58', warm='#ffcf87', warmH='#ffe7bd';
    m.box(-1,0,-1, 3,1,3, ironD); m.set(0,1,0,iron);                      // small base
    const py0=2, H=6; m.box(0,py0,0, 1,H,1, iron);                        // slim post
    m.set(0,py0+3,0,ironL);
    const ly=py0+H;                                                       // lantern base (~8)
    m.box(-1,ly,-1, 3,1,3, iron);                                         // cage floor
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=0;dy<=1;dy++){   // small frosted warm globe
      if(Math.hypot(dx,(dy-0.5)*1.3,dz)<=1.35) m.setT(dx, ly+1+dy, dz, (dy===0?warmH:warm), 'w'); }
    m.box(-1,ly+3,-1, 3,1,3, iron); m.set(0,ly+4,0,iron);                 // cage cap + finial
    return m; },
};
export const PROP_NAMES = ['lamp'];
export function buildProp(name){ return (PROPS[name]||PROPS.lamp)().list(); }
