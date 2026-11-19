// Chords from your melody: the track sheet's "Add chords" makes a chord track under the melody that fits it (Twinkle in C:
// I IV I V I by bar), every half bar too, Pulse and Arp are Pro, and it works for vocals' notes. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ S.key='0'; S.scale='major'; S.bars=4; keyCache=null; const tw=[[60,4],[60,4],[67,4],[67,4],[69,4],[69,4],[67,8],[65,4],[65,4],[64,4],[64,4],[62,4],[62,4],[60,8]]; let s=0;
    const a=mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,notes:tw.map(([p,l])=>{ const n={s,l,p,v:.8}; s+=l; return n; })}); S.tracks.push(a); save(); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(a))); });
  await p.waitForTimeout(300); out.button=await p.isVisible('[data-a="chords"]'); await p.tap('[data-a="chords"]'); await p.waitForTimeout(200);
  out.sheet=await p.textContent('#nxSheet h2');
  await p.tap('#chSt [data-k="pulse"]'); await p.waitForTimeout(200); out.proAsked=await p.evaluate(()=>/Pro/.test(document.body.innerText)); await p.evaluate(()=>{ nxClose(); s2TrackSheet(s2Lane(s2LaneId(S.tracks[0]))); }); await p.waitForTimeout(150); await p.tap('[data-a="chords"]'); await p.waitForTimeout(150);
  await p.tap('#chGo'); await p.waitForTimeout(400);
  const read=()=>p.evaluate(()=>{ const t=S.tracks.find(t=>t.name==='Chords'); return t?{inst:t.inst, sound:t.sound, lane:s2LaneId(t)!==s2LaneId(S.tracks[0]), at:S.tracks.indexOf(t), chords:t.notes.map(n=>[n.s,n.l,chordName(notePitches(t,n))])}:null; });
  out.bar=await read(); out.toast=await p.textContent('#toast');
  await p.evaluate(()=>{ S.tracks=S.tracks.filter(t=>t.name!=='Chords'); addChords(s2Lane(s2LaneId(S.tracks[0])),'piano',8); }); out.half=(await read()).chords.map(c=>c[2]).join(' ');
  // vocals: notes measured from the singing
  out.vox=await p.evaluate(()=>{ S.tracks=[]; const v=mkTrack('vox',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false}); v.vn=[[0,0.6,57],[0.6,0.6,60],[1.2,1.2,64],[2.4,1.2,62],[3.6,1.2,59]].map(([t,l,p])=>({t:t*stepDur()*16/2.4,l:l*stepDur()*16/2.4,p})); S.tracks.push(v); keyCache=null; S.key='9'; S.scale='minor'; keyCache=null;
    const r=addChords(s2Lane(s2LaneId(v)),'pad',16); return r&&r.names; });
  await p.screenshot({path:__dirname+'/results/chords.png'});
  const want={button:true,sheet:'Chords from your melody',proAsked:true};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k]));
  if(!out.bar||out.bar.inst!=='pad'||!out.bar.lane||out.bar.at!==1) errs.push('chord track: '+JSON.stringify(out.bar));
  if(out.bar&&out.bar.chords.map(c=>c[2]).join(' ')!=='C G F C') errs.push('by bar: '+JSON.stringify(out.bar.chords));
  if(!/Chords added: C · G · F · C/.test(out.toast)) errs.push('toast: '+out.toast);
  if(!out.vox||!out.vox.length) errs.push('vocals: '+JSON.stringify(out.vox));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
