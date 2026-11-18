// Trimming is a window, as in a DAW: notes, hits and effects outside it stay (unheard, not drawn) and come back when the part is extended again
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  out.lead=await p.evaluate(async()=>{ ensureCtx(); await ctx.resume(); S.bars=2; const t=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:Array.from({length:8},(_,i)=>({s:i*4,l:4,p:60+i,v:.8,x:true}))}); S.tracks.push(t); save(); renderTracks();
    const sig=()=>t.notes.map(n=>(t.off+n.s)+':'+n.p).join(','), orig=sig(), r={};
    const energy=async(a,b)=>{ await renderDirty(); const d=t._buf.getChannelData(0), sd=stepDur(), sr=ctx.sampleRate; let q=0; for(let i=Math.floor(a*sd*sr);i<Math.floor(b*sd*sr)&&i<d.length;i++) q+=d[i]*d[i]; return q; };
    r.endTrim=s2ResizeClip(t,0,-1); r.afterEnd={len:t.len, kept:t.notes.length, heardBar2:await energy(17,31)>0.01, midiNotes:songEvents(t,t.notes).length};
    r.endBack=s2ResizeClip(t,0,1); r.afterEndBack={same:sig()===orig, heardBar2:await energy(17,31)>0.01, midiNotes:songEvents(t,t.notes).length};
    r.startTrim=s2ResizeClip(t,1,0); r.afterStart={off:t.off, kept:t.notes.length, playing:songEvents(t,t.notes).map(n=>n.s).join(','), heardBar1:await energy(1,15)>0.01, editorNotes:(s2Edit(t), t._grid&&t._grid.rows.length>0)};
    s2EdClose(); r.startBack=s2ResizeClip(t,-1,0); r.afterStartBack={same:sig()===orig, off:t.off};
    // a note crossing the window's end is cut there when played
    s2ResizeClip(t,0,-0.125*0+0); return r; });
  out.crossing=await p.evaluate(()=>{ const t=S.tracks[0]; S.snap=0.125; t.notes=[{s:0,l:12,p:64,v:.8,x:true}]; s2ResizeClip(t,0,-1.5); const ev=songEvents(t,t.notes); return {len:t.len, playedLen:ev[0]&&ev[0].l, stored:t.notes[0].l}; });
  out.drums=await p.evaluate(()=>{ S.snap=1; const k=mkTrack('kit',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,hits:[0,8,16,24].map(s=>({s,d:'kick',v:1}))}); S.tracks.push(k); const a=s2ResizeClip(k,0,-1), mid=songEvents(k,k.hits).length, b2=s2ResizeClip(k,0,1); return {a,mid,b2,back:songEvents(k,k.hits).length, stored:k.hits.length}; });
  out.fx=await p.evaluate(async()=>{ const f=mkTrack('fx',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true}); f.fxs=[fxNew('riser',0,32),fxNew('impact',20,32)]; S.tracks.push(f); s2ResizeClip(f,0,-1); await renderDirty(); const d=f._buf.getChannelData(0), sd=stepDur(), sr=ctx.sampleRate; let late=0; for(let i=Math.floor(20.2*sd*sr);i<Math.floor(23*sd*sr);i++) late+=d[i]*d[i]; s2ResizeClip(f,0,1); return {stored:f.fxs.length, impactSilentWhileTrimmed:late<1e-4}; });
  // the same with the grips, by dragging
  await p.evaluate(()=>{ S.tracks=S.tracks.slice(0,1); const t=S.tracks[0]; t.notes=Array.from({length:8},(_,i)=>({s:i*4,l:4,p:60+i,v:.8,x:true})); t.off=0; t.len=2; S.bars=2; s2.selId=t.id; save(); renderTracks(); });
  const bw=await p.evaluate(()=>s2.barw); const grip=async dx=>{ const g=await p.$eval('#s2Sel .hr',e=>{ const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }); await p.mouse.move(g.x,g.y); await p.mouse.down(); for(let i=1;i<=6;i++) await p.mouse.move(g.x+dx*i/6,g.y); await p.mouse.up(); await p.waitForTimeout(250); };
  await grip(-bw); const mid=await p.evaluate(()=>({len:S.tracks[0].len, stored:S.tracks[0].notes.length})); await grip(bw); out.drag={mid, back:await p.evaluate(()=>({len:S.tracks[0].len, heard:songEvents(S.tracks[0],S.tracks[0].notes).length}))};
  await p.screenshot({path:'results/trimkeep.png'});
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
