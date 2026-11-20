// Key-only piano roll: in the note editor with a key, rows are the key's notes (plus any note placed outside it); "+ All notes" shows all 12;
// dragging and drawing still land on key notes. Drums: Add track offers only Drums; an old Kick track can become a kit. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ S.key='0'; S.scale='major'; S.bars=2; keyCache=null; s2.chrom=false; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[[0,4,60],[4,4,64],[8,4,67],[12,4,66]].map(([s,l,p])=>({s,l,p,v:.8,x:true}))}); S.tracks.push(a); save(); renderTracks(); s2Edit(a); });
  await p.waitForTimeout(400); const pcs=()=>p.evaluate(()=>{ const r=S.tracks[0]._grid.rows; return {n:r.length, black:r.filter(m=>[1,3,6,8,10].includes(m%12)).map(m=>m%12)}; });
  out.key=await pcs(); out.bar=await p.textContent('.ed-keys span');
  await p.tap('#edChrom'); await p.waitForTimeout(300); out.all=await pcs(); out.btn=await p.textContent('#edChrom'); await p.tap('#edChrom'); await p.waitForTimeout(300);
  // a new note drawn in the key-only roll is in key
  out.drawn=await p.evaluate(()=>{ const tr=S.tracks[0], G=tr._grid; const r=G.rows.find(m=>m%12===9); startNewNote(tr,{s:20,row:r}); tr._drag=null; noteChanged(tr); return pitchOf(tr.notes.find(n=>n.s===20))%12; });
  // drums
  out.addOffers=await p.evaluate(()=>{ s2EdClose(); s2AddSheet(false); return [...document.querySelectorAll('#nxSheet [data-k]')].map(b=>b.dataset.k).filter(k=>['kit','kick','snare','hat','clap'].includes(k)).join(','); });
  out.oldKick=await p.evaluate(()=>{ nxClose(); const k=mkTrack('kick',{id:S.nextId++,off:0,len:1,lenSet:true,rep:false,hits:[{s:0,d:'kick',v:1}]}); S.tracks.push(k); renderTracks(); s2PickSheet(s2Lane(s2LaneId(k)),'inst'); return [...document.querySelectorAll('#s2Ins button')].map(b=>b.dataset.k).join(','); });
  const want={key:{n:out.key.n,black:[6]},bar:'Notes in C major',btn:'− Key notes only',drawn:9,addOffers:'kit',oldKick:'kit,kick'};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k]));
  if(out.key.n<10||out.all.n<=out.key.n||!out.all.black.includes(1)) errs.push('rows '+JSON.stringify([out.key,out.all]));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
