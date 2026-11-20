// modes and chord shapes: chords are stacked from the song's scale, so each mode gives its own chords
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const out=await p.evaluate(()=>{ const N=m=>NOTE_NAMES[((m%12)+12)%12], names=a=>a.map(N).join(' '), setKey=(t,sc)=>{ S.key=String(t); S.scale=sc; keyCache=null; };
    const r={}; const C=(t,sc,root,type)=>{ setKey(t,sc); const ps=chordTones(root,type); return names(ps)+' = '+chordName(ps); };
    r.gMixo7=C(7,'mixolydian',67,'seventh'); r.gMajor7=C(7,'major',67,'seventh'); r.cLydianII=C(0,'lydian',62,'triad'); r.ePhrygianII=C(4,'phrygian',65,'triad'); r.aHarmV7=C(9,'harm-minor',64,'seventh'); r.ePhrygDomI=C(4,'phryg-dom',64,'triad');
    r.sus4=C(0,'major',60,'sus4'); r.sus2=C(0,'major',60,'sus2'); r.sixth=C(0,'major',60,'sixth'); r.add9=C(0,'major',60,'add9'); r.eleventh=C(0,'major',62,'eleventh'); r.minor6=C(9,'dorian',69,'sixth');
    setKey(7,'mixolydian'); r.snapFsharp=N(snap(66.1)); r.label=projKeyLabel()||(NOTE_NAMES[currentKey().tonic]+' '+SCALE_LABEL[currentKey().scale]); r.keysig=keySigBytes().slice(3).join(',');
    setKey(2,'dorian'); r.keysigDdorian=keySigBytes().slice(3).join(','); r.options=(SCALE_OPTS.match(/<option/g)||[]).length; r.chordTypes=Object.values(CHORD_TYPES).join(', '); return r; });
  await p.evaluate(()=>{ S.key='7'; S.scale='mixolydian'; keyCache=null; const t=mkTrack('keys',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,chordType:'seventh',notes:[{s:0,l:8,p:67,v:.8,x:true},{s:8,l:8,p:65,v:.8,x:true}]}); S.tracks.push(t); S.bars=1; save(); syncAllInputs(); renderTracks(); });
  await p.tap('#s2Key'); await p.waitForTimeout(200); await p.screenshot({path:'results/modes.png'}); out.sheetScale=await p.$eval('#nxSheet [data-pick="scale"] b',e=>e.textContent); out.chip=await p.$eval('#s2Key span',e=>e.textContent);
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
