// Runs the physics core from legacy/one-sheet-game.html (first inline <script>) in Node
// on tests/fixtures/specs.json and writes tests/golden.json. Never imports src/.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'legacy/one-sheet-game.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const core=scripts[0];if(!/function throwPlane/.test(core))throw new Error('first inline script is not the physics core');
const mod={exports:{}};vm.runInNewContext(core,{module:mod,Math,Map,JSON,Float32Array,Float64Array,Object,Array,isFinite,String});
const {throwPlane}=mod.exports;
const specs=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/specs.json'),'utf8'));
const pick=r=>({dist:r.dist,time:r.time,maxZ:r.maxZ,loops:r.loops});
const out={source:'legacy/one-sheet-game.html',node:process.version,cases:{}};
for(const [name,{seed,spec}] of Object.entries(specs)){const R=throwPlane(spec,seed);const o=R.throws[R.official];
  out.cases[name]={seed,official:R.official,noWing:!!R.G.noWing,Vcap:R.aero.Vcap,nominal:R.nominal,...pick(o.r),throws:R.throws.map(t=>({L:t.L,...pick(t.r),trLen:t.r.tr.length}))};
  console.log(name.padEnd(18),'dist',o.r.dist.toFixed(2),'time',o.r.time.toFixed(2),'maxZ',o.r.maxZ.toFixed(2),'loops',o.r.loops,'noWing',!!R.G.noWing,'official',R.official);}
fs.writeFileSync(path.join(root,'tests/golden.json'),JSON.stringify(out,null,1)+'\n');
