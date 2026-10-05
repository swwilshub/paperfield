// Dynamic stem mixer: plays the phrase files from assets/music on a 2 s bar grid, one bus per
// stem, with the sequencer choosing what comes next. Only the phrases about to play are fetched
// and decoded (decoded audio is large on phones), and old ones are dropped.
import {createSequencer,RHYTHM} from './sequencer.js';

const BASE=new URL('../../assets/music/',import.meta.url);
const DECIDE_AHEAD=7;   // seconds before a phrase ends to choose and load the next one
const KEEP=3;           // phrases kept decoded
const DECODE_RATE=32000;// decode below the device rate to halve memory; plenty for this music

// opts.manual: no timer; the caller drives tick() (used to render previews offline).
export function createMixer(ctx,out,opts){opts=opts||{};
  let manifest=null,seq=null,mood='idle',running=false,timer=null,ready=null;
  const buses={},level={};let flyMod={drums:1,perc:1,brass:1,strings:1};
  const cache=new Map();      // phrase id -> Promise<{stem: AudioBuffer}>
  let cur=null,queued=null,pendingJump=null;
  // decodeAudioData resamples to its context's rate, so decode in a small offline context.
  let decoder=null;try{const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;decoder=new OAC(2,1,DECODE_RATE);}catch(e){decoder=ctx;}

  function load(){if(ready)return ready;
    ready=fetch(new URL('manifest.json',BASE)).then(r=>{if(!r.ok)throw new Error('music manifest '+r.status);return r.json();}).then(m=>{manifest=m;seq=createSequencer(m);
      for(const s of m.stems){const g=ctx.createGain();g.gain.value=0;g.connect(out);buses[s]=g;level[s]=0;}});
    return ready;}
  function decode(buf){return new Promise((res,rej)=>{const p=decoder.decodeAudioData(buf,res,rej);if(p&&p.catch)p.catch(rej);});}
  function fetchPhrase(p){if(cache.has(p.id))return cache.get(p.id);
    const job=Promise.all(Object.entries(p.files).map(([s,f])=>fetch(new URL(f,BASE)).then(r=>{if(!r.ok)throw new Error(f+' '+r.status);return r.arrayBuffer();}).then(decode).then(b=>[s,b])))
      .then(list=>Object.fromEntries(list));
    job.catch(()=>cache.delete(p.id));cache.set(p.id,job);
    const keep=new Set([p.id,cur&&cur.p.id,queued&&queued.p.id,pendingJump&&pendingJump.p.id]);
    while(cache.size>KEEP){const old=[...cache.keys()].find(k=>!keep.has(k));if(!old)break;cache.delete(old);}
    return job;}
  // Some decoders keep the MP3 encoder delay at the start of the buffer; skip it so stems and bars line up.
  function lead(p,b){const want=p.bars*manifest.bar+Math.min(manifest.tail,manifest.duration-p.start-p.bars*manifest.bar);const extra=b.duration-want;return extra>0.04?Math.min(0.06,1105/44100):0;}

  function play(p,bufs,when){const srcs=[],trim=seq.trim(p,mood);
    for(const [s,b] of Object.entries(bufs)){const src=ctx.createBufferSource();src.buffer=b;const g=ctx.createGain();g.gain.value=trim;src.connect(g);g.connect(buses[s]);
      src.start(when,lead(p,b));srcs.push({s,src,g});}
    return{p,t0:when,end:when+p.bars*manifest.bar,srcs,trim};}
  // Let the outgoing phrase go at `when`. If the new phrase is its true continuation the tail
  // would double the same notes, so cut it quickly; otherwise let melodic tails ring briefly.
  function release(ph,when,natural){if(!ph)return;
    for(const {s,src,g} of ph.srcs){const fade=natural?0.06:RHYTHM.includes(s)?0.12:0.8;
      g.gain.cancelScheduledValues(when);g.gain.setValueAtTime(ph.trim,when);g.gain.linearRampToValueAtTime(0,when+fade);try{src.stop(when+fade+0.05);}catch(e){}}}

  function applyLevels(tc){if(!manifest)return;const L=seq.levels(mood),t=ctx.currentTime;
    for(const s of manifest.stems){const v=(L[s]||0)*(mood==='fly'&&flyMod[s]!=null?flyMod[s]:1);
      if(Math.abs(v-level[s])>0.01){level[s]=v;buses[s].gain.setTargetAtTime(v*v,t,tc);}}}  // squared: perceptually smoother fades

  function bar(t){return cur?Math.floor((t-cur.t0)/manifest.bar+1e-6):0;}
  function tick(){if(!running||!cur)return;const t=ctx.currentTime;
    // A requested jump (throw starting): switch at the first bar line after the new phrase is ready.
    if(pendingJump&&pendingJump.bufs){const b=bar(t)+1,when=cur.t0+b*manifest.bar;
      if(when<cur.end-0.05&&when-t>0.05){release(cur,when,false);cur=play(pendingJump.p,pendingJump.bufs,when);queued=null;pendingJump=null;return;}
      pendingJump=null;}
    if(!queued&&cur.end-t<DECIDE_AHEAD){const p=seq.next(cur.p.bar+cur.p.bars-1,mood);queued={p,bufs:null};fetchPhrase(p).then(b=>{if(queued&&queued.p===p)queued.bufs=b;}).catch(()=>{});}
    if(queued&&queued.bufs&&cur.end-t<0.35){const when=Math.max(cur.end,t+0.05);const natural=queued.p.bar===cur.p.bar+cur.p.bars;
      release(cur,when,natural);cur=play(queued.p,queued.bufs,when);queued=null;}
    else if(queued&&!queued.bufs&&t>cur.end+manifest.tail){   // network too slow: restart on the grid once loaded
      const q=queued;fetchPhrase(q.p).then(b=>{if(running&&queued===q){queued=null;cur=play(q.p,b,ctx.currentTime+0.1);}}).catch(()=>{});}
  }

  return{
    async start(){if(running)return;running=true;try{await load();}catch(e){running=false;return;}
      applyLevels(0.05);const p=seq.first(mood);let bufs;try{bufs=await fetchPhrase(p);}catch(e){running=false;return;}
      if(!running)return;cur=play(p,bufs,ctx.currentTime+0.1);if(!opts.manual)timer=setInterval(tick,100);},
    tick,
    stop(){running=false;clearInterval(timer);timer=null;if(cur)release(cur,ctx.currentTime,true);cur=null;queued=null;pendingJump=null;},
    // Change mood. `quick` makes layer changes fast (throw events); `jump` re-sequences at the next bar.
    // `jumpTo` picks the jump phrase for a later mood (the countdown chooses the flight's phrase).
    setMood(m,o){o=o||{};if(!(m in{idle:1,fold:1,wings:1,trim:1,go:1,count:1,fly:1,land:1}))return;mood=m;const tc=o.quick?0.25:1.6;applyLevels(tc);
      if(cur&&seq){const tr=seq.trim(cur.p,m);cur.trim=tr;for(const {g} of cur.srcs)g.gain.setTargetAtTime(tr,ctx.currentTime,tc);}
      if(o.jump&&running&&cur&&seq){const p=seq.jump(cur.p.bar+bar(ctx.currentTime),o.jumpTo||m);const j={p,bufs:null};pendingJump=j;fetchPhrase(p).then(b=>{j.bufs=b;}).catch(()=>{});}},
    // Flight telemetry: rhythm follows speed, brass and strings follow height.
    tele(speed,alt){const sp=Math.max(0,Math.min(1,speed/14)),hi=Math.max(0,Math.min(1,alt/6));
      flyMod={drums:0.55+0.45*sp,perc:0.6+0.4*sp,brass:0.35+0.65*hi,strings:0.7+0.3*hi};if(mood==='fly')applyLevels(0.3);},
    reseed(s){if(seq)seq.reseed(s);},
    get mood(){return mood;},get key(){return manifest&&manifest.key;},
    // For tests and the preview renderer.
    state(){return{running,mood,phrase:cur&&cur.p.id,queued:queued&&queued.p.id,waiting:!!((queued&&!queued.bufs)||(pendingJump&&!pendingJump.bufs)),cached:[...cache.keys()]};}
  };
}
