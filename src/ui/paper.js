// ===== paper colour =====
import {S,$,PAPERS,PAPER_NAMES} from './state.js';
import {renderGo} from './release.js';

// Paper colour: a fixed palette (there is no free drawing, so nothing on a plane is user-made art).
PAPERS.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.setAttribute('aria-label','paper '+PAPER_NAMES[i].toLowerCase());b.setAttribute('aria-pressed',i===0);
  b.onclick=()=>{S.paper=c;$('papers').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderGo();};$('papers').appendChild(b);});

