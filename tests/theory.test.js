// The procedural music's theory (src/audio/theory.js): seeded, in key, calm.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSong,chordAt,pentaNote,inKey,barRandom,PROGS,SHAPES} from '../src/audio/theory.js';

test('the same seed gives the same song; different seeds differ',()=>{
  assert.deepEqual(makeSong('plane-1'),makeSong('plane-1'));
  const songs=new Set(Array.from({length:30},(_,i)=>JSON.stringify(makeSong('p'+i))));
  assert.ok(songs.size>25);
});
test('chill tempos: 70 to 84 BPM, gentle swing',()=>{
  for(let i=0;i<200;i++){const s=makeSong('t'+i);assert.ok(s.bpm>=70&&s.bpm<=84,String(s.bpm));assert.ok(s.swing>=0.12&&s.swing<=0.22);}
});
test('every chord tone and melody note is in the song\'s key',()=>{
  for(let i=0;i<50;i++){const s=makeSong('k'+i);
    for(let bar=0;bar<8;bar++)for(const m of chordAt(s,bar).tones)assert.ok(inKey(s,m),`${s.seed} bar ${bar} note ${m}`);
    for(let d=0;d<15;d++)assert.ok(inKey(s,pentaNote(s,d,0)));}
});
test('progressions loop every four bars and use known chord shapes',()=>{
  for(const p of PROGS){assert.equal(p.length,4);for(const [,shape] of p)assert.ok(SHAPES[shape],shape);}
  const s=makeSong('loop');assert.deepEqual(chordAt(s,1),chordAt(s,5));assert.deepEqual(chordAt(s,-1),chordAt(s,3));
});
test('arrangement randomness is repeatable per bar and layer',()=>{
  const s=makeSong('r');const a=barRandom(s,3,'keys'),b=barRandom(s,3,'keys');
  assert.equal(a(),b());assert.notEqual(barRandom(s,3,'keys')(),barRandom(s,4,'keys')());
});
