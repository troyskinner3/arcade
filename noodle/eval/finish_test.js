// Finish song (round 23): one tap fills in what a song is missing (drums, bass, chords, a melody, transitions, a mix effect), in the song's
// key, with free sounds only; chords follow the song's own melody and the bass follows the chords; one Undo takes it all out; the button shows
// only while something is missing; the finished song plays (not silent). Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={}, kinds=()=>S.tracks.map(t=>t.inst).sort().join(',');
    // 1. only drums
    await projNew(); await w(100); S.bpm=96; S.bars=4; S.tracks.push(mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:true,hits:[0,8].map(s=>({s,d:'kick',v:1})).concat([4,12].map(s=>({s,d:'snare',v:.9})))})); save(); flushSave(); renderTracks(); await w(400);
    out.noButtonEmpty=await (async()=>{ await projNew(); await w(100); renderTracks(); return !document.querySelector('#s2Finish'); })();
    await projNew(); await w(100); S.bpm=96; S.bars=4; S.tracks.push(mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:true,hits:[0,8].map(s=>({s,d:'kick',v:1})).concat([4,12].map(s=>({s,d:'snare',v:.9})))})); save(); flushSave(); renderTracks(); await w(400);
    out.button=!!document.querySelector('#s2Finish'); const before=kinds(), undoBefore=hist.undo.length;
    document.querySelector('#s2Finish').click(); await w(1500); flushSave();
    out.drumsOnly=kinds(); out.missingAfter=finishMissing().join(','); out.buttonGone=!document.querySelector('#s2Finish');
    const K=currentKey(), scale=SCALES[PARENT[K.scale]||K.scale], inKey=p=>scale.includes(((Math.round(p)-K.tonic)%12+12)%12);
    out.inKey=S.tracks.filter(t=>t.notes&&t.notes.length).every(t=>t.notes.every(n=>inKey(n.p)));
    out.freeOnly=S.tracks.every(t=>!PRO_SOUNDS.has(t.sound));
    out.named=S.tracks.filter(t=>t.inst==='bass'||t.inst==='arp').map(t=>s2Name(s2Lane(s2LaneId(t)))).join('|');
    if(playing) await togglePlay(); await renderDirty(); const mix=await renderMix(1,false); let q=0; const d=mix.getChannelData(0); for(let i=0;i<d.length;i++) q+=d[i]*d[i]; out.loud=+(10*Math.log10(q/d.length+1e-12)).toFixed(1);
    undo(); await w(300); out.undoOne=kinds()===before; out.undoSteps=hist.undo.length-undoBefore;
    // 2. only a melody: chords follow it, bass follows the chords
    await projNew(); await w(100); S.bpm=100; S.bars=4; S.key='9'; S.scale='minor'; keyCache=null;
    const mel=[[0,4,69],[4,4,72],[8,8,76],[16,4,74],[20,4,72],[24,8,69],[32,8,67],[40,8,64],[48,16,69]].map(([s,l,p])=>({s,l,p,v:.8,x:true}));
    S.tracks.push(mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,sound:'Saw',notes:mel})); save(); flushSave(); renderTracks(); await w(300);
    await finishSong(); await w(500);
    const ch=S.tracks.find(t=>t.inst==='keys'||t.inst==='pad'), bs=S.tracks.find(t=>t.inst==='bass');
    out.melodyCase=kinds(); out.chordsFollow=!!ch&&ch.notes.every(n=>n.s<64); out.bassOnRoots=!!(ch&&bs)&&bs.notes.every(n=>ch.notes.some(c=>n.s>=c.s&&n.s<c.s+c.l&&((Math.round(c.p)-Math.round(n.p))%12+12)%12===0));
    out.noArp=!S.tracks.some(t=>t.inst==='arp');   /* it has a melody already */
    // the generated lead melodies themselves (A minor over Am F C G, 4 bars), 40 of them
    await loadMusical(); S.key='9'; S.scale='minor'; keyCache=null; scaleCache=null; const K2=currentKey(), prog=[57,53,48,55], tones=r=>new Set(chordTones(r,'triad').map(x=>((x%12)+12)%12)), chordAt=st=>tones(prog[Math.floor((st%64)/16)]);
    let mKey=0, inRange=0, ans=0, endC=0, strong=0, strongN=0, steps=0, ivs=0, notes=0; const seen=new Set();
    for(let k=0;k<40;k++){ const ns=genMelody(K2,4,chordAt); notes+=ns.length; seen.add(ns.map(n=>n.p+':'+n.s).join(' '));
      if(ns.every(n=>K2.set.includes(((n.p-9)%12+12)%12))) mKey++; if(ns.every(n=>n.p>=64&&n.p<=81)) inRange++;
      const a=ns.filter(n=>n.s<32).map(n=>n.s).join(), b=ns.filter(n=>n.s>=32).map(n=>n.s-32).join(); if(a===b) ans++;
      const L=ns[ns.length-1]; if(chordAt(L.s).has(((L.p%12)+12)%12)) endC++;
      ns.forEach((n,i)=>{ if(n.s%8===0){ strongN++; if(chordAt(n.s).has(((n.p%12)+12)%12)) strong++; } if(i&&n.s<32===ns[i-1].s<32){ ivs++; if(Math.abs(n.p-ns[i-1].p)<=4) steps++; } }); }
    out.mel={inKey:mKey/40, inRange:inRange/40, answerRhythm:ans/40, endsOnChord:endC/40, strongChord:+(strong/strongN).toFixed(2), steps:+(steps/ivs).toFixed(2), notes:Math.round(notes/40), distinct:seen.size/40, example:genMelody(K2,4,chordAt).map(n=>n.s+':'+n.p+'/'+n.l).join(' ')};
    return out; });
  const want={noButtonEmpty:true, button:true, drumsOnly:'(any)', missingAfter:'', buttonGone:true, inKey:true, freeOnly:true, undoOne:true, undoSteps:0, chordsFollow:true, bassOnRoots:true, noArp:true};
  for(const [k,v] of Object.entries(want)) if(k!=='drumsOnly'&&r[k]!==v) errs.push(k+': '+JSON.stringify(r[k]));
  { const k=r.drumsOnly.split(','); if(k.length!==6||!['kit','bass','fx','mix'].every(x=>k.includes(x))||!k.some(x=>x==='keys'||x==='pad')||!k.some(x=>x==='arp'||x==='lead')) errs.push('drumsOnly: '+r.drumsOnly); }
  const m=r.mel; if(!(m.inKey===1&&m.inRange===1&&m.answerRhythm>=0.95&&m.endsOnChord>=0.9&&m.strongChord>=0.6&&m.steps>=0.6&&m.notes>=8&&m.notes<=22&&m.distinct>=0.8)) errs.push('melodies: '+JSON.stringify(m));
  if(!/^(bass,fx,keys,lead,mix,kit|bass,fx,kit,lead,mix,pad|bass,fx,keys,kit,lead,mix)$/.test(r.melodyCase)) errs.push('melodyCase: '+r.melodyCase);
  if(!(r.loud>-45)) errs.push('loud: '+r.loud);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
