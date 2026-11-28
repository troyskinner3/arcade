// Round 29 (owner's TestFlight notes, 26 Nov, part B1): Mix effects M/S line up with other tracks; the copy button isn't on an empty spot
// (Paste here is, once something is copied, and pastes there); the Share sheet is compact rows (no sentences); usage stats says "anonymous ID";
// Use this beat is pinned and only after a pick; closing Beats puts the playhead back and a free beat isn't called Pro; Buzz timing goes to
// ±300 ms; a grown sound delay restarts the audio (the song still plays). Teaching the crash: teachcrash_test. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={};
    await nxExample(); await w(700); PRO.owned=true;
    // 12. M and S line up
    const xs=sel=>[...document.querySelectorAll(sel)].map(e=>Math.round(e.getBoundingClientRect().left)); const ms=xs('.s2-ms[data-m]'); o.msAligned=ms.length>3&&ms.every(x=>x===ms[0]);
    // 13. copy / paste here
    const L=s2Lanes().find(L=>L.tracks[0].inst==='lead'), ld=L.tracks[0]; s2.selId=ld.id; renderTracks(); o.copyOnPart=!$('s2CbCopy').hidden&&$('s2CbPaste').hidden;
    await partCopy(ld); s2.selId=null; s2.empty={lane:L.id, at:48}; renderTracks(); o.emptyBar=$('s2CbCopy').hidden+':'+!$('s2CbPaste').hidden;
    const n0=S.tracks.length; $('s2CbPaste').click(); await w(500); const pasted=S.tracks[S.tracks.length-1]; o.pasted=S.tracks.length===n0+1&&pasted.off===48&&s2LaneId(pasted)===L.id;
    // 16. share sheet
    s2ShareSheet(); await w(200); o.share=[...document.querySelectorAll('#nxSheet .sh-a span')].map(x=>x.childNodes[0].textContent).join('|')+':'+document.querySelectorAll('#nxSheet .sh-a small').length+':'+document.querySelectorAll('#nxSheet .sh-row .s2-i').length;
    const rows=[...document.querySelectorAll('#nxSheet .sh-a')].map(x=>Math.round(x.getBoundingClientRect().width)); o.shareRowsEqual=rows.every(x=>x===rows[0]); nxClose();
    // 17.
    o.stats=/anonymous ID/.test(document.body.innerHTML)&&!/random number/.test(document.body.innerHTML);
    // 19 + 20. beats: pinned button after a pick; closing puts the playhead back; a free beat isn't called Pro
    PRO.owned=false; await projNew(); await w(100); S.bars=8; s2PlayheadTo(2); const cur0=s2.cur; beatSheet(); await w(200); o.noButtonYet=!$('btUse');
    const free=BEATS.find(x=>!x.pro); document.querySelector(`#nxSheet [data-beat="${free.id}"]`).click(); await w(1500); o.pinned=!!$('btUse')&&!!$('btUse').closest('.pro-foot')&&$('btUse').textContent==='Use this beat';
    nxClose(); await w(300); o.back=s2.cur===cur0&&!playing&&!S.tracks.length; o.noProNote=!/is Pro/.test($('toast').textContent);
    const pro=BEATS.find(x=>x.pro); beatSheet(); await w(200); document.querySelector(`#nxSheet [data-beat="${pro.id}"]`).click(); await w(300); o.proBtn=$('btUse').textContent; nxClose(); await w(200);
    // 21.
    window.webkit={messageHandlers:{noodleNative:{postMessage:()=>{}}}}; nxGo('more'); await w(200); $('nxTiming').click();   /* Buzz timing is in the iPhone app only */ await w(300); const more=$('nxMtMore'); if(more) more.click(); await w(100); const bz=$('nxBuzz'); o.buzz=bz?bz.min+'..'+bz.max:'none'; nxClose(); delete window.webkit; nxGo('studio');
    // 15. a grown delay restarts the audio; the song still plays
    await nxExample(); await w(600); ensureCtx(); await ctx.resume(); await w(1700); audioLagCheck(); const old=ctx, base=ctx._base; o.baseSet=base!=null;
    old.getOutputTimestamp=()=>({contextTime:old.currentTime-0.35, performanceTime:performance.now()}); audioLagCheck(); await w(200); o.restarted=ctx!==old&&old.state==='closed'&&audioRestarts===1;
    await renderDirty(); if(!playing) await togglePlay(); await w(800); const a=new Float32Array(chain.mon.fftSize); chain.mon.getFloatTimeDomainData(a); let q=0; for(const v of a) q+=v*v; o.playsAfter=playing&&q>0; if(playing) await togglePlay();
    return o; });
  const want={msAligned:true, copyOnPart:true, emptyBar:'true:true', pasted:true, share:'Before and after|Song video|Audio|Link to remix|DAW pack:0:4', shareRowsEqual:true, stats:true, noButtonYet:true, pinned:true, back:true, noProNote:true, proBtn:'Get Pro to use this beat', buzz:'-300..300', baseSet:true, restarted:true, playsAfter:true};
  for(const [k,v] of Object.entries(want)) if(r[k]!==v) errs.push(k+': '+JSON.stringify(r[k]));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
