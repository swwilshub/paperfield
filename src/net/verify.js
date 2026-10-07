// Is a saved plane's flight real? The physics is deterministic, so re-flying the saved build with the
// same seed (its id) must give the saved results. Rules can't run the physics, so a doc written
// straight to Firestore can claim anything within their caps.
//
// Every plane is re-flown, in a background worker (net/verify-worker.js, about 90 ms a plane), and the
// verdict is remembered in this browser so each plane is checked once. Planes with an implausible
// result stay hidden until they pass; the rest are shown while they wait and removed if they fail.
import {throwPlane} from '../core/thrower.js';
import {results,GUIN} from './planedoc.js';

// Implausible enough to keep hidden until checked (the real game's best so far: 90 m, 11 s, 16 m up, 4 loops).
export const LIMITS={dist:100,time:15,maxZ:25,loops:5};
export function suspicious(p){return !(p.dist<=LIMITS.dist&&p.time<=LIMITS.time&&p.maxZ<=LIMITS.maxZ&&p.loops<=LIMITS.loops);}

// The most points a flight like this can earn: distance, hang time, and every bonus it could have won.
export function maxPoints(p){return Math.round(p.dist)+Math.round(3*p.time)+20+20+100*3+50+(p.dist>GUIN.dist?500:0)+(p.time>GUIN.time?500:0);}
// Pure check, shared with the worker: does re-flying give the saved results, and are the points possible?
export function reflies(p){try{if(!(p.points>=0&&p.points<=maxPoints(p)))return false;
    const r=results(throwPlane({W:p.W,L:p.L,folds:p.folds,hT:p.hT,hN:p.hN,gsm:p.gsm,dih:p.dih,delta:p.delta,style:p.style},p.id));
    return ['dist','time','maxZ'].every(k=>Math.abs(r[k]-p[k])<0.15)&&r.loops===p.loops;}catch(e){return false;}}

// Verdicts, remembered across visits (newest 4 000).
const KEY='paperfield-verified',verdicts=new Map();
try{for(const [id,ok] of JSON.parse(localStorage.getItem(KEY)||'[]'))verdicts.set(id,!!ok);}catch(e){}
let saveT=null;
function remember(id,ok){verdicts.set(id,ok);clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify([...verdicts].slice(-4000).map(([i,o])=>[i,o?1:0])));}catch(e){}},1000);}
export const verdict=id=>verdicts.get(id);
// Planes thrown in this browser were flown here, so they're real.
export function trust(id){remember(id,true);}
// Synchronous check (shared links, tests).
export function genuine(p){if(verdicts.has(p.id))return verdicts.get(p.id);const ok=reflies(p);remember(p.id,ok);return ok;}
export function extreme(p){return suspicious(p)&&!genuine(p);}

// ---------- background checking ----------
// A priority queue fed to one worker: hidden (suspicious) planes first, then the most points first.
let worker=null,busy=null;const queue=[];
function startWorker(){if(worker!==null)return worker;try{worker=new Worker(new URL('./verify-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=e=>{const [p,done]=busy;busy=null;remember(p.id,e.data.ok);done(e.data.ok);setTimeout(pump,30);};   // a breath between planes, for slow phonesworker.onerror=()=>{worker=false;};}catch(e){worker=false;}return worker;}
function pump(){if(busy||!queue.length)return;queue.sort((a,b)=>b[2]-a[2]);busy=queue.shift();
  if(startWorker())worker.postMessage(busy[0]);else setTimeout(()=>{const [p,done]=busy;busy=null;done(genuine(p));pump();},30);}   // no workers: on the main thread, one at a time
// Resolves true or false once the plane has been re-flown (at once if it already has).
export function check(p,{hidden=false}={}){if(verdicts.has(p.id))return Promise.resolve(verdicts.get(p.id));
  return new Promise(done=>{queue.push([p,done,(hidden?1e6:0)+(p.points||0)]);pump();});}
