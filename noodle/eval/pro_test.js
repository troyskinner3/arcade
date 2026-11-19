// Noodle Pro on the page, with a stand-in for the iPhone app's App Store bridge. Free: Pro sounds show a lock and open the Pro screen without
// changing the sound; the DAW pack opens it too; free sounds still work. Buying: the page asks the app to buy, the app answers, Pro unlocks at
// once (locks gone, effects open), and is remembered after a reload. Restore with nothing bought says so; Ask to Buy says it's waiting.
// On the web (no app), Unlock says Pro is in the iPhone app.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  const ctx=await b.newContext({...devices['iPhone 13']});
  await ctx.addInitScript(()=>{ window.__msgs=[]; window.__answer='bought'; window.webkit={messageHandlers:{noodlePro:{postMessage:m=>{ window.__msgs.push(m); setTimeout(()=>{
      if(m==='state') window.noodlePro(localStorage.getItem('__owned')==='1','$6.99');
      if(m==='buy'){ if(window.__answer==='bought'){ localStorage.setItem('__owned','1'); window.noodlePro(true,'$6.99'); } window.noodleProResult(window.__answer); }
      if(m==='restore'){ window.noodlePro(localStorage.getItem('__owned')==='1','$6.99'); window.noodleProResult(localStorage.getItem('__owned')==='1'?'restored':'none'); } },30); }}}}; });
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  await p.evaluate(async()=>{ const o=defaultState(); o.bpm=110; o.bars=2; o.pid=projId(); o.tracks=[mkTrack('lead',{id:900,off:0,len:2,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:8,p:64,v:.8,x:true}]})]; await projLoadState(o); s2Render(); }); await p.waitForTimeout(300);
  out.price=await p.evaluate(()=>PRO.price); out.askedState=await p.evaluate(()=>window.__msgs.includes('state'));
  const lane=()=>p.evaluate(()=>s2TrackSheet(s2Lanes()[0]));
  await lane(); await p.waitForTimeout(200); out.lockShown=await p.evaluate(()=>!!document.querySelector('#s2Snd button[data-x="Glass"] svg')&&!document.querySelector('#s2Snd button[data-x="Square"] svg'));
  await p.click('#s2Snd button[data-x="Glass"]'); await p.waitForTimeout(200); out.proSheet=await p.evaluate(()=>/Noodle Pro/.test($('nxSheet').textContent)&&/\$6\.99/.test($('nxSheet').textContent)); out.soundKept=await p.evaluate(()=>S.tracks[0].sound);
  await lane(); await p.waitForTimeout(200); await p.click('#s2Snd button[data-x="Square"]'); await p.waitForTimeout(200); out.freeSound=await p.evaluate(()=>S.tracks[0].sound);
  await p.evaluate(()=>{ nxClose(); s2ShareSheet(); }); await p.waitForTimeout(200); await p.click('#nxSheet [data-k="daw"]'); await p.waitForTimeout(200); out.dawLocked=await p.evaluate(()=>/DAW pack/.test($('nxSheet').textContent)&&!!$('proBuy'));
  await p.evaluate(()=>{ window.__answer='pending'; }); await p.click('#proBuy'); await p.waitForTimeout(300); out.pending={msg:await p.evaluate(()=>lastMsg), pro:await p.evaluate(()=>isPro())};
  await p.evaluate(()=>{ window.__answer='bought'; proSheet(); }); await p.waitForTimeout(150); await p.click('#proBuy'); await p.waitForTimeout(300);
  out.bought={msg:await p.evaluate(()=>lastMsg), pro:await p.evaluate(()=>isPro()), stored:await p.evaluate(()=>localStorage.getItem('noodle.pro'))};
  await lane(); await p.waitForTimeout(200); out.locksGone=await p.evaluate(()=>!document.querySelector('#s2Snd svg')); await p.click('#s2Snd button[data-x="Glass"]'); await p.waitForTimeout(200); out.proSound=await p.evaluate(()=>S.tracks[0].sound);
  await p.reload(); await p.waitForTimeout(1000); out.afterReload=await p.evaluate(()=>isPro());
  await p.evaluate(()=>{ localStorage.removeItem('__owned'); }); await p.reload(); await p.waitForTimeout(1000); out.revoked=await p.evaluate(()=>isPro());   /* the App Store's answer wins over the remembered one */
  await p.evaluate(()=>proRestore()); await p.waitForTimeout(300); out.restoreNone=await p.evaluate(()=>lastMsg);
  const w=await (await b.newContext({...devices['iPhone 13']})).newPage(); w.on('pageerror',e=>errs.push(e.message)); await w.goto('http://localhost:8800/noodle-s2.html?studio'); await w.waitForTimeout(900);
  await w.evaluate(()=>proSheet()); await w.click('#proBuy'); await w.waitForTimeout(150); out.web=await w.evaluate(()=>lastMsg);
  const ok=out.price==='$6.99'&&out.askedState&&out.lockShown&&out.proSheet&&out.soundKept==='Saw'&&out.freeSound==='Square'&&out.dawLocked&&/Waiting/.test(out.pending.msg)&&!out.pending.pro&&/unlocked/.test(out.bought.msg)&&out.bought.pro&&out.bought.stored==='1'&&out.locksGone&&out.proSound==='Glass'&&out.afterReload&&!out.revoked&&/No Pro purchase/.test(out.restoreNone)&&/iPhone app/.test(out.web);
  if(!ok) errs.push('pro check failed');
  console.log(JSON.stringify(out),errs); await b.close(); })();
