// Teaching the crash from More → Your drum sounds (round 29, owner: it wasn't saved, and the example song started playing and looping after).
// A long bright "k-shhh" on each click is learned (Taught in the list); no song plays after teaching. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}); const errs=[], out={};
  const c=await b.newContext({...devices['iPhone 13'],permissions:['microphone']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); navigator.mediaDevices.getUserMedia=async()=>{ const cx=window.__ctx, dst=cx.createMediaStreamDestination(); window.__dst=dst; return dst.stream; }; });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  await p.evaluate(async()=>{ ensureCtx(); window.__ctx=ctx; await ctx.resume(); await nxExample(); await new Promise(q=>setTimeout(q,600)); nxGo('more'); });
  await p.waitForTimeout(400); await p.evaluate(()=>$('nxDrums').click()); await p.waitForTimeout(300);
  out.before=await p.evaluate(()=>[...document.querySelectorAll('#nxSheet [data-teach]')].map(x=>x.dataset.teach).join(','));
  await p.evaluate(()=>document.querySelector('#nxSheet [data-teach="crash"]').click());
  await p.waitForFunction(()=>recState&&recState.teach,null,{timeout:15000});
  const w=await p.evaluate(()=>{ const r=recState, cx=window.__ctx, dst=window.__dst, beat=60/S.bpm, sr=cx.sampleRate;
    for(let i=0;i<8;i++){ const t=r.start+i*beat+0.01; if(t>r.end-0.1) break; const n=cx.createBufferSource(), L=Math.min(0.5,beat*0.85), buf=cx.createBuffer(1,Math.round(sr*L),sr), x=buf.getChannelData(0); let y=0;
      for(let j=0;j<x.length;j++){ const u=j/sr, v=Math.random()*2-1, hp=v-y; y=v; x[j]=0.45*hp*Math.min(1,u/0.004)*Math.exp(-u*3.5); }
      n.buffer=buf; n.connect(dst); n.start(t); } return (r.end-cx.currentTime)+0.3; });
  await p.waitForTimeout(w*1000); await p.waitForFunction(()=>!recState,null,{timeout:15000}); await p.waitForTimeout(800);
  out.msg=await p.evaluate(()=>lastMsg);
  out.taught=await p.evaluate(()=>taughtSlots().map(x=>x.id).join(','));
  if(await p.evaluate(()=>!!$('rsKeep')&&!$('rsKeep').hidden)){ await p.evaluate(()=>$('rsKeep').click()); } await p.waitForTimeout(1200);
  out.after=await p.evaluate(()=>({playing, sources:S.tracks.filter(t=>t._src).length, list:(document.querySelector('#nxSheet')&&[...document.querySelectorAll('#nxSheet .nx-item small')].map(x=>x.textContent).join('|'))||''}));
  if(!/crash/.test(out.taught)) errs.push('not taught: '+out.taught+' / '+out.msg);
  if(out.after.playing||out.after.sources) errs.push('song plays after teaching: '+JSON.stringify(out.after));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
