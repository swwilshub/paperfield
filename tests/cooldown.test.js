import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fieldActivity,waitMs,cooldownLeft,freeLeft,FREE_PLANES,MIN_WAIT,MAX_WAIT} from '../src/net/cooldown.js';

const NOW=Date.UTC(2026,9,5,12);const min=60e3;
const plane=(pid,agoMin)=>({pid,at:NOW-agoMin*min});

test('alone, just thrown: one a minute',()=>{
  const planes=[plane('me',0)];
  assert.deepEqual(fieldActivity(planes,NOW),{pilots:1,airborne:1});
  assert.equal(waitMs(fieldActivity(planes,NOW)),1*min);
});
test('a quiet field (up to ~3 pilots) stays at one a minute',()=>{
  assert.equal(waitMs({pilots:0,airborne:0}),MIN_WAIT);
  assert.equal(MIN_WAIT,1*min);
  assert.equal(waitMs({pilots:3,airborne:0}),1*min);
  assert.equal(waitMs({pilots:2,airborne:2}),1*min);
  assert.equal(waitMs({pilots:3,airborne:2}),2*min);
});
test('busy field caps at an hour',()=>{
  assert.equal(waitMs({pilots:62,airborne:0}),MAX_WAIT);
  assert.equal(waitMs({pilots:200,airborne:80}),MAX_WAIT);
});
test('grows with pilots and with planes in the air',()=>{
  const a=waitMs({pilots:5,airborne:0}),b=waitMs({pilots:10,airborne:0}),c=waitMs({pilots:10,airborne:10});
  assert.ok(a<b&&b<c,`${a} ${b} ${c}`);
  assert.equal(waitMs({pilots:10,airborne:8}),12*min);
});
test('old planes stop counting',()=>{
  const planes=[plane('a',5),plane('b',30),plane('c',59),plane('d',61),plane('e',300)];
  assert.deepEqual(fieldActivity(planes,NOW),{pilots:3,airborne:1});
});
test('cooldownLeft shrinks when the field quietens',()=>{
  const busy=Array.from({length:20},(_,i)=>plane('p'+i,15));const mine=NOW-5*min;
  const left=cooldownLeft(mine,[...busy,plane('me',5)],NOW);
  assert.ok(left>5*min,`busy wait left ${left/min} min`);
  assert.equal(cooldownLeft(mine,[plane('me',5)],NOW),0,'alone: 5 min ago is long enough');
  assert.equal(cooldownLeft(NOW-30e3,[plane('me',0.5)],NOW),30e3,'alone: 30 s after a throw, 30 s left');
  assert.equal(cooldownLeft(null,busy,NOW),0,'first plane is always allowed');
});
test('the first 3 planes have no wait, then the limit applies',()=>{
  const busy=Array.from({length:20},(_,i)=>plane('p'+i,15));const just=NOW-5e3;
  assert.equal(FREE_PLANES,3);
  for(const n of [0,1,2])assert.equal(cooldownLeft(just,busy,NOW,n),0,`after ${n} planes: no wait`);
  assert.ok(cooldownLeft(just,busy,NOW,3)>0,'after 3 planes: the timer starts');
  assert.deepEqual([0,1,2,3,9].map(freeLeft),[3,2,1,0,0]);
});
