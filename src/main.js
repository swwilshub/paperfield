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
    for(const p of added){if(net.planes.has(p.id))continue;if(!Array.isArray(p.tr)||!Array.isArray(p.folds))continue;net.planes.set(p.id,p);
      app.world.add(p,!initial&&p.pid!==net.uid&&Date.now()-p.at<10*60e3?'live':null);}
    net.ready=true;renderBoard();if(first){first=false;setInterval(renderBoard,60000);}});
}

// ===== boot =====
initTabs();clampKeel();renderFold();renderBoard();updateMe();
app.world=await createWorld();
for(const p of net.planes.values())app.world.add(p);
await connect();
