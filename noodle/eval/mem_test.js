// Memory: instruments a song no longer uses are let go (and come back, sounding the same, when picked again); String pluck's cache stays bounded.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=100; S.bars=1; const out={};
    const o=defaultState(); o.tracks=[mkTrack('keys',{id:900,off:0,len:1,rep:false,lenSet:true,sound:'Piano',notes:[{s:0,l:8,p:60,v:.8,x:true}]}),mkTrack('lead',{id:901,off:0,len:1,rep:false,lenSet:true,sound:'Flute',notes:[{s:0,l:8,p:72,v:.8,x:true}]})]; await projLoadState(o);
    await Promise.all([loadSampled('Piano'),loadSampled('Flute')]); const t=S.tracks[0]; t.oct=0; t.chordType='off'; const a=await renderStem(t);
    out.loaded=Object.keys(SMP).filter(k=>SMP[k].ok).sort();
    t.sound='Marimba'; renderTracks(); await loadSampled('Marimba'); out.afterSwitch=Object.keys(SMP).filter(k=>SMP[k].ok).sort();
    t.sound='Piano'; renderTracks(); await loadSampled('Piano'); const c=await renderStem(t); let d=0; const x=a.getChannelData(0), y=c.getChannelData(0); for(let i=0;i<x.length;i++) d=Math.max(d,Math.abs(x[i]-y[i])); out.sameAfterReload=d<1e-6;
    const k=mkTrack('keys',{id:902,off:0,len:1,rep:false,lenSet:true,sound:'String pluck',notes:[]}); for(let m=30;m<100;m++) for(const br of [0,2,4]) ksBuf(48000,m,br); out.ksSize=KS_C.size;
    return out; });
  if(r.afterSwitch.includes('piano')||!r.afterSwitch.includes('flute')||!r.sameAfterReload||r.ksSize>48) errs.push('memory check out of range');
  console.log(JSON.stringify(r),errs); await b.close(); })();
