// the Studio's note editor: opens from a clip, selects and splits a note, cycles readings, edits drums, returns to the timeline
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ S.bars=6; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[[0,4,60.2],[4,4,62.1],[8,8,64],[16,4,65.2],[20,4,67],[24,8,64.1]].map(([s,l,p])=>({s,l,p,v:.8}))});
    const a2=mkTrack('lead',{id:S.nextId++,lane:a.id,off:64,len:1,rep:false,lenSet:true,notes:[[0,8,60],[8,8,67]].map(([s,l,p])=>({s,l,p,v:.8}))});
    const k=mkTrack('kit',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,hits:[0,8,16,24].map(s=>({s,d:'kick',v:1})).concat([4,12,20,28].map(s=>({s,d:'snare',v:.9})),Array.from({length:16},(_,i)=>({s:i*2,d:'hat',v:.6})))});
    S.tracks.push(a,a2,k); save(); flushSave(); syncTransport(); renderTracks(); });
  await p.waitForTimeout(300); await p.screenshot({path:'results/ed0.png'});
  const lane=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; });
  await p.mouse.click(lane.x+30,lane.y); await p.waitForTimeout(250); await p.tap('#nxSheet [data-a="edit"]'); await p.waitForTimeout(600);
  out.open=await p.evaluate(()=>({ed:!$('s2Ed').hidden, title:$('s2EdT').textContent, sub:$('s2EdS').textContent, cv:!!$('s2EdBody').querySelector('canvas'), rh:S.tracks[0]._grid&&S.tracks[0]._grid.rh, quickHidden:getComputedStyle($('s2EdBody').querySelector('.tquick')).display})); await p.screenshot({path:'results/ed1.png'});
  // select the third note (8 steps long), then Split
  const g=await p.evaluate(()=>{ const tr=S.tracks[0], G=tr._grid, r=tr._cv.getBoundingClientRect(), n=tr.notes[2], i=G.rows.indexOf(pitchOf(n)); return {x:r.left+G.gut+(n.s+1)*G.cw, y:r.top+1+i*G.rh+G.rh/2}; });
  await p.touchscreen.tap(g.x,g.y); await p.waitForTimeout(400); out.selected=await p.evaluate(()=>({sel:!!S.tracks[0]._sel, bar:!!($('s2EdBody').querySelector('.selbar')&&!$('s2EdBody').querySelector('.selbar').hidden)})); await p.screenshot({path:'results/ed2.png'});
  await p.tap('#s2EdBody .sb-split'); await p.waitForTimeout(500); out.split=await p.evaluate(()=>({notes:S.tracks[0].notes.length, stillEd:!$('s2Ed').hidden}));
  await p.tap('#s2EdVer'); await p.waitForTimeout(700); out.ver=await p.evaluate(()=>({toast:$('toast').textContent, vi:S.tracks[0]._vi||0})); if(await p.evaluate(()=>playing)) await p.tap('#s2EdPlay');
  await p.tap('#s2EdUndo'); await p.waitForTimeout(600); out.undo=await p.evaluate(()=>({stillEd:!$('s2Ed').hidden}));
  await p.tap('#s2EdBack'); await p.waitForTimeout(300); out.back=await p.evaluate(()=>({ed:$('s2Ed').hidden, tl:!!document.querySelector('.s2-trk')}));
  // drums
  const kl=await p.$$eval('.s2-ln canvas',e=>{ const r=e[1].getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; }); await p.mouse.click(kl.x+30,kl.y); await p.waitForTimeout(250); await p.tap('#nxSheet [data-a="edit"]'); await p.waitForTimeout(600);
  out.kit=await p.evaluate(()=>({title:$('s2EdT').textContent, sub:$('s2EdS').textContent, rh:S.tracks[2]._grid&&S.tracks[2]._grid.rh, ver:$('s2EdVer').hidden})); await p.screenshot({path:'results/ed3.png'});
  out.overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
