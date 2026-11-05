// Run Basic Pitch once per file, then turn its raw output into notes with several post-processing settings.
// usage: node bp_sweep.js <listfile> <outprefix>
const {chromium}=require('playwright'); const fs=require('fs');
const V={ def:{on:0.5,fr:0.3,minLen:5,melodia:true}, on35:{on:0.35,fr:0.3,minLen:5,melodia:true}, on65:{on:0.65,fr:0.3,minLen:5,melodia:true},
  fr20:{on:0.5,fr:0.2,minLen:5,melodia:true}, fr40:{on:0.5,fr:0.4,minLen:5,melodia:true}, len10:{on:0.5,fr:0.3,minLen:10,melodia:true},
  nomel:{on:0.5,fr:0.3,minLen:5,melodia:false}, on35len10:{on:0.35,fr:0.3,minLen:10,melodia:true}, poly:{on:0.5,fr:0.3,minLen:5,melodia:true,mono:false} };
(async()=>{ const [list,prefix]=process.argv.slice(2); const files=fs.readFileSync(list,'utf8').trim().split('\n');
  const done=fs.existsSync(prefix+'_progress.json')?JSON.parse(fs.readFileSync(prefix+'_progress.json','utf8')):{};
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/bp_eval.html'); await p.waitForTimeout(500); const t0=Date.now(); let n=0;
  for(const f of files){ if(done[f]) continue;
    done[f]=await p.evaluate(async([f,V])=>{ const R=await bpRaw('/'+f); const out={};
      for(const [k,o] of Object.entries(V)) out[k]={dur:R.dur, ms:R.ms, notes:bpNotes(R,o)}; return out; },[f,V]);
    if(++n%10===0){ fs.writeFileSync(prefix+'_progress.json',JSON.stringify(done)); console.log(n,'files',((Date.now()-t0)/1000).toFixed(0),'s'); } }
  fs.writeFileSync(prefix+'_progress.json',JSON.stringify(done));
  for(const k of Object.keys(V)){ const o={}; for(const f in done) o[f]=done[f][k]; fs.writeFileSync(`${prefix}_${k}.json`,JSON.stringify(o)); }
  console.log('done',Object.keys(done).length,'errors',errs.slice(0,3)); await b.close(); })();
