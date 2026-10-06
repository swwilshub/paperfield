// ===== app shell: modes, sheets and the dock =====
// The field fills the screen. Building a plane happens in a sheet above the dock, one step at a
// time (fold → wings → release). body[data-mode] picks which row of dock actions is shown:
// field | fold | wings | go | board | event. The sheet's content is per step, so a different
// folding experience (e.g. 3D) can replace the fold step without touching the dock.
import {$,app} from './state.js';
import {renderFold} from './fold.js';
import {renderWings} from './wings.js';
import {renderGo} from './release.js';
import {renderBoard} from './board.js';

const STEPS=['fold','wings','go'];
function setMode(m){document.body.dataset.mode=m;}

export function showStep(t){if(!STEPS.includes(t))return;
  $('board').hidden=true;$('designer').hidden=false;setMode(t);
  document.querySelectorAll('[data-step]').forEach(s=>s.hidden=s.dataset.step!==t);
  document.querySelectorAll('[data-stepdot]').forEach(d=>d.dataset.stepdot===t?d.setAttribute('aria-current','step'):d.removeAttribute('aria-current'));
  app.audio&&app.audio.stage(t);
  if(t==='fold')renderFold();if(t==='wings')renderWings();if(t==='go')renderGo();}
// Kept for callers of the old tab API.
export const showTab=showStep;

export function openBoard(){$('designer').hidden=true;$('board').hidden=false;setMode('board');renderBoard();app.audio&&app.audio.cue('board');}
export function closeSheets(){$('designer').hidden=true;$('board').hidden=true;setMode('field');app.audio&&app.audio.stage('idle');}
// A throw takes over the screen: no sheets, no dock (Skip is the only action).
export function eventMode(on){if(on){$('designer').hidden=true;$('board').hidden=true;setMode('event');}else setMode('field');}

export function initTabs(){
  app.ui={showStep,openBoard,closeSheets,eventMode};
  $('foldBtn').addEventListener('click',()=>showStep('fold'));
  $('toWings').addEventListener('click',()=>showStep('wings'));
  $('openBoard').addEventListener('click',openBoard);
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showStep(b.dataset.goto)));
  document.querySelectorAll('.closeSheet').forEach(b=>b.addEventListener('click',closeSheets));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&['fold','wings','go','board'].includes(document.body.dataset.mode))closeSheets();});
}
