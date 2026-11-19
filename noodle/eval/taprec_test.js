// Tap along: record one held hum (four repeats sung as one sound) into a melody part with a fake mic, tapping the pad on each beat.
// With taps it becomes four notes; with the pad turned off it stays one. The pad shows only while a melody records. Prints {..., errs:[]}.
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}); const out={}, errs=[];
  for(const mode of ['taps','off']){
    const c=await b.newContext({permissions:['microphone'],viewport:{width:390,height:844}}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{ navigator.mediaDevices.getUserMedia=async()=>{ const ctx=window.__ctx, dst=ctx.createMediaStreamDestination();
        window.__sing=(t0,du,hz)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sawtooth'; o.frequency.value=hz; g.gain.value=0; g.gain.setTargetAtTime(0.12,t0,0.01); g.gain.setTargetAtTime(0,t0+du-0.05,0.01); o.connect(g); g.connect(dst); o.start(t0); o.stop(t0+du+0.1); };
        return dst.stream; }; });
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
    const r=await p.evaluate(async mode=>{ ensureCtx(); window.__ctx=ctx; await ctx.resume(); S.tapPad=mode==='taps'; S.bpm=100; S.bars=1;
      const tr=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,notes:[]}); S.tracks.push(tr); renderTracks();
      await recordInto(tr.id); const R=recState; if(!R) return {err:'no recState'}; const beat=60/S.bpm, pad=document.getElementById('s2TapPad');
      const shown=!pad.hidden; window.__sing(R.start+0.02,4*beat-0.05,220);
      if(mode==='taps') for(let k=0;k<4;k++){ const at=R.start+k*beat+0.01; while(ctx.currentTime<at) await new Promise(q=>setTimeout(q,5)); pad.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); }
      while(recState) await new Promise(q=>setTimeout(q,50)); while(takeReading) await new Promise(q=>setTimeout(q,50)); await new Promise(q=>setTimeout(q,300));
      const t=S.tracks.find(x=>x.id===tr.id)||S.tracks.find(x=>x.inst==='lead'&&x.notes&&x.notes.length);
      return {shown, hiddenAfter:pad.hidden, notes:t?t.notes.map(n=>[n.s,n.l,pitchOf(n)]):null}; },mode);
    out[mode]=r; await c.close(); }
  if(!out.taps.shown) errs.push('pad not shown'); if(out.off.shown) errs.push('pad shown while off'); if(!out.taps.hiddenAfter) errs.push('pad still shown');
  if(!out.taps.notes||out.taps.notes.length!==4) errs.push('with taps: '+JSON.stringify(out.taps.notes)); if(!out.off.notes||out.off.notes.length!==1) errs.push('no taps: '+JSON.stringify(out.off.notes));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
