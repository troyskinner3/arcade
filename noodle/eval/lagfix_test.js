// Owner, 28 Nov: after switching apps, the Play pad's sound came nearly a second after the touch until the pad was closed (the delay check
// only ran while nothing played; the pad's take loops). A grown delay is faked here (the output clock reported 0.5 s behind) and the check
// must restart the audio: in the Studio while stopped and while playing (playback carries on from about the same spot), on the pad screen
// while its take plays (it plays again) and while ready (the next touch sounds); never during a pad take or while a video is recorded.
// Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={}, until=async f=>{ for(let i=0;i<800&&!f();i++) await w(10); };
    const lag=()=>{ const c=ctx; c._base=0.01; c.getOutputTimestamp=()=>({contextTime:c.currentTime-0.5, performanceTime:performance.now()}); };
    const restarted=async(f)=>{ const c0=ctx, n0=audioRestarts; lag(); await f(); audioLagCheck(); await w(50); return ctx!==c0 && audioRestarts===n0+1; };
    await nxExample(); await w(600); ensureCtx(); await w(200);
    o.stopped=await restarted(()=>{});
    await togglePlay(); await w(1200); const pos0=((ctx.currentTime-t0)%loopLen()+loopLen())%loopLen();
    o.playing=await restarted(()=>{}); await until(()=>playing&&renderedLen>0); await w(300); const pos1=((ctx.currentTime-t0)%loopLen()+loopLen())%loopLen(); o.resumed=playing; o.posJump=+Math.abs(pos1-pos0).toFixed(2); await togglePlay(); await w(200);
    // the pad: ready, then a take (no restart), then its take playing (restart, plays again)
    const lead=S.tracks.find(t=>t.inst==='lead'); await tapOpen('xy',s2LaneId(lead)); await until(()=>tapIn&&tapIn.xy); await w(200);
    o.padReady=await restarted(()=>{});
    const box=$('tiXY'), R=box.getBoundingClientRect(), an=()=>{ const a=ctx.createAnalyser(); a.fftSize=2048; chain.gate.connect(a); return a; };
    { const A=an(), buf=new Float32Array(2048); box.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:R.left+R.width/2,clientY:R.top+R.height/2,pointerId:1})); let m=0; for(let k=0;k<5;k++){ await w(40); A.getFloatTimeDomainData(buf); for(const x of buf) m=Math.max(m,Math.abs(x)); } box.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1})); o.padSoundsAfter=+m.toFixed(3); }
    tapRec(); await until(()=>tapIn.state==='take'); const T=tapIn;
    o.noRestartInTake=!(await restarted(()=>{}));
    box.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:R.left+R.width/3,clientY:R.top+R.height/2,pointerId:1})); await w(400); box.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    await w(300); document.querySelector('#tiBar [data-a="stop"]').click(); await until(()=>tapIn.state==='review'&&tapIn.playing); await w(300);
    o.padPlaying=await restarted(()=>{}); await until(()=>tapIn.playing); o.padPlaysAgain=tapIn.playing&&playing; tapClose(); await w(200);
    audioBusy++; o.noRestartInVideo=!(await restarted(()=>{})); audioBusy--;
    return o; });
  for(const k of ['stopped','playing','resumed','padReady','noRestartInTake','padPlaying','padPlaysAgain','noRestartInVideo']) if(!r[k]) errs.push(k);
  if(!(r.padSoundsAfter>0.02)) errs.push('pad silent after the restart '+r.padSoundsAfter); if(!(r.posJump<1.5)) errs.push('playback jumped '+r.posJump+' s');
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
