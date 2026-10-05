// ===== procedural music =====
// Seeded per plane so everyone watching a throw hears the same song.
import {mulberry,hashStr} from '../core/thrower.js';

export const audio=(function(){let ctx=null,master,rev,on=true,mode='idle',song=null,fieldSong=null,step=0,nextT=0,started=false;
  try{const v=localStorage.getItem('onesheet-music');if(v==='off')on=false;}catch(e){}
  const tele={alt:0,speed:0,vz:0};
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const PROGS=[[[0,4,7],[7,11,14],[9,12,16],[5,9,12]],[[0,4,7],[9,12,16],[5,9,12],[7,11,14]],[[0,4,7,11],[5,9,12,16],[2,5,9,12],[7,11,14,17]],[[9,12,16],[5,9,12],[0,4,7],[7,11,14]]];
  function makeSong(seed){const r=mulberry(hashStr(String(seed)));const root=48+Math.floor(r()*8);const prog=PROGS[Math.floor(r()*PROGS.length)];const pat=Array.from({length:8},()=>Math.floor(r()*4));
    return{root,prog,pat,bpm:96+Math.floor(r()*24),swing:r()<0.4};}
  function unlock(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!ctx){ctx=new AC();const comp=ctx.createDynamicsCompressor();master=ctx.createGain();master.gain.value=on?0.55:0;master.connect(comp);comp.connect(ctx.destination);
      rev=ctx.createConvolver();const len=Math.floor(ctx.sampleRate*2.6),buf=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
      rev.buffer=buf;const rg=ctx.createGain();rg.gain.value=0.32;rev.connect(rg);rg.connect(master);fieldSong=makeSong('field');song=fieldSong;nextT=ctx.currentTime+0.1;setInterval(tick,25);
      document.addEventListener('visibilitychange',()=>{if(!ctx)return;document.hidden?ctx.suspend():ctx.resume();});}
    if(ctx.state==='suspended')ctx.resume();started=true;}
  function out(g,send){g.connect(master);if(send){const s=ctx.createGain();s.gain.value=send;g.connect(s);s.connect(rev);}}
  function tone(type,freq,t,dur,vol,cut,send,att){const o=ctx.createOscillator();o.type=type;o.frequency.value=freq;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cut||3000;const g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(att||0.008));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(f);f.connect(g);out(g,send==null?0.35:send);o.start(t);o.stop(t+dur+0.05);}
  let nbuf=null;function noise(t,dur,vol,type,freq,q,send){if(!nbuf){nbuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    const s=ctx.createBufferSource();s.buffer=nbuf;const f=ctx.createBiquadFilter();f.type=type||'highpass';f.frequency.value=freq||7000;f.Q.value=q||0.7;const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f);f.connect(g);out(g,send||0.15);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);}
  function kick(t,vol,lo){const o=ctx.createOscillator();o.frequency.setValueAtTime(lo?90:130,t);o.frequency.exponentialRampToValueAtTime(lo?32:45,t+0.18);const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+(lo?0.7:0.3));o.connect(g);out(g,0.05);o.start(t);o.stop(t+0.8);}
  function pad(notes,t,dur,vol){for(const m of notes)for(const det of [-7,6]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=mtof(m);o.detune.value=det;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;
      const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol/notes.length,t+Math.min(0.8,dur*0.3));g.gain.setValueAtTime(vol/notes.length,t+dur*0.7);g.gain.linearRampToValueAtTime(0.0001,t+dur);o.connect(f);f.connect(g);out(g,0.6);o.start(t);o.stop(t+dur+0.1);}}
  function tick(){if(!ctx||!on)return;const sp=60/(song.bpm)/4;while(nextT<ctx.currentTime+0.15){play(nextT,step);nextT+=sp*((song.swing&&step%2===0)?1.12:(song.swing?0.88:1));step++;}}
  function play(t,n){const s=n%16,bar=Math.floor(n/16),ch=song.prog[bar%4],R=song.root;
    if(mode==='idle'){if(n%32===0)pad(ch.map(c=>R+12+c),t,6,0.05);if(s%4===2&&Math.random()<0.18)tone('triangle',mtof(R+24+ch[Math.floor(Math.random()*ch.length)]+(Math.random()<0.4?12:0)),t,1.4,0.035,2000,0.7);return;}
    if(mode==='count'){if(s===0)pad(ch.map(c=>R+c),t,2.6,0.06);return;}
    if(mode!=='fly')return;
    const fast=tele.speed>9,oct=Math.max(0,Math.min(2,Math.floor(tele.alt/4)));
    if(s===0)pad(ch.map(c=>R+12+c),t,60/song.bpm*4,0.07);
    if(s===0||s===8||(fast&&(s===4||s===12)))kick(t,0.5);
    if(s%4===2)noise(t,0.05,0.07);else if(fast&&s%2===1)noise(t,0.03,0.03);
    if(s===4||s===12)noise(t,0.12,0.06,'bandpass',1800,0.8,0.2);
    if(s===0||s===10)tone('sawtooth',mtof(R-12+ch[0]),t,0.45,0.09,380,0.05);
    if(fast||s%2===0){const idx=song.pat[(n>>(fast?0:1))%8]%ch.length;const up=tele.vz>1.5?12:0;tone('triangle',mtof(R+12+ch[idx]+12*oct+up),t,0.32,0.085,1500+tele.speed*120,0.4);}}
  const api={tele,unlock,isOn:()=>on,
    toggle(){on=!on;try{localStorage.setItem('onesheet-music',on?'on':'off');}catch(e){}if(ctx){master.gain.setTargetAtTime(on?0.55:0,ctx.currentTime,0.08);if(on)nextT=ctx.currentTime+0.05;}return on;},
    countdown(seed){if(!ctx||!on)return;song=makeSong(seed);mode='count';step=0;const t=ctx.currentTime+0.02;nextT=t;
      for(let i=0;i<48;i++){const tt=t+i*3/48;noise(tt,0.06,0.015+0.07*i/48,'bandpass',900+i*30,1.2,0.1);}
      [0,1,2].forEach(k=>{kick(t+k,0.55,true);tone('square',mtof(song.root+12+[0,5,7][k]),t+k,0.35,0.05,1200,0.4);});},
    go(){if(!ctx||!on)return;const t=ctx.currentTime+0.01;kick(t,0.8,true);noise(t,1.6,0.16,'highpass',5000,0.5,0.5);pad(song.prog[0].map(c=>song.root+12+c).concat([song.root+24]),t,2.2,0.12);mode='fly';step=0;nextT=t+0.05;},
    chime(big){if(!ctx||!on)return;const t=ctx.currentTime+0.01,R=song.root;(big?[0,4,7,12,16]:[7,12,16]).forEach((d,i)=>tone('triangle',mtof(R+36+d),t+i*0.07,big?1.4:0.9,0.07,5000,0.8));
      if(big)[0,0.18,0.36].forEach(dt=>song.prog[0].forEach(c=>tone('sawtooth',mtof(R+12+c),t+dt,0.25,0.04,2200,0.3)));},
    land(){if(!ctx||!on)return;const t=ctx.currentTime+0.01,R=song.root;mode='after';kick(t,0.9,true);noise(t,0.35,0.18,'lowpass',900,0.7,0.2);
      pad([R,R+7,R+14,R+16,R+24],t+0.05,5,0.13);tone('triangle',mtof(R+36),t+0.4,3,0.05,4000,0.9);setTimeout(()=>{if(mode==='after'){song=fieldSong;mode='idle';}},6500);},
    blip(i){if(!ctx||!on)return;const sc=[0,2,4,7,9,12,14,16,19,21,24];tone('triangle',mtof(song.root+24+sc[Math.min(i,sc.length-1)]),ctx.currentTime+0.01,0.5,0.08,4000,0.5);},
    total(){if(!ctx||!on)return;const t=ctx.currentTime+0.01,R=song.root;pad([R+12,R+19,R+24,R+28],t,3,0.1);tone('triangle',mtof(R+36),t,1.8,0.07,5000,0.8);},
    idle(){if(mode!=='idle'){song=fieldSong||song;mode='idle';}},setSong(seed){if(ctx)song=makeSong(seed);}};
  return api;})();
