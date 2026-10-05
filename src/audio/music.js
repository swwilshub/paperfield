// ===== music and sound effects =====
// Music is "Fade to Wind" (palettedisk), played as stems by the dynamic mixer (mixer.js): layers
// build as you fold, wings, trim and release, the throw brings in the full band and follows speed
// and height, the landing swells, then it settles back. Sound effects are small synth tones tuned
// to the song's key (B♭ major). Seeded per plane so everyone watching a throw hears the same thing.
import {createMixer} from './mixer.js';

export const audio=(function(){let ctx=null,master,music,sfx,rev,mixer=null,on=true,stage='idle',landT=null;
  try{const v=localStorage.getItem('onesheet-music');if(v==='off')on=false;}catch(e){}
  const tele={alt:0,speed:0,vz:0};
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const R=46; // B♭2: the song's tonic
  function unlock(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!ctx){ctx=new AC();const comp=ctx.createDynamicsCompressor();master=ctx.createGain();master.gain.value=on?0.9:0;master.connect(comp);comp.connect(ctx.destination);
      music=ctx.createGain();music.gain.value=1.3;music.connect(master);sfx=ctx.createGain();sfx.gain.value=0.6;sfx.connect(master);
      rev=ctx.createConvolver();const len=Math.floor(ctx.sampleRate*2.6),buf=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
      rev.buffer=buf;const rg=ctx.createGain();rg.gain.value=0.32;rev.connect(rg);rg.connect(sfx);
      mixer=createMixer(ctx,music);mixer.setMood(stage);if(on)mixer.start();
      setInterval(()=>{if(mixer&&mixer.mood==='fly')mixer.tele(tele.speed,tele.alt);},150);
      document.addEventListener('visibilitychange',()=>{if(!ctx)return;document.hidden?ctx.suspend():ctx.resume();});}
    if(ctx.state==='suspended')ctx.resume();}
  const live=()=>ctx&&on;
  function out(g,send){g.connect(sfx);if(send){const s=ctx.createGain();s.gain.value=send;g.connect(s);s.connect(rev);}}
  function tone(type,freq,t,dur,vol,cut,send,att){const o=ctx.createOscillator();o.type=type;o.frequency.value=freq;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cut||3000;const g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(att||0.008));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(f);f.connect(g);out(g,send==null?0.35:send);o.start(t);o.stop(t+dur+0.05);}
  let nbuf=null;function noise(t,dur,vol,type,freq,q,send){if(!nbuf){nbuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    const s=ctx.createBufferSource();s.buffer=nbuf;const f=ctx.createBiquadFilter();f.type=type||'highpass';f.frequency.value=freq||7000;f.Q.value=q||0.7;const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f);f.connect(g);out(g,send||0.15);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);}
  function thud(t,vol){const o=ctx.createOscillator();o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(32,t+0.18);const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.7);o.connect(g);out(g,0.05);o.start(t);o.stop(t+0.8);}
  function mood(m,o){if(mixer)mixer.setMood(m,o);}
  const api={tele,unlock,isOn:()=>on,
    toggle(){on=!on;try{localStorage.setItem('onesheet-music',on?'on':'off');}catch(e){}
      if(ctx){master.gain.setTargetAtTime(on?0.9:0,ctx.currentTime,0.08);if(on)mixer.start();else setTimeout(()=>{if(!on)mixer.stop();},400);}return on;},
    // Building progress: 'fold' | 'wings' | 'trim' | 'go'. Layers come in as the plane takes shape.
    stage(t){stage=t;if(!mixer||['count','fly','land'].includes(mixer.mood))return;mood(t);},
    countdown(seed){if(mixer)mixer.reseed(seed);mood('count',{quick:true,jump:true,jumpTo:'fly'});if(!live())return;const t=ctx.currentTime+0.02;
      for(let i=0;i<48;i++){const tt=t+i*3/48;noise(tt,0.06,0.01+0.05*i/48,'bandpass',900+i*30,1.2,0.1);}
      [0,1,2].forEach(k=>tone('triangle',mtof(R+24+[0,4,7][k]),t+k,0.4,0.05,1800,0.4));},
    go(){const fromCount=mixer&&mixer.mood==='count';mood('fly',{quick:true,jump:!fromCount});if(!live())return;const t=ctx.currentTime+0.01;noise(t,1.6,0.12,'highpass',5000,0.5,0.5);tone('triangle',mtof(R+36),t,1.2,0.05,5000,0.8);},
    chime(big){if(!live())return;const t=ctx.currentTime+0.01;(big?[0,4,7,12,16]:[7,12,16]).forEach((d,i)=>tone('triangle',mtof(R+36+d),t+i*0.07,big?1.4:0.9,0.06,5000,0.8));},
    land(){mood('land',{quick:true});clearTimeout(landT);landT=setTimeout(()=>{if(mixer&&mixer.mood==='land')mood(stage);},9000);
      if(!live())return;const t=ctx.currentTime+0.01;thud(t,0.8);noise(t,0.35,0.16,'lowpass',900,0.7,0.2);tone('triangle',mtof(R+36),t+0.4,3,0.05,4000,0.9);},
    blip(i){if(!live())return;const sc=[0,2,4,7,9,12,14,16,19,21,24];tone('triangle',mtof(R+24+sc[Math.min(i,sc.length-1)]),ctx.currentTime+0.01,0.5,0.07,4000,0.5);},
    total(){if(!live())return;const t=ctx.currentTime+0.01;[0,4,7,12].forEach((d,i)=>tone('triangle',mtof(R+24+d),t+i*0.05,1.8,0.05,5000,0.8));},
    idle(){clearTimeout(landT);if(mixer&&mixer.mood!==stage)mood(stage);},
    setSong(seed){if(mixer)mixer.reseed(seed);},
    debug:()=>mixer&&mixer.state()};
  return api;})();
