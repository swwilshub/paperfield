// ===== 3D world: your plane up close =====
// A rig attached to the camera, so it stays in front of you. On the Release screen it shows your
// plane turning slowly above the sheet. When you release, a flat sheet appears and folds up for
// real (each crease in order, then the centre and wing folds), turns to flying position, and
// hands over to the throw.
import {$,app,reduceMotion,SCALE} from '../ui/state.js';
import {paperDef,TILE_MM} from '../ui/papers.js';
import {replay,unmap,creasePoint,plan,planePoint} from './foldanim.js';

const ease=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

export function initPreview(W){const {THREE,cam,scene}=W;
  scene.add(cam);   // children of the camera only render if the camera is in the scene
  const root=new THREE.Group();root.visible=false;cam.add(root);
  // root (follows the camera) → tilt (a turntable leaning towards you) → spin (turns on the table) → rig (the paper).
  const tilt=new THREE.Group(),spin=new THREE.Group(),rig=new THREE.Group();root.add(tilt);tilt.add(spin);spin.add(rig);
  // A soft halo behind the plane, so pale papers stand out against the pale field.
  const halo=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(21,36,58,.22)');g.addColorStop(0.6,'rgba(21,36,58,.1)');g.addColorStop(1,'rgba(21,36,58,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));m.position.z=-1.6;m.renderOrder=-1;root.add(m);return m;})();
  const sc=SCALE/1000;let model=null,key='',anim=null;

  // One mesh for the whole sheet; pieces are rebuilt per phase, positions updated per frame.
  function build(spec){
    const def=paperDef(spec.paper),{steps,final}=replay(spec.W,spec.L,spec.folds),pl=plan(spec,final);
    // The field's lights are bright enough to wash pale paper out to white, so the paper's own colour is
    // toned down a little, with a touch of self-light so flaps folded over (seen from behind) don't go grey.
    const tex=def.pattern?W.paperTexture(def):null,base=tex?new THREE.Color(1,1,1):new THREE.Color(def.base);
    const mat=new THREE.MeshLambertMaterial({map:tex,emissiveMap:tex,color:base.clone().multiplyScalar(0.62),emissive:base.clone().multiplyScalar(0.22),side:THREE.DoubleSide});
    const geo=new THREE.BufferGeometry();const mesh=new THREE.Mesh(geo,mat);rig.add(mesh);
    const yMid=(spec.yMin+spec.yTip)/2;
    // Lay out a phase: a list of pieces, each a fan of triangles with UVs from the flat sheet.
    let cur=null;
    function phase(pieces,id){if(id===cur)return pieces;cur=id;let n=0;for(const pc of pieces)n+=(pc.pts.length-2)*3;
      const pos=new Float32Array(n*3),uv=new Float32Array(n*2);let i=0;
      for(const pc of pieces)for(let k=1;k<pc.pts.length-1;k++)for(const j of [0,k,k+1]){const o=unmap(pc.M,pc.pts[j]);uv[i*2]=o[0]/TILE_MM;uv[i*2+1]=o[1]/TILE_MM;i++;}
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));return pieces;}
    function write(pieces,f){const pos=geo.attributes.position.array;let i=0;
      for(const pc of pieces)for(let k=1;k<pc.pts.length-1;k++)for(const j of [0,k,k+1]){const v=f(pc.pts[j],pc);pos[i++]=v[0]*sc;pos[i++]=v[1]*sc;pos[i++]=v[2]*sc;}
      geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();}
    // Each crease step: the paper that stays lies flat, the flap rotates over the crease.
    const sheet=(x,y,z)=>[x-spec.W/2,y-yMid,z];
    function crease(i,theta){const st=steps[i];phase(st.stay.concat(st.mv),'crease'+i);const moving=new Set(st.mv);
      write(st.stay.concat(st.mv),(p,pc)=>moving.has(pc)?sheet(...creasePoint(p,st,theta,pc.layer)):sheet(p[0],p[1],pc.layer*0.12));}
    function plane(t){phase(pl.pieces,'plane');write(pl.pieces,(p,pc)=>{const q=planePoint(p,pc,t,pl,spec.dih);return[q[0],p[1]-yMid,q[2]];});}
    return{mesh,steps:steps.length,crease,plane,len:spec.yTip-spec.yMin,full:Math.max(spec.W,spec.L),
      dispose(){rig.remove(mesh);geo.dispose();mat.dispose();}};}
  function use(spec){const k=JSON.stringify(spec);if(k===key&&model)return model;if(model)model.dispose();key=k;model=build(spec);return model;}

  // Keep the rig in the free space above the sheet (or centred when no sheet is open), sized to fit.
  // It glides there (the sheet closing on Release would otherwise make it jump); `snap` places it at once.
  function place(dt,snap){const vh=innerHeight,top=60;const sheet=$('designer');const bottom=sheet&&!sheet.hidden?sheet.getBoundingClientRect().top:vh*0.8;
    const d=6,half=d*Math.tan(cam.fov*Math.PI/360);const mid=(top+bottom)/2,ndc=1-2*mid/vh;
    const avail=(bottom-top)/vh*2*half;const L=(model?(anim&&anim.flat?model.full:model.len):297)*sc;const scale=Math.max(0.3,Math.min(1.4,0.8*avail/L));
    const k=snap?1:1-Math.exp(-dt*6);root.position.x=0;root.position.z=-d;root.position.y+=(ndc*half-root.position.y)*k;
    root.scale.setScalar(root.scale.x+(scale-root.scale.x)*k);halo.scale.setScalar(L*1.5);}

  // Turntable pose: the plane lies flat (rig) on a table leaning towards you (tilt) and turns on it (spin).
  const FLAT=-Math.PI/2,TILT=0.6;
  function show(spec){anim=null;tilt.position.y=0;if(!spec){root.visible=false;return;}const m=use(spec);m.plane(1);fade(m,1);
    const was=root.visible;rig.rotation.set(FLAT,0,0);tilt.rotation.set(TILT,0,0);if(!was)spin.rotation.set(0,0.8,0);root.visible=true;place(0,!was);}

  // The fold-up: resolves when the plane is ready to throw. The spinning plane FADEs away, a fresh flat sheet
  // slides IN, each CREASE folds, the PLANE folds, it TURNs onto the turntable and HOLDs, then the throw.
  function fade(m,o){const mt=m.mesh.material,tr=o<1;if(mt.transparent!==tr){mt.transparent=tr;mt.depthWrite=!tr;mt.needsUpdate=true;}mt.opacity=o;}
  function foldUp(spec){if(reduceMotion||!spec)return Promise.resolve();const m=use(spec);const shown=root.visible;root.visible=true;
    if(!shown){m.plane(1);rig.rotation.set(FLAT,0,0);tilt.rotation.set(TILT,0,0);spin.rotation.set(0,0,0);place(0,true);}
    const T={FADE:shown?0.45:0,IN:0.45,CREASE:0.55,PLANE:1.5,TURN:0.9,HOLD:0.5};
    const total=T.FADE+T.IN+m.steps*T.CREASE+T.PLANE+T.TURN+T.HOLD;
    return new Promise(res=>{anim={t:0,total,m,res,lastStep:-1,T,flat:false,swapped:false};});}
  function tickFold(dt){const a=anim,m=a.m,T=a.T;a.t+=dt;let t=a.t;
    // The plane on the turntable fades away, still turning.
    if(t<T.FADE){fade(m,1-ease(t/T.FADE));spin.rotation.y+=dt*0.5;return;}
    t-=T.FADE;
    // A new, flat sheet: facing you, sized for the whole sheet, sliding up into place as it fades in.
    if(!a.swapped){a.swapped=true;a.flat=true;if(m.steps)m.crease(0,0);else m.plane(0);rig.rotation.set(0,0,0);tilt.rotation.set(0,0,0);spin.rotation.set(0,0,0);place(0,true);}
    if(t<T.IN){const e=ease(t/T.IN);fade(m,e);tilt.position.y=-0.25*(1-e)*m.full*sc;return;}
    tilt.position.y=0;fade(m,1);t-=T.IN;
    if(t<m.steps*T.CREASE){const i=Math.floor(t/T.CREASE);if(i!==a.lastStep){a.lastStep=i;app.audio&&app.audio.cue('crease',{n:i});}m.crease(i,Math.PI*ease((t-i*T.CREASE)/T.CREASE));return;}
    t-=m.steps*T.CREASE;
    if(t<T.PLANE){if(a.lastStep!==-2){a.lastStep=-2;app.audio&&app.audio.cue('step');}m.plane(ease(t/T.PLANE));return;}
    t-=T.PLANE;m.plane(1);a.flat=false;
    // Settle onto the turntable, then turn a little before the throw.
    if(t<T.TURN){const e=ease(t/T.TURN);rig.rotation.x=FLAT*e;tilt.rotation.x=TILT*e;return;}
    rig.rotation.x=FLAT;tilt.rotation.x=TILT;spin.rotation.y+=0.8*dt;if(a.t>=a.total){anim=null;root.visible=false;a.res();}}

  W.previewTick=dt=>{if(!root.visible)return;place(dt);if(anim)tickFold(dt);else if(!reduceMotion)spin.rotation.y+=dt*0.5;};
  Object.assign(W,{preview:show,foldUp});}
