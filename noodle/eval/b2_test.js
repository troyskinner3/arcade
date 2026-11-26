// Round 29 B2 small items: Count-in chord lives in Mic and timing (not Tempo); the timeline draws lines at the snap size when they'd be at
// least 9 px apart (merging to beats, then none, zoomed out); the Mix effect buttons have room for their Pro badge; Credits lists the music
// Noodle learned from. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={};
    await nxExample(); await w(600);
    s2Sheets('tempo'); await w(150); o.tempoNoChord=!/Count-in chord/.test($('nxSheet').textContent); nxClose();
    nxGo('more'); await w(150); $('nxTiming').click(); await w(150); $('nxMtMore').click(); o.micHasChord=!!$('nxKr'); nxClose(); nxGo('studio'); await w(200);
    const sub=()=>getComputedStyle($('s2')).getPropertyValue('--s2-subw').trim()+'/'+$('s2').classList.contains('s2-sub');
    S.snap=0.25; s2.barw=44; s2Render(); o.q44=sub(); S.snap=0.125; s2.barw=120; s2Render(); o.e120=sub(); S.snap=0.125; s2.barw=30; s2Render(); o.e30=sub(); S.snap=1; s2.barw=44; s2Render(); o.bar=sub();
    const m=mkTrack('mix',{id:S.nextId++,off:0,len:1,lenSet:true,rep:false}); m.mfx={k:'lp',curve:null,params:{}}; S.tracks.push(m); renderTracks(); PRO.owned=false; s2Edit(m); await w(300); const row=document.querySelector('.mfx-k'), badge=row&&row.querySelector('.pro-b'); o.badgeInside=!!badge&&badge.getBoundingClientRect().top>=row.getBoundingClientRect().top-0.5; s2EdClose();
    nxGo('more'); await w(150); $('nxCredits').click(); await w(150); o.credits=['Groove MIDI Dataset','Chordonomicon','McGill Billboard','PDMX'].every(x=>$('nxSheet').textContent.includes(x)); nxClose();
    // the new free beats (rock, country, reggaeton): each plays with sound, free sounds only, in its key
    o.newBeats=[]; for(const id of ['rock1','country1','regg1']){ await projNew(); await w(100); const bt=BEATS.find(x=>x.id===id); beatTry(bt); beatUse(); if(playing) await togglePlay(); await renderDirty();
      const mix=await renderMix(1,false); let q=0; const d=mix.getChannelData(0); for(let i=0;i<d.length;i++) q+=d[i]*d[i]; const K=currentKey(), sc=SCALES[PARENT[K.scale]||K.scale];
      o.newBeats.push(id+':'+(!bt.pro)+':'+(10*Math.log10(q/d.length+1e-12)>-40)+':'+S.tracks.every(t=>!PRO_SOUNDS.has(t.sound))+':'+S.tracks.filter(t=>t.notes).every(t=>t.notes.every(n=>sc.includes(((Math.round(n.p)-K.tonic)%12+12)%12)))); }
    return o; });
  const want={newBeats:undefined, tempoNoChord:true, micHasChord:true, q44:'11px/true', e120:'15px/true', e30:'100%/false', bar:'100%/false', badgeInside:true, credits:true};
  if(r.newBeats.join()!=='rock1:true:true:true:true,country1:true:true:true:true,regg1:true:true:true:true') errs.push('new beats: '+r.newBeats.join());
  for(const [k,v] of Object.entries(want)) if(k!=='newBeats'&&r[k]!==v) errs.push(k+': '+JSON.stringify(r[k]));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
