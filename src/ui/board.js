// ===== board & HUD =====
// Names come from the store adapter (nm in state.js); the prototype fetched them from claude.ai profiles.
import {$,net,app,esc,ago,nm,planeLabel} from './state.js';
import {records,myPilot,cooldown,fmtWait} from './release.js';

// A pilot's totals as shown: binned planes (flights the physics can't reproduce) don't count. The stored
// pilot doc keeps them; only planes this browser has loaded and checked can be taken off.
export function shown(id,p){let score=p.score||0,planes=p.planes||0;
  for(const b of net.binned.values())if(b.pid===id){score-=b.points||0;planes--;}
  return{score:Math.max(0,score),planes:Math.max(0,planes)};}
export function renderBoard(){const R=records(null);const cats=[['dist','Farthest',' m'],['time','Longest aloft',' s'],['maxZ','Highest climb',' m'],['loops','Most loops','']];
  $('recs').innerHTML=cats.map(c=>{const p=R[c[0]];return p&&(c[0]!=='loops'||p.loops>0)?`<button class="rec" type="button" data-pl="${esc(p.id)}"><small>${c[1]}</small><div class="v num">${p[c[0]]}${c[2]}</div><small>${esc(planeLabel(p))} by ${esc(nm(p.pid))}</small></button>`:`<div class="rec"><small>${c[1]}</small><div class="v">–</div><small>Not set yet</small></div>`;}).join('');
  $('recs').querySelectorAll('[data-pl]').forEach(b=>b.onclick=()=>{if(app.ui)app.ui.closeSheets();app.world.focus(b.dataset.pl);});
  const ps=Object.entries(net.pilots).map(([id,p])=>[id,shown(id,p)]).filter(([,s])=>s.planes>0).sort((a,b)=>b[1].score-a[1].score).slice(0,25);
  $('pilots').innerHTML=ps.length?ps.map(([id,s])=>`<tr><td>${esc(nm(id))}</td><td class="num">${s.planes}</td><td class="r">${s.score}</td></tr>`).join(''):'<tr><td colspan="3" class="sub">Nobody has thrown yet.</td></tr>';
  const recent=[...net.planes.values()].sort((a,b)=>b.at-a.at).slice(0,3);
  $('ticker').innerHTML=recent.length?recent.map(p=>`<div><b>${esc(nm(p.pid))}</b>: ${esc(planeLabel(p))}, <b class="num">${p.dist} m · ${p.time} s</b> <span class="sub">${ago(p.at)}</span></div>`).join(''):(net.ready?'The field is empty.':'Loading the field…');
  $('empty').hidden=net.planes.size>0||!net.ready;}
export function updateMe(){const p=myPilot();if(!net.store){$('me').textContent=net.ready?'Offline: planes not saved':'Connecting…';return;}
  const cd=net.limit?cooldown():0;$('me').textContent=`${net.mode==='local'?'Local · ':''}${p?shown(net.uid,p).score:0} pts · ${cd>0?'next plane in '+fmtWait(cd):'plane ready'}`;}
