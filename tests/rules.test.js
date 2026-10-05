// Firestore security rules, against the emulator. Run: npm run test:rules
// Uses the same plane doc the game builds (src/net/planedoc.js + the Firebase adapter's encoding).
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
import {throwPlane} from '../src/core/thrower.js';
import {planeDoc} from '../src/net/planedoc.js';
import {toFirestore} from '../src/net/firebase.js';

const specs=JSON.parse(readFileSync(new URL('./fixtures/specs.json',import.meta.url),'utf8'));
const {spec}=specs['classic-dart'];
const build={...spec,elev:spec.delta,paper:'#CDE7FF'};
const R=throwPlane(structuredClone(spec),'rules-seed');

let env;
before(async()=>{
  const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8085').split(':');
  env=await initializeTestEnvironment({projectId:'demo-one-sheet',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),host,port:+port}});
});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();});

const db=uid=>env.authenticatedContext(uid).firestore();
// What the game writes for a throw: the plane and the pilot doc in one batch.
function throwBatch(fs,uid,id,{prev=null,points=120,plane={},pilot={}}={}){
  const b=writeBatch(fs);const d=Object.assign(toFirestore(planeDoc(id,uid,build,R,points,0)),{uid,at:serverTimestamp()},plane);
  b.set(doc(fs,'planes',id),d);
  b.set(doc(fs,'pilots',uid),Object.assign({score:(prev?prev.score:0)+points,planes:(prev?prev.planes:0)+1,last:serverTimestamp(),lastPlane:id,pbDist:10,pbTime:3},pilot));
  return b.commit();}
async function seedPilot(uid,minsAgo,extra){await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'pilots',uid),Object.assign({score:200,planes:1,last:Timestamp.fromMillis(Date.now()-minsAgo*60e3),lastPlane:'old',pbDist:10,pbTime:3},extra));});}

test('a first throw (plane + pilot in one batch) is accepted',async()=>{
  await assertSucceeds(throwBatch(db('alice'),'alice','p1'));
});
test('anyone can read the field',async()=>{
  await throwBatch(db('alice'),'alice','p1');
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'planes','p1')));
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'pilots','alice')));
});
test('signed-out users cannot throw',async()=>{
  await assertFails(throwBatch(env.unauthenticatedContext().firestore(),'alice','p1'));
});
test('a plane on its own, or a pilot update on its own, is rejected',async()=>{
  const fs=db('alice');
  await assertFails(setDoc(doc(fs,'planes','p1'),Object.assign(toFirestore(planeDoc('p1','alice',build,R,120,0)),{uid:'alice',at:serverTimestamp()})));
  await assertFails(setDoc(doc(fs,'pilots','alice'),{score:120,planes:1,last:serverTimestamp(),lastPlane:'p1',pbDist:1,pbTime:1}));
});
test('a second plane within 50 s is rejected; after a minute it is accepted',async()=>{
  await seedPilot('alice',0.5);
  await assertFails(throwBatch(db('alice'),'alice','p2',{prev:{score:200,planes:1}}));
  await seedPilot('alice',1.1);
  await assertSucceeds(throwBatch(db('alice'),'alice','p3',{prev:{score:200,planes:1}}));
});
test("writing another pilot's doc or plane is rejected",async()=>{
  await assertFails(throwBatch(db('mallory'),'alice','p1'));
  await assertFails(throwBatch(db('mallory'),'mallory','p1',{plane:{uid:'alice'}}));
});
test('an inflated score or plane count is rejected',async()=>{
  await assertFails(throwBatch(db('alice'),'alice','p1',{pilot:{score:9999}}));
  await assertFails(throwBatch(db('alice'),'alice','p1',{pilot:{planes:5}}));
  await assertFails(throwBatch(db('alice'),'alice','p1',{points:5000}));
});
test('planes carry no text or images: extra fields and off-palette colours are rejected',async()=>{
  await assertFails(throwBatch(db('alice'),'alice','p1',{plane:{name:'anything'}}));
  await assertFails(throwBatch(db('alice'),'alice','p1',{plane:{img:'data:image/png;base64,AAAA'}}));
  await assertFails(throwBatch(db('alice'),'alice','p1',{plane:{paper:'#FF0000'}}));
  await assertFails(throwBatch(db('alice'),'alice','p1',{pilot:{nick:'anything'}}));
});
test('a client-chosen timestamp is rejected',async()=>{
  await assertFails(throwBatch(db('alice'),'alice','p1',{plane:{at:Timestamp.fromMillis(0)}}));
});
test('only admins can delete planes',async()=>{
  await throwBatch(db('alice'),'alice','p1');
  await assertFails(deleteDoc(doc(db('alice'),'planes','p1')));
  await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'admins','sam'),{}));
  await assertSucceeds(deleteDoc(doc(db('sam'),'planes','p1')));
});
test('nobody can make themselves an admin',async()=>{
  await assertFails(setDoc(doc(db('alice'),'admins','alice'),{}));
});
