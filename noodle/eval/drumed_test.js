// The drum editor works like the note editor: tap empty to add a hit (selected), tap a hit to select it (not delete), tap empty again deselects, drag a hit in time or to another drum, Delete in the bar, Undo
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); S.bars=1; const k=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,hits:[{s:0,d:'kick',v:1},{s:4,d:'snare',v:.9},{s:8,d:'kick',v:1},{s:12,d:'snare',v:.9}]}); S.tracks.push(k); save(); renderTracks(); s2Edit(k); return ctx.resume(); });
  await p.waitForTimeout(500);
  const at=(d,st)=>p.evaluate(([d,st])=>{ const t=S.tracks[0], G=t._grid, r=t._cv.getBoundingClientRect(), i=G.rows.indexOf(d), L=Math.floor(st/G.sPL); return {x:r.left+G.gut+((st%G.sPL)+0.5)*G.cw, y:r.top+L*(G.lineH+G.gapH)+1+(i+0.5)*G.rh}; },[d,st]);
  const hits=()=>p.evaluate(()=>S.tracks[0].hits.map(h=>h.d+'@'+h.s).sort().join(' '));
  const sel=()=>p.evaluate(()=>{ const t=S.tracks[0]; return t._sel?{d:t._sel.d,s:t._sel.s,bar:!t._selbar.hidden,label:t._selbar.querySelector('.sb-n').textContent,split:t._selbar.querySelector('.sb-split').hidden}:null; });
  out.hint=await p.$eval('#s2EdHint',e=>e.textContent.slice(0,40)); out.rows=await p.evaluate(()=>S.tracks[0]._grid.rows.join(','));
  let a=await at('hat',2); await p.touchscreen.tap(a.x,a.y); await p.waitForTimeout(300); out.added={hits:await hits(), sel:await sel()};
  a=await at('snare',4); await p.touchscreen.tap(a.x,a.y); await p.waitForTimeout(300); out.tapHitSelects={hits:await hits(), sel:await sel()};
  await p.screenshot({path:'results/drumed.png'});
  a=await at('hat',10); await p.touchscreen.tap(a.x,a.y); await p.waitForTimeout(300); out.tapEmptyDeselects={hits:await hits(), sel:await sel()};
  // select the snare at 4, then drag it 2 steps later and onto the clap row
  a=await at('snare',4); await p.touchscreen.tap(a.x,a.y); await p.waitForTimeout(250); const to=await at('clap',6);
  const h=await p.$eval('.nsel',e=>{ const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }); await p.mouse.move(h.x,h.y); await p.mouse.down(); for(let i=1;i<=6;i++) await p.mouse.move(h.x+(to.x-h.x)*i/6,h.y+(to.y-h.y)*i/6); await p.mouse.up(); await p.waitForTimeout(300);
  out.dragged={hits:await hits(), sel:await sel()};
  await p.tap('#s2EdBody .sb-del'); await p.waitForTimeout(300); out.deleted={hits:await hits(), sel:await sel()};
  await p.tap('#s2EdUndo'); await p.waitForTimeout(400); out.undo=await hits();
  out.edits=await p.evaluate(()=>(S.tracks[0].ed||[]).map(x=>x.k).join(','));
  out.plays=await p.evaluate(async()=>{ await renderDirty(); const d=S.tracks[0]._buf.getChannelData(0); let q=0; for(let i=0;i<d.length;i+=5) q+=d[i]*d[i]; return q>0.5; });
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
