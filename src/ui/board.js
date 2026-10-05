// ===== board & HUD =====
// Names come from the store adapter (nm in state.js); the prototype fetched them from claude.ai profiles.
import {$,net,app,esc,ago,nm,planeLabel} from './state.js';
import {records,myPilot,cooldown,fmtWait} from './release.js';

export function renderBoard(){const R=records(null);const cats=[['dist','Farthest',' m'],['time','Longest aloft',' s'],['maxZ','Highest climb',' m'],['loops','Most loops','']];
  $('recs').innerHTML=cats.map(c=>{const p=R[c[0]];return p&&(c[0]!=='loops'||p.loops>0)?`<button class="rec" type="button" data-pl="${esc(p.id)}"><small>${c[1]}</small><div class="v num">${p[c[0]]}${c[2]}</div><small>${esc(planeLabel(p))} by ${esc(nm(p.pid))}</small></button>`:`<div class="rec"><small>${c[1]}</small><div class="v">–</div><small>Not set yet</small></div>`;}).join('');
  $('recs').querySelectorAll('[data-pl]').forEach(b=>b.onclick=()=>{if(app.ui)app.ui.closeSheets();app.world.focus(b.dataset.pl);});
  const ps=Object.entries(net.pilots).sort((a,b)=>(b[1].score||0)-(a[1].score||0)).slice(0,25);
  $('pilots').innerHTML=ps.length?ps.map(([id,p])=>`<tr><td>${esc(nm(id))}</td><td class="num">${p.planes||0}</td><td class="r">${p.score||0}</td></tr>`).join(''):'<tr><td colspan="3" class="sub">Nobody has thrown yet.</td></tr>';
  const recent=[...net.planes.values()].sort((a,b)=>b.at-a.at).slice(0,3);
  $('ticker').innerHTML=recent.length?recent.map(p=>`<div><b>${esc(nm(p.pid))}</b>: ${esc(planeLabel(p))}, <b class="num">${p.dist} m · ${p.time} s</b> <span class="sub">${ago(p.at)}</span></div>`).join(''):(net.ready?'The field is empty.':'Loading the field…');
  $('empty').hidden=net.planes.size>0||!net.ready;}
export function updateMe(){const p=myPilot();if(!net.store){$('me').textContent=net.ready?'Offline: planes not saved':'Connecting…';return;}
  const cd=net.limit?cooldown():0;$('me').textContent=`${net.mode==='local'?'Local · ':''}${p?p.score||0:0} pts · ${cd>0?'next plane in '+fmtWait(cd):'plane ready'}`;}
