// Golden tests: the ES-module port must reproduce the legacy prototype's flights.
// Regenerate golden.json only from the legacy file: `npm run golden`.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {throwPlane,applyFolds,geometry} from '../src/core/index.js';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const golden=read('./golden.json').cases;
const specs=read('./fixtures/specs.json');
const TOL=0.01;
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<=TOL,`${msg}: got ${a}, golden ${b}`);

test('golden set covers the five M1 specs',()=>{
  assert.deepEqual(Object.keys(golden).sort(),['all-keel','classic-dart','flat-sheet','landscape-glider','nose-heavy-float']);
  assert.deepEqual(Object.keys(specs).sort(),Object.keys(golden).sort());
});

for(const [name,{seed,spec}] of Object.entries(specs)){
  test(`${name} matches legacy`,()=>{
    const g=golden[name];assert.equal(seed,g.seed);
    const R=throwPlane(structuredClone(spec),seed);const o=R.throws[R.official];
    assert.equal(R.official,g.official,'official throw');
    assert.equal(!!R.G.noWing,g.noWing,'noWing');
    for(const k of ['dist','time','maxZ'])close(o.r[k],g[k],k);
    assert.equal(o.r.loops,g.loops,'loops');
    R.throws.forEach((t,i)=>{for(const k of ['dist','time','maxZ'])close(t.r[k],g.throws[i][k],`throw ${i} ${k}`);assert.equal(t.r.loops,g.throws[i].loops);});
  });
  test(`${name} is deterministic and bit-identical to legacy in this runtime`,()=>{
    const a=throwPlane(structuredClone(spec),seed),b=throwPlane(structuredClone(spec),seed);
    const o=a.throws[a.official].r;
    assert.deepEqual([o.dist,o.time,o.maxZ,o.loops],[b.throws[b.official].r.dist,b.throws[b.official].r.time,b.throws[b.official].r.maxZ,b.throws[b.official].r.loops]);
    assert.deepEqual([o.dist,o.time,o.maxZ],[golden[name].dist,golden[name].time,golden[name].maxZ]);
  });
}

test('folds conserve paper area',()=>{
  const {spec}=specs['classic-dart'];const area=applyFolds(spec.W,spec.L,spec.folds).reduce((s,p)=>{let a=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=q[0]*r[1]-r[0]*q[1];}return s+Math.abs(a/2);},0);
  assert.ok(Math.abs(area-spec.W*spec.L)<1,`area ${area}`);
});

test('geometry mass equals the sheet mass',()=>{
  const {spec}=specs['classic-dart'];const G=geometry(spec,2);
  assert.ok(Math.abs(G.mass-spec.W*spec.L*1e-6*spec.gsm*1e-3)<1e-12);
});
