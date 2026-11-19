// Presets: save a vocal preset (style, knobs, backing vocals) and use it on another vocal track in another song; save track effects; build a kit
// from several kits (a drum taken from Brushes plays the Brushes sample) and save it; presets travel in backups; Edit renames and deletes;
// a Pro preset is tried by free users. Track menus show the basics, with More settings for the rest. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ localStorage.removeItem('noodle.presets'); localStorage.removeItem('noodle.more'); s2.more=false; PRO.owned=true; S.bars=2;
    const v=mkTrack('vox',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,sound:'Hard tune'}); v.fx=Object.assign({},VOX_PRESETS['Hard tune'],{air:80,harm:30}); S.tracks.push(v); save(); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(v))); });
  await p.waitForTimeout(200); out.basic=await p.evaluate(()=>({tune:!!document.querySelector('#s2Fx_tune'), harm:!!document.querySelector('#s2Fx_harm'), vol:!!document.querySelector('#s2Vol'), airHidden:!!document.querySelector('.nx-adv[hidden] #s2Fx_air'), revHidden:!!document.querySelector('.nx-adv[hidden] #s2Rev')}));
  await p.tap('[data-more]'); out.moreOpen=await p.evaluate(()=>!document.querySelector('.nx-adv').hidden&&localStorage.getItem('noodle.more')==='1'); await p.tap('[data-more]');
  await p.tap('[data-save="vox"]'); await p.fill('#prName','Radio voice'); await p.tap('#prOk'); await p.waitForTimeout(200);
  out.saved=await p.evaluate(()=>{ const x=presetsAll().vox[0]; return x&&{name:x.name,sound:x.sound,air:x.fx.air,harm:x.fx.harm}; }); out.chip=await p.evaluate(()=>!!document.querySelector('#s2Snd [data-pre]'));
  // another vocal track: apply it
  await p.evaluate(()=>{ nxClose(); const w=mkTrack('vox',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,sound:'Pop'}); S.tracks.push(w); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(w))); });
  await p.tap('#s2Snd [data-pre]'); await p.waitForTimeout(200); out.applied=await p.evaluate(()=>{ const w=S.tracks[1]; return {sound:w.sound, air:w.fx.air, harm:w.fx.harm, pressed:document.querySelector('#s2Snd [data-pre]').getAttribute('aria-pressed')}; });
  // effects preset
  await p.evaluate(()=>{ nxClose(); const t=mkTrack('lead',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,notes:[{s:0,l:4,p:60,v:.8}]}); t.tfx={echo:50,chorus:20}; S.tracks.push(t); renderTracks(); s2.more=true; s2TrackSheet(s2Lane(s2LaneId(t))); });
  await p.tap('[data-save="fx"]'); await p.fill('#prName','Wide'); await p.tap('#prOk'); await p.waitForTimeout(150); out.fxSaved=await p.evaluate(()=>JSON.stringify(presetsAll().fx[0].tfx));
  // your kit: snare from Brushes, saved
  await p.evaluate(()=>{ nxClose(); const k=mkTrack('kit',{id:S.nextId++,off:0,len:1,lenSet:true,rep:false,sound:'808',hits:[{s:0,d:'kick',v:1},{s:4,d:'snare',v:1}]}); S.tracks.push(k); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(k))); });
  await p.selectOption('#kd_snare','Brushes'); await p.waitForTimeout(200); out.slotKit=await p.evaluate(()=>S.kit.slots.find(x=>x.id==='snare').kit);
  out.brushSnare=await p.evaluate(async()=>{ await loadSmp('brushkit'); const r=async st=>{ const oc=new OfflineAudioContext(1,22050,44100); drumHit(oc,oc.destination,'snare',0.01,1,'808',0.5); const d=(await oc.startRendering()).getChannelData(0); let q=0; for(let i=0;i<d.length;i++) q+=d[i]*d[i]; return q; };
    const a=await r(); const sl=S.kit.slots.find(x=>x.id==='snare'); delete sl.kit; const b2=await r(); sl.kit='Brushes'; return a!==b2; });
  await p.tap('[data-save="kit"]'); await p.fill('#prName','Night kit'); await p.tap('#prOk'); await p.waitForTimeout(150); out.kitSaved=await p.evaluate(()=>{ const x=presetsAll().kit[0]; return x&&x.sound+':'+x.slots.find(s=>s.id==='snare').kit; });
  // a new song: the kit preset rebuilds the kit
  await p.evaluate(()=>{ nxClose(); S.kit=defaultKit(); const k2=S.tracks.find(t=>t.inst==='kit'); k2.sound='Rock'; s2TrackSheet(s2Lane(s2LaneId(k2))); }); await p.tap('#s2Snd [data-pre^="kit:"]'); await p.waitForTimeout(150);
  out.kitApplied=await p.evaluate(()=>S.tracks.find(t=>t.inst==='kit').sound+':'+S.kit.slots.find(s=>s.id==='snare').kit);
  // backups carry presets; a fresh phone gets them back
  out.backup=await p.evaluate(async()=>{ const pr=presetsAll(); localStorage.removeItem('noodle.presets'); const f={noodle:'songs',v:1,songs:[],presets:pr}; await songFileOpen(JSON.stringify(f)); const q=presetsAll(); return [q.vox.length,q.fx.length,q.kit.length].join(','); });
  // free user: a preset with Pro parts (backing vocals) is tried, not kept
  await p.evaluate(()=>{ nxClose(); PRO.owned=false; const w=mkTrack('vox',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,sound:'Pop'}); S.tracks.push(w); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(w))); });
  out.freeBadge=await p.evaluate(()=>!!document.querySelector('#s2Snd [data-pre] .pro-b')); await p.tap('#s2Snd [data-pre^="vox:"]'); await p.waitForTimeout(150);
  out.freeTry=await p.evaluate(()=>{ const w=S.tracks[S.tracks.length-1]; flushSave(); const sv=JSON.parse(localStorage.getItem(STORE_KEY)).tracks.find(t=>t.id===w.id); return w.sound+'/'+sv.sound; });
  await p.evaluate(()=>nxClose()); out.freeAfter=await p.evaluate(()=>S.tracks[S.tracks.length-1].sound);
  // edit: rename and delete
  await p.evaluate(()=>{ PRO.owned=true; presetEditSheet('vox',()=>{}); }); await p.fill('[data-ren]','Studio voice'); await p.dispatchEvent('[data-ren]','change'); out.renamed=await p.evaluate(()=>presetsAll().vox[0].name);
  await p.tap('[data-del]'); out.deleted=await p.evaluate(()=>presetsAll().vox.length);
  const want={basic:{tune:true,harm:true,vol:true,airHidden:true,revHidden:true},moreOpen:true,saved:{name:'Radio voice',sound:'Hard tune',air:80,harm:30},chip:true,applied:{sound:'Hard tune',air:80,harm:30,pressed:'true'},
    fxSaved:'{"echo":50,"chorus":20}',slotKit:'Brushes',brushSnare:true,kitSaved:'808:Brushes',kitApplied:'808:Brushes',backup:'1,1,1',freeBadge:true,freeTry:'Hard tune/Pop',freeAfter:'Pop',renamed:'Studio voice',deleted:0};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k]));
  console.log(JSON.stringify({errs})); await b.close(); })();
