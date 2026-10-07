// ===== wings =====
// The wing fold is a line on the half plane, from the tail to the nose. It's always drawn with a handle
// at each end; dragging an end (like drawing a crease on the fold step) sets the keel depth there.
import {S,$,app,curPolys,spec,paperOf} from './state.js';
import {svgPaper} from './papers.js';
import {clipHalf} from '../core/folds.js';
import {geometry} from '../core/geometry.js';
import {aeroModel} from '../core/aero.js';
import {polyPts,clampKeel} from './fold.js';

const wsvg=$('wingSvg'),PADX=12,PADY=24;let drag=null,raf=0;
export function renderWings(){const W=S.W,L=S.L,cx=W/2;$('hNo').textContent=S.hN+' mm';$('hTo').textContent=S.hT+' mm';const polys=curPolys();
  const half=polys.map(p=>clipHalf(p,[cx,0],[-1,0],1)).filter(p=>p.length>2);const G=geometry(spec(),2);
  wsvg.setAttribute('viewBox',`${-PADX} ${-PADY} ${cx+2*PADX+34} ${L+2*PADY}`);
  const P0=[cx-S.hT,G.yMin],P1=[cx-S.hN,G.yTip];
  let g=`<rect x="${-PADX}" y="${-PADY}" width="${cx+2*PADX+34}" height="${L+2*PADY}" fill="transparent"/><g id="wingG" transform="translate(0 ${L}) scale(1 -1)">`;
  g+=`<polygon points="${cx},${G.yMin} ${P0[0]},${P0[1]} ${P1[0]},${P1[1]} ${cx},${G.yTip}" fill="var(--pen)" fill-opacity="0.10"/>`;
  const pp=paperOf(S),sv=svgPaper(pp,'wingPaper'),edge=pp.dark?'#E8EEF5':'var(--ink)';g+=`<defs>${sv.defs}</defs>`;
  for(const pl of half)g+=`<polygon points="${polyPts(pl)}" fill="${sv.fill}" stroke="none"/>`;
  for(const pl of half)g+=`<polygon points="${polyPts(pl)}" fill="var(--layer)" stroke="${edge}" stroke-width="1.1" stroke-linejoin="round"/>`;
  g+=`<line x1="${cx}" y1="${G.yMin-6}" x2="${cx}" y2="${G.yTip+6}" stroke="var(--ink)" stroke-width="2.4"/>`;
  g+=`<line x1="${cx}" y1="${G.yTip-G.sCG}" x2="${cx-24}" y2="${G.yTip-G.sCG}" stroke="var(--fold)" stroke-width="2.2"/>`;
  // The wing fold line and its two handles, each with a little ‹ › to say it slides sideways.
  g+=`<line x1="${P0[0]}" y1="${P0[1]}" x2="${P1[0]}" y2="${P1[1]}" stroke="var(--fold)" stroke-width="2.4"/>`;
  for(const [P,k] of [[P1,'hN'],[P0,'hT']]){const on=drag&&drag.k===k;
    g+=`<g class="grab" data-end="${k}"><circle cx="${P[0]}" cy="${P[1]}" r="14" fill="transparent"/>
      <path d="M${P[0]-9} ${P[1]-3.5} l-4 3.5 l4 3.5 M${P[0]+9} ${P[1]-3.5} l4 3.5 l-4 3.5" fill="none" stroke="var(--fold)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${P[0]}" cy="${P[1]}" r="${on?6.5:5}" fill="var(--fold)" stroke="#fff" stroke-width="1.5"/></g>`;}
  g+='</g>';
  g+=`<text x="${cx+5}" y="${L-(G.yMin+G.yTip)/2}" font-size="12" font-weight="700" fill="var(--ink)">keel</text>`;
  g+=`<text x="${cx-26}" y="${L-(G.yTip-G.sCG)+4}" font-size="11" font-weight="700" fill="var(--fold)" text-anchor="end">balance</text>`;
  // Depth labels: above the nose handle, below the tail handle, kept inside the view.
  const lx=x=>Math.max(18,Math.min(cx-6,x));
  g+=`<text x="${lx(P1[0])}" y="${L-P1[1]-11}" font-size="10" font-weight="800" fill="var(--fold)" text-anchor="middle" class="num">nose ${S.hN} mm</text>`;
  g+=`<text x="${lx(P0[0])}" y="${L-P0[1]+19}" font-size="10" font-weight="800" fill="var(--fold)" text-anchor="middle" class="num">tail ${S.hT} mm</text>`;
  wsvg.innerHTML=g;const A=aeroModel(G,S.dih);
  const rows=G.noWing?[['Wing','none: all keel']]:[['Wingspan',(G.b*1000).toFixed(0)+' mm'],['Length',G.len.toFixed(0)+' mm'],['Wing area',(G.S*1e4).toFixed(0)+' cm²'],['Aspect ratio',G.AR.toFixed(2)],['Average layers',G.kW.toFixed(1)],['Holds together up to',A.Vcap.toFixed(0)+' m/s']];
  $('wingSpec').innerHTML=rows.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
  const pos=Math.max(0,Math.min(1,(G.SM+0.15)/0.6));$('balI').style.left=(pos*100)+'%';}

function svgPoint(e){const g=wsvg.querySelector('#wingG');const pt=wsvg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(g.getScreenCTM().inverse());return[p.x,p.y];}
// Grab whichever end is nearer the touch, so a tap anywhere on the sheet moves the closer end.
wsvg.addEventListener('pointerdown',e=>{const G=geometry(spec(),2),cx=S.W/2,p=svgPoint(e);
  const dN=Math.hypot(p[0]-(cx-S.hN),p[1]-G.yTip),dT=Math.hypot(p[0]-(cx-S.hT),p[1]-G.yMin);
  wsvg.setPointerCapture(e.pointerId);drag={k:dN<=dT?'hN':'hT'};move(p);});
wsvg.addEventListener('pointermove',e=>{if(drag)move(svgPoint(e));});
for(const t of ['pointerup','pointercancel'])wsvg.addEventListener(t,()=>{if(!drag)return;drag=null;renderWings();});
// Soft notes that rise with the keel depth (at most ~12 a second), as the sliders had.
let keelT=0;
function move(p){const cx=Math.floor(S.W/2),v=Math.round(S.W/2-p[0]);const before=S[drag.k];S[drag.k]=v;clampKeel();
  const now=performance.now();if(S[drag.k]!==before&&app.audio&&now-keelT>80){keelT=now;app.audio.cue('keel',{v:S[drag.k]/cx});}
  if(!raf)raf=requestAnimationFrame(()=>{raf=0;renderWings();});}
