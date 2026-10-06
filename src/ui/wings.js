// ===== wings =====
import {S,$,app,curPolys,spec,paperOf} from './state.js';
import {svgPaper} from './papers.js';
import {clipHalf} from '../core/folds.js';
import {geometry} from '../core/geometry.js';
import {aeroModel} from '../core/aero.js';
import {polyPts} from './fold.js';

const wsvg=$('wingSvg');let wingTimer=null;
// Dragging a keel slider plays soft notes that rise with the keel depth (at most ~12 a second).
let keelT=0;
['hN','hT'].forEach(k=>$(k).addEventListener('input',()=>{S[k]=+$(k).value;const now=performance.now();if(app.audio&&now-keelT>80){keelT=now;app.audio.cue('keel',{v:S[k]/+$(k).max});}$(k+'o').textContent=S[k]+' mm';clearTimeout(wingTimer);wingTimer=setTimeout(renderWings,30);}));
export function renderWings(){const W=S.W,L=S.L,cx=W/2,pad=12;$('hNo').textContent=S.hN+' mm';$('hTo').textContent=S.hT+' mm';const polys=curPolys();
  const half=polys.map(p=>clipHalf(p,[cx,0],[-1,0],1)).filter(p=>p.length>2);const G=geometry(spec(),2);
  wsvg.setAttribute('viewBox',`${-pad} ${-pad} ${cx+2*pad+34} ${L+2*pad}`);
  const P0=[cx-S.hT,G.yMin],P1=[cx-S.hN,G.yTip];
  let g=`<g transform="translate(0 ${L}) scale(1 -1)">`;
  g+=`<polygon points="${cx},${G.yMin} ${P0[0]},${P0[1]} ${P1[0]},${P1[1]} ${cx},${G.yTip}" fill="var(--pen)" fill-opacity="0.10"/>`;
  const pp=paperOf(S),sv=svgPaper(pp,'wingPaper'),edge=pp.dark?'#E8EEF5':'var(--ink)';g+=`<defs>${sv.defs}</defs>`;
  for(const pl of half)g+=`<polygon points="${polyPts(pl)}" fill="${sv.fill}" stroke="none"/>`;
  for(const pl of half)g+=`<polygon points="${polyPts(pl)}" fill="var(--layer)" stroke="${edge}" stroke-width="1.1" stroke-linejoin="round"/>`;
  g+=`<line x1="${cx}" y1="${G.yMin-6}" x2="${cx}" y2="${G.yTip+6}" stroke="var(--ink)" stroke-width="2.4"/>`;
  g+=`<line x1="${P0[0]}" y1="${P0[1]-6}" x2="${P1[0]}" y2="${P1[1]+6}" stroke="var(--fold)" stroke-width="2.4" stroke-dasharray="7 4"/>`;
  g+=`<line x1="${cx-G.sCG*0+0}" y1="${G.yTip-G.sCG}" x2="${cx-24}" y2="${G.yTip-G.sCG}" stroke="var(--fold)" stroke-width="2.2"/></g>`;
  g+=`<text x="${cx+5}" y="${L-(G.yMin+G.yTip)/2}" font-size="12" font-weight="700" fill="var(--ink)">keel</text>`;
  g+=`<text x="${cx-26}" y="${L-(G.yTip-G.sCG)+4}" font-size="11" font-weight="700" fill="var(--fold)" text-anchor="end">balance</text>`;
  wsvg.innerHTML=g;const A=aeroModel(G,S.dih);
  const rows=G.noWing?[['Wing','none: all keel']]:[['Wingspan',(G.b*1000).toFixed(0)+' mm'],['Length',G.len.toFixed(0)+' mm'],['Wing area',(G.S*1e4).toFixed(0)+' cm²'],['Aspect ratio',G.AR.toFixed(2)],['Average layers',G.kW.toFixed(1)],['Holds together up to',A.Vcap.toFixed(0)+' m/s']];
  $('wingSpec').innerHTML=rows.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('');
  const pos=Math.max(0,Math.min(1,(G.SM+0.15)/0.6));$('balI').style.left=(pos*100)+'%';}
