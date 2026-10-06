// Procedural chill music: a lo-fi band synthesised with Web Audio, plus musical cues for game events.
// Everything is scheduled ahead on the audio clock, so the same engine plays live (music.js calls
// scheduleUntil from a timer) or renders offline (tools/preview-music.mjs).
//
// Layers: pad, keys (electric piano), bass, kick, snare (brushes), hats, melody (glassy plucks),
// vinyl (crackle) and air (wind that follows the plane's speed). Each stage sets a level per layer.
import {makeSong,chordAt,barRandom,pentaNote,mtof} from './theory.js';

export const LAYERS=['pad','keys','bass','kick','snare','hats','melody','vinyl','air'];
export const STAGES={
  idle:  {pad:.55,keys:.45,bass:0,  kick:0,  snare:0,  hats:0,  melody:.25,vinyl:.5, air:0},
  fold:  {pad:.55,keys:.6, bass:.35,kick:0,  snare:0,  hats:.15,melody:.3, vinyl:.45,air:0},
  wings: {pad:.5, keys:.65,bass:.5, kick:.35,snare:.3, hats:.3, melody:.35,vinyl:.4, air:0},
  go:    {pad:.5, keys:.7, bass:.7, kick:.6, snare:.5, hats:.45,melody:.45,vinyl:.35,air:.1},
  count: {pad:.8, keys:.4, bass:.3, kick:0,  snare:0,  hats:.5, melody:.2, vinyl:.2, air:.4},
  fly:   {pad:.55,keys:.7, bass:.9, kick:.85,snare:.65,hats:.6, melody:.7, vinyl:.15,air:.7},
  land:  {pad:.8, keys:.85,bass:.5, kick:0,  snare:0,  hats:.1, melody:.6, vinyl:.35,air:.2},
};
const SENDS={pad:[.5,.2],keys:[.3,.25],bass:[0,0],kick:[.05,0],snare:[.25,0],hats:[.1,.1],melody:[.55,.45],vinyl:[0,0],air:[.2,0],fx:[.45,.3]}; // [reverb, delay]

export function createEngine(ctx,out,opts){opts=opts||{};
  const bus={},target={},lvl=k=>target[k]||0;
  // Shared effects: a soft plate-ish reverb and a dotted-eighth delay with a darkening feedback loop.
  const rev=ctx.createConvolver();{const len=Math.floor(ctx.sampleRate*3.2),b=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);let s=c?7:3;for(let i=0;i<len;i++){s=(s*16807)%2147483647;d[i]=(s/1073741823.5-1)*Math.pow(1-i/len,3);}}rev.buffer=b;}
  const revOut=ctx.createGain();revOut.gain.value=0.35;rev.connect(revOut);revOut.connect(out);
  const dly=ctx.createDelay(2),fb=ctx.createGain(),dlp=ctx.createBiquadFilter(),dOut=ctx.createGain();fb.gain.value=0.38;dlp.type='lowpass';dlp.frequency.value=2200;dOut.gain.value=0.3;
  dly.connect(dlp);dlp.connect(fb);fb.connect(dly);dlp.connect(dOut);dOut.connect(out);
  for(const k of [...LAYERS,'fx']){const g=ctx.createGain();g.gain.value=0;g.connect(out);const [rs,ds]=SENDS[k];
    if(rs){const s=ctx.createGain();s.gain.value=rs;g.connect(s);s.connect(rev);}if(ds){const s=ctx.createGain();s.gain.value=ds;g.connect(s);s.connect(dly);}bus[k]=g;}
  bus.fx.gain.value=0.7;target.fx=0.7;

  // Noise for brushes, hats, vinyl and wind (seeded, so offline renders are repeatable).
  const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);{const d=noise.getChannelData(0);let s=12345;for(let i=0;i<d.length;i++){s=(s*16807)%2147483647;d[i]=s/1073741823.5-1;}}
  let song=makeSong(opts.seed||'field'),fieldSong=song,step=0,nextT=ctx.currentTime+0.1,stage='idle';
  const tele={speed:0,alt:0,vz:0};

  // ---------- instruments ----------
  function env(g,t,a,peak,dur){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);}
  function osc(type,f,t,end,dest,detune){const o=ctx.createOscillator();o.type=type;o.frequency.value=f;if(detune)o.detune.value=detune;o.connect(dest);o.start(t);o.stop(end+0.05);return o;}
  function lp(f,q,dest){const x=ctx.createBiquadFilter();x.type='lowpass';x.frequency.value=f;x.Q.value=q||0.7;x.connect(dest);return x;}
  // Electric piano: a sine carrier with a fast-decaying FM modulator gives the bell-like attack.
  function epiano(t,m,dur,vel,dest){const f=mtof(m),g=ctx.createGain();env(g,t,0.006,0.12*vel,dur);g.connect(dest||bus.keys);const flt=lp(2600,0.5,g);
    const c=osc('sine',f,t,t+dur,flt),mod=ctx.createOscillator(),mg=ctx.createGain();mod.frequency.value=f;mg.gain.setValueAtTime(f*1.2,t);mg.gain.exponentialRampToValueAtTime(f*0.05,t+0.35);
    mod.connect(mg);mg.connect(c.frequency);mod.start(t);mod.stop(t+dur+0.05);}
  function pad(t,notes,dur,vel){const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.05*vel/Math.sqrt(notes.length),t+Math.min(1.6,dur*0.35));
    g.gain.setValueAtTime(0.05*vel/Math.sqrt(notes.length),t+dur*0.75);g.gain.linearRampToValueAtTime(0.0001,t+dur);g.connect(bus.pad);
    const flt=lp(stage==='count'?1800:850,0.6,g);for(const m of notes)for(const d of [-8,7])osc('sawtooth',mtof(m),t,t+dur,flt,d);}
  function bass(t,m,dur,vel){const g=ctx.createGain();env(g,t,0.02,0.15*vel,dur);g.connect(bus.bass);const flt=lp(420,0.8,g);osc('triangle',mtof(m),t,t+dur,flt);osc('sine',mtof(m-12),t,t+dur,flt);}
  function kick(t,vel){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(105,t);o.frequency.exponentialRampToValueAtTime(42,t+0.16);env(g,t,0.004,0.3*vel,0.38);o.connect(g);g.connect(bus.kick);o.start(t);o.stop(t+0.45);}
  function hiss(t,dur,vel,type,freq,q,dest){const s=ctx.createBufferSource();s.buffer=noise;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q||0.7;const g=ctx.createGain();
    env(g,t,0.004,vel,dur);s.connect(f);f.connect(g);g.connect(dest);s.start(t,(t*7.13)%1.5);s.stop(t+dur+0.05);}
  function pluck(t,m,dur,vel,dest){const g=ctx.createGain();env(g,t,0.004,0.09*vel,dur);g.connect(dest||bus.melody);const flt=lp(4200,0.5,g);osc('triangle',mtof(m),t,t+dur,flt);osc('sine',mtof(m+12),t,t+dur*0.5,flt);}
  function bell(t,m,dur,vel,dest){const g=ctx.createGain();env(g,t,0.003,0.07*vel,dur);g.connect(dest||bus.fx);osc('sine',mtof(m),t,t+dur,g);const g2=ctx.createGain();env(g2,t,0.002,0.03*vel,dur*0.4);g2.connect(dest||bus.fx);osc('sine',mtof(m)*2.76,t,t+dur*0.4,g2);}

  // Continuous beds: vinyl hiss and wind (its filter follows the plane's speed).
  const bed=(type,freq,q,lvl,dest)=>{const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=lvl;s.connect(f);f.connect(g);g.connect(dest);s.start(nextT);return f;};
  bed('lowpass',2400,0.3,0.012,bus.vinyl);const wind=bed('bandpass',400,0.9,0.09,bus.air);

  // ---------- the band, one 16th note at a time ----------
  const stepDur=n=>60/song.bpm/4*(n%2===0?1+song.swing:1-song.swing);
  function play(t,n){const s=n%16,bar=Math.floor(n/16),ch=chordAt(song,bar),fly=stage==='fly',busy=fly&&tele.speed>9;
    const voicing=ch.tones.map(m=>m+24).filter((m,i)=>i<5);
    if(lvl('pad')>0.02&&s===0&&bar%2===0)pad(t,voicing.slice(0,4).map(m=>m+12),stepDur(0)*32*0.95,1);
    if(lvl('keys')>0.02){const r=barRandom(song,bar,'keys');const hits=[0,r()<0.5?6:10,r()<0.4?14:-1];
      if(hits.includes(s)){const v=s===0?1:0.7;voicing.forEach((m,i)=>epiano(t+i*0.012,m,s===0?1.6:0.8,v));}}
    if(lvl('bass')>0.02){const r=barRandom(song,bar,'bass');if(s===0)bass(t,ch.root,0.9,1);else if(s===8)bass(t,ch.root+(r()<0.5?7:0),0.7,0.85);
      else if(s===14&&r()<0.4){const nxt=chordAt(song,bar+1).root;bass(t,nxt+(nxt>ch.root?-1:1),0.25,0.6);}}
    if(lvl('kick')>0.02&&(s===0||s===8||(busy&&s===10)||(s===11&&barRandom(song,bar,'kick')()<0.3)))kick(t,s===0?1:0.8);
    if(lvl('snare')>0.02&&(s===4||s===12))hiss(t,0.16,0.09,'bandpass',1700,0.6,bus.snare);
    if(lvl('hats')>0.02&&(busy?true:s%2===0))hiss(t,0.035,s%4===2?0.05:0.03,'highpass',7500,0.7,bus.hats);
    if(lvl('melody')>0.02&&s%2===0){const r=barRandom(song,bar*16+s,'mel');const p={idle:.12,fold:.15,wings:.18,go:.22,count:.1,fly:.32,land:.3}[stage]||.15;
      if(r()<p){const oct=fly?Math.min(2,Math.floor(tele.alt/4)):0;const deg=song.contour[(bar+s/2)%8]+(tele.vz>1.5?2:0);pluck(t,pentaNote(song,deg,oct),1.4,0.9);}}
    if(lvl('vinyl')>0.02&&barRandom(song,n,'crackle')()<0.18)hiss(t+0.01,0.008,0.05,'highpass',3000,0.5,bus.vinyl);}

  // If the timer fell behind (a throttled phone), skip the missed notes rather than playing them all at once.
  function scheduleUntil(T){if(nextT<ctx.currentTime-0.2)while(nextT<ctx.currentTime){nextT+=stepDur(step);step++;}
    while(nextT<T){play(nextT,step);nextT+=stepDur(step);step++;}}
  function setStage(s,t,tc){if(!STAGES[s])return;stage=s;const L=STAGES[s];t=t==null?ctx.currentTime:t;
    for(const k of LAYERS){target[k]=L[k];bus[k].gain.setTargetAtTime(L[k],t,tc==null?1.2:tc);}}
  // Start a fresh song (a throw's own song, seeded by the plane) on the next bar line, or go back to the field's.
  function setSong(seed,t){song=seed==null?fieldSong:makeSong(seed);step=0;nextT=Math.max(nextT,t==null?ctx.currentTime+0.05:t);}
  function setTele(speed,alt,vz,t){tele.speed=speed;tele.alt=alt;tele.vz=vz;wind.frequency.setTargetAtTime(300+speed*90,t==null?ctx.currentTime:t,0.2);}

  // ---------- cues: short musical events, always in the current song's key ----------
  const now=t=>t==null?ctx.currentTime+0.01:t;
  const chordNow=()=>chordAt(song,Math.floor(step/16));
  const C={
    crease(d,t){const ch=chordNow(),m=ch.tones[(d.n||0)%ch.tones.length]+36;hiss(t,0.09,0.05,'highpass',3500,0.5,bus.fx);epiano(t+0.03,m,1.1,0.9,bus.fx);},
    pending(d,t){bell(t,pentaNote(song,7,1),0.25,0.4);},
    undo(d,t){const ch=chordNow();epiano(t,ch.tones[2]+36,0.6,0.7,bus.fx);epiano(t+0.12,ch.tones[0]+36,0.9,0.6,bus.fx);},
    restart(d,t){hiss(t,0.5,0.05,'bandpass',1200,1.5,bus.fx);epiano(t+0.1,song.key+24,1.4,0.7,bus.fx);},
    nope(d,t){epiano(t,song.key+30,0.35,0.5,bus.fx);epiano(t+0.02,song.key+31,0.35,0.4,bus.fx);},
    keel(d,t){pluck(t,pentaNote(song,Math.round((d.v||0)*9),0),0.35,0.45,bus.fx);},
    paper(d,t){const ch=chordNow(),bright=d.pattern?12:0;ch.tones.slice(0,3).forEach((m,i)=>pluck(t+i*0.05,m+24+bright,0.9,0.6,bus.fx));},
    step(d,t){const ch=chordNow();epiano(t,ch.tones[1]+36,0.9,0.6,bus.fx);epiano(t+0.09,ch.tones[3]+36,1.1,0.6,bus.fx);},
    board(d,t){bell(t,pentaNote(song,5,1),0.8,0.5);bell(t+0.1,pentaNote(song,7,1),1,0.5);},
    card(d,t){pluck(t,pentaNote(song,Math.min(12,Math.round((d.dist||0)/8)),0),0.8,0.6,bus.fx);},
    arrival(d,t){bell(t,pentaNote(song,9,1),2.4,0.6);bell(t+0.35,pentaNote(song,7,1),2.4,0.45);},
    ready(d,t){[0,2,4,7].forEach((k,i)=>bell(t+i*0.11,pentaNote(song,5+k,0),1.2,0.6));},
    count(d,t){for(let i=0;i<48;i++)hiss(t+i*3/48,0.06,0.006+0.03*i/48,'bandpass',800+i*40,1.4,bus.fx);[0,1,2].forEach(k=>bell(t+k,pentaNote(song,5+[0,2,4][k],0),0.6,0.7));},
    go(d,t){hiss(t,1.4,0.06,'highpass',4500,0.5,bus.fx);kick(t,0.8);const ch=chordNow();ch.tones.forEach((m,i)=>pluck(t+i*0.03,m+24,1.6,0.7,bus.fx));},
    milestone(d,t){(d.big?[0,2,4,5,7]:[2,4,7]).forEach((k,i)=>bell(t+i*0.07,pentaNote(song,5+k,1),d.big?1.6:1,0.7));},
    loop(d,t){for(let i=0;i<6+2*(d.n||1);i++)pluck(t+i*0.045,pentaNote(song,i,1),0.5,0.6,bus.fx);},
    peak(d,t){bell(t,pentaNote(song,10,1),2.2,0.6);},
    dive(d,t){hiss(t,0.9,0.06,'bandpass',2400,1.2,bus.fx);},
    land(d,t){kick(t,0.8);hiss(t,0.35,0.08,'lowpass',900,0.7,bus.fx);const ch=chordAt(song,0);
      if(d.record){ch.tones.concat(ch.tones.map(m=>m+12)).forEach((m,i)=>pluck(t+0.15+i*0.06,m+24,2,0.7,bus.fx));}
      else if(d.dist<8){epiano(t+0.2,song.key+28,1.4,0.6,bus.fx);epiano(t+0.45,song.key+26,1.8,0.5,bus.fx);}
      else ch.tones.forEach((m,i)=>epiano(t+0.15+i*0.04,m+24,2.5,0.8,bus.fx));},
    blip(d,t){bell(t,pentaNote(song,5+Math.min(d.i||0,9),0),d.big?1.2:0.5,d.big?0.8:0.55);},
    pb(d,t){[0,4,7,9].forEach((k,i)=>pluck(t+i*0.08,pentaNote(song,k,1),0.9,0.7,bus.fx));},
    total(d,t){const ch=chordNow();ch.tones.forEach((m,i)=>epiano(t+i*0.05,m+36,2,0.7,bus.fx));},
  };
  function cue(name,d,t){if(C[name])C[name](d||{},now(t));}

  return{scheduleUntil,setStage,setSong,setTele,cue,get stage(){return stage;},get song(){return song;},cues:Object.keys(C)};
}
