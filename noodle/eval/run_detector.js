// Run the app's own melody detector over a list of audio files and save the raw notes.
// usage: node run_detector.js <listfile> <out.json> [page=noodle.html] [inst=lead]
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [list,out,page='noodle.html',inst='lead']=process.argv.slice(2); const files=fs.readFileSync(list,'utf8').trim().split('\n');
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/'+page); await p.waitForTimeout(800);
  const res={}; const t0=Date.now();
  for(const f of files){ res[f]=await p.evaluate(async([f,inst])=>{ const buf=await (await fetch('/'+f)).arrayBuffer(); const ac=new OfflineAudioContext(1,1,44100);
      const ab=await ac.decodeAudioData(buf); const x=mono(ab), sr=ab.sampleRate; const t=performance.now();
      const an=analyzeTake(x,sr,inst,55,false); fitWhistle(an,inst);
      return {ms:Math.round(performance.now()-t), dur:+(x.length/sr).toFixed(2), notes:(an.notes||[]).map(n=>[+n.t0.toFixed(4),+n.t1.toFixed(4),+n.p.toFixed(3)])}; },[f,inst]); }
  fs.writeFileSync(out,JSON.stringify(res)); console.log('files',files.length,'secs',((Date.now()-t0)/1000).toFixed(1),'errors',errs.slice(0,3)); await b.close(); })();
