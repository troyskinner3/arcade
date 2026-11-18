// A song's recorded instruments load when it opens (before any play or tap), only the ones it uses; changing a part's sound loads the new one.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(2500);
  const r=await p.evaluate(async()=>{ const out={};
    { const o=defaultState(); o.tracks=([mkTrack('keys',{id:900,off:0,len:1,sound:'Piano',notes:[{s:0,l:4,p:60,v:.8}]}),mkTrack('kit',{id:901,off:0,len:1,sound:'Punchy',hits:[{s:0,d:'kick',v:.8}]}),mkTrack('lead',{id:902,off:0,len:1,sound:'Saw',notes:[{s:0,l:4,p:60,v:.8}]})]);
      for(const k in SMP) delete SMP[k]; const ren=renderStem; renderStem=async()=>ctx.createBuffer(2,1,ctx.sampleRate); window._ren=ren; await projLoadState(o); await new Promise(r=>setTimeout(r,2500)); }   /* renders switched off: what loads, loads because the song opened */   /* open a song with a recorded piano, a synth kit and a synth lead */
    out.songSounds=S.tracks.map(t=>t.sound); out.playedYet=!!playing;
    const want=[...new Set(S.tracks.filter(t=>INST[t.inst].kind==='pitched'&&SAMPLED[t.sound]).map(t=>SAMPLED[t.sound]))];
    out.wanted=want; out.readyOnOpen=want.every(k=>SMP[k]&&SMP[k].ok); out.loadedOnOpen=Object.keys(SMP).filter(k=>SMP[k].ok).sort();
    const kit=S.tracks.find(t=>t.hits&&INST[t.inst].kind!=='pitched'), lead=S.tracks.find(t=>t.inst==='lead');
    if(kit) kit.sound='Rock'; if(lead) lead.sound=lead.inst==='bass'?'Rock bass':'Guitar'; renderStem=async()=>ctx.createBuffer(2,1,ctx.sampleRate); renderTracks();
    await new Promise(r=>setTimeout(r,2500)); out.afterChange=Object.keys(SMP).filter(k=>SMP[k].ok).sort(); out.kitReady=kitReady('Rock');
    return out; });
  console.log(JSON.stringify(r,null,1),errs); await b.close(); })();
