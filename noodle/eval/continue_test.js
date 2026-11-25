// Continue this (round 27): the note editor's ••• has Continue this for a short melody or chord part; a 2-bar melody becomes 8 bars: the part,
// a variation (first half the same), an answer (same rhythm, new notes), the part again ending on the home note; all in key; one Undo;
// with room for only 2 copies it makes the part and an ending; chord parts repeat and end on the home chord; drums have no Continue.
// Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={};
    await projNew(); await w(100); S.bpm=100; S.bars=2; S.key='0'; S.scale='major'; keyCache=null; scaleCache=null;
    const mel=[[0,4,64],[4,4,67],[8,8,69],[16,4,67],[20,4,65],[24,8,62]].map(([s,l,p])=>({s,l,p,v:.8,x:true}));
    const ld=mkTrack('lead',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,sound:'Bell',notes:mel}); S.tracks.push(ld); save(); flushSave(); renderTracks(); await w(200);
    s2Edit(ld); await w(300); out.moreShown=!$('s2EdMore').hidden; $('s2EdMore').click(); await w(200); out.btn=!!$('edCont'); const u0=hist.undo.length; $('edCont').click(); await w(1200); flushSave();
    const t=S.tracks.find(x=>x.id===ld.id), ns=t.notes, seg=k=>ns.filter(n=>n.s>=k*32&&n.s<(k+1)*32).map(n=>({...n,s:n.s-k*32})), sig=a=>a.map(n=>n.s+':'+Math.round(n.p)).join(' '), A=sig(mel);
    out.len=t.len+'/'+S.bars; out.a=sig(seg(0))===A; out.rhythm=[1,2,3].every(k=>seg(k).map(n=>n.s).join()===mel.map(n=>n.s).join());
    out.varFirstHalf=sig(seg(1).filter(n=>n.s<16))===sig(mel.filter(n=>n.s<16)); out.answerNew=sig(seg(2))!==A;
    const e=seg(3); out.ending=sig(e.slice(0,-1))===sig(mel.slice(0,-1))&&Math.round(e[e.length-1].p)%12===0;
    out.inKey=ns.every(n=>[0,2,4,5,7,9,11].includes(((Math.round(n.p))%12+12)%12)); out.oneUndo=hist.undo.length===u0+1; s2EdClose();
    undo(); await w(300); out.undone=S.tracks.find(x=>x.id===ld.id).notes.length===mel.length;
    // room for two copies only: a part 2 bars later in the same lane
    const t2=S.tracks.find(x=>x.id===ld.id); const nx=mkTrack('lead',{id:S.nextId++,lane:s2LaneId(t2),off:64,len:2,lenSet:true,rep:false,sound:'Bell',notes:[{s:0,l:4,p:60,v:.8,x:true}]}); S.tracks.push(nx); S.bars=8; save(); flushSave();
    await continuePart(t2); out.two=t2.len===4&&t2.notes.length===mel.length*2;
    // chords: repeat and end home
    await projNew(); await w(100); S.key='0'; S.scale='major'; keyCache=null; S.bars=1; const ch=mkTrack('keys',{id:S.nextId++,off:0,len:1,lenSet:true,rep:false,chordType:'triad',notes:[{s:0,l:8,p:57,v:.7,x:true},{s:8,l:8,p:55,v:.7,x:true}]}); S.tracks.push(ch); save(); flushSave();
    await continuePart(ch); out.chords=ch.notes.map(n=>n.s+':'+n.p).join(' ');
    const kit=mkTrack('kit',{id:S.nextId++,off:0,len:1,hits:[{s:0,d:'kick',v:1}]}); out.noDrums=!continueOk(kit);
    return out; });
  const want={moreShown:true, btn:true, len:'8/8', a:true, rhythm:true, varFirstHalf:true, answerNew:true, ending:true, inKey:true, oneUndo:true, undone:true, two:true, noDrums:true};
  if(!/^0:57 8:55 16:57 24:55 32:57 40:55 48:57 56:(48|60)$/.test(r.chords)) errs.push('chords: '+r.chords);
  for(const [k,v] of Object.entries(want)) if(r[k]!==v) errs.push(k+': '+JSON.stringify(r[k]));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
