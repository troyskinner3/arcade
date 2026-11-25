// Round 21 (owner's TestFlight review, 25 Nov): a long "k-shhh" in a beatbox take is a crash (a short hit isn't); the kit has a
// Crash row (old kits get it once); a new Mix effects track comes with the new-part outline; a free user previewing a Pro effect sees one line
// with Get Pro; bending a transition keeps its ends; a song opens with the playhead at the start; after a take the playhead waits at its
// start and Discard puts it back; the message after leaving the Studio isn't stretched. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={};
    // a beatbox take: kick, a short "ch", a long bright "k-shhh"
    const sr=16000, x=new Float32Array(sr*3); let seed=7; const rnd=()=>{ seed=(seed*1103515245+12345)>>>0; return seed/4294967296*2-1; };
    const hit=(t,len,kind)=>{ const s0=Math.floor(t*sr); let lp=0,hp=0,px=0; for(let i=0;i<len*sr;i++){ const u=i/sr, n=rnd();
        if(kind==='kick'){ x[s0+i]+=0.8*Math.sin(2*Math.PI*(60+90*Math.exp(-u*30))*u)*Math.exp(-u*18); continue; }
        hp=0.85*(hp+n-px); px=n; const env=kind==='crash'?Math.min(1,u/0.005)*Math.exp(-u*2.2):Math.min(1,u/0.003)*Math.exp(-u*28); x[s0+i]+=0.45*hp*env; } };
    hit(0.2,0.3,'kick'); hit(0.9,0.25,'snare'); hit(1.6,0.9,'crash');
    S.kit=defaultKit(); const an=analyzeTake(x,sr,'kit',55,false), cls=(an.onsets||[]).map(o=>((slotOf(o.cls)||{}).sound||o.cls)+':'+(+o.t).toFixed(1));
    out.cls=cls.join(' '); out.crashRow=S.kit.slots.some(s=>s.id==='crash');
    // an old kit (no crash, never migrated) gets the crash once
    const ok=kitMigrate({next:1,slots:[{id:'kick',sound:'kick',say:'B'},{id:'snare',sound:'snare',say:'ch'}]}); const del=kitMigrate({next:1,mig4:1,slots:[{id:'kick',sound:'kick'}]}); out.migrated=ok.slots.some(s=>s.sound==='crash')&&!del.slots.some(s=>s.sound==='crash');
    // a song opens at its start
    await nxExample(); await w(600); s2.cur=1.5; await projNew(); await w(100); out.startAt=s2.cur===0&&playFrom===0;
    // a new Mix effects track comes with the outline
    s2AddSheet(false); await w(300); document.querySelector('#nxSheet [data-k="mix"]').click(); await w(300); out.mixOutline=!!s2.empty&&!!document.querySelector('.s2-ghost');
    // a free user previewing a Pro effect: one line with Get Pro
    const m=mkTrack('mix',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true}); m.mfx={k:'phaser',curve:null,params:{}}; S.tracks.push(m); renderTracks(); s2Edit(m); await w(300);
    const pv=document.querySelector('#s2EdHint .pv-one'); out.proLine=!!pv&&!!pv.querySelector('[data-a="pvpro"]')&&pv.getBoundingClientRect().height<48; s2EdClose();
    // bending keeps the drawn ends where they were
    const e=fxNew('sweepDown',0,32), a0=fxShape(e,0), a1=fxShape(e,1); e.b=1; out.ends=Math.abs(fxShape(e,0)-a0)<1e-6&&Math.abs(fxShape(e,1)-a1)<1e-6&&fxShape(e,0.5)>a0*0.5;
    // after a take, the playhead waits at its start; Discard puts it back where it was
    await nxExample(); await w(600); const ld=S.tracks.find(t=>t.inst==='lead'); ld.off=16; s2.cur=0.25; s2.preRec=0.25; takeBar={id:ld.id,pre:hist.cur,histLen:hist.undo.length,prevBars:S.bars}; s2PlayheadTo(1); out.atTake=s2.cur===1;
    discardTake=async()=>{}; $('s2TkDel').click(); await w(100); out.backAfterDiscard=s2.cur===0.25;
    // the Pro preview's Catching up waits under More settings
    out.brakeHidden=MFX.brake.params.every(pm=>pm.adv);
    return out; });
  // leaving the Studio with a message up: it isn't stretched over the Songs screen
  await p.evaluate(()=>{ toast('Recording cancelled'); nxGo('projects'); }); await p.waitForTimeout(500);
  r.toastH=await p.evaluate(()=>Math.round($('toast').getBoundingClientRect().height));
  if(!/kick:0\.2/.test(r.cls)||/crash:0\.9/.test(r.cls)||!/crash:1\.6/.test(r.cls)) errs.push('crash: '+r.cls);
  for(const k of ['crashRow','migrated','startAt','mixOutline','proLine','ends','atTake','backAfterDiscard','brakeHidden']) if(!r[k]) errs.push(k);
  if(!(r.toastH>0&&r.toastH<120)) errs.push('toast height '+r.toastH);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
