// ===== 3D world: plane meshes, resting poses, picking, card and live toast =====
import {$,net,app,SCALE,esc,ago,nm,paperOf,planeLabel} from '../ui/state.js';
import {pieces,thumbnail} from '../ui/shapes.js';
import {TILE_MM,tileCanvas} from '../ui/papers.js';

export function initPlanes(W){const {THREE,scene,cam,canvas}=W;
  const items=new Map();const flights=[];const blobGeo=new THREE.CircleGeometry(1,24);const blobMat=new THREE.MeshBasicMaterial({color:0x15243a,transparent:true,opacity:0.16,depthWrite:false});
  const ray=new THREE.Raycaster();const group=new THREE.Group();scene.add(group);
  function buildMesh(p){const sc=SCALE/1000,dih=p.dih*Math.PI/180;const {wing,keel,len}=pieces(p);const wp=[],wu=[],kp=[],lp=[];
    for(const side of [1,-1])for(const q of wing){const V=q.map(([e,s])=>({v:[(p.sCG-s)*sc,e*Math.sin(dih)*sc,side*e*Math.cos(dih)*sc],u:[side*e/TILE_MM,(len-s)/TILE_MM]}));
      for(let i=1;i<V.length-1;i++)for(const k of [0,i,i+1]){wp.push(...V[k].v);wu.push(...V[k].u);}for(let i=0;i<V.length;i++)lp.push(...V[i].v,...V[(i+1)%V.length].v);}
    for(const q of keel){const V=q.map(([d,s])=>[(p.sCG-s)*sc,-d*sc,0]);for(let i=1;i<V.length-1;i++)kp.push(...V[0],...V[i],...V[i+1]);}
    const g=new THREE.Group();const def=paperOf(p),paper=new THREE.Color(def.base);
    if(wp.length){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(wu,2));geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo,def.pattern?new THREE.MeshLambertMaterial({side:THREE.DoubleSide,map:paperTexture(def)}):new THREE.MeshLambertMaterial({side:THREE.DoubleSide,color:paper})));
      const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));g.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0x15243a,transparent:true,opacity:0.28})));}
    if(kp.length){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(kp,3));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:paper,side:THREE.DoubleSide})));}
    g.rotation.order='YZX';g.traverse(o=>{o.userData.pid=p.id;});return g;}
  // One shared texture per patterned paper; wing UVs are in tiles (TILE_MM), so the pattern is real size.
  const texCache=new Map();
  function paperTexture(def){if(texCache.has(def.id))return texCache.get(def.id);
    const t=new THREE.CanvasTexture(tileCanvas(def,256));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=W.R.capabilities.getMaxAnisotropy();
    texCache.set(def.id,t);return t;}
  function trAt(p,i){const a=p.tr;return[a[4*i],a[4*i+1],a[4*i+2],a[4*i+3]];}
  function sample(p,t){const n=p.tr.length/4;let i=0;while(i<n-2&&p.tr[4*(i+1)]<=t)i++;const a=trAt(p,i),b=trAt(p,Math.min(n-1,i+1));const f=b[0]>a[0]?Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))):1;
    return[a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2]),a[3]+f*(b[3]-a[3])];}
  function setPose(it,x,z,th){const h=it.p.heading*Math.PI/180;it.g.position.set(x*Math.cos(h),z+0.15,x*Math.sin(h));it.g.rotation.set(0,-h,th);if(it.blob)it.blob.visible=false;}
  function poseAt(it,t){const s=sample(it.p,t);setPose(it,s[0],s[1],s[2]);return s[0];}
  function rest(it){const p=it.p,h=p.heading*Math.PI/180;it.g.position.set(p.dist*Math.cos(h),0.25,p.dist*Math.sin(h));it.g.rotation.set(p.roll*Math.PI/180,-h,-0.12);
    if(!it.blob){it.blob=new THREE.Mesh(blobGeo,blobMat);it.blob.rotation.x=-Math.PI/2;it.blob.scale.set(1.6,1.1,1);scene.add(it.blob);}it.blob.position.set(it.g.position.x,0.04,it.g.position.z);it.blob.visible=true;}
  function add(p,mode){if(items.has(p.id))return items.get(p.id);let g;try{g=buildMesh(p);}catch(e){return null;}const it={p,g};items.set(p.id,it);group.add(g);
    if(mode==='live'){it.t0=performance.now();flights.push(it);liveToast(it);}else if(mode!=='event')rest(it);return it;}
  function focus(id){const it=items.get(id);if(!it)return;if(W.ev)W.endEvent();const O=W.O;O.tx=it.g.position.x;O.tz=it.g.position.z;O.ty=0;O.r=8;O.el=0.55;W.follow=null;showCard(it.p);}
  function pick(e){const r=canvas.getBoundingClientRect();const v=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(v,cam);const hit=ray.intersectObjects(group.children,true)[0];
    if(hit&&hit.object.userData.pid){const p=net.planes.get(hit.object.userData.pid);if(p)showCard(p);}else hideCard();}
  function showCard(p){app.audio.cue('card',{dist:p.dist});const c=$('card');c.style.display='flex';c.innerHTML=`<button class="x" aria-label="Close">×</button><img alt="" src="${thumbnail(p)}"><div><b>${esc(planeLabel(p))}</b><div class="sub" style="font-size:13px">by ${esc(nm(p.pid))}, ${ago(p.at)}</div>
     <div class="num" style="font-size:14px;font-weight:700;margin-top:4px">${p.dist} m · ${p.time} s · ${p.maxZ} m high${p.loops?` · ${p.loops} loop${p.loops>1?'s':''}`:''}</div><button class="btn" style="margin-top:6px;padding:5px 10px;font-size:13px" type="button">Watch the throw</button></div>`;
    c.querySelector('.x').onclick=hideCard;c.querySelector('.btn').onclick=()=>{app.audio.unlock();hideCard();W.event(p,{countdown:false});};}
  function hideCard(){$('card').style.display='none';}
  let toastT=null;function liveToast(it){app.audio.cue('arrival');const t=$('toast');t.innerHTML=`<b>${esc(nm(it.p.pid))}</b> just threw <b>${esc(planeLabel(it.p))}</b> <button class="btn" type="button">Watch</button>`;t.hidden=false;
    t.querySelector('button').onclick=()=>{app.audio.unlock();t.hidden=true;const i=flights.indexOf(it);if(i>=0)flights.splice(i,1);W.event(it.p,{countdown:false});};clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},12000);}
  Object.assign(W,{items,flights,group,sample,setPose,poseAt,rest,add,focus,pick,showCard,hideCard});}
