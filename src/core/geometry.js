// Ported verbatim from legacy/one-sheet-game.html (physics core). Do not edit without updating tests/golden.json.
import {applyFolds,pip,bboxOf} from './folds.js';

// ---- mass & aerodynamic geometry from a symmetric layer raster ----
export const geoCache=new Map();
export function geometry(spec,cell){cell=cell||2;const key=JSON.stringify(spec)+cell;if(geoCache.has(key))return geoCache.get(key);
  const W=spec.W,L=spec.L,cx=W/2,gsm=spec.gsm;const final=applyFolds(W,L,spec.folds);const bb=bboxOf(final);
  const bbs=final.map(p=>bboxOf([p]));
  const nx=Math.ceil(cx/cell),y0=Math.max(0,bb.y0),ny=Math.ceil((bb.y1-y0)/cell);
  const lay=new Float32Array(nx*ny);
  const count=(x,y)=>{let n=0;for(let k=0;k<final.length;k++){const b=bbs[k];if(x<b.x0||x>b.x1||y<b.y0||y>b.y1)continue;if(pip([x,y],final[k]))n++;}return n;};
  let yTop=-1e9,yBot=1e9;
  for(let j=0;j<ny;j++){const y=y0+(j+0.5)*cell;for(let i=0;i<nx;i++){const x=(i+0.5)*cell;const n=(count(x,y)+count(W-x,y))/2;lay[j*nx+i]=n;if(n>0){if(y>yTop)yTop=y;if(y<yBot)yBot=y;}}}
  if(yTop<yBot){yTop=bb.y1;yBot=bb.y0;}
  const yTip=yTop+cell/2,yMin=yBot-cell/2,len=yTip-yMin;
  const hT=spec.hT,hN=spec.hN;const xf=y=>cx-(hT+(hN-hT)*((y-yMin)/Math.max(1,len)));
  const cA=cell*cell;let mSum=0,sM=0;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const n=lay[j*nx+i];if(!n)continue;mSum+=n;sM+=n*(yTip-(y0+(j+0.5)*cell));}
  const sCG=sM/mSum;let Iacc=0;
  const nb=nx+4;const cnt=new Float64Array(nb),sle=new Float64Array(nb).fill(1e9);
  let wingCells=0,wingLay=0,keelCells=0,etaMax=0,areaSs=0;
  for(let j=0;j<ny;j++){const y=y0+(j+0.5)*cell,s=yTip-y,xF=xf(y);for(let i=0;i<nx;i++){const n=lay[j*nx+i];if(!n)continue;const x=(i+0.5)*cell;Iacc+=n*(s-sCG)*(s-sCG);
    if(x<xF){const eta=xF-x;const b=Math.min(nb-1,Math.floor(eta/cell));cnt[b]++;if(s<sle[b])sle[b]=s;wingCells++;wingLay+=n;areaSs+=s;if(eta>etaMax)etaMax=eta;}else keelCells++;}}
  const sheetKg=W*L*1e-6*gsm*1e-3;const scale=sheetKg/(2*mSum*cA*1e-6*gsm*1e-3);
  const Iyy=2*Iacc*cA*1e-6*gsm*1e-3*1e-6*scale+sheetKg*1e-5;
  const Skeel=keelCells*cA*1e-6;
  let r;
  if(wingCells<6){ // no usable wing: a paper dart of keel only
    r={S:2e-4,b:0.02,AR:1,mac:0.02,SM:0.15,kW:1,kLE:1,sAC:sCG+3,sTE:sCG+10,armFlap:0,wSl:1,semi:6,noWing:true};
  }else{
    const S=2*wingCells*cA*1e-6;const semi=etaMax+cell/2;const b=2*semi*1e-3;const AR=Math.min(12,b*b/S);
    let c2=0,c1=0,qc=0,te=0;for(let k=0;k<nb;k++){if(!cnt[k])continue;const c=cnt[k]*cell;c1+=c;c2+=c*c;qc+=c*(sle[k]+0.25*c);te+=c*(sle[k]+c);}
    const mac=c2/c1,sQC=qc/c1,sCent=areaSs/wingCells;const w=Math.min(1,Math.max(0,(2.5-AR)/2));const sAC=w*sCent+(1-w)*sQC;
    const SM=(sAC-sCG)/mac;const sTE=te/c1;const armFlap=w*((sTE-0.06*mac-sCG)/mac)+(1-w)*SM;
    let leL=0,leN=0;for(let j=0;j<ny;j++){const y=y0+(j+0.5)*cell,s=yTip-y,xF=xf(y);for(let i=0;i<nx;i++){const n=lay[j*nx+i];if(!n)continue;const x=(i+0.5)*cell;if(x>=xF)continue;
      const k=Math.min(nb-1,Math.floor((xF-x)/cell));if(s<sle[k]+0.15*cnt[k]*cell){leL+=n;leN++;}}}
    r={S,b,AR,mac:mac*1e-3,SM,kW:wingLay/wingCells,kLE:leL/Math.max(1,leN),sAC,sTE,armFlap,wSl:w,semi};}
  const res=Object.assign(r,{W,L,cx,cell,nx,ny,y0,lay,xf,yTip,yMin,len,sCG,Skeel,mass:sheetKg,Iyy,gsm,final});
  geoCache.set(key,res);if(geoCache.size>300)geoCache.clear();return res;}
