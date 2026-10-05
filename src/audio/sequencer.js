// Generative arrangement for the stem music: which phrase plays next, and how loud each stem
// layer should be for the current moment in the game. Pure (no Web Audio), so it runs in Node.
//
// Vertical: each mood sets a target level per stem, so layers build up as you fold, wings, trim,
// release and fly. Horizontal: at the end of each phrase (or, for a throw, at the next bar) the
// next phrase is picked at random from those that fit harmonically after the current bar
// (manifest `fit`), weighted towards phrases whose instruments suit the mood and away from
// phrases heard recently. Seeded, so everyone watching the same throw hears the same arrangement.
import {mulberry,hashStr} from '../core/thrower.js';

// Per mood: target loudness (dB, on the manifest's activity scale), how busy the rhythm section
// should be (`energy`), and a level (0..1) per stem. Bus gain is level², so audible power ~ level⁴.
export const MOODS={
  idle:  {target:-32,energy:0.0, keys:0.9,synth:0.75,air:0.6,strings:0.3,guitar:0.25,bass:0,   perc:0,   drums:0,   brass:0},
  fold:  {target:-31,energy:0.15,keys:0.9,synth:0.75,air:0.55,strings:0.5,guitar:0.4,bass:0.2, perc:0.1, drums:0,   brass:0},
  wings: {target:-29,energy:0.3, keys:0.85,synth:0.75,air:0.5,strings:0.6,guitar:0.5,bass:0.45,perc:0.3, drums:0.1, brass:0},
  trim:  {target:-28,energy:0.45,keys:0.85,synth:0.75,air:0.45,strings:0.65,guitar:0.55,bass:0.6,perc:0.45,drums:0.25,brass:0.1},
  go:    {target:-26,energy:0.6, keys:0.85,synth:0.8,air:0.4,strings:0.75,guitar:0.6,bass:0.75,perc:0.6, drums:0.45,brass:0.2},
  count: {target:-24,energy:0.7, keys:0.7,synth:0.85,air:0.5,strings:0.9,guitar:0.4,bass:0.6, perc:0.85,drums:0.3, brass:0.3},
  fly:   {target:-21,energy:1.0, keys:0.8,synth:0.85,air:0.45,strings:0.9,guitar:0.8,bass:1,   perc:1,   drums:1,   brass:0.7},
  land:  {target:-22,energy:0.5, keys:1,  synth:0.9,air:0.6,strings:1,  guitar:0.6,bass:0.7, perc:0.3, drums:0.25,brass:1},
};
export const RHYTHM=['drums','perc','bass'];
const FIT_PHRASE=0.9,FIT_BAR=0.85;

const presence=db=>Math.max(0,Math.min(1,(db+55)/25));
// How loud phrase p will sound with the mood's layer levels.
export function loudness(p,mood){const m=MOODS[mood]||MOODS.idle;let s=0;for(const k in p.activity){const v=m[k]||0;s+=v*v*v*v*Math.pow(10,p.activity[k]/10);}return 10*Math.log10(s+1e-12);}
// Gain (dB) that brings p towards the mood's target loudness, kept gentle so the song's own dynamics survive.
export function trimDb(p,mood){const m=MOODS[mood]||MOODS.idle;return Math.max(-6,Math.min(8,m.target-loudness(p,mood)));}
export function phraseEnergy(p){return RHYTHM.reduce((s,k)=>s+presence(p.activity[k]),0)/RHYTHM.length;}

export function createSequencer(manifest,seed){
  const P=manifest.phrases;let rnd=mulberry(hashStr(String(seed==null?'one-sheet':seed)));const recent=[];
  function score(p,mood){const m=MOODS[mood]||MOODS.idle;let s=0,w=0;
    for(const k of manifest.stems){if(!m[k])continue;s+=m[k]*presence(p.activity[k]);w+=m[k];}
    s=w?s/w:0;s-=1.0*Math.abs(phraseEnergy(p)-m.energy);
    s-=Math.abs(loudness(p,mood)-m.target)/12;  // prefer phrases near the target level (trim does the rest)
    const r=recent.lastIndexOf(p.id);if(r>=0)s-=0.6*(1-(recent.length-1-r)/recent.length);
    return s;}
  // Candidates that can follow `bar` (the last bar heard). The natural successor always fits.
  function candidates(bar,minFit){const nat=P.find(p=>p.bar===bar+1);
    // Never the phrase we're already in, unless nothing else fits.
    const last=recent[recent.length-1];const c=P.filter(p=>(p===nat||p.fit[bar]>=minFit)&&p.id!==last);
    return c.length?c:(nat?[nat]:P);}
  function pick(cands,mood){const sc=cands.map(p=>score(p,mood));const mx=Math.max(...sc);
    const w=sc.map(s=>Math.exp((s-mx)/0.12));let r=rnd()*w.reduce((a,b)=>a+b,0);
    for(let i=0;i<cands.length;i++){r-=w[i];if(r<=0)return cands[i];}return cands[cands.length-1];}
  function note(p){recent.push(p.id);if(recent.length>4)recent.shift();return p;}
  return{
    // First phrase: something calm that suits the mood (usually the intro).
    first(mood){return note(pick(P,mood||'idle'));},
    // Next phrase when the current one ends on `lastBar`.
    next(lastBar,mood){return note(pick(candidates(lastBar,FIT_PHRASE),mood));},
    // A phrase to jump to mid-phrase at the next bar line (used when a throw starts).
    jump(currentBar,mood){return note(pick(candidates(currentBar,FIT_BAR),mood));},
    reseed(s){rnd=mulberry(hashStr(String(s)));},
    levels(mood){return MOODS[mood]||MOODS.idle;},
    trim(p,mood){return Math.pow(10,trimDb(p,mood)/20);}
  };
}
