// Spotting saved flights the physics can't reproduce (src/net/verify.js).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {throwPlane} from '../src/core/thrower.js';
import {planeDoc} from '../src/net/planedoc.js';
import {suspicious,genuine,extreme,reflies,maxPoints} from '../src/net/verify.js';

const {spec}=JSON.parse(readFileSync(new URL('./fixtures/specs.json',import.meta.url),'utf8'))['classic-dart'];
const plane={...spec,elev:spec.delta,paper:'#FFFFFF'};
const doc=id=>Object.assign({id},planeDoc(id,'u',plane,throwPlane(spec,id),100,0));

test('a real throw is genuine, and plausible enough not to need checking',()=>{
  const p=doc('real-1');assert.equal(genuine(p),true);assert.equal(suspicious(p),false);assert.equal(extreme(p),false);});
test('a doctored result is caught, and only implausible ones are hidden',()=>{
  const far=Object.assign(doc('fake-1'),{dist:500,maxZ:200});assert.equal(suspicious(far),true);assert.equal(genuine(far),false);assert.equal(extreme(far),true);
  const loops=Object.assign(doc('fake-2'),{loops:19});assert.equal(extreme(loops),true);
  // Forged just under the limits: plausible-looking, but re-flying still catches it.
  const sly=Object.assign(doc('fake-3'),{dist:99.9,time:14.9,maxZ:24.9,loops:5,points:995});assert.equal(suspicious(sly),false);assert.equal(genuine(sly),false);});
test('a real flight with padded points is caught',()=>{
  const p=doc('real-2');assert.equal(reflies(p),true);
  assert.equal(reflies(Object.assign({},p,{points:maxPoints(p)+1})),false);assert.equal(reflies(Object.assign({},p,{points:-5})),false);});
test('missing or broken numbers count as implausible',()=>{assert.equal(suspicious({dist:NaN,time:1,maxZ:1,loops:0}),true);assert.equal(suspicious({}),true);});
