// Ported verbatim from legacy/one-sheet-game.html (physics core). Do not edit without updating tests/golden.json.
import {geometry} from './geometry.js';
import {aeroModel} from './aero.js';
import {simulate} from './sim.js';

// ---- the automatic thrower: same arm for everyone, picks a sensible throw, then 3 noisy attempts ----
export function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export const ARM=22,RELEASE_H=1.8;
export function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
export function throwPlane(spec,seedStr){const G=geometry(spec,2);const aero=aeroModel(G,spec.dih);const Vmax=Math.min(ARM,aero.Vcap);
  const metric=r=>spec.style==='float'?r.time:r.dist;let best=null;
  for(let ga=-5;ga<=80;ga+=5)for(const vf of [0.55,0.78,1]){const L={V:vf*Vmax,gamma:ga,h:RELEASE_H,delta:spec.delta};const r=simulate(G,aero,L,{tmax:spec.style==='float'?45:25});
    if(!best||metric(r)>metric(best.r))best={L,r};}
  const rnd=mulberry(hashStr(seedStr));const clip=(v,a)=>Math.max(-a,Math.min(a,v));const throws=[];
  for(let k=0;k<3;k++){const L={V:Math.min(aero.Vcap,best.L.V*(1+clip(0.03*gauss(rnd),0.06))),gamma:best.L.gamma+clip(2.5*gauss(rnd),5),h:RELEASE_H,delta:spec.delta,alpha0:clip(1.5*gauss(rnd),3)};
    const r=simulate(G,aero,L,{record:true,tmax:45});throws.push({L,r});}
  let off=0;for(let k=1;k<3;k++)if(metric(throws[k].r)>metric(throws[off].r))off=k;
  return{G,aero,nominal:best.L,throws,official:off};}
