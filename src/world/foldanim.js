// Geometry for the fold-up animation, pure (no three.js) so it can be tested in Node.
//
// Creases are replayed with the same maths as the physics fold engine (core/folds.js), but each
// piece of paper keeps its stacking layer and an affine map back to the flat sheet, so the paper's
// pattern stays put as it folds. Then the folded sheet is creased down the middle and the wings are
// folded out along the keel line.
//
// Coordinates are millimetres in the sheet's frame: x across, y along (nose at the top), z out of
// the sheet towards the viewer.
import {lineNormal,sideSign,reflectPt,clipHalf,polyArea} from '../core/folds.js';

const I=[1,0,0,1,0,0];   // affine [a,b,c,d,e,f]: x'=a·x+b·y+e, y'=c·x+d·y+f
const mul=(A,B)=>[A[0]*B[0]+A[1]*B[2],A[0]*B[1]+A[1]*B[3],A[2]*B[0]+A[3]*B[2],A[2]*B[1]+A[3]*B[3],A[0]*B[4]+A[1]*B[5]+A[4],A[2]*B[4]+A[3]*B[5]+A[5]];
function reflectM(f){const n=lineNormal(f),k=2*(f.P[0]*n[0]+f.P[1]*n[1]);return[1-2*n[0]*n[0],-2*n[0]*n[1],-2*n[0]*n[1],1-2*n[1]*n[1],k*n[0],k*n[1]];}
// Where a point of the folded paper was on the flat sheet.
export function unmap(M,p){const det=M[0]*M[3]-M[1]*M[2],x=p[0]-M[4],y=p[1]-M[5];return[(M[3]*x-M[1]*y)/det,(-M[2]*x+M[0]*y)/det];}

// Replay the creases. Returns each step (the pieces that stay and the ones that fold over) and the result.
export function replay(W,L,folds){let pieces=[{pts:[[0,0],[W,0],[W,L],[0,L]],M:I,layer:0}];const steps=[];
  for(const f of folds){const n=lineNormal(f),sg=sideSign(f),stay=[],mv=[];
    for(const pc of pieces){const s=clipHalf(pc.pts,f.P,n,-sg),m=clipHalf(pc.pts,f.P,n,sg);
      if(Math.abs(polyArea(s))>0.3)stay.push({...pc,pts:s});if(Math.abs(polyArea(m))>0.3)mv.push({...pc,pts:m});}
    steps.push({fold:f,n,sg,stay,mv});
    const top=pieces.reduce((t,p)=>Math.max(t,p.layer),0),R=reflectM(f);
    // The moving stack flips over onto the top, so its order reverses.
    pieces=stay.concat(mv.slice().reverse().map((pc,i)=>({pts:pc.pts.map(p=>reflectPt(p,f)),M:mul(R,pc.M),layer:top+1+i})));}
  return{steps,final:pieces};}

// A point on a flap part-way through a crease: rotated by θ (0 flat … π folded over) about the crease.
export function creasePoint(p,step,theta,layer){const f=step.fold,n=step.n,k=(p[0]-f.P[0])*n[0]+(p[1]-f.P[1])*n[1];
  const c=Math.cos(theta);return[p[0]-k*n[0]+k*c*n[0],p[1]-k*n[1]+k*c*n[1],Math.abs(k)*Math.sin(theta)+layer*0.12];}

// Split the folded sheet down the middle and along both keel lines, so each piece is all keel or all wing.
export function plan(spec,final){const cx=spec.W/2,len=Math.max(1,spec.yTip-spec.yMin);
  const h=y=>spec.hT+(spec.hN-spec.hT)*((y-spec.yMin)/len);
  const keelLine=side=>{const P=[cx+side*spec.hT,spec.yMin],Q=[cx+side*spec.hN,spec.yTip];return{P,Q,n:lineNormal({P,Q})};};
  const out=[];
  for(const side of [-1,1])for(const pc of final){const half=clipHalf(pc.pts,[cx,0],[side,0],1);if(half.length<3||Math.abs(polyArea(half))<0.3)continue;
    const kl=keelLine(side);const inner=[cx,(spec.yMin+spec.yTip)/2];const sgn=((inner[0]-kl.P[0])*kl.n[0]+(inner[1]-kl.P[1])*kl.n[1])>0?1:-1;
    for(const [part,dir] of [['keel',sgn],['wing',-sgn]]){const q=clipHalf(half,kl.P,kl.n,dir);if(q.length>2&&Math.abs(polyArea(q))>0.3)out.push({pts:q,M:pc.M,layer:pc.layer,side,part});}}
  return{pieces:out,h,cx};}

// The centre and wing folds: t = 0 (flat, folded sheet facing you) … 1 (finished plane, keel hanging away).
// A cross-section: the keel line folds down, the keel swings to vertical, the wings tilt up to the dihedral.
export function planePoint(p,piece,t,pl,dihDeg){const u=Math.abs(p[0]-pl.cx),h=pl.h(p[1]),s=piece.side,dih=dihDeg*Math.PI/180*t;
  const a=Math.PI/2*t,fx=s*h*(1-t),d=Math.abs(u-h);
  if(piece.part==='keel'){return[fx-s*Math.cos(a)*d+s*t*(0.15+piece.layer*0.05),p[1],-Math.sin(a)*d+piece.layer*0.12*(1-t)];}
  return[fx+s*Math.cos(dih)*d,p[1],Math.sin(dih)*d+piece.layer*(0.12*(1-t)+0.05*t)];}
