// Owner, 28 Nov: the first time a track was armed with the Play pad, touching it made no sound; after one take it did. Opening the pads
// while the song plays stops it, and stopping shuts the output gate (to cut the reverb); until 27 Nov only Play or a take opened it again.
// Every pad screen (Play pad, Note pads, Chord pads, Drum pads) is opened while playing and touched, listening after the gate (the speaker). Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const out={};
  for(const [inst,kind] of [['lead','xy'],['bass','xy'],['lead','notes'],['keys','chords'],['kit','drums']]){
    const r=await p.evaluate(async([inst,kind])=>{ const w=ms=>new Promise(q=>setTimeout(q,ms));
      await nxExample(); await w(500); ensureCtx(); await togglePlay(); await w(400);   /* playing when Record is pressed: the pads stop it (Pause) */
      const tr=S.tracks.find(t=>t.inst===inst); await tapOpen(kind,s2LaneId(tr)); await w(300);
      const an=ctx.createAnalyser(); an.fftSize=2048; chain.gate.connect(an); const a=new Float32Array(2048);
      const el=kind==='xy'?document.querySelector('#tiXY'):document.querySelector('.ti-pad'); const r=el.getBoundingClientRect();
      const ev=(t)=>el.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:1,clientX:r.left+r.width*0.4,clientY:r.top+r.height*0.5,isPrimary:true}));
      ev('pointerdown'); let m=0; for(let k=0;k<6;k++){ await w(40); an.getFloatTimeDomainData(a); for(const x of a) m=Math.max(m,Math.abs(x)); } ev('pointerup'); tapClose(); await w(200);
      return +m.toFixed(3); },[inst,kind]);
    out[inst+' '+kind]=r; if(!(r>0.02)) errs.push(inst+' '+kind+' silent '+r); }
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
