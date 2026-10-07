// The Firebase store adapter (src/net/firebase.js) against the Auth + Firestore emulators,
// with two players. Run: npm run test:emulator
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as app from 'firebase/app';
import * as auth from 'firebase/auth';
import * as fs from 'firebase/firestore';
import {createFirebaseStore} from '../src/net/firebase.js';
import {throwPlane} from '../src/core/thrower.js';
import {planeDoc} from '../src/net/planedoc.js';

const sdk={app,auth,fs};
const cfg={apiKey:'demo-key',authDomain:'demo-one-sheet.firebaseapp.com',projectId:'demo-one-sheet',appId:'1:1:web:1'};
const emu={authEmulator:'http://127.0.0.1:9099',firestoreEmulator:{host:'127.0.0.1',port:8085}};
const {spec}=JSON.parse(readFileSync(new URL('./fixtures/specs.json',import.meta.url),'utf8'))['flat-sheet'];
const build={...spec,elev:spec.delta,paper:'#FFD6DE'};
const waitFor=async(fn,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,50));}throw new Error('timed out');};
after(()=>setTimeout(()=>process.exit(0),200));   // the SDK keeps listeners open

test('two players: a throw by one appears live for the other, and the rules accept it',async()=>{
  const a=createFirebaseStore(cfg,{sdk,appName:'alice',...emu}),b=createFirebaseStore(cfg,{sdk,appName:'bob',...emu});
  const ia=await a.connect(),ib=await b.connect();
  assert.equal(ia.mode,'firebase');assert.notEqual(ia.uid,ib.uid);
  const seen=[];let initial=null;b.onPlanes(({added,initial:i})=>{if(initial===null)initial=i;else seen.push(...added.map(p=>({...p,live:!i})));});
  await waitFor(()=>initial!==null);

  const id='t-'+Date.now().toString(36);const R=throwPlane(structuredClone(spec),id);
  const doc=planeDoc(id,ia.uid,build,R,150,Date.now());
  await a.savePlane(id,doc,{score:150,planes:1,pbDist:doc.dist,pbTime:doc.time});

  const got=await waitFor(()=>seen.find(p=>p.id===id));
  assert.equal(got.live,true,'arrives as a live plane');
  assert.equal(got.pid,ia.uid);assert.equal(got.paper,'#FFD6DE');
  assert.deepEqual(got.throws,doc.throws,'throws survive the round trip');
  assert.deepEqual(got.tr,doc.tr);
  assert.ok(Math.abs(got.at-Date.now())<60e3,'server timestamp comes back as millis');
  await waitFor(()=>a.me()&&a.me().lastPlane===id&&a.me().score===150);
  // Only your own pilot doc is read; another pilot's isn't.
  let pilotsB=null;b.onPilots(({pilots})=>{pilotsB=pilots;});await waitFor(()=>pilotsB);assert.equal(pilotsB[ia.uid],undefined);
  // Subscribing again starts from the cache: the plane is there at once, and only newer planes come from the server.
  const again=[];const un2=b.onPlanes(({added,initial})=>again.push(...added.map(p=>({id:p.id,initial}))));
  await waitFor(()=>again.find(p=>p.id===id));assert.equal(again.find(p=>p.id===id).initial,true);
  await new Promise(r=>setTimeout(r,500));assert.equal(again.filter(p=>p.id===id).length,1,'not fetched twice');un2();
  assert.equal(b.nameOf(ia.uid),a.nameOf(ia.uid),'same generated name everywhere');
  // Shared links look a plane up by id.
  const one=await b.getPlane(id);assert.equal(one.id,id);assert.equal(one.pid,ia.uid);assert.ok(Array.isArray(one.tr)&&Array.isArray(one.throws[0]));
  assert.equal(await b.getPlane('no-such-plane'),null);

  // The first 3 planes have no wait: the 2nd and 3rd go straight through; a 4th straight away breaks the floor.
  for(const n of [2,3]){const idn=id+n;const d=planeDoc(idn,ia.uid,build,R,100,Date.now());
    await a.savePlane(idn,d,{score:150+100*(n-1),planes:n,pbDist:doc.dist,pbTime:doc.time});await waitFor(()=>a.me()&&a.me().lastPlane===idn);}
  const id4=id+'4';const doc4=planeDoc(id4,ia.uid,build,R,100,Date.now());
  await assert.rejects(a.savePlane(id4,doc4,{score:450,planes:4,pbDist:doc.dist,pbTime:doc.time}),e=>e.code==='permission_denied');
});
