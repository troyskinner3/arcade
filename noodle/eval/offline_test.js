// offline: the page reloads without a connection; a take recorded offline waits on the device and is sent when back online; pitch correction slider on a voice track
const {chromium,devices}=require('playwright');
const H={Authorization:'Bearer local'}, A='http://localhost:8787/v1/admin/list?prefix=takes/';
const keys=async()=>(await (await fetch(A,{headers:H})).json()).keys.map(k=>k.key.split('/').slice(3).join('/'));
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('noodle.api','http://localhost:8787'); localStorage.setItem('noodle.onboard','1'); }catch(e){} });
  await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(1200); const out={};
  out.sw=await p.evaluate(async()=>{ const r=await navigator.serviceWorker.ready; return !!r.active; }); await p.waitForTimeout(1500);
  await p.reload(); await p.waitForTimeout(1200);   // second load: everything it fetched is now kept
  await p.evaluate(()=>{ shareEnable(); nxMoreSync(); });
  const before=(await keys()).length;
  await c.setOffline(true); await p.reload().catch(e=>{ out.reloadErr=String(e).slice(0,80); }); await p.waitForTimeout(1500);
  out.offlineLoad=await p.evaluate(()=>({projects:!!document.getElementById('nxProjects'), fn:typeof s2Render, online:navigator.onLine, font:[...document.fonts].filter(f=>f.status==='loaded').length>0})).catch(e=>({err:String(e).slice(0,80)}));
  // record a take while offline (straight through the engine)
  await p.evaluate(async()=>{ await nxNew(); ensureCtx(); const sr=ctx.sampleRate, x=new Float32Array(sr*4); for(let n=0;n<4;n++) for(let i=0;i<sr*0.8;i++){ const t=i/sr; x[Math.floor(n*sr+i)]=0.3*Math.sin(2*Math.PI*[196,220,247,262][n]*t)*Math.min(1,t*40)*Math.min(1,(0.8-t)*40); }
    const tr=mkTrack('lead',{id:S.nextId++}); S.tracks.push(tr); S.target=tr.id; await addTake(x,sr,'lead',{align:0.0,notch:true,live:true}); S.target=null; await new Promise(r=>setTimeout(r,1500)); });
  out.waiting=await p.evaluate(async()=>((await outbox.all())||[]).map(i=>({sid:i.sid.slice(-13), wav:!!i.wav&&i.wav.byteLength>1000}))); out.serverWhileOffline=(await keys()).length-before;
  // an edit while still offline updates the waiting take in place
  await p.evaluate(async()=>{ const t=S.tracks.find(t=>t.sid), n=t.notes[0]; n.l+=1; dropSync(); await new Promise(r=>setTimeout(r,600)); }); out.stillOne=await p.evaluate(async()=>((await outbox.all())||[]).length);
  if(await p.evaluate(()=>playing)) await p.evaluate(()=>togglePlay());
  await p.evaluate(()=>nxGo('more')); await p.waitForTimeout(500); out.moreLabel=await p.$eval('#nxShS',e=>e.textContent);
  await c.setOffline(false); await p.evaluate(()=>window.dispatchEvent(new Event('online'))); await p.waitForFunction(async()=>((await outbox.all())||[]).length===0,null,{timeout:15000}); await p.waitForTimeout(400);
  out.sent=(await keys()).slice(before); out.moreAfter=await p.$eval('#nxShS',e=>e.textContent);
  // pitch correction on a voice track
  out.tune=await p.evaluate(async()=>{ await nxGo('studio'); const sr=ctx.sampleRate, x=new Float32Array(sr*3); for(let i=0;i<x.length;i++){ const t=i/sr; x[i]=0.3*Math.sin(2*Math.PI*226*t); }   /* a little sharp of A3 (220) */
    const v=mkTrack('vox',{id:S.nextId++}); S.tracks.push(v); S.target=v.id; await addTake(x,sr,'vox',{align:0.0,live:true}); S.target=null; if(playing) togglePlay(); renderTracks();
    s2TrackSheet(s2Lane(v.id)); const has=!!$('s2Fx_tune'), labels=[...document.querySelectorAll('#nxSheet .s2-fld label')].map(l=>l.textContent);
    const set=val=>{ const e=$('s2Fx_tune'); e.value=val; e.dispatchEvent(new Event('change',{bubbles:true})); }; set(100); const t100=fxOf(v).tune; set(0); const t0=fxOf(v).tune; nxClose(); return {has, labels, t100, t0}; });
  await p.evaluate(()=>{ const v=S.tracks.find(t=>t.inst==='vox'); s2TrackSheet(s2Lane(v.id)); }); await p.waitForTimeout(200); await p.screenshot({path:'results/vx.png'});
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
