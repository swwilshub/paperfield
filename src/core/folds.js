// Ported verbatim from legacy/one-sheet-game.html (physics core). Do not edit without updating tests/golden.json.
// Fold engine: polygons, mirrored creases, point-in-polygon.
export function polyArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=q[0]*r[1]-r[0]*q[1];}return a/2;}
export function clipHalf(poly,P,n,sgn){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];
  const fa=sgn*((a[0]-P[0])*n[0]+(a[1]-P[1])*n[1]),fb=sgn*((b[0]-P[0])*n[0]+(b[1]-P[1])*n[1]);
  if(fa>=0)out.push(a);if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;}
export function lineNormal(f){const d=[f.Q[0]-f.P[0],f.Q[1]-f.P[1]],L=Math.hypot(d[0],d[1])||1;return[-d[1]/L,d[0]/L];}
export function sideSign(f){const n=lineNormal(f);return((f.M[0]-f.P[0])*n[0]+(f.M[1]-f.P[1])*n[1])>0?1:-1;}
export function reflectPt(p,f){const n=lineNormal(f);const k=(p[0]-f.P[0])*n[0]+(p[1]-f.P[1])*n[1];return[p[0]-2*k*n[0],p[1]-2*k*n[1]];}
export function splitByFold(polys,f){const n=lineNormal(f),sg=sideSign(f);const stay=[],mv=[];
  for(const poly of polys){const s=clipHalf(poly,f.P,n,-sg),m=clipHalf(poly,f.P,n,sg);if(Math.abs(polyArea(s))>0.3)stay.push(s);if(Math.abs(polyArea(m))>0.3)mv.push(m);}return{stay,mv};}
export function foldPolys(polys,f){const {stay,mv}=splitByFold(polys,f);return stay.concat(mv.reverse().map(m=>m.map(p=>reflectPt(p,f))));}
export function sheetRect(W,L){return[[[0,0],[W,0],[W,L],[0,L]]];}
export function applyFolds(W,L,folds){let p=sheetRect(W,L);for(const f of folds)p=foldPolys(p,f);return p;}
export function pip(pt,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];
  if(((a[1]>pt[1])!==(b[1]>pt[1]))&&(pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0]))ins=!ins;}return ins;}
export function bboxOf(polys){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of polys)for(const q of p){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}return{x0,x1,y0,y1};}
