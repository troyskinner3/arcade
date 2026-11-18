// Velocity for the selected note or hit: a slider in the bar under the grid, in the note editor and the drum editor; it changes the sound, the MIDI export and is undoable
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); S.bars=1; const a=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,notes:[{s:0,l:4,p:60,v:.85,x:true},{s:8,l:4,p:64,v:.85,x:true}]}), k=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,hits:[{s:0,d:'kick',v:.85},{s:8,d:'kick',v:.85}]}); S.tracks.push(a,k); save(); renderTracks(); return ctx.resume(); });
  const level=(ti,s0)=>p.evaluate(async([ti,s0])=>{ await renderDirty(); const d=S.tracks[ti]._buf.getChannelData(0), sd=stepDur(), sr=ctx.sampleRate; let q=0; for(let i=Math.floor(s0*sd*sr);i<Math.floor((s0+3)*sd*sr);i++) q+=d[i]*d[i]; return q; },[ti,s0]);
  for(const [ti,name] of [[0,'notes'],[1,'drums']]){ const r={};
    await p.evaluate(ti=>{ s2Edit(S.tracks[ti]); },ti); await p.waitForTimeout(400);
    await p.evaluate(ti=>{ const t=S.tracks[ti]; selectNote(t,evs(t)[1]); },ti); await p.waitForTimeout(150);
    r.shown=await p.evaluate(()=>{ const sb=document.querySelector('#s2EdBody .selbar'), v=sb.querySelector('.sb-vel'); return !sb.hidden && v.offsetParent!==null && sb.querySelector('.sb-vel input').value; });
    const before=await level(ti,8), first=await level(ti,0);
    await p.evaluate(()=>{ const e=document.querySelector('#s2EdBody .sb-vel input'); e.value=30; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); }); await p.waitForTimeout(200);
    const after=await level(ti,8); r.v=await p.evaluate(ti=>evs(S.tracks[ti])[1].v,ti); r.quieter=after<before*0.5; r.otherUnchanged=Math.abs(await level(ti,0)-first)<first*0.05;
    r.midi=await p.evaluate(ti=>{ const t=S.tracks[ti], ev=isPitchedTr(t)?songEvents(t,t.notes):songEvents(t,t.hits); return ev.map(e=>Math.round(e.v*120)).join(','); },ti);
    r.logged=await p.evaluate(ti=>(S.tracks[ti].ed||[]).filter(x=>x.k==='vel').length,ti);
    if(ti===1) await p.screenshot({path:'results/velocity.png'});
    await p.evaluate(()=>flushSave()); await p.tap('#s2EdUndo'); await p.waitForTimeout(400); r.undo=await p.evaluate(ti=>evs(S.tracks[ti])[1].v,ti);
    await p.tap('#s2EdBack'); await p.waitForTimeout(250); out[name]=r; }
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
