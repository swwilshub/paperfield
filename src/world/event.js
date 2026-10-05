// ===== 3D world: a throw as an event (countdown, flight cam, landing, confetti) =====
import {$,app,GUIN,css,esc,nm,paperOf,planeLabel,reduceMotion as reduce} from '../ui/state.js';

export function initEvent(W){const {THREE,scene,cam}=W;const audio=app.audio;
  const wrap=$('worldWrap');W.ev=null;const penC=css('--pen')||'#2D63C8';
  const trailMax=3000;const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(trailMax*3),3));trailGeo.setDrawRange(0,0);
  const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:new THREE.Color(penC),transparent:true,opacity:0.85}));trail.frustumCulled=false;scene.add(trail);let trailN=0;
  function trailPush(v){if(trailN>=trailMax)return;trailGeo.attributes.position.setXYZ(trailN++,v.x,v.y,v.z);trailGeo.attributes.position.needsUpdate=true;trailGeo.setDrawRange(0,trailN);}
  const bits=[];const bitGeo=new THREE.PlaneGeometry(0.35,0.25);
  function burst(pos,col){const cols=[col,'#FFFFFF','#FFE45C','#D2423A','#2D63C8','#CDE7FF'];for(let i=0;i<46;i++){const m=new THREE.Mesh(bitGeo,new THREE.MeshBasicMaterial({color:new THREE.Color(cols[i%cols.length]),side:THREE.DoubleSide,transparent:true}));
      m.position.copy(pos);const a=Math.random()*Math.PI*2,sp=2+Math.random()*5;bits.push({m,v:new THREE.Vector3(Math.cos(a)*sp,4+Math.random()*6,Math.sin(a)*sp),w:new THREE.Vector3(Math.random()*9,Math.random()*9,Math.random()*9),life:2.6});scene.add(m);}}
  function callout(text,big){const c=$('callout');c.textContent=text;c.className=big?'show big':'show';void c.offsetWidth;clearTimeout(c._t);c._t=setTimeout(()=>{c.className='';},big?2600:1600);}
  function event(p,opts){opts=opts||{};W.hideCard();$('toast').hidden=true;let it=W.items.get(p.id);if(!it)it=W.add(p,'event');if(!it){if(opts.onLand)opts.onLand();return;}
    const fi=W.flights.indexOf(it);if(fi>=0)W.flights.splice(fi,1);if(W.ev)endEvent(true);
    trailN=0;trailGeo.setDrawRange(0,0);
    const ms=[25,50,75].map(d=>({d,txt:d+' m'}));if(opts.recordDist&&opts.recordDist>3)ms.push({d:opts.recordDist,txt:'New field record!',big:true});ms.push({d:GUIN.dist,txt:'Past the world record!',big:true});ms.sort((a,b)=>a.d-b.d);
    W.setRecordRing(opts.recordDist||0);
    const ev=W.ev={it,p,phase:opts.countdown?'count':'fly',t:0,sim:0,ms,opts,loopsSeen:0,peakDone:false,prev:null,last:-1,shake:0};
    wrap.classList.add('event');if(app.ui)app.ui.eventMode(true);setTimeout(W.resize,30);$('skip').hidden=false;$('eventInfo').innerHTML=`<b>${esc(planeLabel(p))}</b> by ${esc(nm(p.pid))}`;
    const h=p.heading*Math.PI/180;it.dir=new THREE.Vector3(Math.cos(h),0,Math.sin(h));it.side=new THREE.Vector3(-Math.sin(h),0,Math.cos(h));
    W.setPose(it,0,p.tr[2],p.tr[3]);const P=it.g.position;cam.position.copy(P).addScaledVector(it.dir,-9).addScaledVector(it.side,4).add(new THREE.Vector3(0,3,0));ev.look=P.clone().addScaledVector(it.dir,3).add(new THREE.Vector3(0,-0.4,0));cam.fov=50;cam.updateProjectionMatrix();
    if(ev.phase==='count'){audio.countdown(p.id);callout('3',true);}else{audio.setSong(p.id);audio.go();}}
  function endEvent(silent){const ev=W.ev;if(!ev)return;const it=ev.it;if(ev.phase!=='land')W.rest(it);const O=W.O;
    const P=it.g.position;const d=cam.position.clone().sub(P);O.tx=P.x;O.ty=0;O.tz=P.z;O.r=Math.max(4,d.length());O.el=Math.max(0.05,Math.asin(Math.max(-1,Math.min(1,d.y/O.r))));O.az=Math.atan2(d.z,d.x);
    cam.fov=50;cam.updateProjectionMatrix();W.ev=null;wrap.classList.remove('event');if(app.ui)app.ui.eventMode(false);setTimeout(W.resize,30);$('skip').hidden=true;$('flightHud').style.display='none';$('callout').className='';$('eventInfo').innerHTML='';$('reveal').hidden=true;audio.idle();if(!silent)W.showCard(it.p);}
  $('skip').onclick=()=>{const ev=W.ev;if(!ev)return;if(ev.phase==='land'){endEvent();return;}land();};
  function land(){const ev=W.ev;const it=ev.it,p=ev.p;W.rest(it);ev.phase='land';ev.t=0;audio.land();if(!reduce)ev.shake=0.45;burst(it.g.position.clone().add(new THREE.Vector3(0,0.4,0)),paperOf(p));
    const far=p.style!=='float';callout(far?p.dist.toFixed(1)+' m':p.time.toFixed(1)+' s',true);
    $('flightHud').innerHTML=`<span class="hb num">${p.dist.toFixed(1)} m</span><span class="num">${p.time.toFixed(1)} s · peak ${p.maxZ.toFixed(1)} m</span>`;
    if(ev.opts.onLand)setTimeout(()=>{if(W.ev&&W.ev.it===it)ev.opts.onLand();},900);}
  function updateEvent(dt){const ev=W.ev;const it=ev.it,p=ev.p;ev.t+=dt;
    if(ev.phase==='count'){const n=3-Math.floor(ev.t);if(n!==ev.last&&n>0){ev.last=n;if(n<3)callout(String(n),true);}
      const bob=Math.sin(ev.t*3)*0.04;W.setPose(it,-0.25+Math.min(0.25,ev.t*0.08),p.tr[2]+bob,p.tr[3]-0.15*Math.sin(Math.min(1,ev.t/3)*Math.PI));
      if(ev.t>=3){ev.phase='fly';ev.t=0;ev.sim=0;audio.go();callout('Go!',true);}
      const P=it.g.position;const want=P.clone().addScaledVector(it.dir,-3.2).addScaledVector(it.side,1.1).add(new THREE.Vector3(0,0.9,0));cam.position.lerp(want,1-Math.exp(-dt*1.4));ev.look.lerp(P.clone().addScaledVector(it.dir,3).add(new THREE.Vector3(0,-0.3,0)),1-Math.exp(-dt*2));cam.lookAt(ev.look);return;}
    if(ev.phase==='fly'){const n=p.tr.length/4,tEnd=p.tr[4*(n-1)];const slow=reduce?1:(ev.sim<0.35?0.3:ev.sim<0.7?0.6:1);ev.sim+=dt*slow;
      if(ev.sim>=tEnd){land();return;}
      const s=W.sample(p,ev.sim);W.setPose(it,s[0],s[1],s[2]);const P=it.g.position;
      const speed=ev.prev?Math.hypot(s[0]-ev.prev[0],s[1]-ev.prev[1])/Math.max(1e-4,dt*slow):0;const vz=ev.prev?(s[1]-ev.prev[1])/Math.max(1e-4,dt*slow):0;ev.prev=s;
      audio.tele.alt=s[1];audio.tele.speed=speed;audio.tele.vz=vz;
      trailPush(P);
      for(const m of ev.ms)if(!m.done&&s[0]>=m.d){m.done=true;callout(m.txt,m.big);audio.chime(m.big);}
      const loops=Math.floor(Math.abs(s[2]-p.tr[3])/(2*Math.PI));if(loops>ev.loopsSeen){ev.loopsSeen=loops;callout(loops>1?`Loop ×${loops}!`:'Loop!',true);audio.chime(true);}
      if(!ev.peakDone&&p.maxZ>3&&s[1]>=p.maxZ-0.08){ev.peakDone=true;callout(`Peak ${p.maxZ.toFixed(1)} m`);audio.chime(false);}
      $('flightHud').style.display='block';$('flightHud').innerHTML=`<span class="hb num">${s[0].toFixed(1)} m</span><span class="num">${ev.sim.toFixed(1)} s · ${s[1].toFixed(1)} m up · ${speed.toFixed(1)} m/s</span>`;
      const want=P.clone().addScaledVector(it.dir,-7).addScaledVector(it.side,2.6).add(new THREE.Vector3(0,2.2+Math.max(0,s[1])*0.15,0));if(want.y<0.6)want.y=0.6;
      cam.position.lerp(want,1-Math.exp(-dt*(ev.sim<0.7?6:3)));ev.look.lerp(P.clone().addScaledVector(it.dir,2.5),1-Math.exp(-dt*6));cam.lookAt(ev.look);
      const fov=50+Math.min(16,speed*0.7);cam.fov+=(fov-cam.fov)*(1-Math.exp(-dt*2));cam.updateProjectionMatrix();return;}
    if(ev.phase==='land'){const P=it.g.position;const ang=ev.t*0.22;const want=P.clone().addScaledVector(it.dir,-6*Math.cos(ang)).addScaledVector(it.side,6*Math.sin(ang)+2).add(new THREE.Vector3(0,3,0));
      cam.position.lerp(want,1-Math.exp(-dt*1.5));ev.look.lerp(P,1-Math.exp(-dt*3));cam.lookAt(ev.look);cam.fov+=(50-cam.fov)*(1-Math.exp(-dt*2));cam.updateProjectionMatrix();
      if(ev.shake>0){ev.shake-=dt;const k=ev.shake*0.5;cam.position.x+=(Math.random()-0.5)*k;cam.position.y+=(Math.random()-0.5)*k;}
      if(ev.t>25&&$('reveal').hidden)endEvent();}}
  function updateBits(dt){for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.life-=dt;b.v.y-=9.81*dt*0.35;b.v.multiplyScalar(1-dt*1.2);b.m.position.addScaledVector(b.v,dt);if(b.m.position.y<0.05){b.m.position.y=0.05;b.v.set(0,0,0);}
      b.m.rotation.x+=b.w.x*dt;b.m.rotation.y+=b.w.y*dt;b.m.material.opacity=Math.min(1,b.life);if(b.life<=0){scene.remove(b.m);b.m.material.dispose();bits.splice(i,1);}}}
  Object.assign(W,{event,endEvent,updateEvent,updateBits});}
