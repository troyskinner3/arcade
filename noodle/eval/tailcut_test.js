// Owner, 27 Nov: (1) a 2-bar lead whose notes are all in bar 2 played a short, sudden pluck when started at bar 1: the ring-over of the last
// note is folded into the loop's start (so the loop is seamless) and was heard on the first pass too. Now the first pass is clean (live and in
// exports) and later passes keep the ring-over. (2) After Pause, tapping notes or keys in the editor made no sound until Play: Pause closes the
// output gate and nothing opened it. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={}, pk=(d,a,z)=>{ let m=0; for(let i=a;i<z;i++) m=Math.max(m,Math.abs(d[i])); return +m.toFixed(4); };
    await projNew(); S.bpm=94; S.bars=2; const t=mkTrack('lead',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,vol:80,sound:'Saw',notes:[{s:16,l:4,p:60,v:0.8,x:true},{s:20,l:4,p:63,v:0.8,x:true},{s:24,l:4,p:60,v:0.8,x:true},{s:28,l:4,p:55,v:0.8,x:true}]}); S.tracks.push(t); ensureCtx(); await renderDirty();
    const sr=t._buf.sampleRate, z=Math.round(0.3*sr), d=t._buf.getChannelData(0), c=t._buf._cut?t._buf._cut.getChannelData(0):null;
    o.loopStart=pk(d,0,z); o.hasCut=!!c; if(c){ const f=new Float32Array(z); for(let i=0;i<z;i++) f[i]=d[i]+c[i]; o.firstPass=pk(f,0,z); }
    const mix=await renderMix(2,false), md=mix.getChannelData(0), n=Math.round(loopLen()*sr); o.exportStart=pk(md,0,z); o.exportLoop2=pk(md,n,n+z);
    // live: what reaches the speaker in the first 0.25 s after Play at bar 1
    const an=ctx.createAnalyser(); an.fftSize=2048; chain.gate.connect(an); const a=new Float32Array(2048);
    playFrom=0; await togglePlay(); await w(60); let m=0; for(let k=0;k<5;k++){ an.getFloatTimeDomainData(a); m=Math.max(m,pk(a,0,a.length)); await w(35); } o.livePlay=m; await togglePlay(); await w(200);
    // preview after Pause, listened to after the gate
    previewNote(t,60); await w(110); an.getFloatTimeDomainData(a); o.previewAfterPause=pk(a,0,a.length);
    await w(500); previewHit({inst:'kit',sound:S.tracks[0]?.sound||'808',vol:80,pan:0},'k'); await w(60); an.getFloatTimeDomainData(a); o.hitAfterPause=pk(a,0,a.length);
    return o; });
  if(!(r.loopStart>0.02)) errs.push('setup: no ring-over at the loop start '+r.loopStart);
  if(!r.hasCut || !(r.firstPass<0.001)) errs.push('first pass not clean '+r.firstPass);
  if(!(r.exportStart<0.001 && r.exportLoop2>0.02)) errs.push('export '+r.exportStart+' '+r.exportLoop2);
  if(!(r.livePlay<0.005)) errs.push('live first pass '+r.livePlay);
  if(!(r.previewAfterPause>0.05)) errs.push('no preview after pause '+r.previewAfterPause);
  if(!(r.hitAfterPause>0.05)) errs.push('no drum preview after pause '+r.hitAfterPause);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
