// Copy a part to another song (Pro): free users get the Pro screen; Pro copies a melody and a vocal (with its recording), opens another song,
// Add track offers Paste part, which puts it on a new track at the playhead with its notes, sound and recording.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  for(const pro of [false,true]){ const c=await b.newContext({...devices['iPhone 13']}); if(pro) await c.addInitScript(()=>localStorage.setItem('noodle.pro','1')); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
    out[pro?'pro':'free']=await p.evaluate(async()=>{ const r={}, w=ms=>new Promise(r=>setTimeout(r,ms));
      const o=defaultState(); o.bpm=100; o.bars=4; o.pid=projId(); o.title='Song A'; o.tracks=[mkTrack('lead',{id:S.nextId++,off:16,len:2,rep:false,lenSet:true,sound:'Glass',notes:[{s:0,l:4,p:64,v:.8,x:true},{s:8,l:4,p:67,v:.8,x:true}]}), mkTrack('vox',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Natural'})]; await projLoadState(o);
      const v=S.tracks[1], x=new Float32Array(48000); for(let i=0;i<x.length;i++) x[i]=0.3*Math.sin(i*0.03); v._raw={x,sr:48000}; v.va=0; storeVox(v); await w(200);
      s2.selId=S.tracks[0].id; s2Render(); await w(100); $('s2CbCopy').click(); await w(300); r.proSheet=/Noodle Pro/.test($('nxSheet').textContent)&&!$('nxScrim').hidden; nxClose();
      if(!isPro()) return r;
      s2.selId=v.id; s2Render(); await w(100); $('s2CbCopy').click(); await w(300); const vClip=(await takeStore.get('clipboard')).part.inst;
      s2.selId=S.tracks[0].id; s2Render(); await w(100); $('s2CbCopy').click(); await w(300); r.copiedMsg=lastMsg;
      const o2=defaultState(); o2.bpm=100; o2.bars=8; o2.pid=projId(); o2.title='Song B'; o2.tracks=[mkTrack('kit',{id:S.nextId++,off:0,len:8,rep:false,lenSet:true,sound:'Punchy',hits:[{s:0,d:'kick',v:.8}]})]; await projLoadState(o2);
      s2.cur=5.5; await s2AddSheet(false); await w(100); r.offered=!!$('s2Paste')&&/Glass|Lead/.test($('s2Paste').textContent)&&/Song A/.test($('s2Paste').textContent); $('s2Paste').click(); await w(400);
      const t=S.tracks.find(t=>t.inst==='lead'); r.pasted=t&&{off:t.off, sound:t.sound, notes:t.notes.map(n=>n.p).join(','), ownLane:s2LaneId(t)===t.id};
      // the vocal, with its recording
      await takeStore.put('clipboard',{part:(()=>{ const q=JSON.parse(JSON.stringify(o.tracks[1],(k,v)=>k[0]==='_'?undefined:v)); q.va=0; return q; })(), take:await takeStore.get('vox'+v.id), from:'Song A'}); s2.cur=0; await partPaste(); await w(800);
      const pv=S.tracks.filter(t=>t.inst==='vox').pop(); r.vox={raw:!!(pv&&pv._raw), len:pv&&pv._raw&&pv._raw.x.length, vClip};
      return r; }); await c.close(); }
  const f=out.free, pr=out.pro, ok=f.proSheet&&!pr.proSheet&&/Copied/.test(pr.copiedMsg)&&pr.offered&&pr.pasted&&pr.pasted.off===80&&pr.pasted.sound==='Glass'&&pr.pasted.notes==='64,67'&&pr.pasted.ownLane&&pr.vox.raw&&pr.vox.len===48000&&pr.vox.vClip==='vox';
  if(!ok) errs.push('copy part failed'); console.log(JSON.stringify(out),errs); await b.close(); })();
