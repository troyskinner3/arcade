// Drum fills: a looping 1-bar beat with fills every 4 bars gets a fill in bars 4 and 8 (bigger in 8) and a crash on bar 5; the sheet
// sets it; the rendered part differs from no-fills only around those spots. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ S.bars=8; S.bpm=120; const k=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:true,hits:[0,8].map(s=>({s,d:'kick',v:1})).concat([4,12].map(s=>({s,d:'snare',v:.9})),Array.from({length:8},(_,i)=>({s:i*2,d:'hat',v:.6})))});
    S.tracks.push(k); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(k))); const out={sheet:!!document.querySelector('#s2Fill')};
    document.querySelector('#s2Fill [data-f="4"]').click(); out.fill=k.fill; out.loops=pLoops(k);
    const ev=withFills(k,songEvents(k,k.hits)), at=b=>ev.filter(h=>h.s>=b*16&&h.s<b*16+16).map(h=>h.s%16+':'+soundOf(h.d)).join(' ');
    out.bar4=at(3); out.bar5=at(4).split(' ')[0]+' '+at(4).split(' ').filter(x=>x.endsWith('crash')).length; out.bar8=at(7); out.bar2=at(1);
    return out; });
  const want={sheet:true,fill:4,loops:8};
  for(const [k,v] of Object.entries(want)) if(r[k]!==v) errs.push(k+': '+r[k]);
  if(!/12:tomhi 13:tomhi 14:tommid 15:tomlo$/.test(r.bar4)||/12:snare|14:hat/.test(r.bar4)) errs.push('bar 4: '+r.bar4);
  if(!/8:snare 10:snare 12:tomhi/.test(r.bar8)) errs.push('bar 8: '+r.bar8);
  if(/tom|crash/.test(r.bar2)) errs.push('bar 2: '+r.bar2);
  if(!/1$/.test(r.bar5)) errs.push('crash: '+r.bar5);
  // render: with vs without fills, energy per bar
  const e=await p.evaluate(async()=>{ const k=S.tracks[0]; const rms=async()=>{ k._dirty=true; await renderDirty(); const d=k._buf.getChannelData(0), bl=d.length/8, o=[]; for(let b=0;b<8;b++){ let q=0; for(let i=Math.floor(b*bl);i<Math.floor((b+1)*bl);i++) q+=d[i]*d[i]; o.push(Math.sqrt(q/bl)); } return o; };
    const a=await rms(); k.fill=64; const n=await rms(); k.fill=4;   /* 64: rendered the same way, but no phrase is that long */ return a.map((x,i)=>+(20*Math.log10((x+1e-9)/(n[i]+1e-9))).toFixed(1)); });
  r.dbVsNoFill=e; if(Math.abs(e[1])>0.3||Math.abs(e[2])>0.3||Math.abs(e[3])<0.5||e[4]<0.05||Math.abs(e[7])<0.5) errs.push('render: '+e.join(','));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
