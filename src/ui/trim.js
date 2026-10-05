// ===== trim =====
import {S,$} from './state.js';

function bindRange(id,key,unit){const el=$(id);el.value=S[key];const out=()=>{$(id+'o').textContent=(S[key]>0&&id==='elev'?'up ':S[key]<0&&id==='elev'?'down ':'')+Math.abs(S[key])+unit;};out();el.addEventListener('input',()=>{S[key]=+el.value;out();});}
bindRange('elev','elev','°');bindRange('dih','dih','°');
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{S.style=b.dataset.style;document.querySelectorAll('[data-style]').forEach(x=>x.setAttribute('aria-pressed',x===b));}));
document.querySelectorAll('[data-gsm]').forEach(b=>b.addEventListener('click',()=>{S.gsm=+b.dataset.gsm;document.querySelectorAll('[data-gsm]').forEach(x=>x.setAttribute('aria-pressed',x===b));}));
