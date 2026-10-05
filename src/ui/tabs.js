// ===== tabs =====
import {$} from './state.js';
import {renderFold} from './fold.js';
import {renderWings} from './wings.js';
import {renderDraw} from './draw.js';
import {renderGo} from './release.js';

export function showTab(t){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==t);
  if(t==='fold')renderFold();if(t==='wings')renderWings();if(t==='draw')renderDraw();if(t==='go')renderGo();}
export function initTabs(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>{showTab(b.dataset.goto);document.querySelector('.tabs').scrollIntoView({behavior:'smooth',block:'start'});}));
  $('toWings').addEventListener('click',()=>showTab('wings'));
}
