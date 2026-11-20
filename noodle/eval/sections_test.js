// Song sections: mark bars 1-4 "Verse" on the timeline (band with handles, Done / Exit), then Chorus, duplicate it (its parts are copied to bars 5-8, the chorus moves to 9-12,
// a looping beat keeps looping), labels show in the ruler, loop and remove work. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ S.bars=8; const v=mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,notes:[{s:0,l:8,p:60,v:.8}]}); const ch=mkTrack('lead',{id:S.nextId++,lane:v.id,off:64,len:4,rep:false,lenSet:true,notes:[{s:0,l:8,p:67,v:.8}]});
    const k=mkTrack('kit',{id:S.nextId++,len:1,hits:[{s:0,d:'kick',v:1}]}); S.tracks.push(v,ch,k); save(); renderTracks(); });
  await p.tap('#s2Secs'); await p.waitForTimeout(200); out.sheet=await p.textContent('#nxSheet h2');
  await p.tap('#secMark'); await p.waitForTimeout(200); out.mode=await p.evaluate(()=>!$('s2MarkBar').hidden&&!!$('s2MBand'));
  await p.tap('#s2MkN [data-mkn="Verse"]'); await p.tap('#s2MkOk'); await p.waitForTimeout(200);   /* bars 1-4 (the band starts on 4 bars at the playhead) */
  { const h=await (await p.$('#s2MBand .mh.l')).boundingBox(), bw=await p.evaluate(()=>s2.barw); await p.mouse.move(h.x+h.width/2,h.y+h.height/2); await p.mouse.down(); await p.mouse.move(h.x+h.width/2+2*bw,h.y+h.height/2,{steps:6}); await p.mouse.up();
    out.dragged=await p.evaluate(()=>s2.mark.a+'-'+s2.mark.b); const h2=await (await p.$('#s2MBand .mh.l')).boundingBox(); await p.mouse.move(h2.x+h2.width/2,h2.y+h2.height/2); await p.mouse.down(); await p.mouse.move(h2.x+h2.width/2-2*bw,h2.y+h2.height/2,{steps:6}); await p.mouse.up(); }
  out.nextName=await p.evaluate(()=>s2.mark.name); await p.tap('#s2MkOk'); await p.waitForTimeout(200); await p.tap('#s2MkX'); await p.waitForTimeout(150); out.left=await p.evaluate(()=>!s2.mark&&$('s2MarkBar').hidden);
  await p.tap('#s2Secs'); await p.waitForTimeout(200);
  out.secs=await p.evaluate(()=>S.secs.map(x=>x.name+':'+x.a+'-'+x.b).join(' '));
  await p.screenshot({path:__dirname+'/results/sections_sheet.png'});
  await p.tap('[data-dup="0"]'); await p.waitForTimeout(300);
  out.after=await p.evaluate(()=>({bars:S.bars, parts:S.tracks.filter(t=>t.inst==='lead').map(t=>(t.off||0)/16+':'+t.notes[0].p).sort().join(' '), kitLoops:pLoops(S.tracks.find(t=>t.inst==='kit')), secs:S.secs.map(x=>x.name+':'+x.a+'-'+x.b).join(' '), labels:[...document.querySelectorAll('.s2-sec b')].map(x=>x.textContent).join(',')}));
  await p.screenshot({path:__dirname+'/results/sections_ruler.png'});
  await p.tap('.s2-sec b'); await p.waitForTimeout(150); out.labelMenu=await p.textContent('#nxSheet h2'); await p.evaluate(()=>nxClose());
  await p.tap('#s2Secs'); await p.waitForTimeout(150); await p.tap('[data-loop="2"]'); await p.waitForTimeout(150); out.loop=await p.evaluate(()=>s2.sec&&[s2.sec.a,s2.sec.b].join('-'));
  await p.tap('#s2Secs'); await p.waitForTimeout(150); await p.tap('[data-rm="0"]'); await p.waitForTimeout(150); out.removed=await p.evaluate(()=>S.secs.map(x=>x.name).join(' '));
  await p.evaluate(()=>{ nxClose(); undo(); }); await p.waitForTimeout(200); out.undo=await p.evaluate(()=>(S.secs||[]).length);
  const want={sheet:'Sections',mode:true,dragged:'6-8',nextName:'Chorus',left:true,labelMenu:'Verse',secs:'Verse:0-4 Chorus:4-8',after:{bars:12,parts:'0:60 4:60 8:67',kitLoops:12,secs:'Verse:0-4 Verse:4-8 Chorus:8-12',labels:'Verse,Verse,Chorus'},loop:'128-192',removed:'Verse Chorus',undo:3};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k]));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
