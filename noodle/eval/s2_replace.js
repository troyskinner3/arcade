// a new take replaces what it overlaps in its lane: unit cases on s2Replace, then one real take over the middle of a long part and its discard
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],permissions:['microphone']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ navigator.mediaDevices.getUserMedia=async()=>{ const cx=window.__ctx, dst=cx.createMediaStreamDestination(); window.__sing=(t0,notes)=>notes.forEach(([st,du,hz])=>{ const o=cx.createOscillator(), g=cx.createGain(); o.type='sawtooth'; o.frequency.value=hz; g.gain.value=0; g.gain.setTargetAtTime(0.15,t0+st,0.01); g.gain.setTargetAtTime(0,t0+st+du-0.05,0.01); o.connect(g); g.connect(dst); o.start(t0+st); o.stop(t0+st+du+0.1); }); return dst.stream; }; });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200); const out={};
  out.unit=await p.evaluate(()=>{ const res={}; const mk=(off,len,lane)=>{ const t=mkTrack('lead',{id:S.nextId++,off:off*16,len,rep:false,lenSet:true,notes:Array.from({length:len*4},(_,i)=>({s:i*4,l:4,p:60+i%5,v:.8,x:true}))}); if(lane!=null) t.lane=lane; return t; };
    const show=()=>S.tracks.map(t=>`${(t.off||0)/16}+${t.len}:${t.notes.length}`).sort().join(' ');
    const run=(olds,nw)=>{ S.bars=16; S.tracks=[]; const first=mk(...olds[0]); S.tracks.push(first); olds.slice(1).forEach(o=>S.tracks.push(mk(o[0],o[1],first.id))); const n=mk(nw[0],nw[1],first.id); S.tracks.push(n); s2Replace(n); return show(); };
    res.covered=run([[2,2]],[1,4]); res.tail=run([[0,4]],[2,4]); res.head=run([[2,4]],[0,3]); res.middle=run([[0,8]],[3,2]); res.none=run([[0,2]],[4,2]); res.two=run([[0,2],[2,2]],[1,2]);
    // a note crossing the cut is shortened, not dropped
    S.tracks=[]; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,notes:[{s:12,l:8,p:60,v:.8,x:true}]}); const n=mkTrack('lead',{id:S.nextId++,lane:a.id,off:16,len:1,rep:false,notes:[{s:0,l:4,p:62,v:.8,x:true}]}); S.tracks.push(a,n); s2Replace(n); res.crossing=JSON.stringify(a.notes.map(x=>[x.s,x.l]))+' len '+a.len;
    // another lane is never touched
    S.tracks=[]; const x=mk(0,4), y=mk(0,4); S.tracks.push(x,y); s2Replace(y); res.otherLane=show(); S.tracks=[]; S.bars=4; return res; });
  // real take: an 8-bar part, record 1 bar at bar 3 -> left 2 bars, new 1 bar, right 5 bars; discard restores
  await p.evaluate(()=>{ ensureCtx(); window.__ctx=ctx; S.bars=8; const t=mkTrack('lead',{id:S.nextId++,off:0,len:8,rep:false,lenSet:true,notes:Array.from({length:32},(_,i)=>({s:i*4,l:4,p:60+i%5,v:.8,x:true}))}); S.tracks.push(t); s2.armId=t.id; s2.cur=2.2; save(); flushSave(); renderTracks(); return ctx.resume(); });
  const state=()=>p.evaluate(()=>({bars:S.bars, clips:S.tracks.map(t=>`${(t.off||0)/16}+${t.len}:${(t.notes||[]).length}`).sort().join(' ')}));
  out.before=await state(); await p.tap('#s2RecB'); await p.waitForFunction(()=>!!recState,null,{timeout:8000});
  const w=await p.evaluate(()=>{ const r=recState, beat=60/S.bpm; window.__sing(r.start,[[0,beat*.9,196],[beat,beat*.9,220],[2*beat,beat*.9,247]]); return (r.start-ctx.currentTime)+3*beat+0.4; });
  await p.waitForTimeout(w*1000); await p.tap('#s2RecB'); await p.waitForFunction(()=>!$('s2Take').hidden,null,{timeout:20000}); await p.waitForTimeout(600); out.afterTake=await state(); await p.screenshot({path:'results/rep1.png'});
  await p.tap('#s2TkDel'); await p.waitForFunction(()=>S.bars===8&&S.tracks.length===1,null,{timeout:15000}).catch(()=>{}); out.afterDiscard=await state();
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
