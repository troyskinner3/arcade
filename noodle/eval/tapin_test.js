// Tap it in (round 26): Add track has Chord pads and Tap a rhythm (not on the "What are you recording?" sheet). Chord pads show the key's six
// chords; a take (count-in, then 4 bars) turns taps into chords on the nearest 8th, each held until the next; Tap a rhythm turns taps into a
// melody on exactly those steps, in the key; Other notes keeps the rhythm; Keep adds the part as one Undo; leaving without Keep, or Stop,
// adds nothing and puts the song's length and key back. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={};
    const until=async f=>{ for(let i=0;i<1500&&!f();i++) await w(10); };
    const tapAt=async(sel,step)=>{ const T=tapIn; await until(()=>T.start&&ctx.currentTime>=T.start+step*stepDur()+T.lat); document.querySelector(sel).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); };
    // the sheet
    await projNew(); await w(100); S.bpm=150; S.bars=1; renderTracks(); const key0=S.key+'/'+S.scale;
    await s2AddSheet(false); await w(200); out.sheet=[...document.querySelectorAll('#nxSheet [data-tap]')].map(x=>x.textContent).join('|');
    nxClose(); await s2AddSheet(true); await w(200); out.notOnRecord=!document.querySelector('#nxSheet [data-tap]'); nxClose();
    // chord pads in C major and A minor
    S.key='0'; S.scale='major'; keyCache=null; scaleCache=null; await s2AddSheet(false); await w(200); document.querySelector('#nxSheet [data-tap="chords"]').click(); await w(300);
    out.padsC=[...document.querySelectorAll('#tapIn .ti-pad')].map(x=>x.textContent).join(' '); out.title=document.querySelector('#tapIn .s2-edt').textContent;
    out.barsDuring=S.bars; tapClose(); out.restored=S.bars===1&&S.key==='0'&&!S.tracks.length&&$('tapIn').hidden;
    S.key=key0.split('/')[0]; S.scale=key0.split('/')[1]; keyCache=null; scaleCache=null; await tapOpen('chords'); out.autoFixed=S.key!=='auto'&&S.scale!=='auto'; tapClose(); out.autoBack=S.key+'/'+S.scale===key0;
    S.key='9'; S.scale='minor'; keyCache=null; scaleCache=null; await tapOpen('chords'); out.padsAm=[...document.querySelectorAll('#tapIn .ti-pad')].map(x=>x.textContent).join(' ');
    // a take: Am on 1, F on beat 3 (a little late), C on bar 2, G on bar 3 beat 2
    const undo0=hist.undo.length; tapRec(); await until(()=>tapIn.start);
    await tapAt('#tapIn .ti-pad[data-i="0"]',0); await tapAt('#tapIn .ti-pad[data-i="4"]',8.4); await tapAt('#tapIn .ti-pad[data-i="1"]',16); await tapAt('#tapIn .ti-pad[data-i="5"]',36);
    await until(()=>tapIn.state==='review'); out.chordNotes=tapIn.tr.notes.map(n=>n.s+':'+n.l+':'+NOTE_NAMES[n.p%12]).join(' '); out.chordKind=tapIn.tr.inst+'/'+tapIn.tr.chordType;
    out.reviewBtns=[...document.querySelectorAll('#tiBar button')].map(x=>x.textContent).join('|'); out.playVisible=!$('tiPlay').hidden;
    out.notSavedYet=hist.undo.length===undo0; tapKeep(); await w(500);
    out.kept=S.tracks.length===1&&S.tracks[0].inst==='keys'&&S.bars===4&&hist.undo.length===undo0+1&&$('tapIn').hidden;
    undo(); await w(200); out.undone=!S.tracks.length;
    // Stop during the take: nothing added
    await tapOpen('chords'); tapRec(); await until(()=>tapIn.start); await tapAt('#tapIn .ti-pad[data-i="0"]',0); tapCancelTake(); await w(100);
    out.stopped=tapIn.state==='ready'&&!tapIn.tr&&!playing&&[...document.querySelectorAll('#tiBar button')].map(x=>x.textContent).join()==='Record'; tapClose();
    // Tap a rhythm over chords already in the song
    S.tracks.push(mkTrack('keys',{id:S.nextId++,off:0,len:4,lenSet:true,rep:false,chordType:'triad',notes:[[0,57],[16,53],[32,48],[48,55]].map(([s,p])=>({s,l:16,p,v:.7}))})); save(); flushSave(); renderTracks();
    await tapOpen('rhythm'); out.onePad=document.querySelectorAll('#tapIn .ti-pad').length===1;
    const steps=[0,4,6,8,12,16,20,24,28,32,36,38,40,44,48,56]; tapRec(); await until(()=>tapIn.start); for(const s of steps) await tapAt('#tiOne',s);
    await until(()=>tapIn.state==='review'); const K=currentKey(), sc=SCALES[PARENT[K.scale]||K.scale], ink=q=>sc.includes(((q-K.tonic)%12+12)%12);
    const m1=tapIn.tr.notes; out.rhythm=m1.map(n=>n.s).join()===steps.join(); out.melInKey=m1.every(n=>ink(n.p)); out.melInst=tapIn.tr.inst; out.melKey=K.tonic+'/'+K.scale; out.melEx=m1.map(n=>n.s+':'+NOTE_NAMES[n.p%12]).join(' ');
    out.otherBtn=[...document.querySelectorAll('#tiBar button')].some(x=>x.textContent==='Other notes');
    const p1=m1.map(n=>n.p).join(); let diff=false; for(let k=0;k<5&&!diff;k++){ await tapOther(); diff=tapIn.tr.notes.map(n=>n.p).join()!==p1; } out.otherDiffers=diff; out.otherRhythm=tapIn.tr.notes.map(n=>n.s).join()===steps.join();
    out.notInSave=!JSON.parse(songJson()).tracks.some(t=>t.inst==="lead"); tapClose(); out.rhythmDropped=S.tracks.length===1;
    // Drum pads: one per kit sound; taps on the nearest 16th; Add more layers a second pass over the first
    await tapOpen('drums'); out.drumPads=[...document.querySelectorAll('#tapIn .ti-pad')].map(x=>x.textContent).join(' '); out.drumSub=document.querySelector('#tapIn .s2-edt small').textContent;
    const kick=S.kit.slots.findIndex(x=>x.id==='kick'), snare=S.kit.slots.findIndex(x=>x.id==='snare'), hat=S.kit.slots.findIndex(x=>x.id==='hat');
    tapRec(); await until(()=>tapIn.start); for(const [i,st] of [[kick,0],[snare,4],[kick,8.3],[snare,12]]) await tapAt(`#tapIn .ti-pad[data-i="${i}"]`,st);
    await until(()=>tapIn.state==='review'); out.drumBtns=[...document.querySelectorAll('#tiBar button')].map(x=>x.textContent).join('|'); out.drum1=tapIn.tr.inst+':'+tapIn.tr.hits.map(h=>h.s+h.d[0]).join(' ');
    tapRec(true); await until(()=>tapIn.start); for(const st of [2,6]) await tapAt(`#tapIn .ti-pad[data-i="${hat}"]`,st);
    await until(()=>tapIn.state==='review'); out.drum2=tapIn.tr.hits.map(h=>h.s+h.d[0]).join(' ');
    tapRec(true); await until(()=>tapIn.start); tapCancelTake(); out.moreStop=tapIn.state==='review'&&!!tapIn.tr&&tapIn.tr.hits.length===6;
    const n0=S.tracks.filter(t=>!t._tapTemp).length; tapKeep(); await w(500); out.drumKept=S.tracks.length===n0+1&&S.tracks.some(t=>t.inst==='kit'&&t.hits.length===6); undo(); await w(300);
    // Note pads: the key's notes over an octave, low row at the bottom; taps last until the next (at most 2 beats); Add more adds a line
    S.key='0'; S.scale='major'; keyCache=null; scaleCache=null; await tapOpen('notes'); const np=[...document.querySelectorAll('#tapIn .ti-pad')];
    out.notePads=np.map(x=>x.textContent).join(' '); const rc=x=>x.getBoundingClientRect(); out.lowRowBelow=rc(np[0]).top>rc(np[4]).top&&rc(np[0]).left<rc(np[1]).left;
    tapRec(); await until(()=>tapIn.start); for(const [i,st] of [[0,0],[2,4],[4,8],[7,16]]) await tapAt(`#tapIn .ti-pad[data-i="${i}"]`,st);
    await until(()=>tapIn.state==='review'); out.notes1=tapIn.tr.inst+':'+tapIn.tr.notes.map(n=>n.s+':'+n.l+':'+n.p).join(' '); out.noteBtns=[...document.querySelectorAll('#tiBar button')].map(x=>x.textContent).join('|');
    tapRec(true); await until(()=>tapIn.start); await tapAt('#tapIn .ti-pad[data-i="4"]',0); await until(()=>tapIn.state==='review'); out.notes2=tapIn.tr.notes.length; tapClose();
    // Play pad: across picks notes in the key, up is brighter; a slide is recorded with where each note starts and how bright it is
    await tapOpen('xy'); const box=$('tiXY'), R=box.getBoundingClientRect(), n=tapIn.xy.ps.length, X=i=>R.left+(i+0.5)*R.width/n, pe=(type,i,y)=>box.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:X(i),clientY:R.top+y*R.height,pointerId:1}));
    out.xyRange=tapIn.xy.ps.length+':'+tapIn.xy.ps.every(q=>[0,2,4,5,7,9,11].includes(q%12));
    tapRec(); await until(()=>tapIn.start); const T=tapIn, waitSt=async st=>until(()=>ctx.currentTime>=T.start+st*stepDur()+T.lat);
    await waitSt(0); pe('pointerdown',0,0.1); await waitSt(4); pe('pointermove',2,0.9); await waitSt(6); pe('pointermove',2,0.5); await waitSt(8); pe('pointerup',2,0.5);
    await waitSt(16); pe('pointerdown',4,0.5); await waitSt(16.2); pe('pointerup',4,0.5);
    await until(()=>tapIn.state==='review'); const ps=tapIn.xy.ps; out.xy=tapIn.tr.notes.map(n=>n.s+':'+n.l+':'+ps.indexOf(n.p)+':'+(n.tn>0.6?'hi':n.tn<0.4?'lo':'mid')).join(' ');
    out.xyHeld=!tapIn.xy.rel; tapClose(); out.xyClosed=!S.tracks.some(t=>t._tapTemp);
    // the model with tapped onsets: 40 rhythms, notes on them, in the key and range
    await loadMusical(); const KA=currentKey(), cat=st=>new Set(chordTones([57,53,48,55][Math.floor(st/16)%4],'triad').map(x=>x%12)); let onOk=0, keyOk=0, rangeOk=0, strong=0, strongN=0;
    for(let k=0;k<40;k++){ const ons=[...new Set(Array.from({length:6+k%8},()=>Math.floor(Math.random()*64)))].sort((a,b)=>a-b); const ns=genMelody(KA,4,cat,{onsets:ons});
      if(ns.map(n=>n.s).join()===ons.join()) onOk++; if(ns.every(n=>KA.set.includes(((n.p-KA.tonic)%12+12)%12))) keyOk++; if(ns.every(n=>n.p>=64&&n.p<=81&&n.l>=1&&n.s+n.l<=64)) rangeOk++;
      ns.forEach(n=>{ if(n.s%8===0){ strongN++; if(cat(n.s).has(n.p%12)) strong++; } }); }
    out.model={onsets:onOk/40, inKey:keyOk/40, range:rangeOk/40, strongChord:+(strong/Math.max(1,strongN)).toFixed(2)};
    return out; });
  if(r.sheet!=='Drum pads|Chord pads|Note pads|Tap a rhythm|Play pad') errs.push('sheet: '+r.sheet);
  if(r.padsC!=='C Dm Em F G Am') errs.push('padsC: '+r.padsC); if(r.padsAm!=='Am C Dm Em F G') errs.push('padsAm: '+r.padsAm);
  if(r.chordNotes!=='0:8:A 8:8:F 16:20:C 36:28:G') errs.push('chordNotes: '+r.chordNotes);
  if(r.chordKind!=='keys/triad') errs.push('chordKind: '+r.chordKind); if(r.reviewBtns!=='Keep|Tap again') errs.push('reviewBtns: '+r.reviewBtns);
  if(r.barsDuring!==4) errs.push('barsDuring: '+r.barsDuring); if(r.melInst!=='lead') errs.push('melInst: '+r.melInst);
  if(r.drumPads!=='Kick Snare Clap Hat Crash') errs.push('drumPads: '+r.drumPads); if(!/^\d+ BPM · bars/.test(r.drumSub)) errs.push('drumSub: '+r.drumSub);
  if(r.drumBtns!=='Keep|Tap again|Add more') errs.push('drumBtns: '+r.drumBtns); if(r.drum1!=='kit:0k 4s 8k 12s') errs.push('drum1: '+r.drum1); if(r.drum2!=='0k 2h 4s 6h 8k 12s') errs.push('drum2: '+r.drum2);
  if(r.notePads!=='C D E F G A B C') errs.push('notePads: '+r.notePads); if(r.notes1!=='lead:0:4:60 4:4:64 8:8:67 16:8:72') errs.push('notes1: '+r.notes1);
  if(r.noteBtns!=='Keep|Tap again|Add more') errs.push('noteBtns: '+r.noteBtns); if(r.notes2!==5) errs.push('notes2: '+r.notes2);
  if(r.xyRange!=='15:true') errs.push('xyRange: '+r.xyRange); if(r.xy!=='0:4:0:hi 4:4:2:lo 16:1:4:mid') errs.push('xy: '+r.xy);
  for(const k of ['lowRowBelow','xyHeld','xyClosed','moreStop','drumKept','notOnRecord','restored','autoFixed','autoBack','playVisible','notSavedYet','kept','undone','stopped','onePad','rhythm','melInKey','otherBtn','otherDiffers','otherRhythm','rhythmDropped','notInSave']) if(!r[k]) errs.push(k);
  if(!(r.model.onsets===1&&r.model.inKey===1&&r.model.range===1&&r.model.strongChord>=0.6)) errs.push('model: '+JSON.stringify(r.model));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
