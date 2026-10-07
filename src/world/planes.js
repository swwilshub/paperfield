// ===== 3D world: plane meshes, the field batch, resting poses, picking, card and live toast =====
import {$,net,app,SCALE,esc,ago,nm,paperOf,planeLabel} from '../ui/state.js';
import {pieces,thumbnail} from '../ui/shapes.js';
import {TILE_MM,tileCanvas} from '../ui/papers.js';
import {sharePlane,sharePhoto,shareButton} from '../ui/share.js';

export function initPlanes(W){const {THREE,scene,cam,canvas}=W;
  const items=new Map();const flights=[];const blobGeo=new THREE.CircleGeometry(1,24);const blobMat=new THREE.MeshBasicMaterial({color:0x15243a,transparent:true,opacity:0.16,depthWrite:false});
  const ray=new THREE.Raycaster();const group=new THREE.Group();scene.add(group);

  // ---------- one plane's shape ----------
  // Triangles in the plane's own frame: wings on both sides (with tile UVs) and the keel; plus the wing outline.
  function shape(p){const sc=SCALE/1000,dih=p.dih*Math.PI/180;const {wing,keel,len}=pieces(p);const wp=[],wu=[],kp=[],lp=[];
    for(const side of [1,-1])for(const q of wing){const V=q.map(([e,s])=>({v:[(p.sCG-s)*sc,e*Math.sin(dih)*sc,side*e*Math.cos(dih)*sc],u:[side*e/TILE_MM,(len-s)/TILE_MM]}));
      for(let i=1;i<V.length-1;i++)for(const k of [0,i,i+1]){wp.push(...V[k].v);wu.push(...V[k].u);}for(let i=0;i<V.length;i++)lp.push(...V[i].v,...V[(i+1)%V.length].v);}
    for(const q of keel){const V=q.map(([d,s])=>[(p.sCG-s)*sc,-d*sc,0]);for(let i=1;i<V.length-1;i++)kp.push(...V[0],...V[i],...V[i+1]);}
    return{wp,wu,kp,lp};}
  // Materials are shared per paper.
  const mats=new Map(),lineMat=new THREE.LineBasicMaterial({color:0x15243a,transparent:true,opacity:0.28});
  function mat(def,plain){const k=def.id+(plain?':plain':'');if(!mats.has(k))mats.set(k,!plain&&def.pattern?new THREE.MeshLambertMaterial({side:THREE.DoubleSide,map:paperTexture(def)}):new THREE.MeshLambertMaterial({side:THREE.DoubleSide,color:new THREE.Color(def.base)}));return mats.get(k);}
  // The full mesh: patterned wings, outline, keel. Only for planes near the camera, flying or in an event.
  function buildMesh(it){const p=it.p,{wp,wu,kp,lp}=it.shape;const g=new THREE.Group();const def=paperOf(p);
    if(wp.length){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(wu,2));geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo,mat(def)));const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));g.add(new THREE.LineSegments(lg,lineMat));}
    if(kp.length){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(kp,3));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,mat(def,true)));}
    g.rotation.order='YZX';g.traverse(o=>{o.userData.pid=p.id;});return g;}
  // One shared texture per patterned paper; wing UVs are in tiles (TILE_MM), so the pattern is real size.
  const texCache=new Map();
  function paperTexture(def){if(texCache.has(def.id))return texCache.get(def.id);
    const t=new THREE.CanvasTexture(tileCanvas(def,256));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=W.R.capabilities.getMaxAnisotropy();
    texCache.set(def.id,t);return t;}
  // A paper's colour from a distance: its base, or the average of its pattern.
  const avgCache=new Map();
  function avgColour(def){if(avgCache.has(def.id))return avgCache.get(def.id);let c=new THREE.Color(def.base);
    if(def.pattern)try{const d=tileCanvas(def,32).getContext('2d').getImageData(0,0,32,32).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}const n=d.length/4;c=new THREE.Color(r/n/255,g/n/255,b/n/255);}catch(e){}
    avgCache.set(def.id,c);return c;}

  // ---------- the field batch ----------
  // Resting planes away from the camera are one mesh (their real shapes, coloured by paper) and their
  // shadows one instanced mesh, so a field of 1 500 planes is two draw calls. Each plane owns a fixed
  // run of the batch's vertices and one shadow instance; hiding it collapses them, showing writes them.
  const B={cap:0,used:0,geo:null,mesh:null,owner:[],dirty:null,blobs:null,blobCap:0,blobUsed:0,blobDirty:false};
  const batchMat=new THREE.MeshLambertMaterial({side:THREE.DoubleSide,vertexColors:true});
  function growBatch(need){if(B.cap>=need)return;let cap=Math.max(4096,B.cap);while(cap<need)cap*=2;
    const geo=new THREE.BufferGeometry();for(const [k,n] of [['position',3],['normal',3],['color',3]]){const a=new Float32Array(cap*n);if(B.geo)a.set(B.geo.attributes[k].array);const at=new THREE.BufferAttribute(a,n);at.setUsage(THREE.DynamicDrawUsage);geo.setAttribute(k,at);}
    geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1000);geo.setDrawRange(0,B.used);
    if(B.mesh){B.geo.dispose();B.mesh.geometry=geo;}else{B.mesh=new THREE.Mesh(geo,batchMat);B.mesh.frustumCulled=false;B.mesh.userData.batch=true;scene.add(B.mesh);}
    B.geo=geo;B.cap=cap;B.dirty=[0,B.used];}
  function growBlobs(need){if(B.blobCap>=need)return;let cap=Math.max(512,B.blobCap);while(cap<need)cap*=2;
    const m=new THREE.InstancedMesh(blobGeo,blobMat,cap);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.renderOrder=-1;
    if(B.blobs){for(let i=0;i<B.blobUsed;i++){B.blobs.getMatrixAt(i,tmpM);m.setMatrixAt(i,tmpM);}scene.remove(B.blobs);B.blobs.dispose();}
    m.count=B.blobUsed;scene.add(m);B.blobs=m;B.blobCap=cap;B.blobDirty=true;}
  const tmpM=new THREE.Matrix4(),tmpE=new THREE.Vector3(),tmpO=new THREE.Object3D(),va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3(),nrm=new THREE.Vector3(),ZERO=new THREE.Matrix4().makeScale(0,0,0);
  function markDirty(a,b){B.dirty=B.dirty?[Math.min(B.dirty[0],a),Math.max(B.dirty[1],b)]:[a,b];}
  // The plane resting where it landed (the same pose rest() gives a full mesh).
  function restPose(p,o){const h=p.heading*Math.PI/180;o.position.set(p.dist*Math.cos(h),0.25,p.dist*Math.sin(h));o.rotation.order='YZX';o.rotation.set(p.roll*Math.PI/180,-h,-0.12);o.scale.set(1,1,1);o.updateMatrix();return o;}
  function addToBatch(it){const {wp,kp}=it.shape;const n=(wp.length+kp.length)/3;growBatch(B.used+n);it.slot=[B.used,n];
    for(let t=0;t<n/3;t++)B.owner[B.used/3+t]=it;B.used+=n;B.geo.setDrawRange(0,B.used);
    growBlobs(B.blobUsed+1);it.blob=B.blobUsed++;B.blobs.count=B.blobUsed;}
  // Write the plane into its slot, or collapse the slot (hidden: flying, close up, or removed).
  function writeSlot(it,show){const [s,n]=it.slot;const P=B.geo.attributes.position.array,N=B.geo.attributes.normal.array,C=B.geo.attributes.color.array;
    if(!show){P.fill(0,s*3,(s+n)*3);}else{const M=restPose(it.p,tmpO).matrix,col=avgColour(paperOf(it.p)),src=it.shape.wp.concat(it.shape.kp);
      for(let v=0;v<n;v+=3){va.fromArray(src,v*3).applyMatrix4(M);vb.fromArray(src,v*3+3).applyMatrix4(M);vc.fromArray(src,v*3+6).applyMatrix4(M);
        nrm.subVectors(vc,vb).cross(tmpE.subVectors(va,vb)).normalize();   // as computeVertexNormals: (c−b)×(a−b)
        for(const [k,q] of [[0,va],[1,vb],[2,vc]]){const o=(s+v+k)*3;P[o]=q.x;P[o+1]=q.y;P[o+2]=q.z;N[o]=nrm.x;N[o+1]=nrm.y;N[o+2]=nrm.z;C[o]=col.r;C[o+1]=col.g;C[o+2]=col.b;}}}
    markDirty(s,s+n);}
  function writeBlob(it,show){if(show){const p=it.p,h=p.heading*Math.PI/180;tmpO.position.set(p.dist*Math.cos(h),0.04,p.dist*Math.sin(h));tmpO.rotation.set(-Math.PI/2,0,0);tmpO.scale.set(1.6,1.1,1);tmpO.updateMatrix();B.blobs.setMatrixAt(it.blob,tmpO.matrix);}
    else B.blobs.setMatrixAt(it.blob,ZERO);B.blobDirty=true;}
  // Upload only what changed, once a frame.
  function flushBatch(){if(B.dirty&&B.geo){const [a,b]=B.dirty;for(const k of ['position','normal','color']){const at=B.geo.attributes[k];at.clearUpdateRanges();at.addUpdateRange(a*3,(b-a)*3);at.needsUpdate=true;}B.dirty=null;}
    if(B.blobDirty&&B.blobs){B.blobs.instanceMatrix.needsUpdate=true;B.blobDirty=false;}}

  // ---------- which planes get a full mesh ----------
  // Pinned (flying, in an event) or among the NEAR planes nearest the camera (within NEAR_M metres),
  // so the front of the field keeps its patterns and outlines.
  const NEAR=40,NEAR_M=80;
  function sync(it){const full=it.pins.size>0||it.near;
    if(full&&!it.g){it.g=buildMesh(it);group.add(it.g);if(it.resting)restPose(it.p,it.g);}
    if(!full&&it.g){group.remove(it.g);it.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});it.g=null;}
    const inBatch=it.resting&&!it.g;if(inBatch!==it.inBatch){it.inBatch=inBatch;writeSlot(it,inBatch);}
    const blob=it.resting;if(blob!==it.blobOn){it.blobOn=blob;writeBlob(it,blob);}}
  function pin(it,why){it.pins.add(why);sync(it);}
  function unpin(it,why){if(it.pins.delete(why))sync(it);}
  let nearT=0;const lastCam=new THREE.Vector3(1e9,0,0);
  function updateNear(dt){nearT-=dt;if(nearT>0&&cam.position.distanceToSquared(lastCam)<1)return;nearT=0.3;lastCam.copy(cam.position);
    const cand=[];for(const it of items.values()){if(!it.resting)continue;const d=cam.position.distanceToSquared(it.pos);if(d<NEAR_M*NEAR_M)cand.push([d,it]);}
    cand.sort((a,b)=>a[0]-b[0]);const want=new Set(cand.slice(0,NEAR).map(c=>c[1]));
    for(const it of items.values()){const n=want.has(it);if(n!==!!it.near){it.near=n;sync(it);}}}
  W.updatePlanes=dt=>{updateNear(dt);flushBatch();};

  function trAt(p,i){const a=p.tr;return[a[4*i],a[4*i+1],a[4*i+2],a[4*i+3]];}
  function sample(p,t){const n=p.tr.length/4;let i=0;while(i<n-2&&p.tr[4*(i+1)]<=t)i++;const a=trAt(p,i),b=trAt(p,Math.min(n-1,i+1));const f=b[0]>a[0]?Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))):1;
    return[a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2]),a[3]+f*(b[3]-a[3])];}
  // Flying: the plane leaves the ground (and the batch); it must be pinned so it has a full mesh.
  function setPose(it,x,z,th){if(it.resting){it.resting=false;sync(it);}if(!it.g)pin(it,'pose');const h=it.p.heading*Math.PI/180;it.g.position.set(x*Math.cos(h),z+0.15,x*Math.sin(h));it.g.rotation.set(0,-h,th);}
  function poseAt(it,t){const s=sample(it.p,t);setPose(it,s[0],s[1],s[2]);return s[0];}
  function rest(it){it.resting=true;it.pins.delete('pose');if(it.g)restPose(it.p,it.g);sync(it);}
  function add(p,mode){if(items.has(p.id))return items.get(p.id);let sh;try{sh=shape(p);}catch(e){return null;}
    const it={p,shape:sh,g:null,pins:new Set(),near:false,resting:false,inBatch:false,blobOn:false,pos:restPose(p,tmpO).position.clone()};items.set(p.id,it);addToBatch(it);
    if(mode==='live'){it.t0=performance.now();pin(it,'flight');flights.push(it);liveToast(it);}else if(mode==='event')pin(it,'event');else rest(it);return it;}
  function remove(id){const it=items.get(id);if(!it)return;it.pins.clear();it.near=false;it.resting=false;sync(it);items.delete(id);
    for(let t=it.slot[0]/3;t<(it.slot[0]+it.slot[1])/3;t++)B.owner[t]=null;const i=flights.indexOf(it);if(i>=0)flights.splice(i,1);}
  function focus(id){const it=items.get(id);if(!it)return;if(W.ev)W.endEvent();const O=W.O;O.tx=it.pos.x;O.tz=it.pos.z;O.ty=0;O.r=8;O.el=0.55;W.follow=null;showCard(it.p);}
  function pick(e){const r=canvas.getBoundingClientRect();const v=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(v,cam);const hit=ray.intersectObjects([group,B.mesh].filter(Boolean),true)[0];
    const owner=hit&&(hit.object.userData.batch?(B.owner[hit.faceIndex]||{}).p:{id:hit.object.userData.pid});
    const p=owner&&owner.id&&net.planes.get(owner.id);if(p)showCard(p);else hideCard();}
  function showCard(p){app.audio.cue('card',{dist:p.dist});const c=$('card');c.style.display='flex';c.innerHTML=`<button class="x" aria-label="Close">×</button><img alt="" src="${thumbnail(p)}"><div><b>${esc(planeLabel(p))}</b><div class="sub" style="font-size:13px">by ${esc(nm(p.pid))}, ${ago(p.at)}</div>
     <div class="num" style="font-size:14px;font-weight:700;margin-top:4px">${p.dist} m · ${p.time} s · ${p.maxZ} m high${p.loops?` · ${p.loops} loop${p.loops>1?'s':''}`:''}</div><div class="cardBtns"><button class="btn" data-act="watch" type="button">Watch the throw</button>${p.unsaved?'':'<button class="btn" data-act="share" type="button">Share</button>'}<button class="btn" data-act="photo" type="button">Photo</button></div></div>`;
    c.querySelector('.x').onclick=hideCard;c.querySelector('[data-act="watch"]').onclick=()=>{app.audio.unlock();hideCard();W.event(p,{countdown:false});};
    const sh=c.querySelector('[data-act="share"]');if(sh)shareButton(sh,()=>sharePlane(p));shareButton(c.querySelector('[data-act="photo"]'),()=>sharePhoto(p));}
  function hideCard(){$('card').style.display='none';}
  let toastT=null;function liveToast(it){app.audio.cue('arrival');const t=$('toast');t.innerHTML=`<b>${esc(nm(it.p.pid))}</b> just threw <b>${esc(planeLabel(it.p))}</b> <button class="btn" type="button">Watch</button>`;t.hidden=false;
    t.querySelector('button').onclick=()=>{app.audio.unlock();t.hidden=true;const i=flights.indexOf(it);if(i>=0)flights.splice(i,1);unpin(it,'flight');W.event(it.p,{countdown:false});};clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},12000);}
  Object.assign(W,{items,flights,group,sample,setPose,poseAt,rest,add,remove,pin,unpin,focus,pick,showCard,hideCard,paperTexture});}
