// The generative sequencer and the phrase manifest built by tools/build-music.py.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createSequencer,MOODS,phraseEnergy} from '../src/audio/sequencer.js';

const dir=new URL('../assets/music/',import.meta.url);
const m=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));
const run=(seed,mood,n)=>{const s=createSequencer(m,seed);let p=s.first(mood);const out=[p];for(let i=1;i<n;i++){p=s.next(p.bar+p.bars-1,mood);out.push(p);}return out;};

test('manifest: 120 BPM, 2 s bars, every listed file exists',()=>{
  assert.equal(m.bpm,120);assert.equal(m.bar,2);assert.equal(m.stems.length,9);
  for(const p of m.phrases){assert.equal(p.fit.length,m.bars);for(const f of Object.values(p.files))assert.ok(existsSync(new URL(f,dir)),f);}
});
test('every mood sets a level for every stem',()=>{
  for(const [k,v] of Object.entries(MOODS))for(const s of m.stems)assert.ok(v[s]>=0&&v[s]<=1,`${k}.${s}`);
});
test('same seed gives the same arrangement; different seeds differ',()=>{
  const ids=s=>run(s,'fly',12).map(p=>p.id).join();
  assert.equal(ids('plane-a'),ids('plane-a'));
  assert.notEqual(ids('plane-a'),ids('plane-b'));
});
test('only harmonically safe transitions are taken',()=>{
  for(const mood of Object.keys(MOODS)){const seq=run('fit-'+mood,mood,40);
    for(let i=1;i<seq.length;i++){const a=seq[i-1],b=seq[i],last=a.bar+a.bars-1;
      assert.ok(b.bar===last+1||b.fit[last]>=0.9,`${a.id}->${b.id} fit ${b.fit[last]}`);}}
});
test('it keeps moving: no phrase repeats back to back over a long run',()=>{
  const seq=run('long','idle',60);for(let i=1;i<seq.length;i++)assert.notEqual(seq[i].id,seq[i-1].id);
  assert.ok(new Set(seq.map(p=>p.id)).size>=6,'uses a variety of phrases');
});
test('flight picks busier phrases than idle',()=>{
  const avg=a=>a.reduce((s,p)=>s+phraseEnergy(p),0)/a.length;
  assert.ok(avg(run('e','fly',40))>avg(run('e','idle',40))+0.1);
});
