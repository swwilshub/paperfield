// Boot: wire the UI sections, start audio and the 3D world, then connect to the store.
import {$,net,app} from './ui/state.js';
import {initTabs} from './ui/tabs.js';
import {renderFold,clampKeel} from './ui/fold.js';
import './ui/wings.js';
import './ui/paper.js';
import {renderGo} from './ui/release.js';
import {renderBoard,updateMe} from './ui/board.js';
import {audio} from './audio/music.js';
import {createWorld} from './world/scene.js';
import {openStore} from './net/store.js';
import {linkedPlane} from './ui/share.js';
import {suspicious,genuine} from './net/verify.js';

app.audio=audio;
// For tests and the console: window.oneSheet.audio.debug() shows the music stage and song.
window.oneSheet={audio};
// Until three.js has loaded, releases still score and reveal; the plane just isn't shown flying.
app.world={add(){},focus(){},event(p,o){if(o&&o.onLand)o.onLand();},busy:()=>false,end(){}};

// ===== music =====
// Always on. Browsers only allow sound after a user gesture, so it starts on the first one.
for(const t of ['pointerdown','keydown'])document.addEventListener(t,()=>audio.unlock(),{once:true});

// ===== network =====
async function connect(){
  let store,info;try{({store,info}=await openStore());}catch(e){net.ready=true;renderBoard();updateMe();renderGo();return;}
  Object.assign(net,{store,uid:info.uid,mode:info.mode,canWrite:info.canWrite,limit:info.limit});
  let first=true;
  store.onPilots(({pilots})=>{net.pilots=pilots;net.ready=true;renderBoard();updateMe();renderGo();});
  store.onPlanes(({added,initial})=>{
    for(const p of added){if(net.planes.has(p.id)||net.hidden.has(p.id))continue;if(!Array.isArray(p.tr)||!Array.isArray(p.folds))continue;
      const mode=!initial&&p.pid!==net.uid&&Date.now()-p.at<10*60e3?'live':null;
      if(suspicious(p)){net.hidden.set(p.id,p);check(p,mode);continue;}
      net.planes.set(p.id,p);app.world.add(p,mode);}
    net.ready=true;renderBoard();if(first){first=false;setInterval(renderBoard,60000);}});
  await openLinked(store);
}

// ===== too-good-to-be-true planes =====
// Implausible flights stay hidden until re-flown (net/verify.js), one per tick so loading stays smooth.
// Real ones join the field; the rest stay in the database but out of the field and the records.
const queue=[];
function check(p,mode){queue.push([p,mode]);if(queue.length===1)setTimeout(drain,50);}
function drain(){const [p,mode]=queue.shift();if(genuine(p)&&net.hidden.delete(p.id)){net.planes.set(p.id,p);app.world.add(p,mode);renderBoard();}
  else if(!genuine(p)){net.binned.set(p.id,p);renderBoard();updateMe();}
  if(queue.length)setTimeout(drain,20);}

// ===== shared links =====
// ?plane=<id> flies the camera to that plane on the ground and opens its card. A plane whose flight
// isn't real still gets its flight shown, then is crumpled up and sent off the field.
async function openLinked(store){const id=linkedPlane();if(!id)return;
  let p=net.planes.get(id)||net.hidden.get(id);
  if(!p){try{p=await store.getPlane(id);}catch(e){}
    if(!p||!Array.isArray(p.tr)||!Array.isArray(p.folds)){$('ticker').textContent='That shared plane isn\'t in the field any more.';return;}}
  if(suspicious(p)&&!genuine(p)){net.hidden.set(id,p);net.binned.set(id,p);renderBoard();updateMe();app.world.event(p,{countdown:false,extreme:true});return;}
  if(!net.planes.has(id)){net.hidden.delete(id);net.planes.set(id,p);app.world.add(p);renderBoard();}
  app.world.focus(id);}

// ===== boot =====
initTabs();clampKeel();renderFold();renderBoard();updateMe();
app.world=await createWorld();
for(const p of net.planes.values())app.world.add(p);
await connect();
