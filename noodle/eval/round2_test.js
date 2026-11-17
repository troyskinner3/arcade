// Review round 2. Play under an open sheet: the transport stays usable and changes are heard. "Another version" in the note editor: an info sheet explains it; tapping cycles versions; Mine puts back your notes exactly, edits included; editing on a version makes that the new Mine
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ S.bars=4; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[[0,4,60.4],[4,4,62.4],[8,4,63.6],[12,4,65.4],[16,4,67.5],[20,4,68.6],[24,8,70.4]].map(([s,l,p])=>({s,l,p,v:.8}))});
    S.tracks.push(a); save(); flushSave(); renderTracks(); s2Edit(a); });
  await p.waitForTimeout(600); const sig=()=>p.evaluate(()=>JSON.stringify(S.tracks[0].notes.map(n=>[n.s,n.l,pitchOf(n)])));
  out.labels={ver:await p.$eval('#s2EdVer',e=>e.textContent), info:await p.evaluate(()=>!$('s2EdVerI').hidden), mine:await p.evaluate(()=>$('s2EdMine').hidden)};
  await p.tap('#s2EdVerI'); await p.waitForTimeout(200); out.infoSheet=await p.$eval('#nxSheet h2',e=>e.textContent); await p.screenshot({path:'results/ver_info.png'}); await p.tap('#nxX');
  // a hand edit: make the first note longer and move the last one an octave up
  await p.evaluate(()=>{ const t=S.tracks[0]; t.notes[0].l=3; t.notes[6].p+=12; t.notes[6].x=true; save(); renderTracks(); }); const mine=await sig();
  await p.tap('#s2EdVer'); await p.waitForTimeout(500); const v2=await sig(); out.first={label:await p.$eval('#s2EdVer',e=>e.textContent), mineShown:await p.evaluate(()=>!$('s2EdMine').hidden), fillHidden:await p.evaluate(()=>$('s2EdFill').hidden), changed:v2!==mine, toast:await p.$eval('#toast',e=>e.textContent)}; await p.screenshot({path:'results/ver_on.png'});
  if(await p.evaluate(()=>playing)) await p.tap('#s2EdPlay');
  await p.tap('#s2EdVer'); await p.waitForTimeout(400); out.second={label:await p.$eval('#s2EdVer',e=>e.textContent)};
  await p.tap('#s2EdMine'); await p.waitForTimeout(400); out.mine={restored:(await sig())===mine, label:await p.$eval('#s2EdVer',e=>e.textContent), mineHidden:await p.evaluate(()=>$('s2EdMine').hidden)};
  // going round the whole cycle also comes back to Mine
  const n=await p.evaluate(()=>S.tracks[0]._versions.length); for(let i=0;i<n;i++){ await p.tap('#s2EdVer'); await p.waitForTimeout(250); } out.fullCycle={restored:(await sig())===mine, versions:n};
  // edit while on a version: that becomes the new Mine
  await p.tap('#s2EdVer'); await p.waitForTimeout(300); await p.evaluate(()=>{ const t=S.tracks[0]; t.notes[1].l=2; save(); renderTracks(); }); const mine2=await sig();
  out.afterEdit={mineButtonGone:await p.evaluate(()=>$('s2EdMine').hidden)}; await p.tap('#s2EdVer'); await p.waitForTimeout(300); await p.tap('#s2EdMine'); await p.waitForTimeout(300); out.afterEdit.restoresEdited=(await sig())===mine2;
  if(await p.evaluate(()=>playing)) await p.tap('#s2EdPlay');
  // play while a track sheet is open
  await p.tap('#s2EdBack'); await p.waitForTimeout(300); if(await p.evaluate(()=>playing)) await p.tap('#s2Play');
  await p.tap('.s2-nm'); await p.waitForTimeout(250); const geo=await p.evaluate(()=>{ const sh=$('nxSheet').getBoundingClientRect(), tr=document.querySelector('.s2-tr').getBoundingClientRect(); return {sheetBottom:Math.round(sh.bottom), transportTop:Math.round(tr.top), recDimmed:getComputedStyle($('s2RecB')).pointerEvents==='none'}; });
  await p.tap('#s2Play'); await p.waitForTimeout(500); const pl=await p.evaluate(()=>({playing, sheetOpen:!$('nxScrim').hidden}));
  await p.tap('#nxSheet [data-x]').catch(()=>{}); const snd=await p.evaluate(()=>{ const b=[...document.querySelectorAll('#s2Snd button')].find(x=>x.getAttribute('aria-pressed')!=='true'); if(b) b.click(); return b?b.dataset.x:null; }); await p.waitForTimeout(700);
  out.playUnderSheet={...geo, ...pl, soundChangedTo:snd, stillPlaying:await p.evaluate(()=>playing), sound:await p.evaluate(()=>S.tracks[0].sound)}; await p.screenshot({path:'results/sheet_play.png'});
  await p.tap('#s2Play'); await p.waitForTimeout(200); out.playUnderSheet.paused=await p.evaluate(()=>!playing); await p.tap('#nxX'); out.playUnderSheet.recBack=await p.evaluate(()=>getComputedStyle($('s2RecB')).pointerEvents!=='none');
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
