"use strict";
/* ---- Beats to start from: drums, bass and chords (plus a few effects), made with Noodle's own sounds, so every part can be edited like one you
   recorded. Tapping a beat plays it in your song (a try: nothing is saved); "Use this beat" keeps it. With nothing recorded yet, the song takes
   the beat's tempo and key; otherwise the beat follows your song's key and tempo. One beat per style is free; the rest are Pro (tried by free users).
   Drums: one character per 16th step ("x" hit, "o" soft, "-" rest), one or two bars. Chords: a scale degree per bar (0 = home). Bass: a rhythm per
   bar on each chord's root ("x" new note, "=" hold it). ---- */
const BEATS=[
 {id:'trap1', name:'Night Drive', style:'Trap', bpm:140, tonic:9, scale:'minor', swing:0, kit:'808', prog:[0,5,2,6],
  drums:{kick:'x------x--x-----x-----x-x-------', snare:'--------x---------------x-------', hat:'x-x-x-x-x-xxx-x-x-x-x-x-xxxxx-x-', openhat:'---------------x---------------x'},
  bass:{sound:'808 glide', rhythm:'x======x==x=====', oct:36}, chords:{inst:'pad', sound:'Warm pad', type:'triad', vol:52},
  extra:{inst:'arp', sound:'Bell', type:'triad', vol:44}, master:{drive:25,punch:65,rev:40}},
 {id:'trap2', name:'Glacier', style:'Trap', pro:true, bpm:145, tonic:5, scale:'minor', swing:0, kit:'808', prog:[0,3,5,4],
  drums:{kick:'x-----x---x-----x-----x--x-x----', snare:'--------x---------------x-------', hat:'x-x-x-xxx-x-x-x-x-x-x-x-x-xxxx-x', clap:'--------x---------------x-------'},
  bass:{sound:'808 glide', rhythm:'x=====x===x=====', oct:36}, chords:{inst:'keys', sound:'Glass', type:'seventh', vol:50, tfx:{echo:45}},
  master:{drive:25,punch:65,rev:45}, fx:{k:'washout', bar:3}},
 {id:'boom1', name:'Dusty Steps', style:'Boom bap', bpm:90, tonic:2, scale:'minor', swing:30, kit:'Punchy', prog:[0,5,3,4],
  drums:{kick:'x-----x-x-------x-----x---x-----', snare:'----x-------x-------x-------x-o-', hat:'x-o-x-o-x-o-x-o-x-o-x-o-x-o-x-oo'},
  bass:{sound:'Sub', rhythm:'x=====x=x=======', oct:38}, chords:{inst:'keys', sound:'E-piano', type:'seventh', vol:56, rhythm:'x=======----x===', send:30},
  master:{drive:35,punch:55,rev:30}},
 {id:'boom2', name:'Corner Store', style:'Boom bap', pro:true, bpm:88, tonic:0, scale:'minor', swing:28, kit:'Rock', prog:[0,0,5,4],
  drums:{kick:'x--x--x-x-------x--x----x-x-----', snare:'----x-------x-------x-------x---', hat:'x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-'},
  bass:{sound:'Rock bass', rhythm:'x==x==x=x=======', oct:36}, chords:{inst:'keys', sound:'Piano', type:'seventh', vol:54, rhythm:'x===----x=--x===', tfx:{drive:30}},
  master:{drive:40,punch:60,rev:25}},
 {id:'lofi1', name:'Rainy Window', style:'Lo-fi', bpm:78, tonic:3, scale:'major', swing:45, kit:'Lo-fi', prog:[0,5,1,4],
  drums:{kick:'x-------x-x-----x-------x-----x-', snare:'----x-------x-------x-------x---', hat:'x-o-x-o-x-o-x-o-x-o-x-o-x-o-xoo-'},
  bass:{sound:'Sub', rhythm:'x=======x=====x=', oct:39}, chords:{inst:'keys', sound:'E-piano', type:'seventh', vol:58, send:45},
  master:{drive:20,punch:40,rev:60}, fx:{k:'lp', bar:0}},
 {id:'lofi2', name:'Paper Plane', style:'Lo-fi', pro:true, bpm:80, tonic:9, scale:'major', swing:40, kit:'Brushes', kitVol:100, prog:[3,4,2,5],
  drums:{kick:'x-------x-------x-------x-x-----', snare:'----x-------x-------x-------x---', hat:'x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-', ride:'--------------------------------'},
  bass:{sound:'Rock bass', rhythm:'x=======x===x===', oct:33}, chords:{inst:'keys', sound:'Piano', type:'ninth', vol:70, tfx:{chorus:40}, send:45},
  master:{drive:30,punch:45,rev:55}},
 {id:'drill1', name:'Night Bus', style:'Drill', bpm:142, tonic:7, scale:'minor', swing:0, kit:'808', prog:[0,5,6,4],
  drums:{kick:'x------x---x------x---x---x-----', snare:'--------x---------------x---o---', hat:'x--x--x-x--x--x-x--x--x-x-x-x--x'},
  bass:{sound:'808 glide', rhythm:'x======x===x====', oct:31}, chords:{inst:'pad', sound:'Choir', type:'triad', vol:50},
  master:{drive:30,punch:65,rev:45}},
 {id:'drill2', name:'Cold Front', style:'Drill', pro:true, bpm:144, tonic:1, scale:'minor', swing:0, kit:'808', prog:[0,3,5,6],
  drums:{kick:'x------x--x-------x----x--x-----', snare:'--------x---------------x-o-----', hat:'x--x--x-x-xx-x-x--x--x-x-x-xx-x-'},
  bass:{sound:'Reese', rhythm:'x======x==x=====', oct:37}, chords:{inst:'pad', sound:'Strings', type:'triad', vol:52, tfx:{echo:35}},
  master:{drive:30,punch:60,rev:50}, fx:{k:'phaser', bar:3}},
 {id:'pop1', name:'Sunny Side', style:'Pop', bpm:112, tonic:0, scale:'major', swing:0, kit:'Punchy', prog:[0,4,5,3],
  drums:{kick:'x---x---x---x---', snare:'----x-------x---', clap:'----x-------x---', hat:'x-x-x-x-x-x-x-x-'},
  bass:{sound:'Synth bass', rhythm:'x=x=x=x=x=x=x=x=', oct:36}, chords:{inst:'keys', sound:'Piano', type:'triad', vol:56, rhythm:'x===x===x===x==='},
  extra:{inst:'pad', sound:'Warm pad', type:'triad', vol:38}, master:{drive:20,punch:60,rev:45}, fx:{k:'hp', bar:3}},
 {id:'pop2', name:'Weekend', style:'Pop', pro:true, bpm:118, tonic:7, scale:'major', swing:0, kit:'Punchy', prog:[0,5,3,4],
  drums:{kick:'x---x---x---x---', snare:'----x-------x---', clap:'----x-------x---', hat:'xox-xox-xox-xoxx'},
  bass:{sound:'Synth bass', rhythm:'x=-xx=-xx=-xx=x=', oct:31}, chords:{inst:'keys', sound:'Supersaw', type:'triad', vol:48, rhythm:'x=-x=-x=--x=-x=-', tfx:{chorus:35}},
  extra:{inst:'pad', sound:'Strings', type:'triad', vol:40}, master:{drive:25,punch:65,rev:45}},
 {id:'rnb1', name:'Velvet', style:'R&B', bpm:92, tonic:5, scale:'minor', swing:20, kit:'Punchy', prog:[0,3,6,2],
  drums:{kick:'x------x--x-----x-----x---x-----', snare:'----x-------x-------x-------x---', clap:'----x-------x-------x-------x---', hat:'x-xxx-x-x-xxx-x-x-xxx-x-x-xxx-x-'},
  bass:{sound:'Sub', rhythm:'x=====x===x=====', oct:41}, chords:{inst:'keys', sound:'E-piano', type:'ninth', vol:56, send:40},
  master:{drive:15,punch:50,rev:55}},
 {id:'afro1', name:'Lagos Sun', style:'Afrobeats', pro:true, bpm:106, tonic:9, scale:'major', swing:12, kit:'Punchy', prog:[0,3,5,4],
  drums:{kick:'x--x--x---x--x--', snare:'------x-------x-', rim:'--x--x----x--x--', hat:'x-xxx-xxx-xxx-xx', conga:'---x---x-x-x---x'},
  bass:{sound:'Synth bass', rhythm:'x==x==x=--x==x==', oct:33}, chords:{inst:'keys', sound:'Guitar', type:'triad', vol:52, rhythm:'--x--x--x--x--x-', tfx:{echo:30}},
  master:{drive:20,punch:55,rev:40}}];
const beatPro=b=>!!b.pro&&!isPro();
/* the beat's tracks, in a key (tonic, scale): 4 bars of chords, bass and drums, looping through the song */
function beatTracks(b, tonic, scale){ const par=PARENT[scale]||scale, set=SCALES[par]&&SCALES[par].length===7?SCALES[par]:SCALES[b.scale], root=d=>tonic+set[d%7], out=[], id=()=>S.nextId++;
  const pat=(p,len)=>{ const r=[]; for(let s=0;s<len;s++){ const ch=p[s%p.length]; if(ch==='x'||ch==='o') r.push({s,ch}); } return r; };
  const drumLen=Math.max(...Object.values(b.drums).map(p=>p.length)), hits=[];
  for(const [d,p] of Object.entries(b.drums)) for(const {s,ch} of pat(p,drumLen)) hits.push({s, d:(S.kit.slots.find(x=>x.sound===d)||{id:d}).id, v:ch==='o'?0.5:d==='hat'?0.7:0.95});
  out.push(mkTrack('kit',{id:id(), len:drumLen/16, sound:b.kit, hits:hits.sort((a,c)=>a.s-c.s), fill:4, vol:b.kitVol||80, name:'Drums'}));
  const rhythmNotes=(rh,p)=>{ const n=[]; for(let bar=0;bar<4;bar++){ const r=root(b.prog[bar]); let cur=null; for(let s=0;s<16;s++){ const ch=rh[s]; if(ch==='x'){ cur={s:bar*16+s,l:1,p:p(r),v:0.85}; n.push(cur); } else if(ch==='='&&cur) cur.l++; else cur=null; } } return n; };
  const bass=b.bass; out.push(mkTrack('bass',{id:id(), off:0, len:4, rep:true, lenSet:true, sound:bass.sound, vol:74, name:'Bass', notes:rhythmNotes(bass.rhythm,r=>bass.oct+((r-bass.oct)%12+12)%12)}));
  for(const c of [b.chords,b.extra].filter(Boolean)){ const notes=c.rhythm?rhythmNotes(c.rhythm,r=>48+((r%12)+12)%12):b.prog.map((d,bar)=>({s:bar*16,l:16,p:48+((root(d)%12)+12)%12,v:0.75}));
    const t=mkTrack(c.inst,{id:id(), off:0, len:4, rep:true, lenSet:true, sound:c.sound, vol:c.vol||55, send:c.send??30, chordType:c.type||'triad', name:c===b.chords?'Chords':'Pad', notes:notes.map(n=>({...n,x:true}))});
    if(c.tfx) t.tfx={...c.tfx}; out.push(t); }
  if(b.fx){ const f=mkTrack('mix',{id:id(), off:b.fx.bar*16, len:1, rep:false, lenSet:true}); f.mfx={k:b.fx.k, curve:null, params:{}}; out.push(f); }
  return out; }
/* try a beat in this song: tracks only for the try (never saved); a song with nothing in it takes the beat's tempo, key and feel */
function beatTry(b){ pvEnd(true); const fresh=!S.tracks.some(t=>!t.guide&&hasContent(t)), K=currentKey();
  if(fresh){ S._pvOrig={bpm:S.bpm, key:S.key, scale:S.scale, swing:S.swing, bars:S.bars, master:copyJ(S.master)}; S.bpm=b.bpm; S.key=String(b.tonic); S.scale=b.scale; S.swing=b.swing; S.bars=Math.max(8,S.bars); S.master=Object.assign({},S.master,b.master); keyCache=null; }
  const tonic=fresh||K.none?b.tonic:K.tonic, scale=fresh||K.none?b.scale:K.scale;
  const ts=beatTracks(b,tonic,scale); ts.forEach(t=>{ t._pvTemp=true; t._dirty=true; }); S.tracks.push(...ts); ts.forEach(t=>{ try{ autoOct(t); }catch(e){} }); keyCache=null; S.tracks.forEach(t=>t._dirty=true);
  warmSounds(); renderTracks(); pvOpen(b.name+(b.pro?' (Pro beat)':' beat'), ts.find(t=>t.name==='Chords')||ts[0]); return ts; }
/* keep it */
function beatUse(){ S.tracks.forEach(t=>{ delete t._pvTemp; }); delete S._pvOrig; const p=proPv; proPv=null; if(p&&p.started!=null){ s2.sec=p.sec; s2.loop=p.loop; }
  keyCache=null; save(); renderTracks(); scheduleRender(); }
function beatSheet(){ let cur=null; const styles=[...new Set(BEATS.map(b=>b.style))];
  const draw=()=>{ nxSheet(`<h2>Beats</h2><p style="color:var(--muted);font-size:14px;margin:-4px 0 10px">Tap one to hear it.</p>
    ${styles.map(st=>`<div class="s2-sg">${nxEsc(st)}</div><div class="bt-grid">${BEATS.filter(b=>b.style===st).map(b=>`<button class="bt" data-beat="${b.id}" aria-pressed="${cur===b.id}"><b>${nxEsc(b.name)}</b><small>${b.bpm} BPM</small>${b.pro&&!isPro()?PRO_LOCK:''}</button>`).join('')}</div>`).join('')}
    ${cur&&beatPro(BEATS.find(b=>b.id===cur))?pvLine('Trying '+BEATS.find(b=>b.id===cur).name):''}<button class="nx-primary" id="btUse" ${cur?'':'disabled'}>Use this beat</button>`); };
  draw();
  $('nxSheet').onclick=e=>{ let x;
    if(e.target.closest('[data-a="pvpro"]')){ proSheet(); return; }
    if(x=e.target.closest('[data-beat]')){ const b=BEATS.find(y=>y.id===x.dataset.beat); cur=b.id; beatTry(b); const sc=$('nxSheet').scrollTop; draw(); $('nxSheet').scrollTop=sc; return; }
    if(e.target.closest('#btUse')&&cur){ const b=BEATS.find(y=>y.id===cur); if(beatPro(b)){ proSheet(b.name+' and the other Pro beats are part of Noodle Pro.'); return; }
      beatUse(); nxClose(); toast(`${b.name} is in your song. Tap record to rap or sing over it, or tap a track to change its sound.`,6000); } }; }
