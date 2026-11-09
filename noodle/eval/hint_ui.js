const {chromium,devices}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-hint.html'); await p.waitForTimeout(1200);
  const wav=fs.readdirSync(__dirname+'/../data/user').filter(f=>/buns-words-lead\.wav$/.test(f)).sort().pop(); const al=JSON.parse(fs.readFileSync(__dirname+'/../results/al_known.json'))['buns-words'];
  const id=await p.evaluate(async([wav,al])=>{ await guidedSetup('buns-words'); const ab=await ctx.decodeAudioData(await (await fetch('/user/'+wav)).arrayBuffer());
    const tr=activePart(); tr.notes=[]; S.target=tr.id; await addTake(mono(ab),ab.sampleRate,'lead',{align:al,notch:true,live:true}); S.target=null; if(playing) $('play').click(); openEditor(tr); await new Promise(r=>setTimeout(r,600)); return tr.id; },[wav,al]);
  for(let i=0;i<4;i++){ const m=p.locator('button',{hasText:/^[−-]$/}).first(); if(await m.count()) await m.click(); await p.waitForTimeout(150); }
  await p.waitForTimeout(300);
  const pos=await p.evaluate(id=>{ const tr=S.tracks.find(t=>t.id===id); const n=tr.notes.find(n=>n.hs); const G=tr._grid, i=G.rows.indexOf(pitchOf(n)); tr._cv.scrollIntoView({block:'center'}); let e=tr._cv; const L=[]; while(e){ if(e.scrollWidth>e.clientWidth+4) L.push(e.className+':'+getComputedStyle(e).overflowX); e=e.parentElement; } window.__dbg=L; let sc=tr._cv.parentElement; while(sc&&!(sc.scrollWidth>sc.clientWidth+4&&/(auto|scroll)/.test(getComputedStyle(sc).overflowX))) sc=sc.parentElement; if(sc) sc.scrollLeft=G.gut+(n.s+n.hs[0])*G.cw-150;
    const r=tr._cv.getBoundingClientRect(); return {x:r.left+G.gut+(n.s+n.hs[0])*G.cw+G.cw*0.3, y:r.top+1+i*G.rh+G.rh/2, cw:G.cw, dbg:window.__dbg, n:tr.notes.length, s:n.s, l:n.l, hs:n.hs}; },id);
  await p.screenshot({path:'results/hint_before.png'});
  await p.touchscreen.tap(pos.x,pos.y); await p.waitForTimeout(300);
  const after=await p.evaluate(id=>S.tracks.find(t=>t.id===id).notes.filter(n=>n.s>=28&&n.s<40).map(n=>`${n.s}/${n.l}`),id);
  await p.screenshot({path:'results/hint_after.png'});
  console.log(JSON.stringify(pos),'after tap:',after, errs); await b.close(); })();
