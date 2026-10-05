// ===== drawing =====
import {S,$,css,INKS,PAPERS,spec} from './state.js';
import {applyFolds,lineNormal,clipHalf,polyArea} from '../core/folds.js';
import {geometry} from '../core/geometry.js';

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
export function geoSpec(G){return{W:S.W,L:S.L,folds:S.folds,hT:S.hT,hN:S.hN,yMin:G.yMin,yTip:G.yTip,semi:G.semi};}

const baseC=$('baseC'),inkC=$('inkC');let drawGeo=null,drawing=null;
INKS.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.setAttribute('aria-label','ink '+c);b.setAttribute('aria-pressed',i===0);b.onclick=()=>{S.ink=c;$('pal').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));};$('pal').appendChild(b);});
const pl=document.createElement('span');pl.className='sub';pl.textContent='Paper:';pl.style.marginRight='4px';$('papers').appendChild(pl);
PAPERS.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.setAttribute('aria-label','paper '+c);b.setAttribute('aria-pressed',i===0);b.onclick=()=>{S.paper=c;$('papers').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderDraw();};$('papers').appendChild(b);});
$('brushS').onclick=()=>{S.brush=0.008;$('brushS').setAttribute('aria-pressed',true);$('brushL').setAttribute('aria-pressed',false);};
$('brushL').onclick=()=>{S.brush=0.022;$('brushL').setAttribute('aria-pressed',true);$('brushS').setAttribute('aria-pressed',false);};
$('clearInk').onclick=()=>{if(S.strokes.length&&confirm('Clear your drawing?')){S.strokes=[];renderDraw();}};
function topViewSize(G,maxW,maxH){const sp=2*Math.max(G.semi,20),len=G.len;const sc=Math.min(maxW/sp,maxH/len);return{w:Math.round(sp*sc),h:Math.round(len*sc),sc,sp};}
function drawStrokes(ctx,w,h,strokes){ctx.lineCap='round';ctx.lineJoin='round';for(const st of strokes){ctx.strokeStyle=st.c;ctx.lineWidth=st.w*w;ctx.beginPath();st.p.forEach((q,i)=>i?ctx.lineTo(q[0]*w,q[1]*h):ctx.moveTo(q[0]*w,q[1]*h));if(st.p.length===1)ctx.lineTo(st.p[0][0]*w+0.1,st.p[0][1]*h);ctx.stroke();}}
const maskC=document.createElement('canvas');
export function renderDraw(){drawGeo=geometry(spec(),2);const G=drawGeo;if(G.noWing){baseC.width=inkC.width=400;baseC.height=inkC.height=120;const c=baseC.getContext('2d');c.clearRect(0,0,400,120);c.fillStyle=css('--graphite');c.font='600 18px Archivo,sans-serif';c.fillText('No wings to draw on. Make the keel shallower.',10,60);inkC.getContext('2d').clearRect(0,0,400,120);return;}
  const {w,h}=topViewSize(G,800,1000);baseC.width=inkC.width=maskC.width=w;baseC.height=inkC.height=maskC.height=h;const polys=silPolys(geoSpec(G));
  const c=baseC.getContext('2d');c.fillStyle=css('--paper')||'#F6F8FA';c.fillRect(0,0,w,h);c.strokeStyle=css('--grid')||'#DFE6EE';c.lineWidth=1;for(let x=0;x<w;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=0;y<h;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  drawSil(c,w,h,polys,S.paper,true,'rgba(21,36,58,0.45)');c.strokeStyle='rgba(21,36,58,.5)';c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();c.setLineDash([]);
  const m=maskC.getContext('2d');m.clearRect(0,0,w,h);drawSil(m,w,h,polys,'#000',false,null);redrawInk();}
function redrawInk(){const w=inkC.width,h=inkC.height;const c=inkC.getContext('2d');c.clearRect(0,0,w,h);drawStrokes(c,w,h,S.strokes);c.globalCompositeOperation='destination-in';c.drawImage(maskC,0,0);c.globalCompositeOperation='source-over';}
function normPt(e){const r=inkC.getBoundingClientRect();return[Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
inkC.addEventListener('pointerdown',e=>{if(!drawGeo||drawGeo.noWing)return;inkC.setPointerCapture(e.pointerId);drawing={c:S.ink,w:S.brush,p:[normPt(e)]};S.strokes.push(drawing);redrawInk();});
inkC.addEventListener('pointermove',e=>{if(!drawing)return;drawing.p.push(normPt(e).map(v=>Math.round(v*1000)/1000));redrawInk();});
['pointerup','pointercancel'].forEach(t=>inkC.addEventListener(t,()=>{drawing=null;if(S.strokes.length>400)S.strokes=S.strokes.slice(-400);}));
export function exportTexture(G){const N=256;const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');if(G.noWing){x.fillStyle=S.paper;x.fillRect(0,0,N,N);}else{
  drawSil(x,N,N,silPolys(geoSpec(G)),S.paper,true,'rgba(21,36,58,0.3)');x.globalCompositeOperation='source-atop';drawStrokes(x,N,N,S.strokes);x.globalCompositeOperation='source-over';}
  let u=c.toDataURL('image/webp',0.85);if(u.length>140000)u=c.toDataURL('image/jpeg',0.7);return u;}
