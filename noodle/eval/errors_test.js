// Error states (round 18): the microphone refused shows a sheet that says how to turn it on (in the iPhone app: Open Settings, which asks
// the app to open Noodle's page in Settings) and offers Import a recording; recording again explains again. A song link opened while
// offline says to check the connection (not that the song is gone); a deleted one says it isn't available. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  for(const app of [true,false]){ const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(app=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); window.__m=[];
      if(app) window.webkit={messageHandlers:{noodleNative:{postMessage:m=>window.__m.push(m)}}};
      navigator.mediaDevices.getUserMedia=async()=>{ const e=new Error('denied'); e.name='NotAllowedError'; throw e; }; },app);
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
    const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={}; ensureCtx(); S.bars=1; const t=mkTrack('lead',{id:S.nextId++}); S.tracks.push(t); renderTracks();
      await recordInto(t.id); await w(300); o.title=(document.querySelector('#nxSheet h2')||{}).textContent; o.settings=!!$('micSet'); o.imp=!!$('micImp');
      if($('micSet')){ $('micSet').click(); o.sent=window.__m.some(m=>m.type==='settings'); }
      nxClose(); await w(200); await recordInto(t.id); await w(300); o.again=(document.querySelector('#nxSheet h2')||{}).textContent===o.title; nxClose();
      return o; });
    out[app?'app':'web']=r; await c.close(); }
  const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  await p.route('**/v1/songs/**',r=>r.abort('internetdisconnected'));
  out.offline=await p.evaluate(async()=>{ await songLinkOpen('https://x/s/abcdefghij12'); return $('toast').textContent; });
  await p.unroute('**/v1/songs/**'); await p.route('**/v1/songs/**',r=>r.fulfill({status:404,body:'{"error":"not found"}'}));
  out.gone=await p.evaluate(async()=>{ await songLinkOpen('https://x/s/abcdefghij12'); return $('toast').textContent; });
  await c.close();
  if(out.app.title!=='Noodle can’t hear you'||!out.app.settings||!out.app.imp||!out.app.sent||!out.app.again) errs.push('app: '+JSON.stringify(out.app));
  if(out.web.title!=='Noodle can’t hear you'||out.web.settings||!out.web.imp||!out.web.again) errs.push('web: '+JSON.stringify(out.web));
  if(!/connection/.test(out.offline)) errs.push('offline: '+out.offline); if(!/isn’t available/.test(out.gone)) errs.push('gone: '+out.gone);
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
