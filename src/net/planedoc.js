// Builds the plane document a throw saves, from the thrower's result. Pure (no DOM), so the
// Firestore rules tests send exactly what the game sends.
import {mulberry,hashStr} from '../core/thrower.js';

export const GUIN={dist:88.318,time:29.2};
const r=(v,k)=>Math.round(v*k)/k;

// Rounded results of the official throw.
export function results(R){const o=R.throws[R.official].r;return{dist:r(o.dist,10),time:r(o.time,10),maxZ:r(o.maxZ,10),loops:o.loops};}

// Points breakdown: [[label, points], …]. `me` is the pilot doc (or {}), `rec` the field records.
export function scorePoints(res,me,rec){const pts=[['Distance',Math.round(res.dist)],['Hang time',Math.round(3*res.time)]];
  if(res.dist>(me.pbDist||0)&&me.planes)pts.push(['Personal best distance',20]);if(res.time>(me.pbTime||0)&&me.planes)pts.push(['Personal best hang time',20]);
  if(!rec.dist||res.dist>rec.dist.dist)pts.push(['Field record: farthest',100]);if(!rec.time||res.time>rec.time.time)pts.push(['Field record: longest aloft',100]);
  if(!rec.maxZ||res.maxZ>rec.maxZ.maxZ)pts.push(['Field record: highest',100]);if(res.loops>0&&(!rec.loops||res.loops>rec.loops.loops))pts.push(['Field record: most loops',50]);
  if(res.dist>GUIN.dist)pts.push(['Beat the Guinness distance record',500]);if(res.time>GUIN.time)pts.push(['Beat the Guinness time record',500]);
  return pts;}

// `plane` is the build: {W, L, folds, hT, hN, dih, elev, style, gsm, paper}.
export function planeDoc(id,uid,plane,R,points,at){const G=R.G,o=R.throws[R.official];const rnd=mulberry(hashStr(id+'pose'));
  const tr=o.r.tr;const step=Math.max(1,Math.ceil(tr.length/220));const flat=[];for(let i=0;i<tr.length;i+=step){const q=tr[i];flat.push(r(q[0],100),r(q[1],100),r(q[2],100),r(q[3],1000));}
  const q=tr[tr.length-1];if((tr.length-1)%step){flat.push(r(q[0],100),r(q[1],100),r(q[2],100),r(q[3],1000));}
  return Object.assign({uid,at,W:plane.W,L:plane.L,folds:plane.folds,hT:plane.hT,hN:plane.hN,dih:plane.dih,delta:plane.elev,style:plane.style,gsm:plane.gsm,paper:plane.paper,
    heading:r(rnd()*70-35,10),roll:Math.round((rnd()<0.5?-1:1)*(55+rnd()*25)),tr:flat,points,
    throws:R.throws.map(t=>[r(t.r.dist,10),r(t.r.time,10)]),official:R.official,V:r(o.L.V,10),gamma:r(o.L.gamma,10),
    semi:r(G.semi,10),yTip:r(G.yTip,10),yMin:r(G.yMin,10),sCG:r(G.sCG,10),SM:r(G.SM,1000),Vcap:r(R.aero.Vcap,10)},results(R));}
