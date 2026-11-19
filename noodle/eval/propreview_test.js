// Pro badges and previews (free users): Pro options show the sparkle (gone with Pro); trying a Pro sound, track effects, backing vocals,
// a Pro chord style or a Pro song effect is heard but never saved or put in undo, and goes back when the menu / editor closes, with a
// "Get Pro" note; free choices made meanwhile are kept; Low pass / High pass curves are fully editable for free; buying Pro keeps a try.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  const saved=()=>p.evaluate(()=>{ flushSave(); const o=JSON.parse(localStorage.getItem(STORE_KEY)); return o.tracks.map(t=>({inst:t.inst,sound:t.sound,tfx:t.tfx||null,harm:t.fx&&t.fx.harm||0,mfx:t.mfx?t.mfx.k+':'+(t.mfx.curve?t.mfx.curve.nodes.length:0):null})); });
  await p.evaluate(()=>{ PRO.owned=false; S.key='0'; S.scale='major'; S.bars=2; keyCache=null; const a=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Saw',notes:[[0,4,60],[4,4,64],[8,4,67],[16,8,65]].map(([s,l,p])=>({s,l,p,v:.8}))}); S.tracks.push(a); save(); flushSave(); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(a))); });
  await p.waitForTimeout(200); out.badges=await p.evaluate(()=>[...document.querySelectorAll('#s2Snd button')].filter(x=>x.querySelector('.pro-b')).map(x=>x.dataset.x).join(','));
  const undo0=await p.evaluate(()=>hist.undo.length);
  await p.tap('#s2Snd [data-x="Trumpet"]'); await p.waitForTimeout(300);
  out.tryLive=await p.evaluate(()=>S.tracks[0].sound); out.trySaved=(await saved())[0].sound; out.playing=await p.evaluate(()=>!!playing); out.line=await p.isVisible('.pv-line');
  await p.tap('#s2Snd [data-x="Square"]'); await p.waitForTimeout(200); out.freeKept=(await saved())[0].sound;
  await p.tap('#s2Snd [data-x="Trumpet"]'); await p.waitForTimeout(200);
  // track effects (Pro): sliders work while the menu is open
  await p.evaluate(()=>{ const el=document.querySelector('#s2Tfx_echo'); el.value=60; el.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(200);
  out.tfxLive=await p.evaluate(()=>JSON.stringify(S.tracks[0].tfx)); out.tfxSaved=(await saved())[0].tfx;
  await p.evaluate(()=>nxClose()); await p.waitForTimeout(300);
  out.after=await p.evaluate(()=>({sound:S.tracks[0].sound, tfx:S.tracks[0].tfx||null, playing:!!playing, toast:document.getElementById('toast').textContent, act:document.getElementById('toast').classList.contains('act')}));
  out.undoSame=(await p.evaluate(()=>{ flushSave(); return hist.undo.length; }))-undo0;   /* only the Square choice */
  // chords: Pulse is Pro: tried, not saved, gone on close
  await p.evaluate(()=>{ s2TrackSheet(s2Lane(s2LaneId(S.tracks[0]))); }); await p.tap('[data-a="chords"]'); await p.waitForTimeout(200); await p.tap('#chSt [data-k="pulse"]'); await p.waitForTimeout(300);
  out.chordTry=await p.evaluate(()=>S.tracks.filter(t=>t._pvTemp).length); out.chordSaved=(await saved()).length; out.chordBadge=await p.evaluate(()=>!!document.querySelector('#chSt [data-k="arp"] .pro-b'));
  await p.tap('#chGo'); await p.waitForTimeout(200); out.chordGoPro=await p.evaluate(()=>/Noodle Pro/.test(document.querySelector('#nxSheet h2').textContent)); await p.evaluate(()=>nxClose()); await p.waitForTimeout(200);
  out.chordAfter=await p.evaluate(()=>S.tracks.length);
  // vocals: backing vocals tried
  await p.evaluate(()=>{ const v=mkTrack('vox',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,sound:'Pop'}); S.tracks.push(v); save(); flushSave(); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(v))); const el=document.querySelector('#s2Fx_harm'); el.value=70; el.dispatchEvent(new Event('change',{bubbles:true})); });
  await p.waitForTimeout(200); out.harmLive=await p.evaluate(()=>S.tracks[1].fx.harm); out.harmSaved=(await saved())[1].harm; await p.evaluate(()=>nxClose()); out.harmAfter=await p.evaluate(()=>S.tracks[1].fx&&S.tracks[1].fx.harm||0);
  // Song FX: Low pass fully free (curve edits saved); Phaser tried, then back to the Low pass with its edits when the editor closes
  await p.evaluate(()=>{ const m=mkTrack('mix',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false}); m.mfx={k:'lp',curve:null,params:{}}; S.tracks.push(m); save(); renderTracks(); s2Edit(m); }); await p.waitForTimeout(400);
  await p.tap('.mfxe [data-a="add"]'); await p.waitForTimeout(150); out.lpSaved=(await saved())[2].mfx;
  out.fxBadges=await p.evaluate(()=>document.querySelectorAll('.mfx-k .pro-b').length);
  await p.tap('.mfx-k [data-k="phaser"]'); await p.waitForTimeout(200); out.phLive=await p.evaluate(()=>S.tracks[2].mfx.k); out.phSaved=(await saved())[2].mfx; out.hint=await p.textContent('#s2EdHint');
  await p.evaluate(()=>s2EdClose()); await p.waitForTimeout(200); out.fxAfter=await p.evaluate(()=>S.tracks[2].mfx.k+':'+(S.tracks[2].mfx.curve?S.tracks[2].mfx.curve.nodes.length:0));
  // buying Pro while trying keeps it, and badges go
  await p.evaluate(()=>{ s2TrackSheet(s2Lane(s2LaneId(S.tracks[0]))); }); await p.tap('#s2Snd [data-x="Clarinet"]'); await p.evaluate(()=>noodlePro(true)); await p.waitForTimeout(200);
  out.bought=(await saved())[0].sound; await p.evaluate(()=>{ nxClose(); s2TrackSheet(s2Lane(s2LaneId(S.tracks[0]))); }); out.proBadges=await p.evaluate(()=>document.querySelectorAll('.pro-b').length);
  const want={badges:'Glass,Chip,Theremin,Flute,Trumpet,Clarinet,Glockenspiel,Your voice',tryLive:'Trumpet',trySaved:'Saw',playing:true,line:true,freeKept:'Square',tfxLive:'{"echo":60}',tfxSaved:null,
    after:{sound:'Square',tfx:null,playing:false,toast:'Trumpet and Track effects are Pro. Get Pro to keep them.',act:true},undoSame:1,chordTry:1,chordSaved:1,chordBadge:true,chordGoPro:true,chordAfter:1,
    harmLive:70,harmSaved:0,harmAfter:0,lpSaved:'lp:4',fxBadges:9,phLive:'phaser',phSaved:'lp:4',fxAfter:'lp:4',bought:'Clarinet',proBadges:0};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k])+' want '+JSON.stringify(v));
  console.log(JSON.stringify({errs})); await b.close(); })();
