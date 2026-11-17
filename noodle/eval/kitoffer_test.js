// The first drum kit take offers to teach kick, snare and hi-hat first (once). "Not now" goes straight to recording; "Teach my sounds" learns three sounds, then back to the Studio.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}); const out={}, errs=[];
  const page=async()=>{ const c=await b.newContext({...devices['iPhone 13'],permissions:['microphone'],colorScheme:'dark'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{ navigator.mediaDevices.getUserMedia=async()=>{ const cx=window.__ctx, dst=cx.createMediaStreamDestination(); window.__dst=dst; return dst.stream; }; });
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); await p.evaluate(()=>{ ensureCtx(); window.__ctx=ctx; return ctx.resume(); }); return {c,p}; };
  // 1. Not now
  { const {c,p}=await page(); await p.tap('#s2RecB'); await p.tap('#nxSheet [data-k="kit"]'); await p.waitForTimeout(250);
    out.offer={shown:await p.evaluate(()=>!!$('kitTeach')), title:await p.$eval('#nxSheet h2',e=>e.textContent)}; await p.screenshot({path:'results/kit_offer.png'});
    await p.tap('#kitSkip'); await p.waitForFunction(()=>!!recState,null,{timeout:10000}); out.notNow={recording:true, teach:await p.evaluate(()=>!!recState.teach)}; await p.tap('#s2RecB'); await p.waitForFunction(()=>!recState,null,{timeout:20000}); await p.waitForTimeout(800);
    if(await p.evaluate(()=>!$('s2Take').hidden)) await p.tap('#s2TkDel'); await p.waitForTimeout(300);
    await p.evaluate(()=>{ s2.armId=s2Lanes().find(L=>L.tracks[0].inst==='kit').id; }); await p.tap('#s2RecB'); await p.waitForTimeout(400); out.secondTime={offer:await p.evaluate(()=>!!$('kitTeach')&&!$('nxScrim').hidden), recording:await p.evaluate(()=>!!recState)};
    if(await p.evaluate(()=>!!recState)){ await p.tap('#s2RecB'); await p.waitForFunction(()=>!recState,null,{timeout:20000}); } await c.close(); }
  // 2. Teach my sounds
  { const {c,p}=await page(); await p.tap('#s2RecB'); await p.tap('#nxSheet [data-k="kit"]'); await p.waitForTimeout(250); await p.tap('#kitTeach'); const said=[];
    for(let k=0;k<3;k++){ await p.waitForFunction(()=>recState&&recState.teach,null,{timeout:15000}); said.push(await p.evaluate(()=>recState.teach.d));
      const w=await p.evaluate(()=>{ const r=recState, cx=window.__ctx, dst=window.__dst, beat=60/S.bpm, d=r.teach.d, sr=cx.sampleRate;
        for(let i=0;i<8;i++){ const t=r.start+i*beat+0.01; if(t>r.end-0.1) break; const n=cx.createBufferSource(), buf=cx.createBuffer(1,Math.round(sr*0.2),sr), x=buf.getChannelData(0); let y=0,ph=0;
          for(let j=0;j<x.length;j++){ const u=j/sr, v=Math.random()*2-1;
            if(d==='kick'){ ph+=2*Math.PI*(150*Math.exp(-u*18)+45)/sr; x[j]=0.7*Math.sin(ph)*Math.exp(-u*14); }
            else if(d==='snare'){ y+=0.35*(v-y); x[j]=(0.5*y+0.25*Math.sin(2*Math.PI*190*u))*Math.exp(-u*16); }
            else { const hp=v-y; y=v; x[j]=0.35*hp*Math.exp(-u*55); } }
          n.buffer=buf; n.connect(dst); n.start(t); } return (r.end-cx.currentTime)+0.3; }); await p.waitForTimeout(w*1000); await p.waitForFunction(()=>!recState,null,{timeout:15000}); }
    await p.waitForSelector('#rsKeep:not([hidden])',{timeout:15000}); await p.waitForTimeout(300); out.teach={said, taught:await p.evaluate(()=>taughtSlots().map(x=>x.id)), done:await p.$eval('#rsKeep',e=>e.textContent)}; await p.screenshot({path:'results/kit_taught.png'});
    await p.tap('#rsKeep'); await p.waitForTimeout(400); out.back={studio:await p.evaluate(()=>!$('s2').hidden&&$('recSheet').hidden), toast:await p.$eval('#toast',e=>e.textContent), armedKit:await p.evaluate(()=>{ const L=s2Lane(s2.armId); return !!L&&L.tracks[0].inst==='kit'; })};
    await p.tap('#s2RecB'); await p.waitForTimeout(400); out.afterTeach={offer:await p.evaluate(()=>!$('nxScrim').hidden), recording:await p.evaluate(()=>!!recState&&!recState.teach)}; if(await p.evaluate(()=>!!recState)){ await p.tap('#s2RecB'); await p.waitForFunction(()=>!recState,null,{timeout:20000}); } await c.close(); }
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
