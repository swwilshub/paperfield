// ===== benchmark field (local play only) =====
// `?local&bench=1500` fills the field with that many planes for performance testing: a few real
// designs are thrown once, then copied with random papers, distances, headings and rolls. The copies
// stay inside the plausible range (net/verify.js), are never saved, and are labelled with a "bench" pilot.
import {throwPlane,mulberry} from '../core/thrower.js';
import {planeDoc} from './planedoc.js';
import {PAPER_IDS} from '../ui/papers.js';

const DESIGNS=[
  {W:210,L:297,folds:[{P:[105,297],Q:[0,192],M:[0,297]},{P:[105,297],Q:[210,192],M:[210,297]}],hT:25,hN:15},
  {W:210,L:297,folds:[{P:[105,297],Q:[0,192],M:[0,297]},{P:[105,297],Q:[210,192],M:[210,297]},{P:[105,297],Q:[0,140],M:[0,297]},{P:[105,297],Q:[210,140],M:[210,297]}],hT:30,hN:10},
  {W:210,L:297,folds:[],hT:20,hN:20},
  {W:297,L:210,folds:[{P:[148.5,210],Q:[38.5,100],M:[0,210]},{P:[148.5,210],Q:[258.5,100],M:[297,210]}],hT:40,hN:20},
  {W:210,L:297,folds:[{P:[0,240],Q:[210,240],M:[105,297]}],hT:15,hN:15},
  {W:210,L:297,folds:[{P:[105,297],Q:[0,192],M:[0,297]},{P:[105,297],Q:[210,192],M:[210,297]},{P:[0,220],Q:[210,220],M:[105,297]}],hT:35,hN:12},
];
export function benchCount(){const q=new URLSearchParams(location.search);if(!q.has('local'))return 0;const n=+q.get('bench');return n>0?Math.min(5000,Math.floor(n)):0;}
export function benchPlanes(n){const base=[];
  for(const [i,d] of DESIGNS.entries()){const plane={...d,dih:5,elev:6,style:'far',gsm:80,paper:'#FFFFFF'};
    try{const id='bench-base-'+i;const R=throwPlane({W:d.W,L:d.L,folds:d.folds,hT:d.hT,hN:d.hN,gsm:80,dih:5,delta:6,style:'far'},id);
      base.push(planeDoc(id,'bench',plane,R,100,0));}catch(e){}}
  const rnd=mulberry(12345),out=[],now=Date.now();
  for(let i=0;i<n&&base.length;i++){const b=base[i%base.length];const dist=Math.round(Math.min(95,3+rnd()*85)*10)/10;
    out.push(Object.assign({},b,{id:'bench-'+i,pid:'bench-'+(i%40),uid:'bench-'+(i%40),paper:PAPER_IDS[Math.floor(rnd()*PAPER_IDS.length)],
      dist,time:Math.min(14,b.time),maxZ:Math.min(20,b.maxZ),loops:Math.min(4,b.loops),heading:Math.round(rnd()*700-350)/10,
      roll:Math.round((rnd()<0.5?-1:1)*(55+rnd()*25)),at:now-(n-i)*60e3}));}
  return out;}
