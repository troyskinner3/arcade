// Synth drum kits: per style and drum, loudness over the first 0.25 s, and the part a phone speaker can play (above 150 Hz). Usage: node mm/synthkit.js [page]
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/'+(process.argv[2]||'noodle-s2.html')+'?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=100; S.bars=1; const out={};
    const meas=bb=>{ const sr=bb.sampleRate, d=bb.getChannelData(0), n=Math.round(0.25*sr), a=Math.exp(-2*Math.PI*150/sr); let q=0,qh=0; const y=[0,0,0], xp=[0,0,0]; for(let i=0;i<n;i++){ let x=d[i]; q+=x*x; for(let k=0;k<3;k++){ y[k]=a*(y[k]+x-xp[k]); xp[k]=x; x=y[k]; } qh+=x*x; }   /* 18 dB/octave below 150 Hz, roughly a phone speaker */ return [+(10*Math.log10(q/n+1e-12)).toFixed(1), +(10*Math.log10(qh/n+1e-12)).toFixed(1)]; };
    for(const st of ['808','Punchy','EDM','Lo-fi']) for(const d of ['kick','snare','hat','clap']){ const t=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound:st,hits:[{s:0,d,v:.85}]}); t.tone=50; out[st+'/'+d]=meas(await renderStem(t)); }
    return out; });
  for(const [k,v] of Object.entries(r)) console.log(k.padEnd(14), 'all', v[0], ' >150Hz', v[1]); console.log(errs); await b.close(); })();
