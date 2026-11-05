// Like sweep.js, with an external pitch tracker hook loaded (scripts + loader given on the command line).
// Each variant: {ext:true|false, conf:<voicing threshold>, nt:{...}, sens}
// usage: node sweep_ext.js <listfile> <variants.json> <outprefix> <scripts comma list> <loader fn> <conf global name>
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [list,varsFile,prefix,scripts,loader,confName]=process.argv.slice(2); const files=fs.readFileSync(list,'utf8').trim().split('\n'); const V=JSON.parse(fs.readFileSync(varsFile,'utf8'));
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle.html'); await p.waitForTimeout(800);
  for(const s of scripts.split(',')) await p.addScriptTag({url:s}); await p.evaluate(l=>window[l](),loader);
  const out={}; Object.keys(V).forEach(k=>out[k]={}); const t0=Date.now(); let n=0;
  for(const f of files){
    const r=await p.evaluate(async([f,V,confName])=>{ const buf=await (await fetch('/'+f)).arrayBuffer(); const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(buf); const x=mono(ab), sr=ab.sampleRate;
      const t=performance.now(); if(window.EXT_PREP) await window.EXT_PREP(x,sr); const prepMs=performance.now()-t;
      const base=Object.assign({},NT), hook=window.EXT_PITCH, res={};
      for(const [name,o] of Object.entries(V)){ Object.assign(NT,base,o.nt||{}); window.EXT_PITCH=o.ext?hook:null; window[confName]=o.conf??0.5;
        const an=analyzeTake(x,sr,'lead',o.sens??55,false); fitWhistle(an,'lead');
        res[name]={dur:x.length/sr, ms:prepMs, notes:(an.notes||[]).map(n=>[+n.t0.toFixed(4),+n.t1.toFixed(4),+n.p.toFixed(3)])}; }
      Object.assign(NT,base); window.EXT_PITCH=hook; return res; },[f,V,confName]);
    for(const k in r) out[k][f]=r[k];
    if(++n%25===0) console.log(n,'files',((Date.now()-t0)/1000).toFixed(0),'s'); }
  for(const k in out) fs.writeFileSync(`${prefix}_${k}.json`,JSON.stringify(out[k]));
  console.log('files',files.length,'variants',Object.keys(V).length,'secs',((Date.now()-t0)/1000).toFixed(0),'errors',errs.slice(0,3)); await b.close(); })();
