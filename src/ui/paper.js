// ===== paper picker =====
// Swatches for the fixed set of papers (papers.js): plain colours and printed patterns.
import {S,$,app} from './state.js';
import {PAPERS,tileCanvas} from './papers.js';
import {renderGo} from './release.js';

const box=$('papers');
function select(id){S.paper=id;box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.paper===id));
  const p=PAPERS.find(q=>q.id===id);$('paperName').textContent=p?p.name:'';renderGo();}
for(const p of PAPERS){const b=document.createElement('button');b.type='button';b.className='swatch';b.dataset.paper=p.id;
  b.title=p.name;b.setAttribute('aria-label','paper '+p.name.toLowerCase());
  // ~2.4 px per mm, so a swatch shows a 20 mm patch at real scale.
  b.style.backgroundColor=p.base;if(p.pattern)b.style.backgroundImage=`url(${tileCanvas(p,96).toDataURL()})`;
  b.onclick=()=>{select(p.id);if(app.audio)app.audio.cue('paper',{pattern:!!p.pattern});};box.appendChild(b);}
select(S.paper);
