// app shell: opens in the Studio; back -> Projects; rows open; menu renames, duplicates, deletes; + starts a new project
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-nx.html?studio'); await p.waitForTimeout(1200); const out={};
  out.start=await p.evaluate(()=>({at:nxAt, navHidden:$('nxNav').hidden, tracks:S.tracks.length})); await p.screenshot({path:'results/nx0.png'});
  await p.evaluate(async()=>{ S.title='Subway hook'; S.bpm=110; S.tracks.push(mkTrack('lead',{id:S.nextId++,notes:[{s:0,l:4,p:60,v:.8,x:true},{s:4,l:4,p:64,v:.8,x:true}]})); S.tracks.push(mkTrack('kit',{id:S.nextId++,hits:[{s:0,d:'kick',v:1}]})); save(); flushSave(); renderTracks(); await projSaveCurrent(); await projNew(); S.title='Rainy bassline'; S.bpm=92; S.tracks.push(mkTrack('bass',{id:S.nextId++,notes:[{s:0,l:8,p:40,v:.8,x:true}]})); save(); flushSave(); renderTracks(); });
  await p.tap('#s2Back'); await p.waitForTimeout(400); out.list=await p.$$eval('.nx-row',r=>r.map(x=>x.querySelector('.nx-tt').textContent+' | '+x.querySelector('.nx-mt').textContent)); await p.screenshot({path:'results/nx1.png'});
  await p.fill('#nxQ','sub'); await p.waitForTimeout(200); out.search=await p.$$eval('.nx-tt',r=>r.map(x=>x.textContent)); await p.fill('#nxQ',''); await p.tap('[data-s="title"]'); await p.waitForTimeout(200); out.byName=await p.$$eval('.nx-tt',r=>r.map(x=>x.textContent));
  await p.tap('.nx-row:first-child .nx-dots'); await p.waitForTimeout(200); await p.screenshot({path:'results/nx2.png'}); await p.tap('[data-a="rename"]'); await p.fill('#nxRn','Rainy day bassline'); await p.tap('#nxRnOk'); await p.waitForTimeout(300);
  await p.tap('.nx-row:first-child .nx-dots'); await p.tap('[data-a="dup"]'); await p.waitForTimeout(400); out.afterDup=await p.$$eval('.nx-tt',r=>r.map(x=>x.textContent));
  const copyRow=await p.$('.nx-row:has-text("copy") .nx-dots'); await copyRow.tap(); await p.tap('[data-a="del"]'); await p.tap('#nxDelOk'); await p.waitForTimeout(400); out.afterDel=await p.$$eval('.nx-tt',r=>r.map(x=>x.textContent));
  await p.tap('.nx-row:has-text("Subway") .nx-open'); await p.waitForTimeout(600); out.opened=await p.evaluate(()=>({at:nxAt,title:S.title,tracks:S.tracks.length,nav:$('nxNav').hidden,name:$('songName').value}));
  await p.tap('#s2Back'); await p.waitForTimeout(300); await p.tap('#nxPlus'); await p.waitForTimeout(600); out.plus=await p.evaluate(()=>({at:nxAt,title:S.title||'',tracks:S.tracks.length}));
  await p.tap('#s2Back'); await p.waitForTimeout(300); out.emptyNotListed=await p.$$eval('.nx-tt',r=>r.length); await p.tap('#nxTabM'); await p.waitForTimeout(200); await p.screenshot({path:'results/nx3.png'});
  out.overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
