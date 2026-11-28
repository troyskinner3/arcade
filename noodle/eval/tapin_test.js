// Recording with pads (round 26-29): Record on an instrument track asks once how to record (Mic or the pads that fit it), remembers it,
// and Record with in the track's sheet changes it; vocals never ask. The pad screen records into that track from the playhead's bar until
// Stop (up to 16 bars): chords on the nearest 8th held until the next, drum hits on 16ths with Add more, note pads and the Play pad in the
// track's range (a bass is low), a tapped rhythm kept exactly with notes in the key (Other notes keeps it). Keep adds one part to the track
// (one Undo); Back or Stop in the count-in adds nothing and puts the song's length and key back. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={};
    const until=async f=>{ for(let i=0;i<1500&&!f();i++) await w(10); };
    const tapAt=async(sel,step)=>{ const T=tapIn; await until(()=>T.start&&ctx.currentTime>=T.start+step*stepDur()+T.lat); document.querySelector(sel).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); };
    const stopAt=async step=>{ const T=tapIn; await until(()=>ctx.currentTime>=T.start+step*stepDur()+T.lat); document.querySelector('#tiBar [data-a="stop"]').click(); };
    const add=(inst,o={})=>{ const t=mkTrack(inst,{id:S.nextId++,...o}); S.tracks.push(t); renderTracks(); return t; };
    await projNew(); await w(100); S.bpm=150; S.bars=1; S.key='0'; S.scale='major'; keyCache=null; scaleCache=null;
    // the question, once
    const keys=add('keys'); s2.armId=keys.id; s2Record(); await w(200); out.ask=[...document.querySelectorAll('#nxSheet [data-rin]')].map(x=>x.textContent).join('|');
    const vox=add('vox'); out.voxWays=recWays('vox').length; out.kitWays=recWays('kit').join(','); out.bassWays=recWays('bass').join(',');
    document.querySelector('#nxSheet [data-rin="chords"]').click(); for(let i=0;i<40&&!($('tapIn')&&!$('tapIn').hidden);i++) await w(100); await w(200); out.remembered=keys.rin; out.padsOpen=!$('tapIn').hidden;
    out.padsC=[...document.querySelectorAll('#tapIn .ti-pad')].map(x=>x.textContent).join(' '); out.title=document.querySelector('#tapIn .s2-edt b').textContent;
    // a chord take, stopped in bar 3
    const u0=hist.undo.length; tapRec(); await until(()=>tapIn.start);
    await tapAt('#tapIn .ti-pad[data-i="5"]',0); await tapAt('#tapIn .ti-pad[data-i="3"]',8.4); await tapAt('#tapIn .ti-pad[data-i="0"]',16); await tapAt('#tapIn .ti-pad[data-i="4"]',36); await stopAt(40);
    await until(()=>tapIn.state==='review'); const ct=tapIn.tr; out.chordNotes=ct.notes.map(n=>n.s+':'+n.l+':'+NOTE_NAMES[n.p%12]).join(' '); out.chordPart=ct.len+':'+(s2LaneId(ct)===keys.id)+':'+ct.sound;
    out.reviewBtns=[...document.querySelectorAll('#tiBar button')].map(x=>x.textContent).join('|'); out.notSavedYet=hist.undo.length===u0;
    tapKeep(); await w(500); out.kept=S.tracks.filter(t=>s2LaneId(t)===keys.id&&hasContent(t)).length===1&&S.bars===3&&hist.undo.length===u0+1&&$('tapIn').hidden;
    undo(); await w(300); out.undone=!S.tracks.some(t=>t.notes&&t.notes.length)&&S.bars===1;
    // next Record goes straight to the pads; Stop in the count-in adds nothing
    const k2=S.tracks.find(t=>t.inst==='keys'); s2.armId=k2.id; s2Record(); await w(300); out.straight=!!tapIn&&$('nxScrim').hidden;
    tapRec(); await w(100); document.querySelector('#tiBar [data-a="stop"]').click(); await w(200); out.stopped=tapIn.state==='ready'&&!tapIn.tr&&!playing&&S.bars===1; tapClose();
    // Record with in the track sheet
    s2TrackSheet(s2Lane(k2.id)); await w(200); const rw=document.querySelector('#nxSheet [data-pick="rin"]'); out.recWith=rw?rw.querySelector('b').textContent:'none';
    rw.click(); await w(200); document.querySelector('#nxSheet [data-rin="mic"]').click(); await w(100); out.switched=S.tracks.find(t=>t.inst==='keys').rin; nxClose();
    out.voxRow=(s2TrackSheet(s2Lane(vox.id)),await w(150),!document.querySelector('#nxSheet [data-pick="rin"]')); nxClose();
    // drum pads on a kit track: hits on 16ths, Add more layers
    const kit=add('kit',{rin:'drums'}); s2.armId=kit.id; s2Record(); await w(300); out.drumPads=[...document.querySelectorAll('#tapIn .ti-pad')].map(x=>x.textContent).join(' ');
    const ki=id=>S.kit.slots.findIndex(x=>x.id===id); tapRec(); await until(()=>tapIn.start); for(const [d,st] of [['kick',0],['snare',4],['kick',8.3],['snare',12]]) await tapAt(`#tapIn .ti-pad[data-i="${ki(d)}"]`,st); await stopAt(16.5);
    await until(()=>tapIn.state==='review'); out.drum1=tapIn.tr.len+':'+tapIn.tr.hits.map(h=>h.s+h.d[0]).join(' '); out.drumBtns=[...document.querySelectorAll('#tiBar button')].map(x=>x.textContent).join('|');
    tapRec(true); await until(()=>tapIn.start); for(const st of [2,6]) await tapAt(`#tapIn .ti-pad[data-i="${ki('hat')}"]`,st); await until(()=>tapIn.state==='review'); out.drum2=tapIn.tr.hits.map(h=>h.s+h.d[0]).join(' ');
    tapKeep(); await w(400); out.drumKept=S.tracks.some(t=>s2LaneId(t)===kit.id&&t.hits&&t.hits.length===6);
    // note pads on a bass: low
    const bass=add('bass',{rin:'notes'}); s2.armId=bass.id; s2Record(); await w(300); out.bassPads=tapIn.pads.map(c=>c.p+12*tapIn.oct); tapClose();
    // tap a rhythm on a lead over the chords in the song
    S.tracks.push(mkTrack('keys',{id:S.nextId++,off:0,len:4,lenSet:true,rep:false,chordType:'triad',notes:[[0,57],[16,53],[32,48],[48,55]].map(([s,p])=>({s,l:16,p,v:.7}))})); S.bars=4; save(); flushSave(); renderTracks();
    const lead=add('lead',{rin:'rhythm'}); s2.armId=lead.id; s2PlayheadTo(0); s2Record(); await w(400); out.onePad=document.querySelectorAll('#tapIn .ti-pad').length===1;
    const steps=[0,4,6,8,12,16,20,24,28]; tapRec(); await until(()=>tapIn.start); for(const s of steps) await tapAt('#tiOne',s); await stopAt(31);
    await until(()=>tapIn.state==='review'); const K=currentKey(), sc=SCALES[PARENT[K.scale]||K.scale], ink=q=>sc.includes(((q-K.tonic)%12+12)%12);
    const m1=tapIn.tr.notes; out.rhythm=m1.map(n=>n.s).join()===steps.join()&&tapIn.tr.len===2; out.melInKey=m1.every(n=>ink(n.p)); out.melRange=m1.every(n=>n.p>=60&&n.p<=84);
    const p1=m1.map(n=>n.p).join(); let diff=false; for(let k=0;k<5&&!diff;k++){ await tapOther(); diff=tapIn.tr.notes.map(n=>n.p).join()!==p1; } out.otherDiffers=diff; out.otherRhythm=tapIn.tr.notes.map(n=>n.s).join()===steps.join();
    out.notInSave=!JSON.parse(songJson()).tracks.some(t=>t.id===tapIn.tr.id); tapClose(); out.dropped=!S.tracks.some(t=>s2LaneId(t)===lead.id&&hasContent(t))&&S.bars===4;
    // Play pad on the lead: a slide with brightness
    lead.rin='xy'; s2.armId=lead.id; s2Record(); await w(400); const box=$('tiXY'), R=box.getBoundingClientRect(), n=tapIn.xy.ps.length, X=i=>R.left+(i+0.5)*R.width/n, pe=(type,i,y)=>box.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:X(i),clientY:R.top+y*R.height,pointerId:1}));
    tapRec(); await until(()=>tapIn.start); const T=tapIn, waitSt=async st=>until(()=>ctx.currentTime>=T.start+st*stepDur()+T.lat);
    await waitSt(0); pe('pointerdown',0,0.1); await waitSt(4); pe('pointermove',2,0.9); await waitSt(8); pe('pointerup',2,0.5); await stopAt(12);
    await until(()=>tapIn.state==='review'); const ps=tapIn.xy.ps; out.xy=tapIn.tr.len+':'+tapIn.tr.notes.map(n=>n.s+':'+n.l+':'+ps.indexOf(n.p)+':'+(n.tn>0.6?'hi':n.tn<0.4?'lo':'mid')).join(' '); tapClose();
    // the model with tapped onsets: 40 rhythms, notes on them, in the key and range
    await loadMusical(); const KA=currentKey(), cat=st=>new Set(chordTones([57,53,48,55][Math.floor(st/16)%4],'triad').map(x=>x%12)); let onOk=0, keyOk=0, rangeOk=0, strong=0, strongN=0;
    for(let k=0;k<40;k++){ const ons=[...new Set(Array.from({length:6+k%8},()=>Math.floor(Math.random()*64)))].sort((a,b)=>a-b); const ns=genMelody(KA,4,cat,{onsets:ons});
      if(ns.map(n=>n.s).join()===ons.join()) onOk++; if(ns.every(n=>KA.set.includes(((n.p-KA.tonic)%12+12)%12))) keyOk++; if(ns.every(n=>n.p>=64&&n.p<=81&&n.l>=1&&n.s+n.l<=64)) rangeOk++;
      ns.forEach(n=>{ if(n.s%8===0){ strongN++; if(cat(n.s).has(n.p%12)) strong++; } }); }
    out.model={onsets:onOk/40, inKey:keyOk/40, range:rangeOk/40, strongChord:+(strong/Math.max(1,strongN)).toFixed(2)};
    out.noTapItIn=(await s2AddSheet(false), await w(150), !/Tap it in|Drum pads/.test($('nxSheet').textContent)); nxClose();
    return out; });
  const want={ask:'Mic|Chord pads|Note pads', voxWays:1, kitWays:'mic,drums', bassWays:'mic,notes,rhythm,xy', remembered:'chords', padsOpen:true, padsC:'C Dm Em F G Am',
    chordNotes:'0:8:A 8:8:F 16:20:C 36:12:G', reviewBtns:'Keep|Retake', notSavedYet:true, kept:true, undone:true, straight:true, stopped:true, recWith:'Chord pads', switched:'mic', voxRow:true,
    drumPads:'Kick Snare Clap Hat Crash', drum1:'1:0k 4s 8k 12s', drumBtns:'Keep|Retake|Add more', drum2:'0k 2h 4s 6h 8k 12s', drumKept:true, onePad:true, rhythm:true, melInKey:true, melRange:true,
    otherDiffers:true, otherRhythm:true, notInSave:true, dropped:true, xy:'1:0:4:0:hi 4:4:2:lo', noTapItIn:true};
  for(const [k,v] of Object.entries(want)) if(r[k]!==v) errs.push(k+': '+JSON.stringify(r[k]));
  if(!/^[^:]+:true:/.test(r.chordPart)||!r.chordPart.startsWith('3:')) errs.push('chordPart: '+r.chordPart);
  if(!(r.bassPads&&r.bassPads.length===8&&r.bassPads.every(q=>q>=28&&q<=55))) errs.push('bassPads: '+JSON.stringify(r.bassPads));
  if(!(r.model.onsets===1&&r.model.inKey===1&&r.model.range===1&&r.model.strongChord>=0.6)) errs.push('model: '+JSON.stringify(r.model));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
