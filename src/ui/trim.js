// ===== trim =====
import {S,$,PAPERS,PAPER_NAMES} from './state.js';

function bindRange(id,key,unit){const el=$(id);el.value=S[key];const out=()=>{$(id+'o').textContent=(S[key]>0&&id==='elev'?'up ':S[key]<0&&id==='elev'?'down ':'')+Math.abs(S[key])+unit;};out();el.addEventListener('input',()=>{S[key]=+el.value;out();});}
bindRange('elev','elev','°');bindRange('dih','dih','°');
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{S.style=b.dataset.style;document.querySelectorAll('[data-style]').forEach(x=>x.setAttribute('aria-pressed',x===b));}));
document.querySelectorAll('[data-gsm]').forEach(b=>b.addEventListener('click',()=>{S.gsm=+b.dataset.gsm;document.querySelectorAll('[data-gsm]').forEach(x=>x.setAttribute('aria-pressed',x===b));}));

// Paper colour: a fixed palette (there is no free drawing, so nothing on a plane is user-made art).
PAPERS.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.setAttribute('aria-label','paper '+PAPER_NAMES[i].toLowerCase());b.setAttribute('aria-pressed',i===0);
  b.onclick=()=>{S.paper=c;$('papers').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));};$('papers').appendChild(b);});

