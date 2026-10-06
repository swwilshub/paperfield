// The paper set (src/ui/papers.js) and the Firestore rules must list the same papers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAPERS,PAPER_IDS,paperDef,paintTile} from '../src/ui/papers.js';

test('firestore.rules allows exactly the papers in papers.js',()=>{
  const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
  const m=rules.match(/d\.paper in \[([^\]]*)\]/);assert.ok(m,'paper rule found');
  const inRules=[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  assert.deepEqual([...inRules].sort(),[...PAPER_IDS].sort());
});
test('the six original colours keep their saved ids, so old planes still match',()=>{
  assert.deepEqual(PAPER_IDS.slice(0,6),['#FFFFFF','#FFF3B0','#CDE7FF','#FFD6DE','#D6F5DF','#E6E0FF']);
  assert.equal(paperDef('#CDE7FF').name,'Blue');
});
test('ids and names are unique; unknown papers fall back to white',()=>{
  assert.equal(new Set(PAPER_IDS).size,PAPERS.length);
  assert.equal(new Set(PAPERS.map(p=>p.name)).size,PAPERS.length);
  assert.equal(paperDef('nope').name,'White');assert.equal(paperDef(undefined).name,'White');
});
test('every pattern paints without errors',()=>{
  const calls=[];const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(...a)=>calls.push(k),set:(t,k,v)=>{t[k]=v;return true;}});
  for(const p of PAPERS){calls.length=0;paintTile(ctx,64,p);assert.ok(calls.includes('fillRect'),p.id);}
});
