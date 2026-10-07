// Shared app state, constants and small helpers. No rendering here.
import {applyFolds} from '../core/folds.js';
import {paperDef} from './papers.js';

export const $=id=>document.getElementById(id);
export const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const SCALE=8,GUIN={dist:88.318,time:29.2};
// Only these colours are ever shown, whatever a stored plane says.
// The plane's paper (see papers.js); unknown papers show as white.
export const paperOf=p=>paperDef(p&&p.paper);
// Planes have no player-written names: they are labelled by their paper. Any stored `name` is ignored.
export const planeLabel=p=>paperOf(p).name+' plane';
// Trim is fixed (no controls): elevator 6°, wing angle 5°, thrower aims for distance, 80 gsm paper.
export const S={orient:'portrait',W:210,L:297,folds:[],actions:[],pending:null,drag:null,hN:15,hT:25,elev:6,dih:5,style:'far',gsm:80,paper:'#FFFFFF'};
// Mirror of what the store has told us. `store` is the adapter (src/net/store.js).
// planes: the field (shown, counted for records). hidden: planes waiting for their flight to be
// checked, or whose saved flight the physics can't reproduce (net/verify.js); only shared links show those.
// binned: the hidden planes confirmed not real; their points and plane counts come off their pilots' shown totals.
export const net={store:null,uid:null,mode:null,canWrite:null,limit:true,pilots:{},planes:new Map(),hidden:new Map(),binned:new Map(),loaded:false,ready:false};
// Late-bound modules, so sections can call each other without import cycles.
export const app={world:null,audio:null};
export const r1=v=>Math.round(v*10)/10;
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<48)return h+' h ago';return Math.round(h/24)+' days ago';}
export function curPolys(){return applyFolds(S.W,S.L,S.folds);}
export function spec(){return{W:S.W,L:S.L,folds:S.folds,hT:S.hT,hN:S.hN,gsm:S.gsm,dih:S.dih,delta:S.elev,style:S.style};}
export const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
// Read something out to screen readers (a polite live region; the same text twice is still announced).
export function announce(text){const el=document.getElementById('announce');if(!el)return;el.textContent='';setTimeout(()=>{el.textContent=text;},50);}
export const nm=id=>id===net.uid?'You':((net.store&&net.store.nameOf(id))||'Someone');
