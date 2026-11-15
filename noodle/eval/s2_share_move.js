// Share sheet inside the Studio (audio), moving a clip by the sheet and by press-and-hold drag, landscape screenshot
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); S.bars=6; const mk=(off,len,lane)=>{ const t=mkTrack('lead',{id:S.nextId++,off:off*16,len,rep:false,lenSet:true,notes:Array.from({length:len*4},(_,i)=>({s:i*4,l:4,p:60+i%5,v:.8,x:true}))}); if(lane!=null) t.lane=lane; return t; };
    const a=mk(0,2), a2=mk(4,1,a.id); S.tracks.push(a,a2); save(); flushSave(); syncTransport(); renderTracks(); return ctx.resume(); });
  const st=()=>p.evaluate(()=>S.bars+' | '+S.tracks.map(t=>`${(t.off||0)/16}+${t.len}`).join(' '));
  out.start=await st();
  await p.tap('#s2Share'); await p.waitForTimeout(200); out.sheet=await p.$$eval('#nxSheet .nx-act',x=>x.map(e=>e.firstElementChild.firstChild.textContent)); await p.tap('#nxSheet [data-k="audio"]');
  await p.waitForFunction(()=>!$('s2ShGo').hidden||/didn/.test($('s2ShSt').textContent),null,{timeout:60000}); out.audio=await p.evaluate(()=>({msg:$('s2ShSt').textContent.slice(0,60), file:shareFile&&shareFile.name, size:shareFile&&shareFile.size>10000, loops:S.loops})); await p.screenshot({path:'results/sh1.png'}); await p.evaluate(()=>nxClose());
  // move by the sheet: the second clip one bar later, then try to move the first onto... three bars later (blocked by clip 2 at bar 6?)
  const lane=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; });
  await p.mouse.click(lane.x+44*4.5,lane.y); await p.waitForTimeout(250); await p.evaluate(()=>{ s2MoveClip(S.tracks.find(t=>t.id===s2.selId),1); s2.selId=null; renderTracks(); }); await p.waitForTimeout(300); out.movedLater=await st();
  out.blocked=await p.evaluate(()=>s2MoveClip(S.tracks[0],4)); out.afterBlocked=await st();
  // press and hold, then drag the first clip two bars right
  await p.mouse.move(lane.x+30,lane.y); await p.mouse.down(); await p.waitForTimeout(550); await p.mouse.move(lane.x+30+44*2,lane.y,{steps:6}); await p.mouse.up(); await p.waitForTimeout(400); out.dragged=await st();
  out.sheetAfterDrag=await p.evaluate(()=>!$('nxScrim').hidden);
  await p.tap('#s2Undo'); await p.waitForTimeout(600); out.undo=await st();
  await p.setViewportSize({width:844,height:390}); await p.waitForTimeout(500); await p.screenshot({path:'results/land1.png'});
  const l2=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; }); await p.evaluate(()=>{ s2.selId=null; renderTracks(); }); await p.mouse.click(l2.x+20,l2.y); await p.waitForTimeout(250); await p.screenshot({path:'results/land1.png'}); await p.tap('#s2CbEdit'); await p.waitForTimeout(600); await p.screenshot({path:'results/land2.png'});
  out.landOverflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
