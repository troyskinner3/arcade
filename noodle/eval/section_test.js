// Loop a section: Loop in the clip bar loops the selected part's bars (playback jumps back at its end, seamlessly: the restart is scheduled at the
// exact end), the ruler shows the range, tapping it goes back to the whole song; Loop off clears it too.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); const out={}, w=ms=>new Promise(r=>setTimeout(r,ms));
    const o=defaultState(); o.bpm=240; o.bars=6; o.pid=projId(); o.tracks=[mkTrack('lead',{id:900,off:0,len:6,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:8,p:60,v:.8,x:true}]}), mkTrack('keys',{id:901,off:32,len:1,rep:false,lenSet:true,sound:'Organ',notes:[{s:0,l:8,p:64,v:.8,x:true}]})]; await projLoadState(o); await renderDirty(); s2Render();
    const k=S.tracks.find(t=>t.inst==='keys'); s2.selId=k.id; s2Render(); await w(100); $('s2CbLoop').click(); await w(100);
    out.sec=s2.sec; out.loop=s2.loop; out.band=!!document.querySelector('.s2-secb');
    await togglePlay(); const pos=[]; let jumps=0, last=-1; for(let i=0;i<30;i++){ await w(70); const L=loopLen(), x=(((ctx.currentTime-t0)%L)+L)%L/stepDur(); pos.push(+x.toFixed(1)); if(last>=0 && x<last-4) jumps++; last=x; }
    out.inside=pos.every(x=>x>=29.5&&x<48.5);   /* the jump is booked ~0.12 s ahead, so a reading in that moment sits just before the section */ out.jumps=jumps;   /* bar 3 at 240 BPM: steps 32-48, 1 s; 2.1 s of playing = 2 jumps */
    await togglePlay();
    document.querySelector('.s2-secb').click(); await w(100); out.cleared=s2.sec===null&&!document.querySelector('.s2-secb');
    $('s2CbLoop').click(); await w(50); $('s2Loop').click(); out.offClears=s2.sec===null;
    return out; });
  const ok=r.sec&&r.sec.a===32&&r.sec.b===48&&r.loop&&r.band&&r.inside&&r.jumps>=1&&r.cleared&&r.offClears; if(!ok) errs.push('section loop failed');
  console.log(JSON.stringify(r),errs); await b.close(); })();
