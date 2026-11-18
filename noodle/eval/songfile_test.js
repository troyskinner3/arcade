// Song files: save a song with a kept recording and a Your voice sound, delete it, open the file: the song comes back with its recording
// (new part ids, nothing overwritten) and its Your voice; opening it again adds nothing; a backup holds every song; a wrong file is refused.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ const out={}; let saved=null; window.offerFile=async(fn,blob)=>{ saved={fn,text:await blob.text()}; };
    const o=defaultState(); o.title='Test song'; o.pid=projId(); o.tracks=[mkTrack('vox',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Pop'}),mkTrack('keys',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound:'Piano',notes:[{s:0,l:4,p:60,v:.8}]})]; await projLoadState(o);
    const v=S.tracks[0], x=new Float32Array(16000); for(let i=0;i<x.length;i++) x[i]=0.3*Math.sin(i*0.05); v._raw={x,sr:16000}; v.va=0.1; storeVox(v); S.yv={sr:24000,root:60,ls:100,le:2000,pcm:'AAAA',rank:0,of:1}; persist(); await projSaveCurrent(); await new Promise(r=>setTimeout(r,200));
    const id=S.pid, vid=v.id; await songFileSave([id],'Test song'); out.file=saved.fn; out.kb=Math.round(saved.text.length/1024);
    const f=JSON.parse(saved.text); out.hasTake=!!f.songs[0].takes[vid]; out.hasYv=!!f.songs[0].song.yv;
    await projDelete(id); out.afterDelete=((await projDb.all())||[]).filter(p=>p.title==='Test song').length;
    out.added=await songFileOpen(saved.text); const back=((await projDb.all())||[]).find(p=>p.title==='Test song'); const so=JSON.parse(back.json);
    out.restored={tracks:so.tracks.length, newIds:so.tracks[0].id!==vid, yv:!!so.yv}; const tk=await takeStore.get('vox'+so.tracks[0].id); out.restored.take=!!tk && tk.pcm && tk.pcm.length===x.length && Math.abs(tk.pcm[100]-Math.round(x[100]*32767))<=1;
    out.again=await songFileOpen(saved.text);
    const o2=defaultState(); o2.title='Second'; o2.pid=projId(); o2.tracks=[mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:4,p:60,v:.8}]})]; await projLoadState(o2); await projSaveCurrent();
    saved=null; $('nxBackup').click(); await new Promise(r=>setTimeout(r,600)); out.backup={file:saved&&saved.fn, songs:saved&&JSON.parse(saved.text).songs.map(g=>g.title).sort()};
    out.wrong=await songFileOpen('{"hello":1}');
    return out; });
  const ok=r.hasTake&&r.hasYv&&r.afterDelete===0&&r.added===1&&r.restored.newIds&&r.restored.yv&&r.restored.take&&r.again===0&&r.backup.songs&&r.backup.songs.includes('Second')&&r.backup.songs.includes('Test song')&&r.wrong===-1; if(!ok) errs.push('song file check failed');
  console.log(JSON.stringify(r),errs); await b.close(); })();
