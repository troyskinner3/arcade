const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900);
  for(const f of fs.readdirSync(__dirname+'/../data/phone2').filter(f=>/\.wav$/.test(f))){ const m=JSON.parse(fs.readFileSync(__dirname+'/../data/phone2/'+f.replace('.wav','.json'))); if(!['bass','lead','keys','pad'].includes(m.inst)) continue;
    const r=await p.evaluate(async([f,inst])=>{ ensureCtx(); S.bpm=94; const ab=await ctx.decodeAudioData(await (await fetch('/data/phone2/'+f)).arrayBuffer()); const x=mono(ab), sr=ab.sampleRate; const an=analyzeTake(x,sr,inst,55,true); return an.notes.map(n=>Math.round(n.p)+'@'+n.t0.toFixed(2)).join(' '); },[f,m.inst]);
    console.log(f.slice(0,44), m.inst, 'heard then:',(m.heard&&m.heard.notes||[]).length, '| now:', r); }
  await b.close(); })();
