// ===== paper picker: the first step of building =====
// Swatches for the fixed set of papers (papers.js), in two groups: plain colours and patterns.
import {S,$,app} from './state.js';
import {PAPERS,tileCanvas} from './papers.js';
import {renderGo} from './release.js';

function select(id){S.paper=id;$('papers').querySelectorAll('.swatch').forEach(b=>b.setAttribute('aria-pressed',b.dataset.paper===id));
  const p=PAPERS.find(q=>q.id===id);$('paperName').textContent=p?p.name:'';renderGo();}
function swatch(p){const b=document.createElement('button');b.type='button';b.className='swatch';b.dataset.paper=p.id;
  b.title=p.name;b.setAttribute('aria-label','paper '+p.name.toLowerCase());
  // ~2.4 px per mm, so a swatch shows a 20 mm patch at real scale.
  b.style.backgroundColor=p.base;if(p.pattern)b.style.backgroundImage=`url(${tileCanvas(p,96).toDataURL()})`;
  b.onclick=()=>{select(p.id);if(app.audio)app.audio.cue('paper',{pattern:!!p.pattern});};return b;}
for(const p of PAPERS)$(p.pattern?'papersPattern':'papersColour').appendChild(swatch(p));
$('surprise').addEventListener('click',()=>{const others=PAPERS.filter(p=>p.id!==S.paper);const p=others[Math.floor(Math.random()*others.length)];
  select(p.id);const b=$('papers').querySelector(`[data-paper="${CSS.escape(p.id)}"]`);if(b)b.scrollIntoView({block:'nearest',behavior:'smooth'});
  if(app.audio)app.audio.cue('paper',{pattern:!!p.pattern});});
select(S.paper);
