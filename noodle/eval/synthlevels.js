// Synth sounds: level (RMS dB), stereo width (side/mid dB), brightness (spectral centroid Hz) and render time, on a fixed phrase per sound.
// Used to keep each redesigned sound at the level it had in the mix. Usage: node mm/synthlevels.js [page]
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/'+(process.argv[2]||'noodle-s2.html')+'?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=110; S.bars=2; const out={};
    const C=[['Sub','bass'],['808 glide','bass'],['Synth bass','bass'],['Reese','bass'],['Pluck','bass'],['Saw','lead'],['Supersaw','lead'],['Square','lead'],['Bell','lead'],['Organ','keys'],['Stab','keys'],['Warm pad','pad'],['Choir','pad'],['Sweep','pad'],['Pluck','arp'],['Supersaw','arp'],['Glass','lead'],['Chip','lead'],['Theremin','lead'],['Vowel pad','pad'],['Digital pad','pad'],['Growl','bass'],['Chip','arp'],['Glass','arp'],['Saw','arp'],['Acid','bass'],['Wobble','bass'],['String pluck','keys'],['String pluck','arp'],['Chorus pad','pad'],['Pump pad','pad'],['Stab','keys'],['Piano','keys'],['E-piano','keys'],['Marimba','keys'],['Marimba','arp'],['Horns','pad'],['Horns','keys'],['Flute','lead'],['Glockenspiel','lead'],['Glockenspiel','arp'],['Bell','arp']];
    const line=[60,62,64,67,69,67,64,62], chords=[[57,60,64],[55,59,62],[53,57,60],[55,59,62]];
    for(const [snd,inst] of C){ const pad=inst==='pad'||inst==='keys';
      const notes=pad?chords.flatMap((ch,i)=>ch.map(m=>({s:i*8,l:8,p:m,v:.8,x:true}))):line.map((m,i)=>({s:i*4,l:3,p:m-(inst==='bass'?12:0),v:.8,x:true}));
      const t=mkTrack(inst,{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:snd,notes}); t.oct=0; t.chordType='off'; t.tone=50;
      const t0=performance.now(); const bb=await renderStem(t); const ms=performance.now()-t0;
      const L=bb.getChannelData(0), R=bb.getChannelData(1); let q=0,m2=0,s2=0; for(let i=0;i<L.length;i++){ q+=(L[i]*L[i]+R[i]*R[i])/2; const m=(L[i]+R[i])/2, s=(L[i]-R[i])/2; m2+=m*m; s2+=s*s; }
      let dx=0,xx=0; for(let i=1;i<L.length;i++){ const a=L[i]+R[i], b0=L[i-1]+R[i-1]; dx+=(a-b0)*(a-b0); xx+=a*a; }   /* brightness: a signal's 'mean frequency' from its slope */
      const hz=bb.sampleRate/(2*Math.PI)*Math.sqrt(dx/(xx+1e-12));
      out[snd+'/'+inst]={db:+(10*Math.log10(q/L.length+1e-12)).toFixed(1), width:+(10*Math.log10((s2+1e-12)/(m2+1e-12))).toFixed(1), hz:Math.round(hz), ms:Math.round(ms)}; }
    return out; });
  for(const [k,v] of Object.entries(r)) console.log(k.padEnd(16), JSON.stringify(v)); console.log(errs); await b.close(); })();
