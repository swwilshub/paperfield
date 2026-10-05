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
  let board={};b.onPilots(({pilots})=>{board=pilots;});
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
  await waitFor(()=>board[ia.uid]&&board[ia.uid].score===150);
  await waitFor(()=>a.me()&&a.me().lastPlane===id);
  assert.equal(b.nameOf(ia.uid),a.nameOf(ia.uid),'same generated name everywhere');

  // A second throw straight away breaks the floor between throws.
  const id2=id+'b';const doc2=planeDoc(id2,ia.uid,build,R,100,Date.now());
  await assert.rejects(a.savePlane(id2,doc2,{score:250,planes:2,pbDist:doc.dist,pbTime:doc.time}),e=>e.code==='permission_denied');
});
