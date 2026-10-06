// The fold-up animation's geometry (src/world/foldanim.js).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyFolds,polyArea} from '../src/core/folds.js';
import {geometry} from '../src/core/geometry.js';
import {replay,unmap,creasePoint,plan,planePoint} from '../src/world/foldanim.js';

const specs=JSON.parse(readFileSync(new URL('./fixtures/specs.json',import.meta.url),'utf8'));
const close=(a,b,e=1e-6)=>Math.abs(a-b)<e;

for(const [name,{spec}] of Object.entries(specs)){
  test(`${name}: replayed creases give exactly the physics fold result`,()=>{
    const {final}=replay(spec.W,spec.L,spec.folds),ref=applyFolds(spec.W,spec.L,spec.folds);
    assert.equal(final.length,ref.length);
    final.forEach((pc,i)=>pc.pts.forEach((p,j)=>{assert.ok(close(p[0],ref[i][j][0])&&close(p[1],ref[i][j][1]));}));
  });
  test(`${name}: every piece maps back onto the flat sheet, covering it once`,()=>{
    const {final}=replay(spec.W,spec.L,spec.folds);let area=0;
    for(const pc of final){const orig=pc.pts.map(p=>unmap(pc.M,p));area+=Math.abs(polyArea(orig));
      for(const [x,y] of orig)assert.ok(x>-1e-6&&x<spec.W+1e-6&&y>-1e-6&&y<spec.L+1e-6,`${x},${y}`);}
    assert.ok(close(area,spec.W*spec.L,1),`area ${area}`);
  });
  test(`${name}: centre and wing folds go from flat to a plane without tearing`,()=>{
    const {final}=replay(spec.W,spec.L,spec.folds);const G=geometry(spec,2);
    const pl=plan({...spec,yMin:G.yMin,yTip:G.yTip},final);
    for(const pc of pl.pieces)for(const p of pc.pts){
      const flat=planePoint(p,pc,0,pl,spec.dih);assert.ok(close(flat[0],p[0]-pl.cx,1e-9),'flat at t=0');
      const done=planePoint(p,pc,1,pl,spec.dih);
      if(pc.part==='keel')assert.ok(done[2]<=1e-9,'keel hangs away');else assert.ok(done[2]>=-1e-9,'wings up');}
    // A point exactly on the keel line lands in the same place whether treated as keel or wing.
    const y=(G.yMin+G.yTip)/2,u=pl.h(y),p=[pl.cx-u,y];
    for(const t of [0.3,0.7,1]){const k=planePoint(p,{side:-1,part:'keel',layer:0},t,pl,5),w=planePoint(p,{side:-1,part:'wing',layer:0},t,pl,5);
      assert.ok(close(k[1],w[1])&&close(k[2],w[2],1e-9)&&Math.abs(k[0]-w[0])<0.2);}
  });
}
test('a crease lifts the flap off the sheet and lays it down mirrored',()=>{
  const {spec}=specs['classic-dart'];const {steps}=replay(spec.W,spec.L,spec.folds);const st=steps[0];const f0=st.fold,n0=st.n,dist=q=>Math.abs((q[0]-f0.P[0])*n0[0]+(q[1]-f0.P[1])*n0[1]);
  const p=st.mv[0].pts.reduce((a,b)=>dist(b)>dist(a)?b:a);  // the flap's corner furthest from the crease
  const half=creasePoint(p,st,Math.PI/2,0),done=creasePoint(p,st,Math.PI,0);
  assert.ok(half[2]>0);assert.ok(close(done[2],0,1e-9));
  const f=st.fold,n=st.n,k=(p[0]-f.P[0])*n[0]+(p[1]-f.P[1])*n[1];
  assert.ok(close(done[0],p[0]-2*k*n[0])&&close(done[1],p[1]-2*k*n[1]));
});
