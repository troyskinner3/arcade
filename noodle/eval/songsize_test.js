// Song links stay small (security review, 26 Nov): each recording goes into a shared song once (copies point at it: takeRefs) and at 24 kHz;
// opening it gives every copy its recording; a backup (.noodle) keeps the original rate; a hostile takeRefs can't break opening. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={};
    await projNew(); await w(100); S.bars=8; const sr=48000, x=new Float32Array(sr*10); for(let i=0;i<x.length;i++) x[i]=0.3*Math.sin(2*Math.PI*220*i/sr)+0.01*(Math.random()-0.5);
    const v=mkTrack('vox',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false}); v.va=0; v._raw={x,sr}; storeVox(v); S.tracks.push(v);
    for(let k=1;k<4;k++){ const c=JSON.parse(JSON.stringify(v,(kk,vv)=>kk[0]==='_'?undefined:vv)); c.id=S.nextId++; c.lane=v.id; c.off=k*32; c.copyOf=v.id; c._raw=v._raw; storeVox(c); S.tracks.push(c); }
    save(); flushSave(); await w(600); await projSaveCurrent();
    const link=await songFilePack([S.pid],{link:true}), backup=await songFilePack([S.pid]); const size=x=>JSON.stringify(x).length;
    o.linkKB=Math.round(size(link)/1024); o.oldKB=Math.round(4*size(backup)/1024);   /* before: every copy carried its 48 kHz recording */ o.backupKB=Math.round(size(backup)/1024); o.takes=Object.keys(link[0].takes).length+'+'+Object.keys(link[0].takeRefs||{}).length;
    o.linkRate=unpackV(Object.values(link[0].takes)[0]).sr; o.backupRate=unpackV(Object.values(backup[0].takes)[0]).sr;
    const lk=JSON.parse(JSON.stringify(link)); lk[0].createdAt=2; lk[0].title='Shared'; const n=await songFileOpen(JSON.stringify({noodle:'songs',v:1,songs:lk})); await projOpen(songFileOpen.last); await w(300);
    const got=[]; for(const t of S.tracks.filter(t=>t.inst==='vox')){ const r2=await takeStore.get('vox'+t.id); got.push(!!(r2&&r2.pcm&&r2.pcm.length)); } o.opened=n+':'+got.join(',');
    const bad=JSON.parse(JSON.stringify(link)); bad[0].createdAt=3; bad[0].title='Odd'; bad[0].takeRefs={[bad[0].song.tracks[1].id]:'__proto__',[bad[0].song.tracks[2].id]:'constructor'}; const n2=await songFileOpen(JSON.stringify({noodle:'songs',v:1,songs:bad})); o.hostile=n2;
    return o; });
  if(!(r.takes==='1+3'&&r.linkRate===24000&&r.backupRate===48000&&r.linkKB*1.8<r.backupKB&&r.linkKB<800&&r.opened==='1:true,true,true,true'&&r.hostile===1)) errs.push(JSON.stringify(r));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
