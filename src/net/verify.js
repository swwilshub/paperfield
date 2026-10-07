// Is a saved plane's flight real? The physics is deterministic, so re-flying the saved build with the
// same seed (its id) must give the saved results. Rules can't run the physics, so a doc written
// straight to Firestore can claim anything within their caps. That takes about 90 ms a plane, so only
// planes with an implausible result are re-flown; everything else is shown as is.
import {throwPlane} from '../core/thrower.js';
import {results} from './planedoc.js';

// Well past anything the field has seen from the real game (best so far: 90 m, 11 s, 16 m up, 4 loops).
export const LIMITS={dist:100,time:15,maxZ:25,loops:5};
export function suspicious(p){return !(p.dist<=LIMITS.dist&&p.time<=LIMITS.time&&p.maxZ<=LIMITS.maxZ&&p.loops<=LIMITS.loops);}

const verdicts=new Map();
// True if re-flying the plane gives its saved results (to the 0.1 they're saved at).
export function genuine(p){if(verdicts.has(p.id))return verdicts.get(p.id);let ok=false;
  try{const r=results(throwPlane({W:p.W,L:p.L,folds:p.folds,hT:p.hT,hN:p.hN,gsm:p.gsm,dih:p.dih,delta:p.delta,style:p.style},p.id));
    ok=['dist','time','maxZ'].every(k=>Math.abs(r[k]-p[k])<0.15)&&r.loops===p.loops;}catch(e){}
  verdicts.set(p.id,ok);return ok;}
// Shown in the field and counted for records: anything plausible, or implausible but real.
export function extreme(p){return suspicious(p)&&!genuine(p);}
