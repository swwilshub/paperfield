// Render a scripted session through the real music engine to an MP3 you can listen to.
// Usage: python3 -m http.server 8090 & node tools/preview-music.mjs [out.mp3]   (needs ffmpeg)
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out=process.argv[2]||'music-preview.mp3';
const S=(t,stage,tc)=>[t,'stage:'+stage,tc];
const script=[
  S(0,'idle',0.05),[14,'board'],[20,'card',{dist:24}],
  S(26,'fold'),[26,'step'],[29,'crease',{n:1}],[33,'pending'],[34,'crease',{n:2}],[38,'undo'],[41,'crease',{n:3}],
  S(46,'wings'),[46,'step'],...[0.2,0.3,0.4,0.5,0.6,0.5].map((v,i)=>[49+i*0.25,'keel',{v}]),
  S(58,'go'),[58,'step'],[61,'paper',{pattern:true}],[64,'paper',{pattern:false}],
  [72,'song','plane-123'],S(72,'count',0.4),[72,'count'],
  S(75,'fly',0.25),[75,'go'],...Array.from({length:40},(_,i)=>[75+i*0.25,'tele',[6+10*Math.sin(Math.PI*i/40),5*Math.sin(Math.PI*i/40),i<20?2:-2]]),
  [78,'milestone',{big:false}],[80,'peak'],[82,'loop',{n:1}],[84,'dive'],
  S(85,'land',0.3),[85,'land',{dist:42,record:true}],
  ...[0,1,2,3].map(i=>[88+i*0.45,'blip',{i,big:i>=2}]),[90,'pb'],[91,'total'],
  [95,'song',null],S(95,'idle'),[100,'arrival'],[110,'ready'],
];
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});const p=await b.newPage();
p.on('pageerror',e=>console.log('page error:',e.message));
await p.goto('http://127.0.0.1:8090/tools/preview-music.html');
const wav=await p.evaluate(([s,sc])=>window.renderPreview(s,sc),[120,script]);
await b.close();
writeFileSync(out+'.wav',Buffer.from(wav,'base64'));
execFileSync('ffmpeg',['-v','error','-y','-i',out+'.wav','-c:a','libmp3lame','-q:a','3',out]);
console.log('wrote',out);
