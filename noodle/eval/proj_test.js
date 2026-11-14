// saved projects: make two songs, list, reopen, rename, duplicate, delete; survive a reload; the untouched example is never saved
const {chromium}=require('playwright'); const assert=require('assert');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext(); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const U='http://localhost:8800/noodle-proj.html'; await p.goto(U); await p.waitForTimeout(1000);
  const r1=await p.evaluate(async()=>{ const out={}; out.exampleSaved=(await projSaveCurrent()); out.list0=(await projList()).length;
    await newSong(); S.title='Song A'; const a=mkTrack('lead',{id:S.nextId++, notes:[{s:0,l:4,p:60,v:0.8,x:true},{s:4,l:4,p:62,v:0.8,x:true}]}); S.tracks.push(a); S.bpm=97; save(); flushSave(); const pidA=await projSaveCurrent();
    await newSong(); out.afterNew={tracks:S.tracks.length,title:S.title||'',pidDiffers:S.pid!==pidA};
    S.title='Song B'; S.tracks.push(mkTrack('bass',{id:S.nextId++, notes:[{s:0,l:8,p:40,v:0.8,x:true}]})); save(); flushSave(); const pidB=await projSaveCurrent();
    out.list=(await projList()).map(x=>`${x.title}|${x.bpm}|${x.parts.join('+')}|${x.current?'current':''}`);
    out.openA=await projOpen(pidA); out.A={title:S.title,bpm:S.bpm,notes:S.tracks[0].notes.length,undo:hist.undo.length,domTitle:$('songName').value};
    await projRename(pidB,'Song B2'); await projRename(pidA,'Song A2'); const dup=await projDuplicate(pidA);
    out.list2=(await projList()).map(x=>x.title).sort(); const d=JSON.parse((await projDb.get(dup)).json); out.dupIdsDiffer=d.tracks[0].id!==S.tracks[0].id && d.pid===dup;
    await projDelete(pidB); out.list3=(await projList()).map(x=>x.title).sort(); window.__pidA=pidA; return {...out,pidA,dup}; });
  await p.reload(); await p.waitForTimeout(1000);
  const r2=await p.evaluate(async(r)=>{ const out={afterReload:{title:S.title,pid:S.pid===r.pidA,list:(await projList()).map(x=>x.title).sort()}};
    await projDelete(r.pidA); out.afterDeleteCurrent={tracks:S.tracks.length,title:S.title||'',list:(await projList()).map(x=>x.title)}; out.openDup=await projOpen(r.dup); out.dup={title:S.title,notes:S.tracks[0].notes.length}; return out; },r1);
  console.log(JSON.stringify({...r1,...r2},null,1), errs); await b.close(); })();
