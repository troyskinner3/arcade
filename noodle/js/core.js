"use strict";
/* ============================== constants ============================== */
const DRUM_SOUNDS = ['808','Punchy','EDM','Rock','Brushes','Lo-fi'];
const INST = {
  kit:  {label:'Drum kit', kind:'drums', color:'#e4572e', say:'“B” · “ch” · “k” · “ts”', sounds:DRUM_SOUNDS, hint:'Beatbox the whole groove: “B” for kick, “ch” for snare, “k” for clap, “ts” for hi-hat. Add more sounds and teach it your own noises in Your kit below. Fix any hit by tapping the grid.'},
  kick: {label:'Kick', kind:'drum', drum:'kick', color:'#e4572e', say:'“B” · “bm”', sounds:DRUM_SOUNDS, hint:'Just the kick drum. Say “B” or “bm” wherever you want a kick.'},
  snare:{label:'Snare', kind:'drum', drum:'snare', color:'#f0a238', say:'“ch” · “K” · “Pf”', sounds:DRUM_SOUNDS, hint:'Just the snare. “ch”, “K”, “Pf” or “psh” all work.'},
  hat:  {label:'Hi-hat', kind:'drum', drum:'hat', color:'#22b0a0', say:'“ts” · “tk”', sounds:DRUM_SOUNDS, hint:'Just the hi-hats. Say “ts”, “tk” or “tss”.'},
  clap: {label:'Clap', kind:'drum', drum:'clap', color:'#e2689f', say:'“k” · clap', sounds:DRUM_SOUNDS, hint:'Claps. Say “k”, clap your hands, or snap your fingers. Any short, sharp sound works.'},
  bass: {label:'Bass', kind:'pitched', oct:-1, color:'#7b6cf6', say:'sing low', sounds:['Sub','808 glide','Synth bass','Reese','Pluck','Rock bass','Growl','Acid','Wobble'], hint:'Sing or hum the bass line. It plays an octave lower than you sing.'},
  lead: {label:'Lead', kind:'pitched', oct:0, color:'#3a8dde', say:'sing · whistle', sounds:['Saw','Supersaw','Square','Bell','Guitar','Glass','Chip','Theremin','Flute','Trumpet','Clarinet','Glockenspiel','Your voice'], hint:'Sing (“ahh”, “ooo”, “doo”), hum, or whistle a melody. Slides between notes are fine.'},
  keys: {label:'Keys', kind:'pitched', oct:0, color:'#8fbf3a', say:'sing roots', sounds:['Piano','E-piano','Organ','Stab','String pluck','Marimba','Xylophone','Horns'], hint:'Sing or hum a riff. Each note becomes a chord on electric piano or organ.'},
  pad:  {label:'Pad', kind:'pitched', oct:0, color:'#b77ce8', say:'sing long', sounds:['Warm pad','Strings','Choir','Sweep','Vowel pad','Digital pad','Chorus pad','Pump pad','Horns','Your voice'], hint:'Sing or hum long, slow notes. Each becomes a chord on a soft pad.'},
  arp:  {label:'Arp', kind:'pitched', oct:0, color:'#2fb3c9', say:'sing roots', sounds:['Pluck','Bell','Supersaw','Square','Saw','Chip','Glass','String pluck','Marimba','Xylophone','Glockenspiel'], hint:'Sing, hum or draw root notes. Each one plays its chord from the key as an arpeggio. Set the pattern, speed and chord size under Controls.'},
  vox:  {label:'Vocals', kind:'audio', color:'#f7768e', say:'sing words', sounds:['Pop','Hip hop','Hard tune','EDM','Rock','Natural','Vocoder','Talkbox'], hint:'Sing the real thing: lyrics, ad-libs, harmonies. Your voice is kept as audio and polished with tuning, EQ, compression, doubling and echo. Wear headphones: the other parts play while you sing.'},
  mix:  {label:'Song FX', kind:'mix', color:'#e0a43a', say:'', sounds:[], hint:'Effects on the whole song: sweeps, echoes, phasers. Tap an empty spot in this track to add one.'},
  fx:   {label:'Sound FX', kind:'audio', color:'#9b8cff', say:'“woooop” · “shhh” · “pshh”', sounds:['Synth'], hint:'Ear candy from your mouth: a rising “woooop” is a riser, a falling one a downlifter, “shhh” a noise sweep, a short “pshh” an impact.'},
};
/* Every sound a drum-kit slot can play (all synthesized, plus "my own noise", which plays back your taught recording). */
const SOUNDS = {
  kick:{label:'Kick',midi:36}, snare:{label:'Snare',midi:38}, clap:{label:'Clap',midi:39}, hat:{label:'Closed hi-hat',short:'Hat',midi:42},
  openhat:{label:'Open hi-hat',short:'Open hat',midi:46}, rim:{label:'Rimshot',short:'Rim',midi:37}, snap:{label:'Finger snap',short:'Snap',midi:75},
  tomhi:{label:'High tom',short:'Tom hi',midi:50}, tommid:{label:'Mid tom',short:'Tom mid',midi:47}, tomlo:{label:'Floor tom',short:'Tom lo',midi:43},
  conga:{label:'Conga',midi:63}, block:{label:'Woodblock',short:'Block',midi:76}, cowbell:{label:'Cowbell',short:'Bell',midi:56},
  shaker:{label:'Shaker',midi:70}, tamb:{label:'Tambourine',short:'Tamb',midi:54}, crash:{label:'Crash',midi:49}, ride:{label:'Ride',midi:51},
  boom:{label:'808 boom',short:'Boom',midi:35}, zap:{label:'Laser zap',short:'Zap',midi:81}, voice:{label:'My own noise',short:'Mine',midi:null},
};
const MAX_SLOTS=12;
/* one-tap styles: sound for each kind of part, vocal preset, and the mix */
const STYLES={
  'Pop':    {drums:'Punchy', bass:'Synth bass', lead:'Square',   keys:'Piano',   pad:'Warm pad', arp:'Pluck',    vox:'Pop',      mix:{swing:0,  drive:15, punch:55, rev:45}},
  'Hip hop':{drums:'808',    bass:'808 glide',  lead:'Bell',     keys:'E-piano', pad:'Strings',  arp:'Bell',     vox:'Hip hop',  mix:{swing:28, drive:25, punch:65, rev:30}},
  'EDM':    {drums:'EDM',    bass:'Synth bass', lead:'Supersaw', keys:'Stab',    pad:'Sweep',    arp:'Supersaw', vox:'EDM',      mix:{swing:0,  drive:30, punch:75, rev:60}},
  'Rock':   {drums:'Rock',   bass:'Rock bass',  lead:'Guitar',   keys:'Organ',   pad:'Strings',  arp:'Square',   vox:'Rock',     mix:{swing:6,  drive:40, punch:60, rev:40}},
  'Lo-fi':  {drums:'Lo-fi',  bass:'Sub',        lead:'Bell',     keys:'E-piano', pad:'Warm pad', arp:'Pluck',    vox:'Natural',  mix:{swing:45, drive:20, punch:40, rev:55}},
};
const styleSound=inst=>{ const st=S&&S.genre&&STYLES[S.genre]; if(!st) return null; const k=INST[inst].kind; return k==='drums'||k==='drum'?st.drums:st[inst]; };
const defaultKit=()=>({next:1, slots:[{id:'kick',sound:'kick',say:'B'},{id:'snare',sound:'snare',say:'ch'},{id:'clap',sound:'clap',say:'k'},{id:'hat',sound:'hat',say:'ts'}]});
const soundOf=d=>{ const sl=slotOf(d); return sl?sl.sound:d; };
function slotLabel(d){ const sl=slotOf(d), snd=sl?sl.sound:d, base=SOUNDS[snd]||{label:d};
  const same=S.kit.slots.filter(x=>x.sound===snd); const nm=base.short||base.label;
  return same.length>1 && sl ? nm+' '+(same.indexOf(sl)+1) : nm; }
const NOTE_NAMES = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const SCALES = {major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], 'pent-minor':[0,3,5,7,10], 'pent-major':[0,2,4,7,9], blues:[0,3,5,6,7,10], dorian:[0,2,3,5,7,9,10],
  mixolydian:[0,2,4,5,7,9,10], lydian:[0,2,4,6,7,9,11], phrygian:[0,1,3,5,7,8,10], locrian:[0,1,3,5,6,8,10], 'harm-minor':[0,2,3,5,7,8,11], 'mel-minor':[0,2,3,5,7,9,11], 'phryg-dom':[0,1,4,5,7,8,10]};
/* how each is shown, and which major key shares its notes (for the key signature in MIDI files): semitones up from the tonic, and major (0) or minor (1) in feel */
const SCALE_LABEL={major:'major',minor:'minor','pent-minor':'minor pent.','pent-major':'major pent.',blues:'blues',dorian:'Dorian',mixolydian:'Mixolydian',lydian:'Lydian',phrygian:'Phrygian',locrian:'Locrian','harm-minor':'harmonic minor','mel-minor':'melodic minor','phryg-dom':'Phrygian dominant'};
const SCALE_REL={major:[0,0],'pent-major':[0,0],lydian:[7,0],mixolydian:[5,0],minor:[3,1],'pent-minor':[3,1],blues:[3,1],dorian:[10,1],phrygian:[8,1],locrian:[1,1],'harm-minor':[3,1],'mel-minor':[3,1],'phryg-dom':[8,1]};
const MAJOR_FAMILY = new Set(['major','pent-major','lydian','mixolydian','phryg-dom']);   /* which of the two listening profiles finds the home note */
const KK_MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88], KK_MIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const STORE_KEY = 'mouth-machine.v1';

/* ============================== state ============================== */
function exampleTracks(){
  const hits=[]; const add=(s,d,v)=>hits.push({s,d,v});
  [0,7,10,16,23,26,27].forEach(s=>add(s,'kick',s%16===0?1:0.85));
  [4,12,20,28].forEach(s=>add(s,'snare',0.95)); add(31,'snare',0.45);
  for(let s=0;s<32;s+=2) add(s,'hat', s%4===0?0.75:0.5); add(15,'hat',0.4); add(29,'hat',0.4);
  const bass=[[0,3,57],[3,1,57],[6,2,60],[8,4,55],[14,2,57],[16,3,57],[19,1,57],[22,2,64],[24,3,62],[28,4,60]].map(([s,l,p])=>({s,l,p,v:0.85}));
  const keys=[[0,8,57],[8,8,55],[16,8,57],[24,4,62],[28,4,60]].map(([s,l,p])=>({s,l,p,v:0.7}));
  const lead=[[2,2,69],[4,2,72],[6,4,76],[12,2,74],[14,2,72],[18,2,69],[20,2,72],[22,2,74],[24,6,71]].map(([s,l,p])=>({s,l,p:p+0.1,v:0.75}));
  return [
    mkTrack('kit',{id:1,hits,ex:true,sound:'Punchy'}),
    mkTrack('bass',{id:2,notes:bass,ex:true,sound:'Reese',vol:72}),
    mkTrack('lead',{id:3,notes:lead,ex:true,sound:'Saw',vol:52,send:35}),
    mkTrack('keys',{id:4,notes:keys,ex:true,sound:'E-piano',vol:44,send:30}),   /* chords: Am, G, Am, Dm, C */
    Object.assign(mkTrack('fx',{id:5,ex:true}),{fxs:[{...fxNew('sweepDown',0,32),v:0.7},{...fxNew('riser',16,32),v:0.6}]}),   /* a noise sweep down out of the downbeat, and a riser back into the loop */
  ];
}
function mkTrack(inst, o={}){
  const d = INST[inst];
  return Object.assign({id:0, inst, sound:d.sounds[0], vol:80, pan:0, send:15, tone:50, mute:false, solo:false,
    oct:d.oct||0, sens:S0sens(), ex:false, ...(styleSound(inst)&&d.sounds.includes(styleSound(inst))?{sound:styleSound(inst)}:{}), hits:d.kind==='pitched'||d.kind==='audio'||d.kind==='mix'?undefined:[], notes:d.kind==='pitched'?[]:undefined, ...(inst==='fx'?{hits:[],fxs:[],send:30,vol:45}:d.kind==='audio'?(()=>{ const pr=(styleSound('vox')&&VOX_PRESETS[styleSound('vox')])?styleSound('vox'):'Pop'; return {fx:Object.assign({},VOX_PRESETS[pr]), sound:pr}; })():{})}, o);
}
function S0sens(){ return (typeof S!=='undefined' && S) ? S.sens : 55; }
function defaultState(){
  return {v:1,bpm:94,bars:4,swing:14,key:'auto',scale:'auto',quant:16,metro:false,playAlong:false,tapPad:true,ec:false,calibrated:false,mergeDrums:true,replaceTonal:true,kit:null,latAuto:true,latMs:80,sens:55,loops:4,
    master:{vol:80,rev:45,drive:20,punch:50}, inst:'kit', nextId:10, tracks:null};
}
let S = defaultState();
(function load(){
  try{ const raw=localStorage.getItem(STORE_KEY); if(raw){ const o=JSON.parse(raw); if(o&&o.v===1){ S=Object.assign(defaultState(),o); S.master=Object.assign(defaultState().master,o.master||{}); if(!o.mig2){ S.ec=false; S.playAlong=false; S.mig2=true; } if(!o.mig3){ if(!S.latAuto && S.latMs<15){ S.latAuto=true; S.calibrated=false; } S.mig3=true; } delete S.kitProfile; } } }catch(e){}
  if(!S.kit||!Array.isArray(S.kit.slots)||!S.kit.slots.length) S.kit=defaultKit();
  if(!Array.isArray(S.tracks)) S.tracks = [];
  S.tracks.forEach(t=>{ t._dirty=true; });
})();
let saveTimer=0;
function persist(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(S,pvKeep)); }catch(e){} try{ projSoon(); }catch(e){} }
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ saveTimer=0; persist(); histCommit(); dropSoon(); },300); histUI(); }
/* Undo and Redo are lit as soon as there is something to undo (a change waiting to be saved counts), in the Studio and in the editor */
function histUI(){ const u=!hist.undo.length&&!saveTimer, r=!hist.redo.length; ['s2Undo','s2EdUndo'].forEach(id=>{ const e=$(id); if(e&&e.disabled!==u) e.disabled=u; }); ['s2Redo','s2EdRedo'].forEach(id=>{ const e=$(id); if(e&&e.disabled!==r) e.disabled=r; }); }
/* Undo / redo: every saved change becomes a step (rapid changes such as a slider drag merge into one).
   A step remembers the song plus the recordings behind each part, so undoing a deleted part brings its take back. */
const hist={undo:[],redo:[],cur:null,busy:false};
function snapNow(){ const json=JSON.stringify(S,function(k,v){ if(this===S && (k==='ui'||k==='inst')) return undefined; return pvKeep.call(this,k,v); });   /* Pro previews are not part of the song (pvKeep) */ const rt=new Map(); S.tracks.forEach(t=>rt.set(t.id,{_raw:t._raw,_an:t._an,_takes:t._takes,_range:t._range})); return {json,rt}; }
function histCommit(){ if(hist.busy) return; const sn=snapNow(); if(!hist.cur){ hist.cur=sn; return; } if(sn.json===hist.cur.json){ hist.cur.rt=sn.rt; return; }
  hist.undo.push(hist.cur); if(hist.undo.length>80) hist.undo.shift(); hist.redo=[]; hist.cur=sn; histUI(); }
function flushSave(){ if(saveTimer){ clearTimeout(saveTimer); saveTimer=0; persist(); histCommit(); } }
/* the Studio draws its own undo/redo state */
async function restoreSnap(sn){
  hist.busy=true; const wasPlaying=playing, ph=(playing&&ctx)?(((ctx.currentTime-t0)/loopLen())%1+1)%1:0;
  const view=new Map(S.tracks.map(t=>[t.id,t._scrollX]));   // undo changes the song, not where you're looking
  S.tracks.forEach(disposeTrack);
  const keep={ui:S.ui, inst:S.inst}; const o=JSON.parse(sn.json); S=Object.assign(defaultState(),o,keep); S.master=Object.assign(defaultState().master,o.master||{});
  S.tracks.forEach(t=>{ const r=sn.rt.get(t.id); if(r) Object.assign(t,r); if(view.get(t.id)!=null) t._scrollX=view.get(t.id); t._dirty=true; });
  keyCache=null; scaleCache=null; persist(); hist.busy=false;
  syncAllInputs(); renderTracks();
  if(ctx){ await renderDirty(); if(wasPlaying){ startAll(ctx.currentTime+0.05, ph*loopLen()); } }
}
/* New song: an empty song with default tempo, key and mix. Your setup stays (taught drum sounds, mic timing,
   learned preferences). Undo brings the old song back. */
async function undo(){ flushSave(); if(!hist.undo.length) return; hist.redo.push(hist.cur); hist.cur=hist.undo.pop(); await restoreSnap(hist.cur); histUI(); toast('Undone'); }
async function redo(){ flushSave(); if(!hist.redo.length) return; hist.undo.push(hist.cur); hist.cur=hist.redo.pop(); await restoreSnap(hist.cur); histUI(); toast('Redone'); }
function syncAllInputs(){ applyMaster(); }   /* after loading a song: the master chain follows S.master */

const CHEV='<svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5l5 5-5 5"/></svg>';
/* ---- Vocals: kept as audio, polished with a classic pop / hip-hop chain ---- */
const VOX_PRESETS={
  'Pop':      {tune:45, low:40, pres:60, air:60, comp:60, dbl:25, echo:15},
  'Hip hop':  {tune:25, low:45, pres:65, air:45, comp:75, dbl:15, echo:10},
  'Hard tune':{tune:100,low:40, pres:60, air:55, comp:65, dbl:20, echo:20},
  'EDM':      {tune:65, low:50, pres:55, air:75, comp:65, dbl:35, echo:30},
  'Rock':     {tune:10, low:45, pres:72, air:35, comp:72, dbl:10, echo:5},
  'Natural':  {tune:0,  low:30, pres:35, air:30, comp:30, dbl:0,  echo:0},
  'Vocoder':  {tune:100,low:45, pres:50, air:50, comp:60, dbl:30, echo:20},   /* your voice shapes a synth: chords on each note you sing */
  'Talkbox':  {tune:100,low:45, pres:55, air:40, comp:65, dbl:10, echo:10},   /* your voice shapes a synth playing your melody */
};
const fmtSt=v=>{ const st=Math.round((v-50)*1.2)/10; return st===0?'0':(st>0?'+':'')+st.toFixed(1)+' st'; };
const VOX_KNOBS=[['tune','Tune',v=>v?v+'%':'off'],['form','Formant',fmtSt],['low','Low cut',v=>Math.round(40+v*2.6)+' Hz'],['pres','Presence',v=>{const g=(v-25)/75*9; return (g>0?'+':'')+g.toFixed(1)+' dB';}],['air','Air',v=>'+'+(v/10).toFixed(1)+' dB'],['comp','Compression',v=>v+'%'],['dbl','Double',v=>v+'%'],['echo','Echo',v=>v+'%']];
const fxOf=tr=>Object.assign({form:50},VOX_PRESETS.Pop,tr.fx||{});
/* recordings of vocal parts are kept in this browser (IndexedDB), so they survive a reload */
const takeStore={ db:null,
  open(){ if(this.db) return Promise.resolve(this.db); return new Promise(res=>{ try{ const r=indexedDB.open('mouth-machine',3); r.onupgradeneeded=()=>{ const d=r.result; ['takes','projects','outbox'].forEach(n=>{ if(!d.objectStoreNames.contains(n)) d.createObjectStore(n); }); }; r.onsuccess=()=>{ this.db=r.result; res(this.db); }; r.onerror=()=>res(null); }catch(e){ res(null); } }); },
  async put(k,v){ const db=await this.open(); if(!db) return; try{ db.transaction('takes','readwrite').objectStore('takes').put(v,k); }catch(e){} },
  async get(k){ const db=await this.open(); if(!db) return null; return new Promise(res=>{ try{ const q=db.transaction('takes').objectStore('takes').get(k); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }catch(e){ res(null); } }); },
  async del(k){ const db=await this.open(); if(!db) return; try{ db.transaction('takes','readwrite').objectStore('takes').delete(k); }catch(e){} } };
/* ---- Saved projects: every song you make is kept on this device (IndexedDB) and can be reopened, renamed, duplicated or deleted.
   A project is the song only; your setup (taught drum sounds, mic timing, learned preferences) is shared by all of them. ---- */
const SETUP_KEYS=['kit','calibrated','latAuto','latMs','ec','sens','snapStr','detailBias','vocLat','mergeDrums','replaceTonal','mig2','mig3','sq','keyRef','voxTop'];
const projDb={
  async req(mode,fn){ const db=await takeStore.open(); if(!db) return null; return new Promise(res=>{ try{ const q=fn(db.transaction('projects',mode).objectStore('projects')); q.onsuccess=()=>res(q.result??null); q.onerror=()=>res(null); }catch(e){ res(null); } }); },
  get(id){ return this.req('readonly',st=>st.get(id)); }, all(){ return this.req('readonly',st=>st.getAll()); },
  put(p){ return this.req('readwrite',st=>st.put(p,p.id)); }, del(id){ return this.req('readwrite',st=>st.delete(id)); } };
const projId=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const songJson=()=>JSON.stringify(S,pvKeep);
const projWorthKeeping=()=>!S.prompt && (!!S.title || S.tracks.some(t=>!t.ex && !t.guide));   /* not the untouched example, not a guided-take song */
let projTimer=0, projSaved='';
async function projSaveCurrent(){ clearTimeout(projTimer); projTimer=0; if(!projWorthKeeping()) return null;
  if(!S.pid){ S.pid=projId(); persist(); } const json=songJson(); if(json===projSaved) return S.pid;
  const old=await projDb.get(S.pid), now=Date.now();
  await projDb.put({id:S.pid, title:S.title||'', createdAt:old?old.createdAt:now, updatedAt:now, bpm:S.bpm, bars:S.bars, key:projKeyLabel(), parts:S.tracks.filter(t=>!t.guide).map(t=>t.inst), json}); projSaved=json; return S.pid; }
function projSoon(){ clearTimeout(projTimer); projTimer=setTimeout(()=>projSaveCurrent().catch(()=>{}),1500); }
async function projList(){ const all=(await projDb.all())||[]; return all.map(({json,...p})=>({...p, current:p.id===S.pid})).sort((a,b)=>b.updatedAt-a.updatedAt); }
async function projLoadState(o){ try{ pvEnd(true); }catch(e){} flushSave(); if(typeof s2!=='undefined') s2.sec=null; if(playing){ stopAll(); playing=false; }
  const st=defaultState(); Object.assign(st,o); SETUP_KEYS.forEach(k=>{ if(k in S) st[k]=S[k]; else delete st[k]; }); st.nextId=Math.max(S.nextId||10, o.nextId||10);
  takeBar=null; await restoreSnap({json:JSON.stringify(st), rt:new Map()}); hist.undo=[]; hist.redo=[]; hist.cur=snapNow(); projSaved=songJson(); reloadRaw(); }
async function projOpen(id){ await projSaveCurrent(); const p=await projDb.get(id); if(!p) return false; await projLoadState(JSON.parse(p.json)); return true; }
async function projNew(){ await projSaveCurrent(); const o=defaultState(); o.tracks=[]; o.pid=projId(); await projLoadState(o); return o.pid; }
async function projRename(id,title){ title=String(title||'').slice(0,80); if(id===S.pid){ S.title=title; persist(); await projSaveCurrent(); return true; }
  const p=await projDb.get(id); if(!p) return false; const o=JSON.parse(p.json); o.title=title; await projDb.put({...p, title, json:JSON.stringify(o), updatedAt:Date.now()}); return true; }
/* recordings kept as sound belong to one part each, so a copy gets its own */
async function projDuplicate(id){ if(id===S.pid) await projSaveCurrent(); const p=await projDb.get(id); if(!p) return null; const o=JSON.parse(p.json), now=Date.now(); let nid=Math.max(S.nextId||10, o.nextId||10);
  for(const t of o.tracks||[]){ const old=t.id; t.id=nid++; if(o.activeId===old) o.activeId=t.id; const raw=await takeStore.get('vox'+old); if(raw) await takeStore.put('vox'+t.id,raw); }
  o.nextId=nid; S.nextId=nid; persist(); o.pid=projId(); o.title=(p.title||'Untitled')+' copy';
  await projDb.put({...p, id:o.pid, title:o.title, createdAt:now, updatedAt:now, json:JSON.stringify(o)}); return o.pid; }
async function projDelete(id){ const p=await projDb.get(id); if(!p) return false; try{ for(const t of JSON.parse(p.json).tracks||[]) await takeStore.del('vox'+t.id); }catch(e){}
  await projDb.del(id); if(id===S.pid){ const o=defaultState(); o.tracks=[]; o.pid=projId(); projSaved=''; await projLoadState(o); } return true; }
function projKeyLabel(){ try{ const has=S.tracks.some(t=>(INST[t.inst].kind==='pitched'&&t.notes&&t.notes.length)||(t.inst==='vox'&&(t.vn||[]).length)); if(!has) return ''; const K=currentKey(); if(K.none) return 'No key';
  return NOTE_NAMES[K.tonic]+' '+(SCALE_LABEL[K.scale]||''); }catch(e){ return ''; } }
/* ---- Song files: a song (or all of them) with its kept recordings, to keep safe or open on another device ---- */
const b64of=u8=>{ let s=''; for(let i=0;i<u8.length;i+=8192) s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192)); return btoa(s); };
const u8of=b=>{ const s=atob(b), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; };
const packV=v=>v instanceof Int16Array?{__i16:b64of(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))}:v instanceof Float32Array?{__f32:b64of(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))}:Array.isArray(v)?v.map(packV):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,packV(x)])):v;
const unpackV=v=>v&&typeof v==='object'?(v.__i16!=null?new Int16Array(u8of(v.__i16).buffer):v.__f32!=null?new Float32Array(u8of(v.__f32).buffer):Array.isArray(v)?v.map(unpackV):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,unpackV(x)]))):v;
async function songFilePack(ids){ if(ids.includes(S.pid)) await projSaveCurrent(); const songs=[];
  for(const id of ids){ const p=await projDb.get(id); if(!p) continue; const o=JSON.parse(p.json), takes={}; for(const t of o.tracks||[]){ const r=await takeStore.get('vox'+t.id); if(r) takes[t.id]=packV(r); }
    songs.push({title:p.title||'', createdAt:p.createdAt, updatedAt:p.updatedAt, song:o, takes}); }
  return songs; }
async function songFileSave(ids, name){ const songs=await songFilePack(ids);
  if(!songs.length){ toast('Nothing to save yet: make a song first.'); return false; }
  const day=new Date().toISOString().slice(0,10), fn=(ids.length>1?'Noodle songs '+day:(name||songs[0].title||'Untitled').replace(/[\\/:*?"<>|]+/g,' ').trim().slice(0,60)||'Untitled')+'.noodle';
  await offerFile(fn, new Blob([JSON.stringify({noodle:'songs', v:1, build:NOODLE_BUILD, savedAt:new Date().toISOString(), songs})],{type:'application/json'})); return true; }
async function songFileOpen(text){ let f; try{ f=JSON.parse(text); }catch(e){ f=null; } if(!f||f.noodle!=='songs'||!Array.isArray(f.songs)){ toast('That isn’t a Noodle song file.'); return -1; }
  const have=(await projDb.all())||[]; let added=0, nid=Math.max(S.nextId||10,10);
  for(const g of f.songs){ if(!g||!g.song||!Array.isArray(g.song.tracks)) continue;
    if(have.some(p=>p.createdAt===g.createdAt && (p.title||'')===(g.title||'') && p.updatedAt>=g.updatedAt)) continue;   /* already here (and not older) */
    const o=g.song; for(const t of o.tracks){ const old=t.id; t.id=nid++; if(o.activeId===old) o.activeId=t.id; if(g.takes&&g.takes[old]) await takeStore.put('vox'+t.id, unpackV(g.takes[old])); }   /* each part gets a new id, so nothing here is overwritten */
    o.nextId=nid; o.pid=projId(); const now=Date.now();
    await projDb.put({id:o.pid, title:g.title||'', createdAt:g.createdAt||now, updatedAt:g.updatedAt||now, bpm:o.bpm, bars:o.bars, key:'', parts:o.tracks.filter(t=>!t.guide).map(t=>t.inst), json:JSON.stringify(o)}); added++; songFileOpen.last=o.pid; }
  S.nextId=Math.max(S.nextId||10,nid); persist(); return added; }
/* ---- Song links: share a song by link; whoever opens it (in Noodle) gets their own copy to remix. Anyone with the link can listen.
   The song file goes to the takes service with this phone's owner id (a random id kept on this phone, stored there only as a hash),
   so only this phone can replace or delete it. S.link remembers the song's link. ---- */
function ownerId(){ try{ let o=localStorage.getItem('noodle.owner'); if(!o){ const b=crypto.getRandomValues(new Uint8Array(18)); o=btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_'); localStorage.setItem('noodle.owner',o); } return o; }catch(e){ return null; } }
function linkId(){ const b=crypto.getRandomValues(new Uint8Array(9)); return 's'+btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_'); }
function previewWav(mix, secs=30){ const R=22050, sr=mix.sampleRate, L=mix.getChannelData(0), Rc=mix.numberOfChannels>1?mix.getChannelData(1):L, len=Math.min(mix.length,Math.round(secs*sr)), n=Math.floor((len-1)*R/sr);
  const x=new Float32Array(len); for(let i=0;i<len;i++) x[i]=(L[i]+Rc[i])/2; const z=biquad(biquad(x,'lp',9500,0.707,sr),'lp',9500,0.707,sr), out=new DataView(new ArrayBuffer(44+n*2)), w=(o,t)=>{ for(let i=0;i<t.length;i++) out.setUint8(o+i,t.charCodeAt(i)); };
  w(0,'RIFF'); out.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); out.setUint32(16,16,true); out.setUint16(20,1,true); out.setUint16(22,1,true); out.setUint32(24,R,true); out.setUint32(28,R*2,true); out.setUint16(32,2,true); out.setUint16(34,16,true); w(36,'data'); out.setUint32(40,n*2,true);
  const fade=Math.round(1.5*R); for(let i=0;i<n;i++){ const q=i*sr/R, i0=Math.floor(q), fr=q-i0, v=(z[i0]*(1-fr)+z[i0+1]*fr)*Math.min(1,(n-i)/fade); out.setInt16(44+i*2,Math.max(-32768,Math.min(32767,Math.round(v*32767))),true); }
  return out.buffer; }
async function songLinkShare(onStep){ pvEnd(true); const owner=ownerId(); if(!owner) throw new Error('storage is off');
  await projSaveCurrent(); const songs=await songFilePack([S.pid]); if(!songs.length) throw new Error('nothing to share');
  const id=(S.link&&S.link.id)||linkId(), H={'Content-Type':'application/json','X-Owner':owner};
  onStep&&onStep('Uploading your song…'); const body=JSON.stringify({noodle:'songs', v:1, build:NOODLE_BUILD, savedAt:new Date().toISOString(), songs});
  let r=await fetch(`${NOODLE_API}/v1/songs/${id}`,{method:'PUT',headers:H,body}); if(r.status===413) throw new Error('this song is too big to share by link (8 MB at most)'); if(!r.ok) throw new Error('the upload didn’t go through ('+r.status+')');
  const url=(await r.json()).url; S.link={id, url, at:new Date().toISOString()}; save(); await projSaveCurrent();
  onStep&&onStep('Making a preview…'); try{ const mix=await renderMix(1,true); await fetch(`${NOODLE_API}/v1/songs/${id}/preview`,{method:'PUT',headers:{'Content-Type':'audio/wav','X-Owner':owner},body:previewWav(mix)}); }catch(e){}   /* the link works without it */
  return url; }
async function songLinkDelete(){ const L=S.link; if(!L) return true; let ok=false; try{ ok=(await fetch(`${NOODLE_API}/v1/songs/${L.id}`,{method:'DELETE',headers:{'X-Owner':ownerId()}})).ok; }catch(e){}
  if(ok){ delete S.link; save(); await projSaveCurrent(); } return ok; }
/* Opening a song link (in the app, or ?s=<id> on the web): a copy of the song becomes a new song here, "Remix of …", ready for your part. */
async function songLinkOpen(ref){ const id=String(ref||'').replace(/^.*\/s\//,'').replace(/[?#].*$/,''); if(!/^[A-Za-z0-9_-]{10,32}$/.test(id)) return false;
  toast('Opening the song…'); let f=null; try{ const r=await fetch(`${NOODLE_API}/v1/songs/${id}`); if(r.ok) f=await r.json(); }catch(e){}
  if(!f||!f.songs||!f.songs[0]){ toast('That song isn’t available any more.'); return false; }
  const g=f.songs[0], t=g.title||'a song'; g.title=('Remix of '+t).slice(0,60); g.createdAt=Date.now(); g.updatedAt=Date.now(); if(g.song){ delete g.song.link; g.song.title=g.title; g.song.remixOf={id,title:t}; }
  const n=await songFileOpen(JSON.stringify(f)); if(n<1||!songFileOpen.last) return false;
  if(!$('nxOb').hidden){ window.__remixAfterOb={pid:songFileOpen.last, title:t}; return true; }   /* first launch: open it once the welcome is done */
  await projOpen(songFileOpen.last); if(typeof nxGo==='function') nxGo('studio'); toast(`Remixing “${t}”. Add your own part: tap + Add track.`,6000); return true; }
window.noodleOpenLink=ref=>{ const m=String(ref||'').match(/\/i\/([A-Za-z2-9]{6})\b/); return m?inviteUse(m[1]):songLinkOpen(ref); };
/* ---- Invites: Noodle Pro for bringing friends. Your phone has a code (from the takes service); a friend types it (More > Invite friends)
   or opens your link, and it counts once they have made a song. 3 friends earn a Noodle Pro offer code, redeemed in the App Store. ---- */
const APP_STORE_ID='';   /* the number in Noodle's App Store URL, once it is live (prefills the code on Apple's redeem page) */
async function inviteMine(){ try{ const r=await fetch(`${NOODLE_API}/v1/invites/mine`,{headers:{'X-Owner':ownerId()}}); return r.ok?await r.json():null; }catch(e){ return null; } }
function inviteUse(code){ code=String(code||'').toUpperCase().trim(); if(!/^[A-Z2-9]{6}$/.test(code)){ toast('That invite code isn’t right: 6 letters and numbers.'); return false; }
  try{ localStorage.setItem('noodle.inviteBy',code); }catch(e){} inviteSend(true); return true; }
/* Apple DeviceCheck token from the iPhone app (null on the web or where unsupported): lets the service count each real iPhone once */
function deviceToken(){ if(!(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.noodleNative)) return Promise.resolve(null);
  return new Promise(res=>{ const t=setTimeout(()=>res(null),5000); window.noodleDeviceToken=v=>{ clearTimeout(t); res(v||null); }; native({type:'dctoken'}); }); }
async function inviteSend(say){ let code=null; try{ code=localStorage.getItem('noodle.inviteBy'); }catch(e){} if(!code) return;
  const made=(await projDb.all().catch(()=>[])||[]).some(p=>(p.parts||[]).length)||S.tracks.some(t=>!t.guide&&hasContent(t));
  if(!made){ if(say) toast('Invite saved. It counts for your friend once you’ve made your first song.',5000); return; }
  const dev=await deviceToken(), H={'X-Owner':ownerId()}; if(dev) H['X-Device']=dev;
  let st=0; try{ st=(await fetch(`${NOODLE_API}/v1/invites/${code}/join`,{method:'PUT',headers:H})).status; }catch(e){ return; }   /* offline: try again later */
  if(st===200||st===404||st===409||st===400||st===403){ try{ localStorage.removeItem('noodle.inviteBy'); }catch(e){} }
  if(say||st===200) toast(st===200?'Invite counted. Thanks for joining Noodle!':st===409?'That invite can’t be used from this phone (your own code, or this iPhone already joined one).':st===403?'Invites count from the Noodle iPhone app.':st===404?'That invite code wasn’t found.':'The invite didn’t go through.',5000); }
async function inviteSheet(){ nxSheet(`<h2>Invite friends</h2><p style="color:var(--muted);font-size:14px;margin:-4px 0 12px">When 3 friends make their first song with your invite, you get Noodle Pro free.</p><div id="invBody" style="color:var(--muted)">Loading…</div>
    <div class="nx-grp">Have an invite code?</div><div style="display:flex;gap:8px"><input class="nx-txt" id="invCode" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="6 letters" style="flex:1;text-transform:uppercase"><button class="nx-ghost" id="invUse" style="width:auto;padding:0 18px">Use</button></div>`);
  $('invUse').onclick=()=>{ if(inviteUse($('invCode').value)) $('invCode').value=''; };
  const me=await inviteMine(), body=$('invBody'); if(!body) return;
  if(!me){ body.textContent='Couldn’t reach Noodle’s server. Try again with a connection.'; return; }
  const redeem=me.reward?(APP_STORE_ID?`https://apps.apple.com/redeem?ctx=offercodes&id=${APP_STORE_ID}&code=${encodeURIComponent(me.reward)}`:'https://apps.apple.com/redeem'):null;
  body.innerHTML=`${me.reward?`<p style="color:var(--ink);font-weight:600">You earned Noodle Pro! Your code: <b style="letter-spacing:.1em">${nxEsc(me.reward)}</b></p><a class="nx-primary" href="${nxEsc(redeem)}" target="_blank" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-bottom:12px">Redeem in the App Store</a>`:
      `<div class="nx-bar" style="margin:4px 0 6px"><i style="width:${Math.min(100,me.joined/me.need*100)}%"></i></div><p>${isPro()?'You have Pro already. Friends still get Noodle.':`${me.joined} of ${me.need} friends so far.`}${me.joined>=me.need&&!me.reward?' Your Pro code is on its way: check back soon.':''}</p>`}
    <p>Your code: <b style="color:var(--ink);letter-spacing:.12em">${nxEsc(me.code)}</b></p><button class="nx-primary" id="invShare">Send your invite</button>`;
  $('invShare').onclick=async()=>{ const text=`Make songs by humming with Noodle. Use my invite code ${me.code}:`; try{ if(navigator.share) await navigator.share({title:'Noodle', text, url:me.url}); else { await navigator.clipboard.writeText(text+' '+me.url); toast('Invite copied'); } }catch(e){} }; }
document.getElementById('nxInv').onclick=()=>inviteSheet();   /* ($ is defined in a later file) */
/* ---- App shell ---- */
/* ---- App shell ---- */
const nxEsc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let nxSortBy='updatedAt', nxAt='studio', nxResume=false;
function nxThumb(p){ const cols=(p.parts||[]).slice(0,4).map(i=>(INST[i]||{}).color||'#888'); let h=p.title.length*97+(p.bpm||0)+7; const r=()=>((h=(h*16807)%2147483647)/2147483647);
  return '<svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true">'+cols.map((c,i)=>Array.from({length:5},(_,k)=>r()>.35?`<rect x="${k*7}" y="${i*8+1}" width="${(4+r()*3).toFixed(1)}" height="5" rx="1" fill="${c}"/>`:'').join('')).join('')+'</svg>'; }
async function nxRenderProjects(){ const q=$('nxQ').value.trim().toLowerCase(); let L=(await projList()).filter(p=>(p.title||'untitled').toLowerCase().includes(q));
  L.sort((a,b)=>nxSortBy==='title'?(a.title||'Untitled').localeCompare(b.title||'Untitled'):b[nxSortBy]-a[nxSortBy]);
  const day=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',...(new Date(t).getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})});
  $('nxList').innerHTML = L.length ? L.map(p=>`<div class="nx-row"><button class="nx-open" data-id="${p.id}"><span class="nx-thumb">${nxThumb(p)}</span><span style="min-width:0"><span class="nx-tt">${nxEsc(p.title||'Untitled')}</span><span class="nx-mt">${[day(p.createdAt), p.key, p.bpm+' BPM'].filter(Boolean).join(' · ')}</span></span></button><button class="nx-dots" data-menu="${p.id}" aria-label="Options for ${nxEsc(p.title||'Untitled')}"><svg class="nx-ico" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg></button></div>`).join('')
    : `<p class="nx-empty">${q?'No projects match.':'No projects yet. Tap + to start one.'}</p>${q?'':'<div style="text-align:center"><button class="nx-ghost" id="nxExample" style="width:auto;padding:0 18px">Open an example song</button></div>'}`;
  const ex=$('nxExample'); if(ex) ex.onclick=()=>nxExample(); }
/* a small finished song to poke at: play it, open a part, re-record over it */
async function nxExample(stay){ await projNew(); S.title='Example song'; S.bpm=94; S.bars=2; S.tracks=exampleTracks().map(t=>{ t.id=S.nextId++; delete t.ex; t.off=0; t.len=2; t.lenSet=true; t.rep=false; t._dirty=true; return t; }); keyCache=null; save(); flushSave(); await projSaveCurrent(); if(stay){ await nxGo('projects'); return; } await nxGo('studio'); renderTracks(); scheduleRender(); }
async function nxGo(v){ if(v!=='studio'){ flushSave(); if(recState) cancelRecord(); if(playing){ stopAll(); playing=false; } await projSaveCurrent().catch(()=>{}); }
  nxAt=v; $('nxProjects').hidden=v!=='projects'; $('nxMore').hidden=v!=='more'; $('nxNav').hidden=v==='studio'; document.body.classList.toggle('nx-on',v!=='studio'); document.body.style.overflow=v==='studio'?'':'hidden';
  if(v==='studio' && s2Use()) s2Show(true); else if(v==='studio') s2Show(false); else { $('s2').hidden=true; document.body.classList.remove('s2-on'); }
  $('nxTabP').toggleAttribute('aria-current',false); $('nxTabM').toggleAttribute('aria-current',false); if(v==='projects') $('nxTabP').setAttribute('aria-current','page'); if(v==='more') $('nxTabM').setAttribute('aria-current','page');
  if(v==='projects') await nxRenderProjects(); if(v==='studio') window.scrollTo({top:0}); }
const nxSongEmpty=()=>!S.title && !S.prompt && !S.tracks.some(t=>!t.ex&&!t.guide);
async function nxNew(){ if(!nxSongEmpty() || S.tracks.length) await projNew(); await nxGo('studio'); }
function nxSheet(html){ $('toast').classList.remove('on'); $('nxSheet').onchange=null; $('nxSheet').innerHTML='<button class="nx-x" id="nxX" aria-label="Close"><svg viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12"/></svg></button><div class="nx-g"><div class="nx-grab"></div>'+html+'</div>'; $('nxSheet').style.transform=''; $('nxSheet').scrollTop=0; sheetAboveTransport(); $('nxScrim').hidden=false; $('nxX').onclick=e=>{ e.stopPropagation(); nxClose(); }; }
/* a sheet follows the finger down and closes past a third of the way (not while a slider or a scrolled list is being used) */
function nxSheetSwipe(){ const sh=$('nxSheet'); let y0=null, dy=0;
  sh.addEventListener('touchstart',e=>{ y0=null; if(e.touches.length!==1||sh.scrollTop>0||e.target.closest('input,select,textarea')) return; y0=e.touches[0].clientY; dy=0; },{passive:true});
  sh.addEventListener('touchmove',e=>{ if(y0==null) return; dy=e.touches[0].clientY-y0; if(dy<=0){ if(dy<-6){ y0=null; sh.style.transform=''; } return; } if(e.cancelable) e.preventDefault(); sh.classList.add('drag'); sh.style.transform=`translateY(${dy}px)`; },{passive:false});
  const end=()=>{ if(y0==null) return; y0=null; sh.classList.remove('drag'); if(dy>Math.min(140,sh.clientHeight/3)) nxClose(); sh.style.transform=''; dy=0; };
  sh.addEventListener('touchend',end); sh.addEventListener('touchcancel',end); }
/* In the Studio's timeline a sheet stops above the transport, so Play, rewind, loop and the metronome keep working while you try sounds (changes are heard as you make them) */
function sheetAboveTransport(){ const sc=$('nxScrim'), tr=document.querySelector('.s2-tr'); let b=0;
  try{ if(s2On() && $('s2Ed').hidden && tr && tr.offsetParent){ b=Math.max(0,window.innerHeight-tr.getBoundingClientRect().top); } }catch(e){}
  sc.style.bottom=b?b+'px':''; document.body.classList.toggle('s2-sheet',!!b); }
function nxClose(){ try{ pvEnd(); }catch(e){} $('nxScrim').hidden=true; $('nxScrim').style.bottom=''; document.body.classList.remove('s2-sheet'); $('nxSheet').onclick=null; $('nxSheet').oninput=null; $('nxSheet').onchange=null; }
async function nxMenu(id){ const p=(await projList()).find(x=>x.id===id); if(!p) return; const name=p.title||'Untitled';
  nxSheet(`<h2>${nxEsc(name)}</h2><button class="nx-act" data-a="rename">Rename</button><button class="nx-act" data-a="dup">Duplicate</button><button class="nx-act" data-a="file">Save song file<small>To keep, or open on another device</small></button><button class="nx-act danger" data-a="del">Delete</button>`);
  $('nxSheet').onclick=async e=>{ const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='rename'){ nxSheet(`<h2>Rename</h2><input class="nx-txt" id="nxRn" maxlength="60" value="${nxEsc(p.title||'')}" placeholder="Untitled" aria-label="Project name"><button class="nx-primary" id="nxRnOk">Save</button>`); $('nxSheet').onclick=null; const ok=async()=>{ await projRename(id,$('nxRn').value.trim()); nxClose(); nxRenderProjects(); }; $('nxRnOk').onclick=ok; $('nxRn').onkeydown=ev=>{ if(ev.key==='Enter') ok(); }; $('nxRn').focus(); }
    else if(k==='dup'){ await projDuplicate(id); nxClose(); await nxRenderProjects(); toast('Duplicated'); }
    else if(k==='file'){ nxClose(); await songFileSave([id], name); }
    else if(k==='del'){ nxSheet(`<h2>Delete “${nxEsc(name)}”?</h2><p style="color:var(--muted);margin:0 0 6px">This removes the project from this device.</p><button class="nx-act danger" id="nxDelOk">Delete project</button><button class="nx-act" id="nxDelNo">Keep it</button>`); $('nxSheet').onclick=null; $('nxDelNo').onclick=nxClose; $('nxDelOk').onclick=async()=>{ await projDelete(id); nxClose(); await nxRenderProjects(); toast('Deleted'); }; } }; }
/* ---- Sharing takes and email news (both optional), in More and in the first-launch screens ---- */
const NX_PRIV='https://troyskinner3.github.io/arcade/noodle/privacy/';
const NX_SHARE_HTML=`<ul><li>If you turn this on, Noodle sends us each take you record: the recording, the notes it heard, and your fixes.</li><li>We use them only to make Noodle hear better. No account, no name, never sold.</li><li>You can stop any time in More, and delete what you shared.</li></ul><label class="nx-chk"><input type="checkbox" id="nxAge"> <span>I'm 13 or older</span></label><p class="sub" style="font-size:14px"><a href="${NX_PRIV}" target="_blank" rel="noopener" style="color:inherit">Privacy policy</a></p>`;
const NX_EMAIL_TEXT='Get news about Noodle and what we are building next. Unsubscribe any time.';
const nxSharing=()=>!!(drop&&drop.api), nxLegacy=()=>!!(drop&&!drop.api);
function nxMoreSync(){ const sw=$('nxShSw'); if(!sw) return; sw.setAttribute('aria-checked',String(nxSharing()||nxLegacy())); $('nxShS').textContent=nxLegacy()?'On, through your test link':nxSharing()?'On. Tap to stop, or to delete what you shared.':'Off. Send recordings and your fixes so Noodle learns. 13+';
  if(nxSharing()) outbox.all().then(a=>{ const n=(a||[]).length; if(n && nxSharing()) $('nxShS').textContent=`On. ${n} take${n>1?'s':''} waiting to send when you’re back online.`; }).catch(()=>{});
  let em=''; try{ em=localStorage.getItem('noodle.email')||''; }catch(e){} $('nxEmS').textContent=em?'Signed up as '+em:'Hear about Noodle and what we build next';
  const dn=GUIDED.filter(g=>guidedDone.has(g[0])).length; $('nxTrP').style.width=Math.round(dn/GUIDED.length*100)+'%'; $('nxTrS').textContent=dn?`${dn} of ${GUIDED.length} tunes done · about 30 seconds each`:'About 30 seconds a tune · do as many as you like'; }
function nxShareSheet(){ if(nxLegacy()){ toast('Sharing is on through your test link.'); return; }
  if(!nxSharing()){ nxSheet(`<h2>Share my takes</h2><div class="nx-ob" style="position:static;padding:0;background:none"><div style="display:flex;flex-direction:column;gap:12px">${NX_SHARE_HTML}</div></div><button class="nx-primary" id="nxShOk" disabled>Share my takes</button>`);
    $('nxSheet').onclick=null; $('nxAge').onchange=e=>{ $('nxShOk').disabled=!e.target.checked; }; $('nxShOk').onclick=()=>{ shareEnable(); nxClose(); nxMoreSync(); toast('Thank you. Sharing is on.'); }; return; }
  nxSheet(`<h2>Share my takes</h2><button class="nx-act" data-a="stop">Stop sharing<small>New takes stay on this device</small></button><button class="nx-act danger" data-a="del">Stop and delete what I shared<small>Removes every take shared from this device</small></button>`);
  $('nxSheet').onclick=async e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const del=b.dataset.a==='del'; nxClose(); const ok=await shareDisable(del); nxMoreSync(); toast(!del?'Sharing is off.':ok?'Sharing is off and your shared takes are deleted.':'Deleting didn’t go through, so nothing changed. Check your connection and try again.',5000); }; }
function nxEmailSheet(){ let em=''; try{ em=localStorage.getItem('noodle.email')||''; }catch(e){}
  nxSheet(`<h2>Email news</h2><p style="color:var(--muted);margin:0 0 10px">${NX_EMAIL_TEXT}</p><input class="nx-txt" id="nxEm" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${nxEsc(em)}" aria-label="Email address"><button class="nx-primary" id="nxEmOk">${em?'Update':'Sign me up'}</button>${em?'<button class="nx-act danger" id="nxEmOff">Take me off the list</button>':''}`);
  $('nxSheet').onclick=null; $('nxEmOk').onclick=async()=>{ const v=$('nxEm').value.trim(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){ toast('That doesn’t look like an email address.'); return; } $('nxEmOk').disabled=true; const ok=await emailSignup(v,NX_EMAIL_TEXT); if(ok){ try{ localStorage.setItem('noodle.email',v); }catch(e){} nxClose(); nxMoreSync(); toast('You’re on the list.'); } else { $('nxEmOk').disabled=false; toast('That didn’t go through. Check your connection and try again.'); } };
  if(em) $('nxEmOff').onclick=async()=>{ const ok=await emailRemove(em); if(ok){ try{ localStorage.removeItem('noodle.email'); }catch(e){} nxClose(); nxMoreSync(); toast('You’re off the list.'); } else toast('That didn’t go through. Try again in a moment.'); }; }
/* Voice check: Noodle plays a short tune, you hum it back, twice. From how wide you sing the jumps it learns your interval profile (S.sq),
   which decides whether your takes get the whole-line reading. If you share takes, these two are sent like any other, with the tune they answer. */
const NX_TUNES=['steps-hum','ode-hum'];   /* the first-launch voice check */
const NX_TITLES={steps:'Up and back, twice',scale:'Up and down the scale',twinkle:'Twinkle, Twinkle',mary:'Mary Had a Little Lamb',ode:'Ode to Joy',jingle:'Jingle Bells',frere:'Frère Jacques',birthday:'Happy Birthday',birthday2:'Happy Birthday, the ending',long:'One long note',
  row:'Row, Row, Row Your Boat',london:'London Bridge',yankee:'Yankee Doodle',saints:'When the Saints',farm:'Old MacDonald',buns:'Hot Cross Buns',joy:'Joy to the World',susanna:'Oh! Susanna',taps:'Taps',kumbaya:'Kumbaya',michael:'Michael, Row the Boat Ashore',
  arpeggio:'Up and down a chord',jumps:'Big jumps',beat:'A drum beat',each:'Kick, snare, hat'};
const nxTune=id=>{ const g=GUIDED.find(x=>x[0]===id)||[id,'','']; return {title:NX_TITLES[g[1]]||g[1], how:g[2]||'', kit:g[3]==='kit'}; };
const nxTuneDone=id=>{ guidedDone.add(id); try{ localStorage.setItem('noodle.guided',JSON.stringify([...guidedDone])); }catch(e){} };
/* The tune to sing back, drawn as a piano roll: keys down the side, one bar per note, a playhead that moves while it plays and while you record.
   It shows the shape and timing to aim for. Your own take is never drawn over it: Noodle is learning how you sing, not marking you. */
function nxRoll(cv, id){ const g=GUIDED.find(x=>x[0]===id)||[], kit=g[3]==='kit', ev=[]; const DR=['hat','snare','kick'];
  if(kit) (G_DRUM[g[1]]||[]).forEach(([st,d])=>ev.push({s:st,l:1.4,r:DR.indexOf(d)})); else { let t=0; (G_MEL[g[1]]||[]).forEach(([pp,l])=>{ if(pp!=null) ev.push({s:t,l,p:pp}); t+=l; }); }
  const N=64, hi=kit?0:Math.max(...ev.map(e=>e.p))+1, lo=kit?0:Math.min(...ev.map(e=>e.p))-1, rows=kit?3:hi-lo+1, BLACK=[1,3,6,8,10];
  const draw=frac=>{ const dpr=window.devicePixelRatio||1, W=cv.clientWidth||300, H=cv.clientHeight||150; if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
    const c=cv.getContext('2d'), cs=getComputedStyle(cv), v=n=>cs.getPropertyValue(n).trim(); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
    const kw=kit?46:22, rh=H/rows, sw=(W-kw)/N, amber=v('--lcd-ink')||'#f1c75b';
    for(let r=0;r<rows;r++){ const blk=!kit&&BLACK.includes(((hi-r)%12+12)%12); c.fillStyle=blk?v('--beat'):v('--cell'); c.fillRect(kw,r*rh,W-kw,rh); c.fillStyle=kit?v('--panel'):blk?'#15171c':'#f3f4f6'; c.fillRect(0,r*rh,kw-2,rh-(kit||blk?0:1));
      if(kit){ c.fillStyle=v('--muted'); c.font='600 11px '+(v('--f-mono')||'monospace'); c.textBaseline='middle'; c.fillText(['Hat','Snare','Kick'][r],6,r*rh+rh/2); } }
    for(let b=0;b<=N;b+=4){ c.fillStyle=b%16===0?v('--barline'):v('--line'); c.globalAlpha=b%16===0?0.9:0.5; c.fillRect(kw+b*sw-(b===N?1:0),0,1,H); } c.globalAlpha=1;
    const ph=frac>=0?clamp(frac,0,1)*N:-1;
    ev.forEach(e=>{ const y=(kit?e.r:hi-e.p)*rh, x=kw+e.s*sw, w=Math.max(3,e.l*sw-1.5), on=ph>=e.s&&ph<e.s+Math.max(e.l,2); c.fillStyle=amber; c.globalAlpha=on?1:ph>e.s?0.45:0.8; const hh=Math.max(4,Math.min(rh-2,14)), yy=y+(rh-hh)/2; c.beginPath(); if(c.roundRect) c.roundRect(x,yy,w,hh,Math.min(3,hh/2)); else c.rect(x,yy,w,hh); c.fill(); }); c.globalAlpha=1;
    if(ph>=0){ c.fillStyle=v('--ink'); c.fillRect(kw+ph*sw-1,0,2,H); } };
  draw(-1); return draw; }
let guideAlong=false;   /* the tune plays quietly under the take (hum-along screens, headphones) */
const alongPref=()=>{ try{ const v=localStorage.getItem('noodle.along'); return v==null?null:v==='1'; }catch(e){ return null; } };
async function headphonesLikely(){ try{ const ds=await navigator.mediaDevices.enumerateDevices(); return ds.some(d=>/airpod|headphone|headset|earbud|earphone|buds|bluetooth|hands-?free/i.test(d.label||'')); }catch(e){ return false; } }
/* "Teach Noodle your voice": three tunes at a time, picking up where you left off (all 50, then round again) */
async function nxTrain(){ for(;;){ let next=GUIDED.map(g=>g[0]).filter(id=>!guidedDone.has(id)); if(!next.length){ next=GUIDED.map(g=>g[0]); }
    const r=await nxVoiceCheck(null,{tunes:next.slice(0,3), train:true}); if(r!=='more') break; } }
async function nxVoiceCheck(done, opt={}){ const TUNES=opt.tunes||NX_TUNES; let result='done'; const O=$('nxOb'), I=$('nxObIn'), A=$('nxObActs'), wait=ms=>new Promise(r=>setTimeout(r,ms)); O.hidden=false; let stop=false, learned=0; const back=S.pid; toastQuiet=true; $('toast').classList.remove('on');
  const end=async()=>{ stop=true; if(recState) cancelRecord(); if(playing&&ctx){ stopAll(); playing=false; } takeBar=null;
    if(S.prompt){ if(back && await projDb.get(back)) await projOpen(back); else await projNew(); }
    toastQuiet=false; O.hidden=true; nxMoreSync(); if(done) done(); return result; };
  const ask=(html,acts)=>new Promise(res=>{ I.innerHTML=html; A.innerHTML=acts.map(([id,label,cls])=>`<button class="${cls}" id="${id}">${label}</button>`).join(''); acts.forEach(([id],k)=>{ $(id).onclick=()=>res(k); }); });
  const left=GUIDED.filter(g=>!guidedDone.has(g[0])).length;
  if(await ask(opt.train ? `<h1>Teach Noodle your voice</h1><p class="sub">Noodle plays a short tune, you sing it back. Each one teaches Noodle a little more about how you sing, so your own songs come out right more often.</p><p class="sub">${TUNES.length} tunes now, about a minute and a half. ${left?left+' of '+GUIDED.length+' still to go.':'You’ve done them all; another round keeps it sharp.'}</p>${nxSharing()||nxLegacy()?'':'<p class="sub">With Share my takes on (below, in More), these also help Noodle improve for everyone.</p>'}`
      : `<h1>Voice check</h1><p class="sub">Noodle plays two short tunes. Hum each one back. It learns how you sing, so your notes come out right more often.</p><p class="sub">Takes about a minute. Somewhere quiet works best.</p>`,[['vcGo','Start','nx-primary'],['vcSkip',opt.train?'Not now':'Skip for now','nx-ghost']])!==0) return end();
  ensureCtx(); if(micOff){ await end(); toast('The microphone isn’t available here.'); return 'done'; }
  for(let i=0;i<TUNES.length && !stop;i++){ let tries=0, good=false; const tu=nxTune(TUNES[i]);
    while(!good && !stop && tries<2){ tries++; await guidedSetup(TUNES[i]); const take=S.tracks.find(t=>!t.guide);
      I.innerHTML=`<p class="sub">Tune ${i+1} of ${TUNES.length} · ${nxEsc(tu.title)}</p><h1 id="vcH">Listen</h1><canvas class="nx-roll" id="vcRoll" aria-label="The tune as a piano roll"></canvas><p class="sub" id="vcS">Just listen.</p><p id="vcHow" style="font-weight:600">Then: ${nxEsc(tu.how)}</p><label class="nx-chk"><input type="checkbox" id="vcAlong"> <span>Play the tune while I record (with headphones on)</span></label>`;
      { const pref=alongPref(), box=$('vcAlong'); box.checked=!!pref; if(pref==null) headphonesLikely().then(h=>{ if(h&&$('vcAlong')===box&&alongPref()==null) box.checked=true; }); box.onchange=()=>{ try{ localStorage.setItem('noodle.along',box.checked?'1':'0'); }catch(e){} }; }
      const roll=nxRoll($('vcRoll'),TUNES[i]), pick=acts=>new Promise(res=>{ A.innerHTML=acts.map(([id,label,cls])=>`<button class="${cls}" id="${id}">${label}</button>`).join(''); acts.forEach(([id],k)=>{ $(id).onclick=()=>res(k); }); });
      const listen=async()=>{ let skip=false; $('vcH').textContent='Listen'; $('vcS').textContent='Just listen.'; A.innerHTML=`<button class="nx-primary" id="vcRecNow">Record now</button><button class="nx-ghost" id="vcStop">Stop</button>`; $('vcStop').onclick=()=>{ stop=true; }; $('vcRecNow').onclick=()=>{ skip=true; };
        await renderDirty(); const L=loopLen(), tS=ctx.currentTime+0.15; startAll(tS,0); playing=true;
        while(ctx.currentTime<tS+L+0.2 && !stop && !skip){ roll((ctx.currentTime-tS)/L); await wait(40); }
        stopAll(); playing=false; roll(-1); return skip; };
      let go=await listen();
      while(!go && !stop){ $('vcH').textContent='Your turn'; $('vcS').textContent='Listen as many times as you like.'; $('vcHow').textContent=tu.how;
        const k=await pick([['vcRec','Record','nx-primary'],['vcAgain','Listen again','nx-ghost'],['vcStop','Stop','nx-ghost']]); if(k===0) go=true; else if(k===1) go=await listen(); else stop=true; }
      if(stop) break;
      $('vcH').textContent='Your turn'; $('vcS').textContent='After four clicks.'; $('vcHow').textContent=tu.how; A.innerHTML=`<button class="nx-ghost" id="vcStop">Stop</button>`; $('vcStop').onclick=()=>{ stop=true; }; $('vcAlong').disabled=true;
      guideAlong=$('vcAlong').checked; try{ await recordInto(take.id); } finally{ guideAlong=false; } if(!recState){ await end(); toast('The microphone isn’t available here.'); return; }
      while((recState||rs.mode) && !stop){ const r=recState; if(r&&ctx){ $('vcS').textContent=$('recLabel').textContent; roll(ctx.currentTime<r.start?-1:(ctx.currentTime-r.start)/(r.end-r.start)); } else { $('vcS').textContent='Listening to your take…'; roll(-1); } await wait(40); }
      if(stop) break; if(playing){ stopAll(); playing=false; } takeBar=null;
      const tk=S.tracks.find(t=>!t.guide); good=!!(tk&&(tu.kit ? (tk.hits||[]).length>=4 : /^long-/.test(TUNES[i]) ? (tk.notes||[]).length>=1 : (tk.notes||[]).length>=5));
      if(good){ if(!drop && tk.notes && !tu.kit){ learnSqueeze(tk); persist(); } nxTuneDone(TUNES[i]); learned++; }   /* when sharing is on, sending the take already counted it */
      else if(tries<2){ if(await ask(`<h1>Let’s try that once more</h1><p class="sub">I couldn’t hear enough of it. A little louder, closer to the phone.</p>`,[['vcRe','Try again','nx-primary'],['vcStop2','Stop','nx-ghost']])!==0) stop=true; } } }
  if(stop) return end();
  try{ if(learned) localStorage.setItem('noodle.voice',String(Date.now())); }catch(e){}
  if(opt.train){ const dn=GUIDED.filter(g=>guidedDone.has(g[0])).length;
    const k=await ask(learned ? `<h1>Nice.</h1><p class="sub">Noodle knows your voice a little better now.</p><p class="sub">${dn} of ${GUIDED.length} tunes done.</p>` : `<h1>That didn’t work this time</h1><p class="sub">I couldn’t hear the tunes clearly, so nothing changed.</p>`,[['vcMore',learned?'Do three more':'Try again','nx-primary'],['vcDone','Done for now','nx-ghost']]);
    if(k===0) result='more'; return end(); }
  await ask(learned ? `<h1>All set</h1><p class="sub">Thanks. Noodle knows your voice a little better now.</p><p class="sub">You can teach it more any time in More.</p>`
    : `<h1>That didn’t work this time</h1><p class="sub">I couldn’t hear the tunes clearly, so nothing changed. You can try again any time in More.</p>`,[['vcDone','Done','nx-primary']]);
  return end(); }
/* First launch: what Noodle is, then the two optional choices. Shown once. */
function nxOnboard(done){ const O=$('nxOb'), I=$('nxObIn'), A=$('nxObActs'); O.hidden=false; let step=0;
  const finish=()=>{ try{ localStorage.setItem('noodle.onboard','1'); }catch(e){} nxMoreSync(); nxVoiceCheck(done); };
  const show=()=>{ if(step===1 && (nxSharing()||nxLegacy())) step=2;
    if(step===0){ I.innerHTML=`<div class="brand2">Noodle</div><h1>Get the song out of your head</h1><p class="sub">Hum, sing or beatbox. Noodle turns it into instruments you can edit. Then share it with friends, post it, or take it into your DAW to finish.</p><div class="nx-ways"><div><b>Audio</b><span>Send it to friends, or put it on SoundCloud</span></div><div><b>Video</b><span>Post it on TikTok, Reels or YouTube, or keep editing in CapCut</span></div><div><b>DAW pack</b><span>Every track as audio and MIDI, with the tempo and key, for Logic, Ableton, FL Studio or GarageBand</span></div></div>`; A.innerHTML=`<button class="nx-primary" id="obN">Get started</button>`; $('obN').onclick=()=>{ step=1; show(); }; }
    else if(step===1){ I.innerHTML=`<h1>Help Noodle get better?</h1>${NX_SHARE_HTML}`; A.innerHTML=`<button class="nx-primary" id="obY" disabled>Share my takes</button><button class="nx-ghost" id="obS">Not now</button>`;
      $('nxAge').onchange=e=>{ $('obY').disabled=!e.target.checked; }; $('obY').onclick=()=>{ shareEnable(); step=2; show(); }; $('obS').onclick=()=>{ step=2; show(); }; }
    else { I.innerHTML=`<h1>Want news?</h1><p class="sub">${NX_EMAIL_TEXT}</p><input class="nx-txt" id="obEm" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" aria-label="Email address">`; A.innerHTML=`<button class="nx-primary" id="obE">Sign me up</button><button class="nx-ghost" id="obK">Skip</button>`;
      $('obK').onclick=finish; $('obE').onclick=async()=>{ const v=$('obEm').value.trim(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){ toast('That doesn’t look like an email address.'); return; } $('obE').disabled=true; const ok=await emailSignup(v,NX_EMAIL_TEXT); if(ok){ try{ localStorage.setItem('noodle.email',v); }catch(e){} finish(); } else { $('obE').disabled=false; toast('That didn’t go through. You can sign up later in More.'); } }; } };
  show(); }
function nxInit(){ $('nxPro').onclick=()=>proSheet(); nxProSync();
  if(window.NOODLE_DEV){ const dv=$('nxDev'), sync=()=>dv.querySelectorAll('[data-dv]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dv===devAs()))); dv.hidden=false; sync();
    dv.onclick=e=>{ const b=e.target.closest('[data-dv]'); if(!b) return; try{ localStorage.setItem('noodle.devAs',b.dataset.dv); }catch(err){} sync(); nxProSync(); try{ renderTracks(); if(s2.edId!=null) s2EdMount(); }catch(err){} toast(b.dataset.dv?'Testing as '+(b.dataset.dv==='pro'?'Pro':'Free'):'Using your real App Store purchase'); }; } if(proBridge()) try{ window.webkit.messageHandlers.noodlePro.postMessage('state'); }catch(e){}
  { const sw=$('nxCrSw'); sw.setAttribute('aria-checked',String(crashOn())); sw.onclick=()=>{ const on=!crashOn(); try{ localStorage.setItem(CRASH_KEY,on?'1':'0'); }catch(e){} sw.setAttribute('aria-checked',String(on)); }; }
  $('nxTrainCard').onclick=()=>nxTrain(); $('nxShSw').onclick=nxShareSheet; $('nxEmail').onclick=nxEmailSheet; nxMoreSync(); $('nxTabP').onclick=()=>nxGo('projects'); $('nxTabM').onclick=()=>nxGo('more'); $('nxPlus').onclick=nxNew;
  $('nxQ').oninput=nxRenderProjects; $('nxScrim').onclick=e=>{ if(e.target===$('nxScrim')) nxClose(); }; nxSheetSwipe();
  $('nxSort').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; nxSortBy=b.dataset.s; [...$('nxSort').children].forEach(x=>x.setAttribute('aria-pressed',x===b)); nxRenderProjects(); };
  $('nxList').onclick=async e=>{ const m=e.target.closest('[data-menu]'), o=e.target.closest('[data-id]'); if(m) return nxMenu(m.dataset.menu); if(!o) return; if(o.dataset.id!==S.pid) await projOpen(o.dataset.id); nxGo('studio'); };
  /* the app opens on Projects, unless you were just working (a reload mid-work brings you back to your song) */
  let lastAt=0; try{ lastAt=+localStorage.getItem('noodle.active')||0; }catch(e){}
  nxResume = !nxSongEmpty() && Date.now()-lastAt<10*60*1000;
  let touched=0; const touch=()=>{ const n=Date.now(); if(n-touched<20000) return; touched=n; try{ localStorage.setItem('noodle.active',n); }catch(e){} }; touch(); ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,touch,{capture:true,passive:true})); }
