// drive a real recording in the page with a fake mic stream: quiet background vs loud background; check the count-in label and the after-take toast
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}); 
  for(const [name,noiseAmp] of [['quiet',0.0003],['noisy',0.02]]){
    const c=await b.newContext({permissions:['microphone']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(amp=>{ const AC=window.AudioContext; navigator.mediaDevices.getUserMedia=async()=>{ const ctx=window.__ctx; const dst=ctx.createMediaStreamDestination();
        const n=ctx.createBufferSource(), buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*amp; n.buffer=buf; n.loop=true; n.connect(dst); n.start();
        window.__sing=(t0,notes)=>{ notes.forEach(([st,du,hz])=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sawtooth'; o.frequency.value=hz; g.gain.value=0; g.gain.setTargetAtTime(0.12,t0+st,0.01); g.gain.setTargetAtTime(0,t0+st+du-0.05,0.01); o.connect(g); g.connect(dst); o.start(t0+st); o.stop(t0+st+du+0.1); }); };
        return dst.stream; }; },noiseAmp);
    await p.goto('http://localhost:8800/noodle-noise.html'); await p.waitForTimeout(1000);
    const res=await p.evaluate(async()=>{ ensureCtx(); window.__ctx=ctx; await ctx.resume(); const tr=activePart()||S.tracks[0]; const labels=new Set();
      await recordInto((activePart()||S.tracks.find(t=>INST[t.inst].kind==='pitched')).id); const r=recState; if(!r) return {err:'no recState'};
      const beat=60/S.bpm; window.__sing(r.start,[[0,beat*0.9,196],[beat,beat*0.9,220],[2*beat,beat*0.9,247],[3*beat,beat*0.9,262]]);
      const end=r.end; while(recState||ctx.currentTime<end+1.2){ labels.add($('recLabel').textContent.replace(/\d/g,'#')); await new Promise(q=>setTimeout(q,60)); if(ctx.currentTime>end+6) break; }
      return {labels:[...labels], toast:$('toast').textContent, noise:lastNoise, voxTop:S.voxTop, notes:(activePart()||{}).notes?.length}; });
    console.log(name, JSON.stringify(res), errs); await c.close(); }
  await b.close(); })();
