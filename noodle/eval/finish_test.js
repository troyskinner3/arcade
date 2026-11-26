// Finish song (round 23; round 29: the song's real length and sections). A short song grows to 8 bars (its own parts repeat, a Verse then a
// Chorus are marked); a longer one keeps its length and nothing is added past where its parts end; marked sections are followed and filled
// for their job (an intro sparse, a fill into the chorus, a crash on its first beat, no bass in the intro, the hook only in the chorus);
// chords follow the song's own melody; everything is in key and free; one Undo takes it all out; comping and bass are livelier (syncopated);
// the learned melodies and progressions still pass their checks. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={};
    const inKeyAll=()=>{ const K=currentKey(), sc=SCALES[PARENT[K.scale]||K.scale]; return S.tracks.filter(t=>t.notes&&t.notes.length).every(t=>t.notes.every(n=>sc.includes(((Math.round(n.p)-K.tonic)%12+12)%12))); };
    const ends=()=>Math.max(...S.tracks.filter(t=>hasContent(t)).map(t=>(t.off||0)/16+pBars(t)*pLoops(t)));
    const lanesOf=inst=>[...new Set(S.tracks.filter(t=>t.inst===inst).map(s2LaneId))].length;
    // 1. only drums, 1 bar looping in a 4-bar song: grows to 8 bars, Verse then Chorus
    await projNew(); await w(100); S.bpm=96; S.bars=4; S.tracks.push(mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:true,hits:[0,8].map(s=>({s,d:'kick',v:1})).concat([4,12].map(s=>({s,d:'snare',v:.9})))})); save(); flushSave(); renderTracks(); await w(300);
    out.button=!!document.querySelector('#s2Finish'); const n0=S.tracks.length, u0=hist.undo.length;
    document.querySelector('#s2Finish').click(); await w(2000); flushSave();
    out.d={bars:S.bars, secs:(S.secs||[]).map(x=>x.name+':'+x.a+'-'+x.b).join(' '), missing:finishMissing().join(','), lanes:['bass','keys','pad','lead','arp','fx','mix'].map(k=>k+lanesOf(k)).join(' '),
      leadOnlyChorus:S.tracks.filter(t=>t.inst==='lead'||t.inst==='arp').every(t=>(t.off||0)>=64), inKey:inKeyAll(), free:S.tracks.every(t=>!PRO_SOUNDS.has(t.sound)), withinSong:ends()<=8+1e-6, oneUndo:hist.undo.length===u0+1};
    if(playing) await togglePlay(); await renderDirty(); const mix=await renderMix(1,false); let q=0; const dd=mix.getChannelData(0); for(let i=0;i<dd.length;i++) q+=dd[i]*dd[i]; out.loud=+(10*Math.log10(q/dd.length+1e-12)).toFixed(1);
    undo(); await w(300); out.undone=S.tracks.length===n0&&S.bars===4&&!(S.secs||[]).length;
    // 2. the example song (2 bars): its parts repeat to 8 bars; every bar has music; the mix effect isn't on silence
    await nxExample(); await w(700); const ex=S.tracks.filter(hasContent).length; await finishSong(); await w(400); flushSave();
    const sounding=bar=>S.tracks.filter(t=>hasContent(t)&&t.inst!=='mix'&&t.inst!=='fx').filter(t=>{ const o=(t.off||0)/16; return o<=bar&&o+pBars(t)*pLoops(t)>bar; }).length;
    out.ex={bars:S.bars, copies:S.tracks.filter(t=>t.copyOf!=null).length, everyBar:[...Array(8).keys()].every(b=>sounding(b)>=2), mixOnMusic:S.tracks.filter(t=>t.inst==='mix').every(t=>sounding((t.off||0)/16)>=2), grewFrom:ex};
    // 3. a 16-bar song with a melody and marked sections (Intro 1-4, Verse 5-12, Chorus 13-16), 4 empty bars after: nothing past bar 16
    await projNew(); await w(100); S.bpm=100; S.bars=20; S.key='9'; S.scale='minor'; keyCache=null; scaleCache=null;
    const mel=[]; for(let bar=0;bar<16;bar++) [[0,4,69],[4,4,72],[8,4,76],[12,4,74]].forEach(([s,l,pp])=>mel.push({s:bar*16+s,l,p:bar%4===3?({69:67,72:71,76:74,74:72})[pp]:pp,v:.8,x:true}));   /* in A minor */
    S.tracks.push(mkTrack('lead',{id:S.nextId++,off:0,len:16,rep:false,lenSet:true,sound:'Saw',notes:mel})); S.secs=[{a:0,b:4,name:'Intro'},{a:4,b:12,name:'Verse'},{a:12,b:16,name:'Chorus'}]; save(); flushSave(); renderTracks();
    await finishSong(); await w(400); flushSave();
    const kit=S.tracks.filter(t=>t.inst==='kit'), at=(arr,a,b)=>arr.filter(t=>(t.off||0)>=a*16&&(t.off||0)<b*16), slot=d=>(S.kit.slots.find(x=>x.sound===d)||{id:d}).id;
    const introKit=at(kit,0,4)[0], chorusKit=at(kit,12,16)[0], verseKit=at(kit,4,12)[0];
    out.m={secsKept:S.secs.map(x=>x.name).join(','), bars:S.bars, within:ends()<=16+1e-6, introSparse:!!introKit&&!introKit.hits.some(h=>h.d===slot('snare')),
      crash:!!chorusKit&&chorusKit.hits.some(h=>h.s===0&&h.d===slot('crash')), fill:!!verseKit&&verseKit.hits.filter(h=>h.s>=7*16+8&&h.d===slot('snare')).length>=2,
      noIntroBass:!at(S.tracks.filter(t=>t.inst==='bass'),0,4).length, noLeadAdded:S.tracks.filter(t=>t.inst==='lead').length===1, inKey:inKeyAll(), partsPerSection:at(S.tracks.filter(t=>t.inst==='keys'||t.inst==='pad'),0,16).length===3};
    // 4. livelier: comping and bass at full energy (a chorus) push off the beat a good part of the time
    await loadHarmony(); await loadGenre(); S.key='0'; S.scale='major'; keyCache=null; scaleCache=null; const KM=currentKey(); let sync=0, syncB=0;
    for(let k=0;k<60;k++){ const pr=genProg(KM,'Chorus','pop'), c=genComp(pr,4,1), bl=genBass(pr,KM,4,36,'Chorus',[0,6,10,16,22,26,32,38,42,48,54,58]);
      if(c.some(n=>[3,6,10,11,14].includes(n.s%16))) sync++; if(bl.some(n=>[3,6,10,11,14].includes(n.s%16))) syncB++; }
    out.lively={comp:+(sync/60).toFixed(2), bass:+(syncB/60).toFixed(2)};
    const pops=new Set(); for(let k=0;k<40;k++) pops.add(genProg(KM,'Chorus','pop').map(c=>c.s+':'+c.r).join(',')); out.popChorus={distinct:pops.size, common:GEN.prog.pop.chorus.maj.slice(0,3).some(x=>x[0]==='0,7,9,5')};
    // the lead melody model and the PDMX harmony, as before
    await loadMusical(); S.key='9'; S.scale='minor'; keyCache=null; scaleCache=null; const K2=currentKey(), prog=[57,53,48,55], tones=r2=>new Set(chordTones(r2,'triad').map(x=>((x%12)+12)%12)), chordAt=st=>tones(prog[Math.floor((st%64)/16)]);
    let mKey=0, inRange=0, endC=0, strong=0, strongN=0; for(let k=0;k<40;k++){ const ns=genMelody(K2,4,chordAt); if(ns.every(n=>K2.set.includes(((n.p-9)%12+12)%12))) mKey++; if(ns.every(n=>n.p>=64&&n.p<=81)) inRange++; const L=ns[ns.length-1]; if(chordAt(L.s).has(((L.p%12)+12)%12)) endC++; ns.forEach(n=>{ if(n.s%8===0){ strongN++; if(chordAt(n.s).has(((n.p%12)+12)%12)) strong++; } }); }
    out.mel={inKey:mKey/40, inRange:inRange/40, endsOnChord:endC/40, strongChord:+(strong/strongN).toFixed(2)};
    return out; });
  const D=r.d; if(!(r.button&&D.bars===8&&D.secs==='Verse:0-4 Chorus:4-8'&&D.missing===''&&D.leadOnlyChorus&&D.inKey&&D.free&&D.withinSong&&D.oneUndo&&/bass1/.test(D.lanes)&&/fx1/.test(D.lanes)&&/mix1/.test(D.lanes))) errs.push('drums only: '+JSON.stringify(D));
  if(!(r.loud>-45)) errs.push('loud: '+r.loud); if(!r.undone) errs.push('undo');
  if(!(r.ex.bars===8&&r.ex.copies>=3&&r.ex.everyBar&&r.ex.mixOnMusic)) errs.push('example: '+JSON.stringify(r.ex));
  const M=r.m; if(!(M.secsKept==='Intro,Verse,Chorus'&&M.bars===20&&M.within&&M.introSparse&&M.crash&&M.fill&&M.noIntroBass&&M.noLeadAdded&&M.inKey&&M.partsPerSection)) errs.push('sections: '+JSON.stringify(M));
  if(!(r.lively.comp>=0.4&&r.lively.bass>=0.4)) errs.push('lively: '+JSON.stringify(r.lively)); if(!(r.popChorus.distinct>=6&&r.popChorus.common)) errs.push('pop chorus: '+JSON.stringify(r.popChorus));
  const m=r.mel; if(!(m.inKey===1&&m.inRange===1&&m.endsOnChord>=0.9&&m.strongChord>=0.6)) errs.push('melodies: '+JSON.stringify(m));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
