// Duplicate track: every part and its notes, as a new track right under the original, then its sheet opens to pick an instrument; long presses don't select text
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); S.bars=4; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[{s:0,l:8,p:57,v:.8,x:true},{s:8,l:8,p:55,v:.8,x:true}]}), a2=mkTrack('lead',{id:S.nextId++,lane:a.id,off:32,len:1,rep:false,lenSet:true,notes:[{s:0,l:16,p:60,v:.8,x:true}]}), k=mkTrack('kit',{id:S.nextId++,off:0,len:1,hits:[{s:0,d:'kick',v:1}]}); S.tracks.push(a,a2,k); save(); renderTracks(); return ctx.resume(); });
  await p.tap('.s2-nm'); await p.waitForTimeout(200); await p.tap('#nxSheet [data-a="dup"]'); await p.waitForTimeout(500);
  out.after=await p.evaluate(()=>({lanes:s2Lanes().map(L=>s2Name(L)+':'+L.tracks.length+' parts'), sheetFor:($('nxSheet').querySelector('h2')||{}).textContent, sheetOpen:!$('nxScrim').hidden, toast:$('toast').textContent}));
  await p.tap('#nxSheet #s2Ins [data-k="keys"]'); await p.waitForTimeout(300); await p.evaluate(()=>nxClose());
  out.asKeys=await p.evaluate(()=>{ const L=s2Lanes()[1]; return {inst:L.tracks.map(t=>t.inst).join(','), notes:L.tracks.map(t=>t.notes.length).join(','), origLead:s2Lanes()[0].tracks.every(t=>t.inst==='lead'), octave:L.tracks[0].oct, chords:L.tracks[0].notes.map(n=>chordName(notePitches(L.tracks[0],n))).join(' ')}; });
  out.noSelect=await p.evaluate(()=>getComputedStyle(document.body).webkitUserSelect||getComputedStyle(document.body).userSelect);
  await p.screenshot({path:'results/duptrack.png'});
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
