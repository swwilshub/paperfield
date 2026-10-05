import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fieldActivity,waitMs,cooldownLeft,MIN_WAIT,MAX_WAIT} from '../src/net/cooldown.js';

const NOW=Date.UTC(2026,9,5,12);const min=60e3;
const plane=(pid,agoMin)=>({pid,at:NOW-agoMin*min});

test('alone, just thrown: a few minutes',()=>{
  const planes=[plane('me',0)];
  assert.deepEqual(fieldActivity(planes,NOW),{pilots:1,airborne:1});
  assert.equal(waitMs(fieldActivity(planes,NOW)),5*min);   // 3 × (1 + 0.5) = 4.5 → 5
});
test('empty field gives the minimum, never below 2 min',()=>{
  assert.equal(waitMs({pilots:0,airborne:0}),MIN_WAIT);
});
test('busy field caps at an hour',()=>{
  assert.equal(waitMs({pilots:20,airborne:0}),MAX_WAIT);
  assert.equal(waitMs({pilots:50,airborne:40}),MAX_WAIT);
});
test('grows with pilots and with planes in the air',()=>{
  const a=waitMs({pilots:3,airborne:0}),b=waitMs({pilots:6,airborne:0}),c=waitMs({pilots:6,airborne:6});
  assert.ok(a<b&&b<c,`${a} ${b} ${c}`);
  assert.equal(waitMs({pilots:10,airborne:8}),42*min);
});
test('old planes stop counting',()=>{
  const planes=[plane('a',5),plane('b',30),plane('c',59),plane('d',61),plane('e',300)];
  assert.deepEqual(fieldActivity(planes,NOW),{pilots:3,airborne:1});
});
test('cooldownLeft shrinks when the field quietens',()=>{
  const busy=Array.from({length:10},(_,i)=>plane('p'+i,15));const mine=NOW-10*min;
  const left=cooldownLeft(mine,[...busy,plane('me',10)],NOW);
  assert.ok(left>15*min,`busy wait left ${left/min} min`);
  assert.equal(cooldownLeft(mine,[plane('me',10)],NOW),0,'alone: 10 min ago is long enough');
  assert.equal(cooldownLeft(null,busy,NOW),0,'first plane is always allowed');
});
