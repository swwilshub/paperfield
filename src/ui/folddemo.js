// ===== fold demo =====
// The first time the fold step opens on a blank sheet, the sheet shows how folding works: a finger
// drags a line over the top-left corner, the mirror crease appears, "Fold here" is pressed, both
// corners fold over, then unfold back to the full sheet. Touching the sheet stops it; "Show me" replays it.
// It draws straight into the fold SVG (the real sheet comes back with renderFold), using the same
// flipped #flipG group so the sheet sits exactly where the real one does.
import {S,$,paperOf,reduceMotion} from './state.js';
import {svgPaper} from './papers.js';

const SEEN='paperfield-fold-demo';
const ease=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const clamp01=t=>Math.max(0,Math.min(1,t));
const span=(t,a,b)=>clamp01((t-a)/(b-a));
const pts=a=>a.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
const lerp=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];

let run=null;
export const demoRunning=()=>!!run;
export function shouldDemo(){if(reduceMotion||S.folds.length)return false;try{return !localStorage.getItem(SEEN);}catch(e){return false;}}
// Stop without redrawing (the caller redraws the real sheet).
export function stopDemo(){if(!run)return;cancelAnimationFrame(run.raf);const done=run.done;run=null;done(false);}

export function playDemo(svg,done){stopDemo();try{localStorage.setItem(SEEN,'1');}catch(e){}
  const W=S.W,L=S.L,cx=W/2,pad=12;const pp=paperOf(S),sv=svgPaper(pp,'demoPaper'),edge=pp.dark?'#E8EEF5':'var(--ink)';
  // Fold the top corners to the centre line: crease from the top middle B down to C on the side.
  const flaps=[1,-1].map(s=>{const X=x=>s>0?x:W-x;const A=[X(0),L],B=[cx,L],C=[X(0),L-cx];
    return{A,B,C,F:lerp(B,C,0.5)};});   // F: where the corner's path crosses the crease (its midpoint, for a 45° fold)
  const stay=[[0,0],[W,0],[W,L-cx],[cx,L],[0,L-cx]];
  const crease=flaps[0],mid=lerp(crease.B,crease.C,0.5);
  const pill={x:mid[0]+30,y:L-mid[1]+22,w:62,h:20};   // screen (unflipped) coordinates, inside the sheet
  const hint=(t)=>{$('foldHint').textContent=t;};
  const T={finger:0.5,drag:1,dragEnd:2,mirror:2.2,pill:2.5,toPill:2.7,press:3.1,fold:3.35,foldEnd:4.35,unfold:5.2,end:5.9};
  let said=-1;const t0=performance.now();
  function frame(now){const t=(now-t0)/1000;
    const step=t<T.mirror?0:t<T.fold?1:2;if(step!==said){said=step;hint(['Watch: drag a line over a corner…','…the same crease appears on the other side. Tap Fold here…','…and it folds. Your turn!'][step]);}
    const th=Math.PI*(t<T.unfold?ease(span(t,T.fold,T.foldEnd)):1-ease(span(t,T.unfold,T.end)));   // 0 flat … π folded over
    const pressed=t>=T.press&&t<T.press+0.25;
    let g=`<rect x="${-pad}" y="${-pad}" width="${W+2*pad}" height="${L+2*pad}" fill="transparent"/><defs>${sv.defs}</defs><g id="flipG" transform="translate(0 ${L}) scale(1 -1)">`;
    // Flat, it's just the sheet (no outlines giving the creases away); folding, the corners come off it.
    const sheet=th>1e-3?stay:[[0,0],[W,0],[W,L],[0,L]];
    g+=`<polygon points="${pts(sheet)}" fill="${sv.fill}"/><polygon points="${pts(sheet)}" fill="var(--layer)" stroke="${edge}" stroke-width="1.1" stroke-linejoin="round"/>`;
    g+=`<line x1="${cx}" y1="0" x2="${cx}" y2="${L}" stroke="var(--faint)" stroke-width="0.8" stroke-dasharray="1 3"/>`;
    for(const f of flaps){const k=Math.cos(th);const A=[f.F[0]+(f.A[0]-f.F[0])*k,f.F[1]+(f.A[1]-f.F[1])*k];const tri=pts([A,f.B,f.C]);
      if(th>1e-3)g+=`<polygon points="${tri}" fill="${sv.fill}"/><polygon points="${tri}" fill="${k<0?'rgba(21,36,58,.10)':'var(--layer)'}" stroke="${edge}" stroke-width="1.1" stroke-linejoin="round"/>`;
      // The paper that will move, shown blue (as when you draw a real crease) until it folds.
      if(t>=T.dragEnd&&t<T.fold&&(f===crease||t>=T.mirror))g+=`<polygon points="${tri}" fill="var(--pen)" fill-opacity="0.22"/>`;}
    // The crease being drawn, then both creases dashed.
    if(t>=T.drag&&t<T.foldEnd){const k=ease(span(t,T.drag,T.dragEnd));const tip=lerp(crease.B,crease.C,k);
      g+=t<T.dragEnd?`<line x1="${crease.B[0]}" y1="${crease.B[1]}" x2="${tip[0]}" y2="${tip[1]}" stroke="var(--fold)" stroke-width="2.4"/><circle cx="${crease.B[0]}" cy="${crease.B[1]}" r="3.5" fill="var(--fold)"/><circle cx="${tip[0]}" cy="${tip[1]}" r="3.5" fill="var(--fold)"/>`
        :flaps.filter(f=>f===crease||t>=T.mirror).map(f=>`<line x1="${f.B[0]}" y1="${f.B[1]}" x2="${f.C[0]}" y2="${f.C[1]}" stroke="var(--fold)" stroke-width="2.4" stroke-dasharray="7 4"/>`).join('');}
    g+='</g>';
    // "Fold here", then the finger: on the crease while drawing, then over to the button and pressing it.
    if(t>=T.pill&&t<T.fold+0.2){const a=span(t,T.pill,T.pill+0.2),s=pressed?0.92:1;
      g+=`<g opacity="${a}" transform="translate(${pill.x} ${pill.y}) scale(${s})"><rect x="${-pill.w/2}" y="${-pill.h/2}" width="${pill.w}" height="${pill.h}" rx="${pill.h/2}" fill="${pressed?'#F2D23C':'var(--hi)'}" stroke="var(--ink)" stroke-width="1.2"/>
        <text x="0" y="4" text-anchor="middle" font-size="10" font-weight="800" fill="#15243A">Fold here</text></g>`;}
    if(t>=T.finger&&t<T.fold){const fa=span(t,T.finger,T.finger+0.3);let p;
      if(t<T.dragEnd){const q=lerp(crease.B,crease.C,ease(span(t,T.drag,T.dragEnd)));p=[q[0],L-q[1]];}
      else{const q=crease.C,from=[q[0],L-q[1]];p=lerp(from,[pill.x,pill.y],ease(span(t,T.toPill,T.press)));}
      const r=pressed||(t>=T.drag&&t<T.dragEnd)?7:9;
      g+=`<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="rgba(21,36,58,.22)" stroke="var(--ink)" stroke-width="1.2" opacity="${fa}"/>`;}
    svg.innerHTML=g;
    if(t>=T.end){const d=run.done;run=null;d(true);return;}
    run.raf=requestAnimationFrame(frame);}
  run={raf:requestAnimationFrame(frame),done};}
