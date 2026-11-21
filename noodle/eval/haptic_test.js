// Felt metronome: in the iPhone app (a fake noodleNative here) a take's count-in clicks, then the click stops as recording starts and
// the phone is asked to buzz every beat (count-in + take, strong on each bar's first beat); stopping sends metroStop. Off in the web.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']}); const errs=[], out={};
  for(const app of [true,false]){ const c=await b.newContext({...devices['iPhone 13'],permissions:['microphone']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(app=>{ localStorage.setItem('noodle.onboard','1'); window.__m=[]; if(app) window.webkit={messageHandlers:{noodleNative:{postMessage:m=>window.__m.push(m)}}}; },app);
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
    const r=await p.evaluate(async()=>{ ensureCtx(); await ctx.resume(); S.bpm=120; S.bars=1; const t=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true}); S.tracks.push(t); S.target=t.id; S.inst='lead';
      await startRecord(); const r=recState; if(!r) return {started:false}; const beat=60/S.bpm, at=x=>{ const g=metroGain.gain; return +g.value.toFixed(2); };
      await new Promise(q=>setTimeout(q,(r.start-ctx.currentTime)*1000+300)); const after=+metroGain.gain.value.toFixed(2);
      cancelRecord(); return {started:true, after, msgs:window.__m.filter(m=>['metro','metroStop','metroWarm'].includes(m.type)).map(m=>m.type==='metro'?`metro:${m.beats}:${Math.round(m.beatMs)}:${m.perBar}`:m.type)}; });
    out[app?'app':'web']=r; await c.close(); }
  if(!out.app.started||out.app.after!==0||out.app.msgs.find(m=>m.startsWith('metro:'))!=='metro:8:500:4'||!out.app.msgs.includes('metroStop')) errs.push('app '+JSON.stringify(out.app));
  if(!out.web.started||out.web.after===0||out.web.msgs.length) errs.push('web '+JSON.stringify(out.web));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
