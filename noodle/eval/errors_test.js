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
  // a song file with a made-up instrument: the part is left out, the rest opens, no page errors
  out.badPart=await p.evaluate(async()=>{ const f={noodle:'songs',v:1,songs:[{title:'Odd',createdAt:1,updatedAt:1,song:{v:1,bpm:100,bars:1,tracks:[{id:1,inst:'<b>x</b>',notes:[]},{id:2,inst:'lead',sound:'Saw',notes:[{s:0,l:4,p:60,v:.8}],off:0,len:1,lenSet:true,rep:false},{id:3,inst:'keys',notes:'nope'}]}}]};
    const n=await songFileOpen(JSON.stringify(f)); await projOpen(songFileOpen.last); await new Promise(q=>setTimeout(q,400)); renderTracks(); s2Render(); return n+':'+S.tracks.map(t=>t.inst).join(','); });
  await c.close();
  // the website ignores a saved Pro flag and console purchase reports (Pro is bought in the iPhone app): the page served under a non-local
  // name; on localhost (local test runs) the flag still counts
  { const b2=await chromium.launch({args:['--host-resolver-rules=MAP noodle.test 127.0.0.1']}); const c2=await b2.newContext({...devices['iPhone 13']}); const p2=await c2.newPage(); p2.on('pageerror',e=>errs.push(e.message));
    await p2.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk'].forEach(k=>localStorage.setItem(k,'1')); localStorage.setItem('noodle.pro','1'); });
    await p2.goto('http://noodle.test:8800/noodle-s2.html?studio'); await p2.waitForTimeout(1000); out.webPro=await p2.evaluate(()=>{ const a=isPro(); window.noodlePro(true,'$4.99'); return a+','+isPro(); });
    await p2.goto('http://localhost:8800/noodle-s2.html?studio'); await p2.waitForTimeout(1000); out.localPro=await p2.evaluate(()=>isPro());
    await b2.close(); }
  if(out.badPart!=='1:lead') errs.push('bad part: '+out.badPart); if(out.localPro!==true||out.webPro!=='false,false') errs.push('web pro: '+out.localPro+' '+out.webPro);
  if(out.app.title!=='Noodle can’t hear you'||!out.app.settings||!out.app.imp||!out.app.sent||!out.app.again) errs.push('app: '+JSON.stringify(out.app));
  if(out.web.title!=='Noodle can’t hear you'||out.web.settings||!out.web.imp||!out.web.again) errs.push('web: '+JSON.stringify(out.web));
  if(!/connection/.test(out.offline)) errs.push('offline: '+out.offline); if(!/isn’t available/.test(out.gone)) errs.push('gone: '+out.gone);
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
