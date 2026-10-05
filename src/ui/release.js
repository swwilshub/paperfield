// ===== release =====
import {S,$,net,app,HOUR,GUIN,esc,spec,reduceMotion,planeLabel} from './state.js';
import {throwPlane,mulberry,hashStr} from '../core/thrower.js';
import {geometry} from '../core/geometry.js';
import {renderBoard,updateMe} from './board.js';

export function myPilot(){return net.uid?net.pilots[net.uid]:null;}
export function cooldown(){const p=myPilot();if(!p||!p.last)return 0;return Math.max(0,p.last+HOUR-Date.now());}
export function fmtWait(ms){const m=Math.ceil(ms/60000);return m>=60?'1 h':m+' min';}
export function renderGo(){const cd=cooldown();const G=geometry(spec(),2);
  $('goTitle').textContent=planeLabel(S)+(G.noWing?' (no wings)':'');
  let hint='';if(net.canWrite===false)hint='You can watch the field but not add to it. You can still throw a plane here; it won\'t be saved.';
  else if(!net.store)hint='Not connected to the shared field, so this plane will fly here but won\'t be saved.';
  else if(cd>0&&net.limit)hint=`Your next plane is ready in ${fmtWait(cd)}. Keep folding; it'll be waiting.`;
  else if(net.mode==='local')hint='Playing locally: your planes are saved in this browser only.';
  $('goHint').textContent=hint;$('release').disabled=cd>0&&limited();}
function limited(){return !!net.store&&net.canWrite!==false&&net.limit;}
setInterval(()=>{if(!document.querySelector('[data-panel="go"]').hidden)renderGo();updateMe();},15000);
$('release').addEventListener('click',release);
export function records(excludeId){const R={dist:null,time:null,maxZ:null,loops:null};for(const p of net.planes.values()){if(p.id===excludeId)continue;for(const k in R)if(!R[k]||p[k]>R[k][k])R[k]=p;}return R;}
let releasing=false;
async function release(){app.audio.unlock();if(releasing||(cooldown()>0&&limited()))return;releasing=true;$('release').disabled=true;try{await doRelease();}finally{releasing=false;renderGo();}}
async function doRelease(){$('busy').style.display='grid';await new Promise(r=>setTimeout(r,60));
  const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);const sp=spec();let R;
  try{R=throwPlane(sp,id);}catch(e){$('busy').style.display='none';$('goHint').textContent='Something went wrong simulating that plane: '+e.message;return;}
  const G=R.G,o=R.throws[R.official];const rnd=mulberry(hashStr(id+'pose'));
  const tr=o.r.tr;const step=Math.max(1,Math.ceil(tr.length/220));const flat=[];for(let i=0;i<tr.length;i+=step){const q=tr[i];flat.push(Math.round(q[0]*100)/100,Math.round(q[1]*100)/100,Math.round(q[2]*100)/100,Math.round(q[3]*1000)/1000);}
  const q=tr[tr.length-1];if((tr.length-1)%step){flat.push(Math.round(q[0]*100)/100,Math.round(q[1]*100)/100,Math.round(q[2]*100)/100,Math.round(q[3]*1000)/1000);}
  const res={dist:Math.round(o.r.dist*10)/10,time:Math.round(o.r.time*10)/10,maxZ:Math.round(o.r.maxZ*10)/10,loops:o.r.loops};
  // points
  const rec=records(null);const me=myPilot()||{};const pts=[['Distance',Math.round(res.dist)],['Hang time',Math.round(3*res.time)]];
  if(res.dist>(me.pbDist||0)&&me.planes)pts.push(['Personal best distance',20]);if(res.time>(me.pbTime||0)&&me.planes)pts.push(['Personal best hang time',20]);
  if(!rec.dist||res.dist>rec.dist.dist)pts.push(['Field record: farthest',100]);if(!rec.time||res.time>rec.time.time)pts.push(['Field record: longest aloft',100]);
  if(!rec.maxZ||res.maxZ>rec.maxZ.maxZ)pts.push(['Field record: highest',100]);if(res.loops>0&&(!rec.loops||res.loops>rec.loops.loops))pts.push(['Field record: most loops',50]);
  if(res.dist>GUIN.dist)pts.push(['Beat the Guinness distance record',500]);if(res.time>GUIN.time)pts.push(['Beat the Guinness time record',500]);
  const total=pts.reduce((s,p)=>s+p[1],0);
  const doc=Object.assign({uid:net.uid||'local',at:Date.now(),W:S.W,L:S.L,folds:S.folds,hT:S.hT,hN:S.hN,dih:S.dih,delta:S.elev,style:S.style,gsm:S.gsm,paper:S.paper,
    heading:Math.round((rnd()*70-35)*10)/10,roll:Math.round((rnd()<0.5?-1:1)*(55+rnd()*25)),tr:flat,points:total,
    throws:R.throws.map(t=>[Math.round(t.r.dist*10)/10,Math.round(t.r.time*10)/10]),official:R.official,V:Math.round(o.L.V*10)/10,gamma:Math.round(o.L.gamma*10)/10,
    semi:Math.round(G.semi*10)/10,yTip:Math.round(G.yTip*10)/10,yMin:Math.round(G.yMin*10)/10,sCG:Math.round(G.sCG*10)/10,SM:Math.round(G.SM*1000)/1000,Vcap:Math.round(R.aero.Vcap*10)/10},res);
  let saved=false,saveErr='';
  if(net.store&&net.uid&&net.canWrite!==false){try{
      const body={score:(me.score||0)+total,planes:(me.planes||0)+1,last:doc.at,pbDist:Math.max(me.pbDist||0,res.dist),pbTime:Math.max(me.pbTime||0,res.time)};
      await net.store.savePlane(id,doc,body);net.pilots[net.uid]=Object.assign({},net.pilots[net.uid],body);saved=true;}
    catch(e){const c=e&&e.code;saveErr=c==='quota_exceeded'?(net.mode==='local'?'This browser\'s storage is full, so this plane could not be saved.':'The field is full, so this plane could not be saved.'):c==='permission_denied'?'You don\'t have permission to add planes here.':c==='cooldown'?'Your next plane isn\'t ready yet, so this one wasn\'t saved.':'Saving failed ('+(c||'error')+').';if(c==='permission_denied')net.canWrite=false;}}
  $('busy').style.display='none';
  const p=Object.assign({id,pid:net.uid||'local'},doc);
  $('result').innerHTML='<p class="sub">Watch the field.</p>';
  $('worldWrap').scrollIntoView({behavior:'smooth',block:'start'});await new Promise(r=>setTimeout(r,650));
  const recordDist=rec.dist?rec.dist.dist:0;net.planes.set(id,p);
  app.world.event(p,{countdown:true,recordDist,onLand:()=>{renderResult(p,pts,total,saved,saveErr,R);renderBoard();updateMe();renderGo();reveal(p,pts,total);}});}
export function reveal(p,pts,total){const el=$('reveal');const far=p.style!=='float';el.hidden=false;
  el.innerHTML=`<div class="rv-head"><div class="rv-name">${esc(planeLabel(p))}</div><div class="big num">${far?p.dist.toFixed(1):p.time.toFixed(1)}<span class="unit">${far?'m':'s'}</span></div>
   <div class="sub">${far?`${p.time.toFixed(1)} s in the air`:`${p.dist.toFixed(1)} m forward`} · peak ${p.maxZ.toFixed(1)} m${p.loops?` · ${p.loops} loop${p.loops>1?'s':''}`:''}</div></div>
   <table class="rv-t"><tbody></tbody></table><div class="rv-total num">0</div><div class="btns" style="justify-content:center"><button class="btn primary" type="button" id="rvClose">Back to the field</button></div>`;
  const tb=el.querySelector('tbody');let i=0,run=0;const tot=el.querySelector('.rv-total');
  const next=()=>{if(el.hidden)return;if(i<pts.length){const q=pts[i];tb.insertAdjacentHTML('beforeend',`<tr class="${q[1]>=100?'rec':''}"><td>${esc(q[0])}</td><td class="r">+${q[1]}</td></tr>`);run+=q[1];tot.textContent=run+' points';app.audio.blip(i);i++;setTimeout(next,reduceMotion?60:420);}
    else{tot.classList.add('done');app.audio.total();}};
  setTimeout(next,500);el.querySelector('#rvClose').onclick=()=>{el.hidden=true;app.world.end();};}
export function renderResult(p,pts,total,saved,err,R){const far=p.style!=='float';
  $('result').innerHTML=`<div class="big num">${far?p.dist.toFixed(1):p.time.toFixed(1)}<span class="unit">${far?'m':'s'}</span></div>
   <p class="sub" style="margin-top:4px">${esc(planeLabel(p))} ${far?`stayed up ${p.time.toFixed(1)} s`:`flew ${p.dist.toFixed(1)} m`}, climbed to ${p.maxZ.toFixed(1)} m${p.loops?`, looped ${p.loops} time${p.loops>1?'s':''}`:''}. Thrown at ${p.V} m/s, ${p.gamma}° ${p.gamma<0?'down':'up'}.</p>
   <div class="throws">${p.throws.map((t,i)=>`<div class="${i===p.official?'off':''}">Throw ${i+1}<br><b class="num">${t[0]} m · ${t[1]} s</b></div>`).join('')}</div>
   <table style="margin-top:10px"><tbody>${pts.map(q=>`<tr><td>${q[0]}</td><td class="r">+${q[1]}</td></tr>`).join('')}<tr><td><b>Points</b></td><td class="r">${total}</td></tr></tbody></table>
   <p class="sub" style="margin-top:8px">${saved?(net.mode==='local'?'Saved in this browser. Only you can see it here.':'Saved to the field. Everyone can see it now.'):esc(err||'Not saved to the shared field.')}</p>`;}
