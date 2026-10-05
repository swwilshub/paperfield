// Shared app state, constants and small helpers. No rendering here.
import {applyFolds} from '../core/folds.js';

export const $=id=>document.getElementById(id);
export const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const HOUR=3600e3,SCALE=8,GUIN={dist:88.318,time:29.2};
export const INKS=['#15243A','#D2423A','#2D63C8','#1E8A5A','#F2A41C','#8A3FB8','#FFFFFF'];
export const PAPERS=['#FFFFFF','#FFF3B0','#CDE7FF','#FFD6DE','#D6F5DF','#E6E0FF'];
export const S={orient:'portrait',W:210,L:297,folds:[],actions:[],pending:null,drag:null,hN:15,hT:25,elev:6,dih:5,style:'far',gsm:80,paper:'#FFFFFF',ink:INKS[0],brush:0.022,strokes:[]};
// Mirror of what the store has told us. `store` is the adapter (src/net/store.js).
export const net={store:null,uid:null,mode:null,canWrite:null,limit:true,pilots:{},planes:new Map(),loaded:false,ready:false};
// Late-bound modules, so sections can call each other without import cycles.
export const app={world:null,audio:null};
export const r1=v=>Math.round(v*10)/10;
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<48)return h+' h ago';return Math.round(h/24)+' days ago';}
export function curPolys(){return applyFolds(S.W,S.L,S.folds);}
export function spec(){return{W:S.W,L:S.L,folds:S.folds,hT:S.hT,hN:S.hN,gsm:S.gsm,dih:S.dih,delta:S.elev,style:S.style};}
export const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
export const nm=id=>id===net.uid?'You':((net.store&&net.store.nameOf(id))||'Someone');
