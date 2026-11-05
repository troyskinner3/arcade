// Run the app's melody detector over a file list once per settings variant (NT overrides) and save each variant's notes.
// usage: node sweep.js <listfile> <variants.json> <outprefix>
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [list,varsFile,prefix]=process.argv.slice(2); const files=fs.readFileSync(list,'utf8').trim().split('\n'); const V=JSON.parse(fs.readFileSync(varsFile,'utf8'));
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle.html'); await p.waitForTimeout(800);
  const out={}; Object.keys(V).forEach(k=>out[k]={}); const t0=Date.now();
  for(const f of files){
    const r=await p.evaluate(async([f,V])=>{ const buf=await (await fetch('/'+f)).arrayBuffer(); const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(buf); const x=mono(ab), sr=ab.sampleRate;
      const base=Object.assign({},NT), res={};
      for(const [name,o] of Object.entries(V)){ Object.assign(NT,base,o.nt||{}); const an=analyzeTake(x,sr,'lead',o.sens??55,false); fitWhistle(an,'lead');
        res[name]={dur:x.length/sr, ms:1, notes:(an.notes||[]).map(n=>[+n.t0.toFixed(4),+n.t1.toFixed(4),+n.p.toFixed(3)])}; }
      Object.assign(NT,base); return res; },[f,V]);
    for(const k in r) out[k][f]=r[k]; }
  for(const k in out) fs.writeFileSync(`${prefix}_${k}.json`,JSON.stringify(out[k]));
  console.log('files',files.length,'variants',Object.keys(V).length,'secs',((Date.now()-t0)/1000).toFixed(0),'errors',errs.slice(0,3)); await b.close(); })();
