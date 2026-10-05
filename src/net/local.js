// Local store: keeps the field in memory and, when it can, in localStorage.
// Used when there is no backend (M1) or the backend is unreachable.
// `?nolimit` in the URL turns off the throw limit for local testing.

import {cooldownLeft} from './cooldown.js';
import {pilotName} from './pilots.js';

const KEY='onesheet-local-v1';

function readLS(){try{const v=localStorage.getItem(KEY);return v?JSON.parse(v):null;}catch(e){return null;}}
function writeLS(d){localStorage.setItem(KEY,JSON.stringify(d));}
const newId=()=>'local-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);

export function createLocalStore(){
  let data=readLS()||{uid:newId(),pilots:{},planes:[]};
  // Drawings and plane names were removed: drop any saved by an older version.
  data.planes=data.planes.map(({img,name,...p})=>p);
  const limit=!/[?&]nolimit\b/.test(location.search);
  let persist=false;
  const planeSubs=new Set(),pilotSubs=new Set();
  const withIds=list=>list.map(p=>Object.assign({},p));
  const emitPilots=()=>{for(const cb of pilotSubs)cb({pilots:Object.assign({},data.pilots)});};

  // Another tab on the same browser saved a plane: pick it up.
  addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;let d;try{d=JSON.parse(e.newValue);}catch(_){return;}
    const known=new Set(data.planes.map(p=>p.id));data=d;const added=d.planes.filter(p=>!known.has(p.id));
    if(added.length)for(const cb of planeSubs)cb({added:withIds(added),initial:false});emitPilots();});

  return{
    async connect(){try{writeLS(data);persist=true;}catch(e){}return{uid:data.uid,mode:'local',canWrite:true,limit};},
    me(){return data.pilots[data.uid]||null;},
    onPilots(cb){pilotSubs.add(cb);queueMicrotask(()=>cb({pilots:Object.assign({},data.pilots)}));return()=>pilotSubs.delete(cb);},
    onPlanes(cb){planeSubs.add(cb);queueMicrotask(()=>cb({added:withIds(data.planes),initial:true}));return()=>planeSubs.delete(cb);},
    async savePlane(id,doc,pilot){
      const prev=data.pilots[data.uid];
      if(limit&&prev&&cooldownLeft(prev.last,data.planes,Date.now())>0){const e=new Error('Your next plane is not ready yet.');e.code='cooldown';throw e;}
      const next=Object.assign({},data,{planes:data.planes.concat([Object.assign({id,pid:data.uid},doc)]),pilots:Object.assign({},data.pilots,{[data.uid]:Object.assign({lastPlane:id},pilot)})});
      if(persist)try{writeLS(next);}catch(err){const e=new Error('Local storage is full.');e.code='quota_exceeded';throw e;}
      data=next;emitPilots();},
    nameOf(uid){return pilotName(uid);}
  };
}
