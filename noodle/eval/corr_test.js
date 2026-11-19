// Faster fixes in the note editor: arrows nudge a note's pitch (in key), Split asks 2 / 3 / 4 for long notes, hold-then-drag selects
// several notes (or hits), which then move together by arrows or by dragging, and delete together. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone SE'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ S.key='0'; S.scale='major'; keyCache=null; s2.chrom=true; S.bars=4; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[[0,4,60],[4,4,62],[8,12,64],[20,4,65],[24,8,67]].map(([s,l,p])=>({s,l,p,v:.8}))}); S.tracks.push(a); save(); flushSave(); renderTracks(); s2Edit(a); });
  await p.waitForTimeout(500);
  const ps=()=>p.evaluate(()=>S.tracks[0].notes.map(n=>[n.s,n.l,pitchOf(n)]));
  // one note: up and down step through the key (E -> F -> G, skipping F#)
  await p.evaluate(()=>{ const tr=S.tracks[0]; selectNote(tr,tr.notes[2]); }); await p.waitForTimeout(150);
  await p.tap('.selbar .sb-up'); await p.tap('.selbar .sb-up'); out.up2=(await ps())[2][2];
  await p.tap('.selbar .sb-dn'); out.down1=(await ps())[2][2];
  out.edits=await p.evaluate(()=>S.tracks[0].ed.filter(e=>e.k==='pitch').length);
  // split a 12-step note into 3
  await p.tap('.selbar .sb-split'); out.ask=await p.isVisible('.selbar .sb-sp'); await p.tap('.selbar .sb-sp [data-n="3"]'); out.split3=(await ps()).filter(x=>x[2]===65).map(x=>[x[0],x[1]]);
  // bar fits the smallest phone
  out.barFits=await p.evaluate(()=>{ const sb=document.querySelector('#s2EdBody .selbar')||document.querySelector('.selbar'); return [...sb.children].filter(x=>!x.hidden).every(x=>{ const r=x.getBoundingClientRect(); return r.right<=innerWidth+0.5; }); });
  // hold an empty spot, then drag a box over the first two notes
  await p.evaluate(()=>{ $('s2EdBody').scrollTop=0; window.scrollTo(0,0); }); await p.waitForTimeout(100);
  const cell=await p.evaluate(()=>{ const tr=S.tracks[0], G=tr._grid, R=tr._cv.getBoundingClientRect(); const at=(s,m)=>({x:R.left+G.gut+(s+0.5)*G.cw, y:R.top+1+(G.rows.indexOf(m)+0.5)*G.rh}); return {a:at(0,63), b:at(7,60), n0:at(1,60), far:at(15,G.rows[0])}; });
  await p.mouse.move(cell.a.x,cell.a.y); await p.mouse.down(); await p.waitForTimeout(500); await p.mouse.move(cell.b.x,cell.b.y,{steps:6}); await p.mouse.up(); await p.waitForTimeout(150);
  out.selected=await p.evaluate(()=>(S.tracks[0]._msel||[]).map(n=>n.s)); out.label=await p.textContent('.selbar .sb-n'); out.moveBtns=await p.isVisible('.selbar .sb-r');
  await p.tap('.selbar .sb-r'); await p.tap('.selbar .sb-up'); out.afterArrows=(await ps()).slice(0,2);
  // drag the group: one cell left
  const g0=await p.evaluate(()=>{ const tr=S.tracks[0], G=tr._grid, R=tr._cv.getBoundingClientRect(), n=tr.notes[0]; return {x:R.left+G.gut+(n.s+0.5)*G.cw, y:R.top+1+(G.rows.indexOf(pitchOf(n))+0.5)*G.rh, cw:G.cw}; });
  await p.mouse.move(g0.x,g0.y); await p.mouse.down(); await p.mouse.move(g0.x-g0.cw,g0.y,{steps:4}); await p.mouse.up(); await p.waitForTimeout(150);
  out.afterDrag=(await ps()).slice(0,2);
  await p.tap('.selbar .sb-del'); out.afterDel=(await ps()).length;
  // undo brings them back
  await p.evaluate(()=>undo()); await p.waitForTimeout(150); out.afterUndo=(await ps()).length;
  // drums: box-select hits and move them later
  await p.evaluate(()=>{ s2EdClose(); const k=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,hits:[0,4,8,12].map(s=>({s,d:'kick',v:1}))}); S.tracks.push(k); renderTracks(); s2Edit(k); }); await p.waitForTimeout(500);
  const d=await p.evaluate(()=>{ const tr=S.tracks[1], G=tr._grid, R=tr._cv.getBoundingClientRect(); const at=(s,r)=>({x:R.left+G.gut+(s+0.5)*G.cw, y:R.top+1+(G.rows.indexOf(r)+0.5)*G.rh}); return {a:at(2,G.rows[0]), b:at(9,G.rows[G.rows.length-1])}; });
  await p.mouse.move(d.a.x,d.a.y); await p.mouse.down(); await p.waitForTimeout(500); await p.mouse.move(d.b.x,d.b.y,{steps:6}); await p.mouse.up(); await p.waitForTimeout(150);
  out.hitsSel=await p.evaluate(()=>(S.tracks[1]._msel||[]).map(h=>h.s)); await p.tap('.selbar .sb-r'); out.hitsAfter=await p.evaluate(()=>S.tracks[1].hits.map(h=>h.s));
  await p.screenshot({path:__dirname+'/results/corr_multi.png'});
  const want={up2:67,down1:65,edits:3,ask:true,split3:[[8,4],[12,4],[16,4],[20,4]],barFits:true,selected:[0,4],label:'2 notes',moveBtns:true,afterArrows:[[1,4,62],[5,4,64]],afterDrag:[[0,4,62],[4,4,64]],afterDel:5,afterUndo:7,hitsSel:[4,8],hitsAfter:[0,5,9,12]};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k])+' want '+JSON.stringify(v));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
