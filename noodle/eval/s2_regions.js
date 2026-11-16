// regions: tap selects (outline + grips + bar with real buttons), drag the body to move, drag a grip to trim/extend, Duplicate, Delete, tap again to edit
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ S.bars=4; const t=mkTrack('lead',{id:S.nextId++,off:16,len:2,rep:false,lenSet:true,notes:Array.from({length:8},(_,i)=>({s:i*4,l:4,p:60+i%5,v:.8,x:false}))}); S.tracks.push(t); save(); flushSave(); renderTracks(); });
  const st=()=>p.evaluate(()=>S.bars+' | '+S.tracks.map(t=>`${(t.off||0)/16}+${t.len}:${(t.notes||[]).length}@${(t.notes||[]).length?t.notes[0].s:''}`).join(' '));
  const lane=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; }); const X=bar=>lane.x+44*bar;
  out.start=await st(); await p.mouse.click(X(1.5),lane.y); await p.waitForTimeout(250);
  out.selected=await p.evaluate(()=>({sel:!!$('s2Sel'), bar:!$('s2Clip').hidden, label:$('s2CbL').textContent, btns:[...document.querySelectorAll('#s2Clip button')].map(b=>b.textContent.trim()||b.getAttribute('aria-label'))})); await p.screenshot({path:'results/rg1.png'});
  const drag=async(x0,x1)=>{ await p.mouse.move(x0,lane.y); await p.mouse.down(); await p.mouse.move((x0+x1)/2,lane.y,{steps:3}); await p.mouse.move(x1,lane.y,{steps:3}); await p.mouse.up(); await p.waitForTimeout(350); };
  await drag(X(3),X(4)); out.extendEnd=await st();            // right grip: 1 bar longer
  await drag(X(1),X(2)); out.trimStart=await st();            // left grip: first bar off
  await drag(X(2),X(0)); out.extendStart=await st();          // left grip: two bars earlier
  await drag(X(4),X(2)); out.trimEnd=await st();              // right grip: two bars shorter
  await drag(X(1),X(3)); out.moved=await st();                // body: two bars later
  await p.tap('#s2CbDup'); await p.waitForTimeout(350); out.dup=await st(); out.dupSelected=await p.evaluate(()=>S.tracks.findIndex(t=>t.id===s2.selId)); await p.screenshot({path:'results/rg2.png'});
  await p.tap('#s2CbDel'); await p.waitForTimeout(400); out.del=await st(); out.afterDel=await p.evaluate(()=>({sel:s2.selId, bar:$('s2Clip').hidden}));
  out.scrolledToCopy=await p.evaluate(()=>$('s2Tl').scrollLeft>0); await p.evaluate(()=>{ $('s2Tl').scrollLeft=0; }); await p.waitForTimeout(200);
  await p.mouse.click(X(2.5),lane.y); await p.waitForTimeout(250); await p.mouse.click(X(2.5),lane.y); await p.waitForTimeout(500); out.tapAgainEdits=await p.evaluate(()=>!$('s2Ed').hidden); await p.tap('#s2EdBack');
  await p.waitForTimeout(450); await p.mouse.click(X(0.5),lane.y); await p.waitForTimeout(250); out.deselect=await p.evaluate(()=>s2.selId);
  await p.tap('#s2Undo'); await p.waitForTimeout(500); out.undo=await st();
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
