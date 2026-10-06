// ===== music and sound =====
// Procedural chill music (engine.js), always on once the browser allows sound (first tap).
// Stages build the band up as you fold, set the wings and release; a throw gets its own song,
// seeded by the plane, so everyone watching hears the same music. Game events play musical cues
// in the current song's key (see engine.js → cues).
import {createEngine} from './engine.js';

export const audio=(function(){let ctx=null,eng=null,stage='idle',landT=null,lastDive=0;
  const tele={alt:0,speed:0,vz:0};
  function unlock(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    if(!ctx){ctx=new AC();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;
      const master=ctx.createGain();master.gain.value=0.8;master.connect(comp);comp.connect(ctx.destination);
      eng=createEngine(ctx,master,{seed:'field'});eng.setStage(stage,ctx.currentTime,0.05);
      setInterval(()=>{if(ctx.state!=='running')return;eng.scheduleUntil(ctx.currentTime+0.25);
        if(eng.stage==='fly'){eng.setTele(tele.speed,tele.alt,tele.vz);
          if(tele.vz<-5&&ctx.currentTime-lastDive>2.5){lastDive=ctx.currentTime;eng.cue('dive');}}},50);
      document.addEventListener('visibilitychange',()=>{if(!ctx)return;document.hidden?ctx.suspend():ctx.resume();});}
    if(ctx.state==='suspended')ctx.resume();}
  const live=()=>!!eng;
  const cue=(name,d)=>{if(live())eng.cue(name,d);};
  return{tele,unlock,cue,
    // Building progress: 'fold' | 'wings' | 'go' | 'idle'. Layers come in as the plane takes shape.
    stage(t){if(t!==stage&&t!=='idle'&&live()&&['fold','wings','go'].includes(t))cue('step');stage=t;
      if(live()&&!['count','fly','land'].includes(eng.stage))eng.setStage(t);},
    // A throw: its own song from the plane's id, a countdown riser, then the full band.
    countdown(seed){if(!live())return;eng.setSong(seed);eng.setStage('count',undefined,0.4);cue('count');},
    go(){if(!live())return;eng.setStage('fly',undefined,0.25);cue('go');},
    setSong(seed){if(live())eng.setSong(seed);},
    chime(big){cue('milestone',{big});},
    land(info){if(!live())return;eng.setStage('land',undefined,0.3);cue('land',info||{});clearTimeout(landT);
      landT=setTimeout(()=>{if(eng.stage==='land'){eng.setSong(null);eng.setStage(stage);}},9000);},
    blip(i,big){cue('blip',{i,big});},
    total(){cue('total');},
    idle(){clearTimeout(landT);if(live()&&eng.stage!==stage){eng.setSong(null);eng.setStage(stage);}},
    debug:()=>eng&&{stage:eng.stage,song:eng.song}};
})();
