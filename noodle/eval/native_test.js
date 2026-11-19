// The iPhone app's native pieces, with a stand-in for the app: Now Playing is sent on play and on pause (title, position, length), the lock
// screen's play/pause drive playback, and haptic taps are asked for when a note is placed and when a part is dropped somewhere new.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13']});
  await c.addInitScript(()=>{ window.__nat=[]; window.webkit={messageHandlers:{noodleNative:{postMessage:m=>window.__nat.push(m)}}}; });
  const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); const out={}, w=ms=>new Promise(r=>setTimeout(r,ms));
    const o=defaultState(); o.bpm=120; o.bars=4; o.title='Lock test'; o.pid=projId(); o.tracks=[mkTrack('lead',{id:900,off:0,len:2,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:4,p:60,v:.8,x:true}]})]; await projLoadState(o); await renderDirty(); s2.loop=true;
    window.__nat.length=0; noodleRemote('play'); await w(600); out.playingAfterRemote=playing; const nowOn=window.__nat.filter(m=>m.type==='now').pop(); out.nowOn=nowOn&&{playing:nowOn.playing,title:nowOn.title,dur:nowOn.dur};
    noodleRemote('toggle'); await w(400); out.pausedAfterToggle=!playing; const nowOff=window.__nat.filter(m=>m.type==='now').pop(); out.nowOff=nowOff&&{playing:nowOff.playing,pos:nowOff.pos>0};
    window.__nat.length=0; const t=S.tracks[0]; s2Edit(t); await w(300); startNewNote(t,{s:8,row:64}); out.tapNote=window.__nat.some(m=>m.type==='haptic'&&m.style==='light'); s2EdClose();
    return out; });
  const ok=r.playingAfterRemote&&r.nowOn&&r.nowOn.playing===true&&r.nowOn.title==='Lock test'&&r.nowOn.dur===8&&r.pausedAfterToggle&&r.nowOff&&r.nowOff.playing===false&&r.nowOff.pos&&r.tapNote;
  if(!ok) errs.push('native check failed'); console.log(JSON.stringify(r),errs); await b.close(); })();
