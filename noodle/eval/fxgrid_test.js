// FX editor as a grid like the drum kit: a row per kind; tap empty to add, tap one to select it (volume, pan, delete); tap empty again just deselects; drag to move or change kind; drag the right end for length; playhead while playing; a new FX track starts quieter
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  out.vol=await p.evaluate(()=>({fx:mkTrack('fx',{id:999}).vol, lead:mkTrack('lead',{id:998}).vol}));
  await p.evaluate(()=>{ ensureCtx(); S.bars=2; const t=mkTrack('fx',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true}); t.fxs=[fxNew('riser',0,32), fxNew('impact',16,32)]; S.tracks.push(t); save(); renderTracks(); return ctx.resume(); });
  const lane=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; }); await p.mouse.click(lane.x+20,lane.y); await p.waitForTimeout(200);
  out.button=await p.$eval('#s2CbEdit',e=>e.textContent.trim()); await p.tap('#s2CbEdit'); await p.waitForTimeout(500);
  out.open={editor:!(await p.evaluate(()=>$('s2Ed').hidden)), grid:await p.evaluate(()=>!!document.querySelector('#s2EdBody .fxg canvas')), sheet:await p.evaluate(()=>!$('nxScrim').hidden), sub:await p.$eval('#s2EdS',e=>e.textContent), hint:await p.$eval('#s2EdHint',e=>e.textContent.slice(0,30))};
  await p.screenshot({path:'results/fxgrid.png'});
  const pt=(row,st)=>p.evaluate(([row,st])=>{ const t=S.tracks[0], G=t._fxg, r=document.querySelector('#s2EdBody .fxg canvas').getBoundingClientRect(); return {x:r.left+G.gut+(st+0.5)*G.cw, y:r.top+(row+0.5)*G.rh}; },[row,st]);
  const fx=()=>p.evaluate(()=>S.tracks[0].fxs.map(e=>`${e.k}@${e.s}+${e.l}`).sort().join(' '));
  let a=await pt(2,4); await p.mouse.click(a.x,a.y); await p.waitForTimeout(250); out.added=await fx();
  a=await pt(4,16); await p.mouse.click(a.x,a.y); await p.waitForTimeout(250); out.tapSelects={still:await fx(), bar:await p.evaluate(()=>!document.querySelector('.fxsel').hidden), title:await p.$eval('.fxsel b',e=>e.textContent)};
  await p.evaluate(()=>{ const set=(id,v)=>{ const e=$(id); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); }; set('fxVol',40); set('fxPan',-60); }); out.levels=await p.evaluate(()=>{ const e=S.tracks[0].fxs.find(x=>x.k==='impact'); return {v:e.v, pan:e.pan}; });
  out.panRenders=await p.evaluate(async()=>{ const t=S.tracks[0], only={...t, fxs:t.fxs.filter(x=>x.k==='impact')}; const b=await renderFx(only), L=b.getChannelData(0), R=b.getChannelData(1); let l=0,r=0; for(let i=0;i<L.length;i++){ l+=L[i]*L[i]; r+=R[i]*R[i]; } return l>r*3; });   /* the impact alone: panned left */
  await p.screenshot({path:'results/fxsel.png'});
  await p.tap('#fxDel'); await p.waitForTimeout(250); out.removed=await fx(); out.barGone=await p.evaluate(()=>document.querySelector('.fxsel').hidden);
  a=await pt(2,5); await p.mouse.click(a.x,a.y); await p.waitForTimeout(200); a=await pt(3,24); await p.mouse.click(a.x,a.y); await p.waitForTimeout(200); out.emptyTapDeselects={fx:await fx(), bar:await p.evaluate(()=>document.querySelector('.fxsel').hidden)};
  // drag the sweep down one row (becomes Sweep down) and 4 steps later
  a=await pt(2,6); const G=await p.evaluate(()=>S.tracks[0]._fxg); await p.mouse.move(a.x,a.y); await p.mouse.down(); for(let i=1;i<=6;i++) await p.mouse.move(a.x+G.cw*4*i/6,a.y+G.rh*i/6); await p.mouse.up(); await p.waitForTimeout(250); out.moved=await fx();
  // drag the riser's right end 8 steps shorter
  const e=await p.evaluate(()=>{ const t=S.tracks[0], G=t._fxg, ev=t.fxs.find(x=>x.k==='riser'), r=document.querySelector('#s2EdBody .fxg canvas').getBoundingClientRect(); return {x:r.left+G.gut+(ev.s+ev.l)*G.cw-6, y:r.top+0.5*G.rh}; });
  await p.mouse.move(e.x,e.y); await p.mouse.down(); for(let i=1;i<=6;i++) await p.mouse.move(e.x-G.cw*8*i/6,e.y); await p.mouse.up(); await p.waitForTimeout(250); out.resized=await fx();
  out.edits=await p.evaluate(()=>(S.tracks[0].ed||[]).map(x=>x.k).join(','));
  await p.tap('#s2EdPlay'); await p.waitForTimeout(900); out.playhead=await p.evaluate(()=>{ const ph=S.tracks[0]._fxph; return ph.style.display==='block' && /translateX/.test(ph.style.transform); }); await p.tap('#s2EdPlay');
  out.audio=await p.evaluate(async()=>{ await renderDirty(); const d=S.tracks[0]._buf.getChannelData(0); let q=0; for(let i=0;i<d.length;i+=7) q+=d[i]*d[i]; return q>1; });
  await p.tap('#s2EdUndo'); await p.waitForTimeout(400); out.undo=await fx();
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
