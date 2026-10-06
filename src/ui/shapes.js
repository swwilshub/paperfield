// Plane outline shapes, shared by the 3D world and the plane card thumbnail.
import {applyFolds,lineNormal,clipHalf,polyArea} from '../core/folds.js';
import {paperDef,paperFill} from './papers.js';

export function pieces(p){const cx=p.W/2,len=Math.max(1,p.yTip-p.yMin);const polys=applyFolds(p.W,p.L,p.folds);
  const P0=[cx-p.hT,p.yMin],P1=[cx-p.hN,p.yTip];const n=lineNormal({P:P0,Q:P1});const sg=((0-P0[0])*n[0]+((P0[1]+P1[1])/2-P0[1])*n[1])>0?1:-1;
  const xf=y=>cx-(p.hT+(p.hN-p.hT)*((y-p.yMin)/len));const wing=[],keel=[];
  for(const q0 of polys){const q=clipHalf(q0,[cx,0],[-1,0],1);if(q.length<3)continue;const wq=clipHalf(q,P0,n,sg),kq=clipHalf(q,P0,n,-sg);
    if(wq.length>2&&Math.abs(polyArea(wq))>0.5)wing.push(wq.map(([x,y])=>[Math.max(0,xf(y)-x),p.yTip-y]));
    if(kq.length>2&&Math.abs(polyArea(kq))>0.5)keel.push(kq.map(([x,y])=>[Math.max(0,x-xf(y)),p.yTip-y]));}
  return{wing,keel,len};}
export function silPolys(p){const {wing,len}=pieces(p);const semi=Math.max(p.semi,20);const out=[];for(const side of [1,-1])for(const w of wing)out.push(w.map(([e,s])=>[0.5+side*e/(2*semi),s/len]));return out;}
export function drawSil(ctx,w,h,polys,fill,shade,outline){ctx.fillStyle=fill;for(const q of polys){ctx.beginPath();q.forEach((pt,i)=>i?ctx.lineTo(pt[0]*w,pt[1]*h):ctx.moveTo(pt[0]*w,pt[1]*h));ctx.closePath();ctx.fill();}
  if(shade){ctx.fillStyle='rgba(21,36,58,0.07)';for(const q of polys){ctx.beginPath();q.forEach((pt,i)=>i?ctx.lineTo(pt[0]*w,pt[1]*h):ctx.moveTo(pt[0]*w,pt[1]*h));ctx.closePath();ctx.fill();}}
  if(outline){ctx.strokeStyle=outline;ctx.lineWidth=Math.max(1,w/400);ctx.lineJoin='round';for(const q of polys){ctx.beginPath();q.forEach((pt,i)=>i?ctx.lineTo(pt[0]*w,pt[1]*h):ctx.moveTo(pt[0]*w,pt[1]*h));ctx.closePath();ctx.stroke();}}}
// Small top-view picture of a plane in its paper colour, for the plane card.
const thumbs=new Map();
export function thumbnail(p,size){size=size||144;const key=p.id+':'+size;if(thumbs.has(key))return thumbs.get(key);
  const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');let url='';
  try{const polys=silPolys(p);const sp=2*Math.max(p.semi,20),len=Math.max(1,p.yTip-p.yMin),k=0.9*size/Math.max(sp,len),w=sp*k,h=len*k;
    x.translate((size-w)/2,(size-h)/2);if(polys.length)drawSil(x,w,h,polys,paperFill(x,paperDef(p.paper),k),true,'rgba(21,36,58,0.45)');url=c.toDataURL('image/png');}catch(e){}
  thumbs.set(key,url);return url;}
