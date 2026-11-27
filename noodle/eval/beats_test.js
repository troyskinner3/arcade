// Beats: a new song offers "Start from a beat"; tapping a beat plays it in the song as a try (not saved), with its tempo and key; "Use this beat"
// keeps it (drums, bass, chords, effects; the mix renders with sound). A Pro beat is tried by free users and goes back when the sheet closes.
// In a song that has a key, an added beat follows that key. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  const saved=()=>p.evaluate(()=>{ flushSave(); const o=JSON.parse(localStorage.getItem(STORE_KEY)); return {n:o.tracks.length, bpm:o.bpm}; });
  await p.evaluate(()=>{ PRO.owned=false; S.tracks=[]; save(); renderTracks(); }); await p.waitForTimeout(200);
  out.offer=await p.isVisible('#s2Beat'); await p.tap('#s2Beat'); await p.waitForTimeout(200); out.tiles=await p.evaluate(()=>document.querySelectorAll('[data-beat]').length); out.proTiles=await p.evaluate(()=>document.querySelectorAll('[data-beat] .pro-b').length);
  await p.tap('[data-beat="trap1"]'); await p.waitForTimeout(400);
  out.try=await p.evaluate(()=>({tracks:S.tracks.map(t=>t.inst).join(','), bpm:S.bpm, key:currentKey().tonic, playing:!!playing})); out.trySaved=await saved();
  await p.tap('#btUse'); await p.waitForTimeout(300); out.used=await saved();
  out.mix=await p.evaluate(async()=>{ if(playing) togglePlay(); await renderDirty(); const m=await renderMix(1,true), d=m.getChannelData(0); let q=0; for(let i=0;i<d.length;i++) q+=d[i]*d[i]; return +(10*Math.log10(q/d.length)).toFixed(1); });
  // a Pro beat as a free user: tried, then back
  await p.evaluate(()=>{ S.tracks=[]; save(); renderTracks(); beatSheet(); }); await p.tap('[data-beat="lofi2"]'); await p.waitForTimeout(300);
  out.proTry=await p.evaluate(()=>S.tracks.find(t=>t.inst==='kit').sound); await p.tap('#btUse'); await p.waitForTimeout(150); out.proAsked=await p.evaluate(()=>/Noodle Pro/.test(document.querySelector('#nxSheet h2').textContent));
  await p.evaluate(()=>nxClose()); await p.waitForTimeout(200); out.proAfter=await p.evaluate(()=>S.tracks.length);
  // a song in C major with a melody: an added beat follows C
  await p.evaluate(()=>{ PRO.owned=true; S.key='0'; S.scale='major'; S.bpm=100; keyCache=null; S.tracks=[mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,notes:[{s:0,l:8,p:60,v:.8},{s:8,l:8,p:64,v:.8}]})]; save(); renderTracks(); s2AddSheet(false); });
  await p.tap('#s2AddBeat'); await p.tap('[data-beat="pop2"]'); await p.waitForTimeout(300); await p.tap('#btUse'); await p.waitForTimeout(200);
  out.follow=await p.evaluate(()=>({bpm:S.bpm, bassPcs:[...new Set(S.tracks.find(t=>t.name==='Bass').notes.map(n=>n.p%12))].sort((a,b)=>a-b).join(','), tracks:S.tracks.length}));
  const want={offer:true,tiles:14,proTiles:7,try:{tracks:'kit,bass,pad,arp',bpm:140,key:9,playing:true},trySaved:{n:0,bpm:94},used:{n:4,bpm:140},proTry:'Lo-fi',proAsked:true,proAfter:0,follow:{bpm:100,bassPcs:'0,5,7,9',tracks:5}};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k]));
  if(!(out.mix>-40)) errs.push('mix '+out.mix);
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
