// Render a scripted session through the real mixer to an MP3 you can listen to.
// Usage: node tools/preview-music.mjs [out.mp3]   (needs a static server on :8090 and ffmpeg)
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out=process.argv[2]||'music-preview.mp3';
const script=[[20,'fold'],[40,'wings'],[56,'trim'],[72,'go'],[88,'count',{quick:true,jump:true,jumpTo:'fly'}],[91,'fly',{quick:true}],[101,'land',{quick:true}],[112,'go'],[126,'idle']];
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});const p=await b.newPage();
p.on('console',m=>console.log('page:',m.text()));
await p.goto('http://127.0.0.1:8090/tools/preview-music.html');
const {wav,log}=await p.evaluate(([s,sc])=>window.renderPreview(s,sc),[150,script]);
await b.close();
writeFileSync(out+'.wav',Buffer.from(wav,'base64'));
execFileSync('ffmpeg',['-v','error','-y','-i',out+'.wav','-c:a','libmp3lame','-q:a','3',out]);
console.log(log.join('\n'));console.log('wrote',out);
