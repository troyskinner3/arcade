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
    ${cur&&beatPro(BEATS.find(b=>b.id===cur))?pvLine('Previewing '+BEATS.find(b=>b.id===cur).name):''}<button class="nx-primary" id="btUse" ${cur?'':'disabled'}>Use this beat</button>`); };
  draw();
  $('nxSheet').onclick=e=>{ let x;
    if(e.target.closest('[data-a="pvpro"]')){ proSheet(); return; }
    if(x=e.target.closest('[data-beat]')){ const b=BEATS.find(y=>y.id===x.dataset.beat); cur=b.id; beatTry(b); const sc=$('nxSheet').scrollTop; draw(); $('nxSheet').scrollTop=sc; return; }
    if(e.target.closest('#btUse')&&cur){ const b=BEATS.find(y=>y.id===cur); if(beatPro(b)){ proSheet(b.name+' and the other Pro beats are part of Noodle Pro.'); return; }
      beatUse(); nxClose(); toast(`${b.name} is in your song. Tap record to rap or sing over it, or tap a track to change its sound.`,6000); } }; }
/* ---- Finish song (owner, Nov 2026; free): one tap fills in what a song is missing, so it has at least drums, bass, chords (keys or pad),
   a melody (lead, arp or vocals), transitions and a mix effect. Built from a free beat's patterns and sounds, in the song's key and tempo,
   following its own melody when there is one (chords come from the melody, the bass from the chords, an arp plays the chords when there's no
   melody). Every new part is an ordinary part (edit it, change its sound, delete it); one Undo takes them all out; tapping again after
   Undo gives a different combination. ---- */
function songRoles(){ const real=S.tracks.filter(t=>!t.guide&&!t._pvTemp&&hasContent(t)), has=f=>real.some(f);
  return {any:real.length>0, drums:has(t=>/drum/.test(INST[t.inst].kind)), bass:has(t=>t.inst==='bass'), chords:has(t=>t.inst==='keys'||t.inst==='pad'),
    melody:has(t=>t.inst==='lead'||t.inst==='arp'||(t.inst==='vox'&&t.va!=null)), fx:has(t=>t.inst==='fx'), mix:has(t=>t.inst==='mix')}; }
const finishMissing=()=>{ const r=songRoles(); return r.any?['drums','bass','chords','melody','fx','mix'].filter(k=>!r[k]):[]; };
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
async function finishSong(){ const miss=finishMissing(); if(!miss.length) return false; if(miss.includes('melody')) try{ await loadMusical(); }catch(e){}   /* the melody tables (lead melodies) */
  pvEnd(true); flushSave();
  const free=BEATS.filter(b=>!b.pro), near=free.filter(b=>Math.abs(b.bpm-S.bpm)<=20), b=pickOne(near.length?near:free);
  const pitched=S.tracks.some(t=>!t.guide&&t.notes&&t.notes.length&&INST[t.inst].kind==='pitched');
  let K=currentKey(); if(K.none||!pitched){ S.key=String(b.tonic); S.scale=b.scale; keyCache=null; scaleCache=null; K=currentKey(); }   /* nothing pitched yet: the song takes the beat's key, so it doesn't change once notes arrive */
  K={...K, set:SCALES[PARENT[K.scale]||K.scale]||K.set};   /* the melody, chords and bass all use the same scale */
  if(S.bars<4) S.bars=4;
  const base=beatTracks(b,K.tonic,K.scale), add=[], got=[], ok=snd=>!proLocked(snd);
  const fromBeat=k=>base.find(t=>k==='drums'?t.inst==='kit':k==='bass'?t.name==='Bass':t.name==='Chords');
  /* the chords to follow: the song's own chord part, else chords made from its melody, else the beat's progression */
  const real=S.tracks.filter(t=>!t.guide&&hasContent(t)), chordPart=real.find(t=>(t.inst==='keys'||t.inst==='pad')&&t.notes&&t.notes.length), mel=real.find(t=>(t.inst==='lead'||t.inst==='vox'||t.inst==='arp')&&melodyNotes(t).length);
  let chords=chordPart;
  if(miss.includes('chords')){ const c=b.chords; let t;
    if(mel){ const ch=harmonize(melodyNotes(mel),K,pSteps(mel),1); if(ch&&ch.length) t=mkTrack(c.inst,{id:S.nextId++, off:mel.off||0, len:mel.len, lenSet:true, rep:mel.rep, sound:c.sound, vol:c.vol||55, send:c.send??30, chordType:c.type||'triad', notes:ch.map(x=>({s:x.s,l:x.l,p:x.root,v:0.72,x:true}))}); }
    if(!t) t=fromBeat('chords');
    if(t){ if(c.tfx) t.tfx={...c.tfx}; t.picked=true; delete t.name; add.push(t); chords=t; got.push('chords'); } }
  const roots=chords&&chords.notes&&chords.notes.length?{off:chords.off||0, len:chords.len||4, rep:chords.rep!==false, notes:chords.notes.slice().sort((a,c)=>a.s-c.s)}:null;
  if(miss.includes('bass')){ let t;
    if(roots){ const rh=b.bass.rhythm, n=[]; for(const c of roots.notes){ const root=b.bass.oct+((Math.round(c.p)-b.bass.oct)%12+12)%12; let cur=null;
        for(let s=c.s;s<c.s+c.l;s++){ const ch=rh[s%16]; if(ch==='x'){ cur={s,l:1,p:root,v:0.85}; n.push(cur); } else if(ch==='='&&cur) cur.l++; else cur=null; } }
      if(n.length) t=mkTrack('bass',{id:S.nextId++, off:roots.off, len:roots.len, lenSet:true, rep:roots.rep, sound:b.bass.sound, vol:74, notes:n}); }
    if(!t) t=fromBeat('bass');
    if(t){ t.picked=true; delete t.name; add.push(t); got.push('bass'); } }
  if(miss.includes('drums')){ const t=fromBeat('drums'); if(t){ t.picked=true; delete t.name; add.push(t); got.push('drums'); } }
  if(miss.includes('melody')){ const src0=roots||null;
    /* a lead melody written over the chords, most of the time (genMelody: learned from real tunes); otherwise an arp playing the chords */
    const leadSrc=src0||{off:0,len:4,rep:true,notes:(fromBeat('chords')||{notes:[]}).notes};
    if(typeof genMelody==='function'&&MZ&&leadSrc.notes.length&&Math.random()<0.7){ const bars=Math.max(1,Math.round(leadSrc.len)), span=bars*16, ns=leadSrc.notes;
      const chordAt=st=>{ const q=((st%span)+span)%span, c=ns.find(n=>q>=n.s&&q<n.s+n.l); return c?new Set(chordTones(Math.round(c.p),'triad').map(x=>((x%12)+12)%12)):null; };
      const notes=genMelody(K,bars,chordAt);
      if(notes&&notes.length){ const snd=pickOne(['Bell','Square','Saw','Supersaw','Guitar'].filter(ok)); add.push(mkTrack('lead',{id:S.nextId++, off:leadSrc.off, len:leadSrc.len, lenSet:true, rep:leadSrc.rep, sound:snd, vol:snd==='Supersaw'||snd==='Saw'?40:48, send:35, picked:true, notes:notes.map(n=>({...n,x:true}))})); got.push('a melody'); } }
  }
  if(miss.includes('melody')&&!got.includes('a melody')){ const src=roots||{off:0,len:4,rep:true,notes:b.prog.map((d,bar)=>({s:bar*16,l:16,p:48+(((K.tonic+((SCALES[PARENT[K.scale]||K.scale]||SCALES[b.scale])[d%7]))%12)+12)%12}))};
    const snd=pickOne(['Pluck','Bell','Square','Glass'].filter(ok)), t=mkTrack('arp',{id:S.nextId++, off:src.off, len:src.len, lenSet:true, rep:src.rep, sound:snd, vol:42, send:35, chordType:'triad', picked:true, notes:src.notes.map(n=>({s:n.s,l:n.l,p:62+((Math.round(n.p)-62)%12+12)%12,v:0.7,x:true}))});
    add.push(t); got.push('a melody'); }
  if(miss.includes('fx')){ const fxs=[]; for(let bar=0;bar<S.bars;bar+=4){ fxs.push({...fxNew('sweepDown',bar*16,S.bars*16),l:8,v:0.3}); const end=Math.min(S.bars,bar+4); fxs.push({...fxNew('sweepUp',(end-1)*16,S.bars*16),v:0.3}); }
    const t=mkTrack('fx',{id:S.nextId++, off:0, len:S.bars, lenSet:true, rep:false}); t.fxs=fxs; add.push(t); got.push('transitions'); }
  if(miss.includes('mix')){ const t=mkTrack('mix',{id:S.nextId++, off:(S.bars-1)*16, len:1, lenSet:true, rep:false}); t.mfx={k:'lp', curve:{nodes:[{t:0,v:0},{t:0.85,v:0.28},{t:1,v:0}], curves:[null,null]}, params:{}}; t.picked=true; add.push(t); got.push('a mix effect'); }   /* a gentle low-pass dip into the loop */
  if(!add.length) return false;
  S.tracks.push(...add); add.forEach(t=>{ t._dirty=true; try{ autoOct(t); }catch(e){} }); keyCache=null; S.tracks.forEach(t=>{ t._dirty=true; });
  warmSounds(); save(); renderTracks(); scheduleRender();
  const list=got.length>1?got.slice(0,-1).join(', ')+' and '+got[got.length-1]:got[0];
  toast(`Added ${list}. Undo takes them out.`,5200); return true; }
