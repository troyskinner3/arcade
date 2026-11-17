// Snap: the SNAP chip cycles 1 → ½ → ¼ → ⅛; dragging a part's grip or the part itself moves in snap steps; parts can be a fraction of a bar and start mid-bar; they play where they sit
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); S.bars=4; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:Array.from({length:8},(_,i)=>({s:i*4,l:4,p:60+i,v:.8}))}); S.tracks.push(a); save(); renderTracks(); return ctx.resume(); });
  const chips=[]; for(let i=0;i<4;i++){ chips.push(await p.$eval('#s2Snap span',e=>e.textContent)); await p.tap('#s2Snap'); } out.chipCycle=chips.join(' → ')+' → '+await p.$eval('#s2Snap span',e=>e.textContent);
  await p.tap('#s2Snap'); out.snap=await p.evaluate(()=>S.snap);   /* ½ */
  const lane=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; }); const bw=await p.evaluate(()=>s2.barw);
  await p.mouse.click(lane.x+20,lane.y); await p.waitForTimeout(200);
  const grip=async(cls,dx)=>{ const g=await p.$eval(`#s2Sel .${cls}`,e=>{ const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }); await p.mouse.move(g.x,g.y); await p.mouse.down(); for(let i=1;i<=6;i++) await p.mouse.move(g.x+dx*i/6,g.y); await p.mouse.up(); await p.waitForTimeout(250); };
  await grip('hr',-bw*0.55); out.trimEnd=await p.evaluate(()=>{ const t=S.tracks[0]; return {off:t.off, len:t.len, notes:t.notes.length, label:$('s2CbL').textContent}; });
  await grip('hl',bw*0.3); out.trimStartRoundsToHalf=await p.evaluate(()=>({off:S.tracks[0].off, len:S.tracks[0].len}));
  await grip('hl',bw*0.5); out.trimStart=await p.evaluate(()=>({off:S.tracks[0].off, len:S.tracks[0].len, firstNote:S.tracks[0].notes[0].s, label:$('s2CbL').textContent}));
  const sel=await p.$eval('#s2Sel',e=>{ const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }); await p.mouse.move(sel.x,sel.y); await p.mouse.down(); for(let i=1;i<=6;i++) await p.mouse.move(sel.x+bw*1.0*i/6,sel.y); await p.mouse.up(); await p.waitForTimeout(250);
  out.moved=await p.evaluate(()=>({off:S.tracks[0].off, bars:S.bars, label:$('s2CbL').textContent}));
  await p.evaluate(()=>{ S.snap=0.125; }); out.eighthResize=await p.evaluate(()=>{ const t=S.tracks[0]; const ok=s2ResizeClip(t,0,-0.125); return {ok, len:t.len}; });
  out.play=await p.evaluate(async()=>{ await renderDirty(); const t=S.tracks[0], d=t._buf.getChannelData(0), sd=stepDur(), sr=ctx.sampleRate, e=(a,b)=>{ let q=0; for(let i=Math.floor(a*sd*sr);i<Math.floor(b*sd*sr)&&i<d.length;i++) q+=d[i]*d[i]; return q; };
    return {quietBefore:e(0,t.off-1)<1e-3, soundAt:e(t.off,t.off+4)>0.01, quietAfter:e(t.off+pSteps(t)+3,S.bars*16)<1e-3, editorSub:(s2Edit(t),$('s2EdS').textContent)}; });
  await p.screenshot({path:'results/snap.png'});
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
