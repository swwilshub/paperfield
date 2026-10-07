// ===== folding =====
import {S,$,app,r1,curPolys,paperOf} from './state.js';
import {svgPaper} from './papers.js';
import {pip,splitByFold,lineNormal,polyArea,bboxOf,foldPolys} from '../core/folds.js';
import {playDemo,stopDemo,shouldDemo} from './folddemo.js';

const fsvg=$('foldSvg');
function lineSegIn(polys,P,Q){const d=[Q[0]-P[0],Q[1]-P[1]],L=Math.hypot(d[0],d[1])||1;const u=[d[0]/L,d[1]/L];const T=S.W+S.L;let a=null,b=null;
  for(let i=0;i<=500;i++){const t=-T+2*T*i/500;const p=[P[0]+u[0]*t,P[1]+u[1]*t];if(polys.some(pl=>pip(p,pl))){if(!a)a=p;b=p;}}return a?[a,b]:null;}
function movedArea(polys,f){return splitByFold(polys,f).mv.reduce((s,q)=>s+Math.abs(polyArea(q)),0);}
function mkFold(P,Q,flip,polys){const n=lineNormal({P,Q});const Mp=[P[0]+n[0]*10,P[1]+n[1]*10],Mn=[P[0]-n[0]*10,P[1]-n[1]*10];
  const a=movedArea(polys,{P,Q,M:Mp}),b=movedArea(polys,{P,Q,M:Mn});if(a<25||b<25)return{err:"That crease doesn't cross the paper."};
  let M=a<=b?Mp:Mn;if(flip)M=M===Mp?Mn:Mp;return{P:P.map(r1),Q:Q.map(r1),M:M.map(r1)};}
function resolveFold(P,Q,flip){const W=S.W,cx=W/2,polys=curPolys();
  if(Math.hypot(Q[0]-P[0],Q[1]-P[1])<12)return{err:'Drag a longer line.'};
  if(Math.abs(P[0]-cx)<4&&Math.abs(Q[0]-cx)<4)return{err:'The centre fold happens on its own in the Wings step.'};
  const f=mkFold(P,Q,flip,polys);if(f.err)return f;const bb=bboxOf(splitByFold(polys,f).mv);
  if(bb.x1<=cx+2.5||bb.x0>=cx-2.5)return{folds:[f,{P:[r1(W-f.P[0]),f.P[1]],Q:[r1(W-f.Q[0]),f.Q[1]],M:[r1(W-f.M[0]),f.M[1]]}]};
  const ang=Math.abs(Math.atan2(Q[1]-P[1],Q[0]-P[0]))*180/Math.PI,h=Math.min(ang,180-ang);
  if(h<=28){const t=(cx-P[0])/((Q[0]-P[0])||1e-9);const yc=P[1]+t*(Q[1]-P[1]);const f2=mkFold([0,yc],[W,yc],flip,polys);if(f2.err)return f2;return{folds:[f2],snapped:true};}
  return{err:'Creases must stay on one side of the centre line, or run straight across it.'};}
function snap(p,polys){const cx=S.W/2;let best=null,bd=9;
  for(const pl of polys)for(const q of pl){const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;best=[q[0],q[1]];}}
  if(best)return best;
  // where the centre line meets a paper edge, then any paper edge
  bd=8;for(const pl of polys)for(let i=0;i<pl.length;i++){const a=pl[i],b=pl[(i+1)%pl.length];
    if((a[0]-cx)*(b[0]-cx)<=0&&a[0]!==b[0]){const t=(cx-a[0])/(b[0]-a[0]);const q=[cx,a[1]+t*(b[1]-a[1])];const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;best=q;}}}
  if(best)return best;
  bd=6;for(const pl of polys)for(let i=0;i<pl.length;i++){const a=pl[i],b=pl[(i+1)%pl.length];const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1;
    let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));let q=[a[0]+t*dx,a[1]+t*dy];
    if(Math.abs(dx)<1e-6)q[1]=Math.max(Math.min(a[1],b[1]),Math.min(Math.max(a[1],b[1]),Math.round(q[1]/5)*5));else if(Math.abs(dy)<1e-6)q[0]=Math.max(Math.min(a[0],b[0]),Math.min(Math.max(a[0],b[0]),Math.round(q[0]/5)*5));
    const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;best=q;}}
  if(best)return best;
  if(Math.abs(p[0]-cx)<5)return[cx,Math.round(p[1]/5)*5];return[Math.round(p[0]/5)*5,Math.round(p[1]/5)*5];}
function svgPoint(evt){const g=fsvg.querySelector('#flipG');const pt=fsvg.createSVGPoint();pt.x=evt.clientX;pt.y=evt.clientY;const p=pt.matrixTransform(g.getScreenCTM().inverse());return[p.x,p.y];}
export function polyPts(pl){return pl.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');}
export function renderFold(){stopDemo();const W=S.W,L=S.L,cx=W/2,pad=12;const polys=curPolys();fsvg.setAttribute('viewBox',`${-pad} ${-pad} ${W+2*pad} ${L+2*pad}`);
  let g=`<rect x="${-pad}" y="${-pad}" width="${W+2*pad}" height="${L+2*pad}" fill="transparent"/><g id="flipG" transform="translate(0 ${L}) scale(1 -1)">`;
  g+=`<rect x="0" y="0" width="${W}" height="${L}" fill="none" stroke="var(--faint)" stroke-dasharray="3 4" stroke-width="0.8"/>`;
  // The sheet in the chosen paper, with each layer shaded on top so the stack shows.
  const pp=paperOf(S),sv=svgPaper(pp,'foldPaper'),edge=pp.dark?'#E8EEF5':'var(--ink)';g+=`<defs>${sv.defs}</defs>`;
  for(const pl of polys)g+=`<polygon points="${polyPts(pl)}" fill="${sv.fill}" stroke="none"/>`;
  for(const pl of polys)g+=`<polygon points="${polyPts(pl)}" fill="var(--layer)" stroke="${edge}" stroke-width="1.1" stroke-linejoin="round"/>`;
  g+=`<line x1="${cx}" y1="0" x2="${cx}" y2="${L}" stroke="var(--faint)" stroke-width="0.8" stroke-dasharray="1 3"/>`;
  const pd=S.pending;
  if(pd&&pd.res&&pd.res.folds){let tmp=polys;for(const f of pd.res.folds){const {mv}=splitByFold(tmp,f);for(const m of mv)g+=`<polygon points="${polyPts(m)}" fill="var(--pen)" fill-opacity="0.22" stroke="none"/>`;
      const seg=lineSegIn(tmp,f.P,f.Q);if(seg)g+=`<line x1="${seg[0][0]}" y1="${seg[0][1]}" x2="${seg[1][0]}" y2="${seg[1][1]}" stroke="var(--fold)" stroke-width="2.4" stroke-dasharray="7 4"/>`;tmp=foldPolys(tmp,f);}
    for(const pl of tmp)g+=`<polygon points="${polyPts(pl)}" fill="none" stroke="var(--pen)" stroke-width="1.6" stroke-dasharray="4 3"/>`;}
  if(S.drag){const a=S.drag.a,b=S.drag.b||S.drag.a;g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(--fold)" stroke-width="2.4"/><circle cx="${a[0]}" cy="${a[1]}" r="3.5" fill="var(--fold)"/><circle cx="${b[0]}" cy="${b[1]}" r="3.5" fill="var(--fold)"/>`;}
  if(kb){const [x,y]=kb.p;g+=`<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="var(--pen)" stroke-width="1.6"/><path d="M${x-10} ${y}h6M${x+4} ${y}h6M${x} ${y-10}v6M${x} ${y+4}v6" stroke="var(--pen)" stroke-width="1.4"/>`;}
  g+='</g>';fsvg.innerHTML=g;
  $('orientBox').hidden=S.folds.length>0;$('undo').disabled=!S.actions.length;$('restart').disabled=!S.folds.length;
  $('foldCount').textContent=S.actions.length?`${S.actions.length} crease${S.actions.length>1?'s':''} so far.`:'';
  $('pendingBtns').hidden=!(pd&&pd.res&&pd.res.folds);$('foldMain').hidden=!$('pendingBtns').hidden;$('foldDemoBtn').hidden=S.folds.length>0;}
// The fold demo (folddemo.js): once on a first blank sheet, and again from "Show me".
const HINT='Drag a line across the paper to crease it. Folds are mirrored on the other side. Try folding the top corners to the centre.';
function demo(){playDemo(fsvg,finished=>{$('foldHint').textContent=finished?'Your turn: drag a line over a corner, then tap Fold.':HINT;if(finished)renderFold();});}
export function maybeFoldDemo(){if(shouldDemo())setTimeout(()=>{if(document.body.dataset.mode==='fold'&&!S.drag&&shouldDemo())demo();},450);}
$('foldDemoBtn').addEventListener('click',()=>{if(S.folds.length)return;S.pending=null;demo();});
fsvg.addEventListener('pointerdown',e=>{if(app.audio)app.audio.stage('fold');if(S.actions.length>=14){$('foldHint').innerHTML='<span class="err">That\'s 14 creases. The paper won\'t take more.</span>';return;}
  fsvg.setPointerCapture(e.pointerId);const polys=curPolys();S.pending=null;S.drag={a:snap(svgPoint(e),polys),b:null,polys};renderFold();});
fsvg.addEventListener('pointermove',e=>{if(!S.drag)return;S.drag.b=snap(svgPoint(e),S.drag.polys);renderFold();});
fsvg.addEventListener('pointerup',()=>{if(!S.drag)return;const d=S.drag;S.drag=null;if(!d.b){renderFold();return;}finishCrease(d);});
// A crease line drawn (by pointer or keyboard): check it and show it as pending, ready to fold.
function finishCrease(d){
  const res=resolveFold(d.a,d.b,false);S.pending={a:d.a,b:d.b,flip:false,res};
  $('foldHint').innerHTML=res.err?`<span class="err">${res.err}</span>`:res.snapped?'Across the middle: snapped level so both halves fold together. Blue shows the paper that moves.':'Blue shows the paper that moves. The same fold happens on the other side.';
  if(res.err)S.pending=null;renderFold();cue(res.err?'nope':'pending');}
// Keyboard: a cursor on the sheet moved with the arrow keys (5 mm, or 25 mm with Shift); Enter sets the
// crease's start and then its end, Escape cancels. Then Fold in the dock, as with a pointer.
let kb=null;
fsvg.addEventListener('focus',()=>{if(!kb&&fsvg.matches(':focus-visible')){kb={p:[S.W/2,S.L]};renderFold();}});   // not on a mouse click
fsvg.addEventListener('blur',()=>{kb=null;if(S.drag&&S.drag.kb)S.drag=null;renderFold();});
fsvg.addEventListener('keydown',e=>{if(!kb)kb={p:[S.W/2,S.L]};const step=e.shiftKey?25:5,mv={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,step],ArrowDown:[0,-step]}[e.key];
  if(mv){e.preventDefault();kb.p=[Math.max(0,Math.min(S.W,kb.p[0]+mv[0])),Math.max(0,Math.min(S.L,kb.p[1]+mv[1]))];if(S.drag&&S.drag.kb)S.drag.b=snap(kb.p,S.drag.polys);renderFold();return;}
  if(e.key==='Escape'){if(S.drag&&S.drag.kb){S.drag=null;$('foldHint').textContent='Cancelled.';renderFold();}return;}
  if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();
  if(!(S.drag&&S.drag.kb)){if(S.actions.length>=14)return;if(app.audio)app.audio.stage('fold');const polys=curPolys();S.pending=null;const a=snap(kb.p,polys);
    S.drag={a,b:a,polys,kb:true};$('foldHint').textContent=`Start set at ${Math.round(a[0])}, ${Math.round(a[1])} mm. Move to the end of the crease and press Enter.`;renderFold();return;}
  const d=S.drag;S.drag=null;d.b=snap(kb.p,d.polys);finishCrease(d);});
fsvg.addEventListener('pointercancel',()=>{S.drag=null;renderFold();});
$('flipFold').addEventListener('click',()=>{const p=S.pending;if(!p)return;const res=resolveFold(p.a,p.b,!p.flip);if(res.err){$('foldHint').innerHTML=`<span class="err">${res.err}</span>`;return;}p.flip=!p.flip;p.res=res;renderFold();});
$('doFold').addEventListener('click',()=>{const p=S.pending;if(!p||!p.res.folds)return;S.folds=S.folds.concat(p.res.folds);S.actions.push(p.res.folds.length);S.pending=null;$('foldHint').textContent='Folded. Draw another crease, or move on to the wings.';clampKeel();renderFold();});
$('cancelFold').addEventListener('click',()=>{S.pending=null;$('foldHint').textContent='Cancelled.';renderFold();});
$('undo').addEventListener('click',()=>{const n=S.actions.pop();if(n)S.folds=S.folds.slice(0,S.folds.length-n);S.pending=null;renderFold();});
$('restart').addEventListener('click',()=>{if(!confirm('Unfold everything and start with a fresh sheet?'))return;S.folds=[];S.actions=[];S.pending=null;renderFold();});
document.querySelectorAll('[data-or]').forEach(b=>b.addEventListener('click',()=>{if(S.folds.length)return;S.orient=b.dataset.or;S.W=S.orient==='portrait'?210:297;S.L=S.orient==='portrait'?297:210;
  document.querySelectorAll('[data-or]').forEach(x=>x.setAttribute('aria-pressed',x===b));clampKeel();renderFold();}));
export const KEEL_MIN=3;
export function clampKeel(){const cx=Math.floor(S.W/2);for(const k of ['hN','hT'])S[k]=Math.max(KEEL_MIN,Math.min(cx,S[k]));}

// Musical cues (no-ops until sound is unlocked). Registered after the handlers above, so they see the result.
function cue(n,d){if(app.audio)app.audio.cue(n,d);}
$('doFold').addEventListener('click',()=>cue('crease',{n:S.actions.length}));
$('flipFold').addEventListener('click',()=>cue('pending'));
$('undo').addEventListener('click',()=>cue('undo'));
$('restart').addEventListener('click',()=>{if(!S.actions.length)cue('restart');});
