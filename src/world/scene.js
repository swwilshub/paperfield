// ===== 3D world: renderer, field, orbit camera, render loop =====
// three.js r128 is loaded through the import map in index.html. If it can't load or WebGL
// is unavailable, a stub world is returned and building and scoring still work.
import {$,css,GUIN} from '../ui/state.js';
import {initPlanes} from './planes.js';
import {initEvent} from './event.js';
import {initPreview} from './preview.js';

function stubWorld(){$('ticker').textContent='3D view unavailable on this device. Building and scoring still work.';
  return{add(){},focus(){},event(p,o){if(o&&o.onLand)o.onLand();},busy:()=>false,end(){}};}

export async function createWorld(){let THREE,R;const canvas=$('world');
  try{THREE=await import('three');
    // Keep r128's look: no colour management (colours and textures are used as given, output isn't
    // converted). Lights are physically based since r155, so their intensities are scaled by π (LIGHT) below.
    THREE.ColorManagement.enabled=false;R=new THREE.WebGLRenderer({canvas,antialias:true});R.outputColorSpace=THREE.LinearSRGBColorSpace;}catch(e){return stubWorld();}
  R.setPixelRatio(Math.min(2,devicePixelRatio||1));const scene=new THREE.Scene();const cam=new THREE.PerspectiveCamera(50,1,0.1,1500);
  const dark=matchMedia('(prefers-color-scheme: dark)').matches;const skyTop=dark?'#0B1220':'#CFE0F2',skyLow=dark?'#1A2533':'#F4F7FA',gBase=dark?'#141C27':'#E9EEF3',gMinor=dark?'#1E2A38':'#D3DDE8',gMajor=dark?'#33445A':'#A9BCD0';
  const sk=document.createElement('canvas');sk.width=4;sk.height=256;const skx=sk.getContext('2d');const grd=skx.createLinearGradient(0,0,0,256);grd.addColorStop(0,skyTop);grd.addColorStop(1,skyLow);skx.fillStyle=grd;skx.fillRect(0,0,4,256);
  scene.background=new THREE.CanvasTexture(sk);scene.fog=new THREE.Fog(new THREE.Color(skyLow),140,420);
  const LIGHT=Math.PI;scene.add(new THREE.HemisphereLight(0xffffff,0x8899aa,0.95*LIGHT));const sun=new THREE.DirectionalLight(0xffffff,0.55*LIGHT);sun.position.set(30,80,-40);scene.add(sun);
  const gc=document.createElement('canvas');gc.width=gc.height=512;const gx=gc.getContext('2d');gx.fillStyle=gBase;gx.fillRect(0,0,512,512);
  gx.strokeStyle=gMinor;gx.lineWidth=2;for(let i=0;i<10;i++){gx.beginPath();gx.moveTo(i*51.2,0);gx.lineTo(i*51.2,512);gx.moveTo(0,i*51.2);gx.lineTo(512,i*51.2);gx.stroke();}
  gx.strokeStyle=gMajor;gx.lineWidth=5;gx.strokeRect(0,0,512,512);
  const gt=new THREE.CanvasTexture(gc);gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.repeat.set(80,80);gt.anisotropy=R.capabilities.getMaxAnisotropy();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(800,800),new THREE.MeshLambertMaterial({map:gt}));ground.rotation.x=-Math.PI/2;scene.add(ground);
  function ring(r,col,w){const m=new THREE.Mesh(new THREE.RingGeometry(r-w,r+w,160,1,-0.75,1.5),new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=0.03;scene.add(m);return m;}
  function label(text,x,z,col){const c=document.createElement('canvas');c.width=256;c.height=64;const t=c.getContext('2d');t.font='800 40px Archivo, sans-serif';t.fillStyle=col;t.textAlign='center';t.fillText(text,128,46);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthWrite:false}));s.scale.set(8,2,1);s.position.set(x,1.4,z);scene.add(s);}
  const inkC_=css('--ink')||'#15243A',foldC=css('--fold')||'#D2423A';
  [25,50,75].forEach(r=>{ring(r,css('--faint')||'#9AA6B3',0.12);label(r+' m',r*Math.cos(0.8),r*Math.sin(0.8),inkC_);});ring(GUIN.dist,foldC,0.25);label('record 88.3 m',GUIN.dist*Math.cos(0.8),GUIN.dist*Math.sin(0.8),foldC);
  const stand=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.7,1.6,20),new THREE.MeshLambertMaterial({color:new THREE.Color(dark?'#3A4A5E':'#8A99AB')}));stand.position.y=0.8;scene.add(stand);
  // field-record marker ring (moves when the record does)
  let recRing=null;function setRecordRing(d){if(recRing){scene.remove(recRing);recRing=null;}if(d>2){recRing=ring(d,new THREE.Color(css('--hi')||'#FFE45C'),0.35);}}
  // ---------- orbit camera ----------
  const O={tx:30,ty:0,tz:0,r:70,az:-2.35,el:0.42};const HOME={...O};
  function placeCam(){const x=O.tx+O.r*Math.cos(O.el)*Math.cos(O.az),y=O.ty+O.r*Math.sin(O.el),z=O.tz+O.r*Math.cos(O.el)*Math.sin(O.az);cam.position.set(x,Math.max(0.6,y),z);cam.lookAt(O.tx,O.ty,O.tz);}
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  // Shared context for planes.js and event.js. W.ev is the running event, if any.
  const W={THREE,R,scene,cam,canvas,O,resize,setRecordRing,follow:null,ev:null};
  initPlanes(W);initEvent(W);initPreview(W);
  const ptrs=new Map();let moved=0,pinch0=0;
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);moved=0;if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);}});
  canvas.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const p=ptrs.get(e.pointerId);const dx=e.clientX-p[0],dy=e.clientY-p[1];ptrs.set(e.pointerId,[e.clientX,e.clientY]);moved+=Math.abs(dx)+Math.abs(dy);
    if(W.ev&&W.ev.phase!=='land')return;if(W.ev&&moved>8)W.endEvent();
    if(ptrs.size===1){O.az+=dx*0.006;O.el=Math.max(0.05,Math.min(1.45,O.el+dy*0.005));W.follow=null;}else if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0){O.r=Math.max(3,Math.min(300,O.r*pinch0/d));}pinch0=d;}});
  const up=e=>{if(ptrs.size===1&&moved<8&&!W.ev)W.pick(e);ptrs.delete(e.pointerId);pinch0=0;};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);});
  canvas.addEventListener('wheel',e=>{if(W.ev&&W.ev.phase!=='land')return;e.preventDefault();if(W.ev)W.endEvent();O.r=Math.max(3,Math.min(300,O.r*Math.exp(e.deltaY*0.001)));},{passive:false});
  $('home').onclick=()=>{if(W.ev)W.endEvent();Object.assign(O,HOME);W.follow=null;W.hideCard();};
  addEventListener('resize',resize);resize();let visible=true;new IntersectionObserver(es=>{visible=es[0].isIntersecting;}).observe(canvas);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;let lastNow=performance.now();
  // ---------- frame-time budget ----------
  // If the frame rate stays under BUDGET_FPS (two 2-second windows in a row), draw fewer pixels: step the
  // pixel ratio down towards 1, and switch to light effects (less confetti). It only ever steps down.
  const BUDGET_FPS=45;let fpsN=0,fpsT=0,slow=0;W.lowFx=false;
  function budget(rawDt){if(document.hidden||rawDt>0.5)return;fpsN++;fpsT+=rawDt;if(fpsT<2)return;const fps=fpsN/fpsT;fpsN=0;fpsT=0;
    slow=fps<BUDGET_FPS?slow+1:0;if(slow<2)return;slow=0;W.lowFx=true;const pr=R.getPixelRatio();
    if(pr>1){R.setPixelRatio(Math.max(1,pr-0.5));resize();}}
  function loop(now){requestAnimationFrame(loop);const raw=(now-lastNow)/1000,dt=Math.min(0.05,raw);lastNow=now;if(!visible&&!W.ev)return;budget(raw);
    const flights=W.flights;for(let i=flights.length-1;i>=0;i--){const it=flights[i];const t=(now-it.t0)/1000;const n=it.p.tr.length/4;const tEnd=it.p.tr[4*(n-1)];if(reduce||t>=tEnd){W.rest(it);flights.splice(i,1);W.unpin(it,'flight');continue;}W.poseAt(it,t);}
    W.updateBits(dt);W.previewTick(dt);
    if(W.ev)W.updateEvent(dt);else placeCam();
    W.updatePlanes(dt);R.render(scene,cam);}
  requestAnimationFrame(loop);
  // A photo of a plane on the ground: frame it, render once, copy the frame before the browser clears it.
  W.snapshot=id=>{const it=W.items.get(id);if(!it)return null;const P=it.g?it.g.position:it.pos;
    const pos=cam.position.clone(),q=cam.quaternion.clone(),fov=cam.fov;
    const d=new THREE.Vector3(pos.x-P.x,0,pos.z-P.z);if(d.lengthSq()<1e-6)d.set(-1,0,-1);d.normalize();
    cam.position.set(P.x+d.x*6.5,2.8,P.z+d.z*6.5);cam.lookAt(P.x,0.2,P.z);cam.fov=50;cam.updateProjectionMatrix();
    R.render(scene,cam);const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;c.getContext('2d').drawImage(canvas,0,0);
    cam.position.copy(pos);cam.quaternion.copy(q);cam.fov=fov;cam.updateProjectionMatrix();return c;};
  return{info:()=>({calls:R.info.render.calls,triangles:R.info.render.triangles,planes:W.items.size,pixelRatio:R.getPixelRatio(),lowFx:W.lowFx}),add:W.add,remove:W.remove,focus:W.focus,event:W.event,preview:W.preview,foldUp:W.foldUp,snapshot:W.snapshot,busy:()=>!!W.ev,end:()=>W.endEvent()};}
