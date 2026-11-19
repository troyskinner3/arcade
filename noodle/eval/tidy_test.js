// Tidy (the note editor button): a one-step recorded blip joins the note before, a note just off the 8th grid moves onto it, gaps fill,
// drawn notes are left alone, Undo brings it all back. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ S.quant=16; S.bars=1; const t=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,notes:[{s:0,l:3,p:60,v:.8},{s:3,l:1,p:61,v:.5},{s:5,l:2,p:64,v:.8},{s:9,l:1,p:67,v:.8,x:true},{s:12,l:2,p:65,v:.8}]});
    S.tracks.push(t); save(); flushSave(); renderTracks(); s2Edit(t); await new Promise(q=>setTimeout(q,300)); const before=JSON.stringify(t.notes.map(n=>[n.s,n.l,n.p]));
    document.getElementById('s2EdFill').click(); flushSave(); const after=t.notes.map(n=>[n.s,n.l,n.p]); const label=document.getElementById('s2EdFill').textContent, msg=document.getElementById('toast').textContent;
    undo(); await new Promise(q=>setTimeout(q,200)); const back=JSON.stringify(S.tracks[0].notes.map(n=>[n.s,n.l,n.p])); return {label,after,msg,undone:back===before}; });
  if(r.label!=='Tidy') errs.push('label '+r.label);
  if(JSON.stringify(r.after)!==JSON.stringify([[0,4,60],[4,5,64],[9,3,67],[12,4,65]])) errs.push('after '+JSON.stringify(r.after));
  if(!/1 tiny note joined, 1 lined up on the beat/.test(r.msg)) errs.push('msg '+r.msg); if(!r.undone) errs.push('undo');
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
