// Empty parts: tap an empty spot in a lane → dashed outline + "New part"; it makes a 1-bar empty part there (shorter before the next part) and opens the editor; notes drawn in it play; it survives a reload; Delete removes it
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); S.bars=4; const a=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,notes:[{s:0,l:4,p:60,v:.8}]}), k=mkTrack('kit',{id:S.nextId++,off:48,len:1,rep:false,lenSet:true,hits:[{s:0,d:'kick',v:1}]}); S.tracks.push(a,k); save(); renderTracks(); return ctx.resume(); });
  const lanes=await p.$$eval('.s2-ln canvas',x=>x.map(e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; })); const bw=await p.evaluate(()=>s2.barw);
  await p.mouse.click(lanes[0].x+bw*2.3,lanes[0].y); await p.waitForTimeout(250);
  out.offer={ghost:await p.evaluate(()=>!!document.querySelector('.s2-ghost')), newBtn:await p.evaluate(()=>!$('s2CbNew').hidden), editShown:await p.evaluate(()=>getComputedStyle($('s2CbEdit')).display!=='none'), label:await p.$eval('#s2CbL',e=>e.textContent)}; await p.screenshot({path:'results/blank_offer.png'});
  await p.mouse.click(lanes[0].x+bw*2.3,lanes[0].y); await p.waitForTimeout(200); out.tapAgainDismisses=await p.evaluate(()=>!document.querySelector('.s2-ghost')&&$('s2Clip').hidden);
  await p.mouse.click(lanes[0].x+bw*2.3,lanes[0].y); await p.waitForTimeout(200); await p.tap('#s2CbNew'); await p.waitForTimeout(600);
  out.made=await p.evaluate(()=>{ const t=S.tracks.find(x=>x.blank); return {editor:!$('s2Ed').hidden, off:t&&t.off, len:t&&t.len, lane:t&&s2LaneId(t)===S.tracks[0].id, sub:$('s2EdS').textContent, notes:t.notes.length}; }); await p.screenshot({path:'results/blank_editor.png'});
  // draw a note by tapping the empty grid
  const g=await p.evaluate(()=>{ const tr=S.tracks.find(x=>x.blank), G=tr._grid, r=tr._cv.getBoundingClientRect(); return {x:r.left+G.gut+4.5*G.cw, y:r.top+r.height/2}; }); await p.touchscreen.tap(g.x,g.y); await p.waitForTimeout(400);
  out.drawn=await p.evaluate(()=>S.tracks.find(x=>x.blank).notes.map(n=>[n.s,n.l]));
  await p.tap('#s2EdBack'); await p.waitForTimeout(300);
  out.plays=await p.evaluate(async()=>{ await renderDirty(); const t=S.tracks.find(x=>x.blank), d=t._buf.getChannelData(0), sd=stepDur(), sr=ctx.sampleRate, at=(t.off+t.notes[0].s)*sd; let q=0; for(let i=Math.floor(at*sr);i<Math.floor((at+0.15)*sr);i++) q+=d[i]*d[i]; return q>0.01; });
  // in the drum lane, just before the kit part at bar 4: the new part stops where it starts
  await p.tap('#s2Snap'); await p.waitForTimeout(100); await p.evaluate(()=>{ s2.empty=null; s2.selId=null; s2Render(); }); await p.mouse.click(lanes[1].x+bw*2.6,lanes[1].y); await p.waitForTimeout(250);
  out.beforeNext={label:await p.$eval('#s2CbL',e=>e.textContent)}; await p.tap('#s2CbNew'); await p.waitForTimeout(500); out.beforeNext.part=await p.evaluate(()=>{ const t=S.tracks.filter(x=>x.blank&&x.inst==='kit')[0]; return t&&{off:t.off,len:t.len,editor:!$('s2Ed').hidden,rows:t._grid&&t._grid.rows.length}; }); await p.tap('#s2EdBack'); await p.waitForTimeout(300);
  await p.evaluate(()=>flushSave()); await p.reload(); await p.waitForTimeout(1200); out.reload=await p.evaluate(()=>S.tracks.filter(t=>t.blank).map(t=>`${t.inst}@${t.off}+${t.len}:${(t.notes||t.hits).length}`));
  await p.evaluate(()=>{ s2.selId=S.tracks.find(t=>t.blank&&t.inst==='kit').id; renderTracks(); }); await p.tap('#s2CbDel'); await p.waitForTimeout(300); out.afterDelete=await p.evaluate(()=>S.tracks.filter(t=>t.blank).length);
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
