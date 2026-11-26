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
  warmSounds(); renderTracks(); const hear=ts.find(t=>t.name==='Chords')||ts[0]; if(beatPro(b)) pvOpen(b.name+' (Pro beat)', hear); else { if(!proPv) proPv={labels:[]}; pvPlay(hear); } return ts; }   /* only a Pro beat is named in the "is Pro" note (a free one was, when the sheet closed) */
/* keep it */
function beatUse(){ S.tracks.forEach(t=>{ delete t._pvTemp; }); delete S._pvOrig; const p=proPv; proPv=null; if(p&&p.started!=null){ s2.sec=p.sec; s2.loop=p.loop; }
  keyCache=null; save(); renderTracks(); scheduleRender(); }
function beatSheet(){ let cur=null; const styles=[...new Set(BEATS.map(b=>b.style))];
  const draw=()=>{ nxSheet(`<h2>Beats</h2><p style="color:var(--muted);font-size:14px;margin:-4px 0 10px">Tap one to hear it.</p>
    ${styles.map(st=>`<div class="s2-sg">${nxEsc(st)}</div><div class="bt-grid">${BEATS.filter(b=>b.style===st).map(b=>`<button class="bt" data-beat="${b.id}" aria-pressed="${cur===b.id}"><b>${nxEsc(b.name)}</b><small>${b.bpm} BPM</small>${b.pro&&!isPro()?PRO_LOCK:''}</button>`).join('')}</div>`).join('')}
    ${cur?`<div class="pro-foot">${beatPro(BEATS.find(b=>b.id===cur))?pvLine('Previewing '+BEATS.find(b=>b.id===cur).name):''}<button class="nx-primary" id="btUse">${beatPro(BEATS.find(b=>b.id===cur))?'Get Pro to use this beat':'Use this beat'}</button></div>`:''}`); };   /* once a beat is picked, the next step is pinned to the bottom (owner, 26 Nov) */
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
/* Finish song, round 29 (owner, 26 Nov): it works on the song's real length and its sections. The length is where your own parts end; a song
   shorter than 8 bars grows to 8 (your parts repeat; the second half lifts), empty bars after your parts are never filled. Sections come
   from the Sections row (their types: Intro, Verse, Pre-chorus, Chorus, Drop, Bridge, Solo, Breakdown, Outro), else they're worked out from
   where parts start and stop (and marked there). Each section is filled for its job: energy decides the drums (sparse to full, a fill into
   a chorus), the chords (progressions and harmonic rhythm learned per genre and section type: genre.json), the comping and bass rhythm
   (plain or syncopated: GROOVES), and whether there's a lead (the hook is in the chorus; the same one each time). Transitions go where
   sections change, the mix effect on a real moment. Your own parts are never changed. One Undo takes it all out. */
let GEN=null, genLoad=null;
function loadGenre(){ return genLoad||(genLoad=fetch(new URL('genre.json',location.href)).then(r=>r.ok?r.json():null).then(j=>{ GEN=j; return j; }).catch(()=>{ genLoad=null; return null; })); }
const SEC_ROLE={Intro:{k:'intro',e:0.3},Verse:{k:'verse',e:0.55},'Pre-chorus':{k:'pre',e:0.7},Chorus:{k:'chorus',e:1},Drop:{k:'chorus',e:1},Bridge:{k:'bridge',e:0.6},Solo:{k:'solo',e:0.8},Breakdown:{k:'bridge',e:0.25},Outro:{k:'outro',e:0.35}};
const STYLE_GENRE={Trap:'hiphop',Drill:'hiphop','Boom bap':'hiphop','Lo-fi':'rnb',Pop:'pop','R&B':'rnb',Afrobeats:'latin'};
const GENRE_DRUMS={hiphop:'hiphop',pop:'pop',rnb:'funk',latin:'latin',rock:'rock',country:'country',electronic:'pop'};
/* livelier rhythms (round 29, owner: "a little more lively and less computer generated"): syncopated 1-bar patterns used next to the learned
   ones (which come mostly from hymns and folk tunes, so they sit on the beat). Steps of a 16-step bar. */
const GROOVES={comp:[[0,3,10],[0,3,6,10],[0,3,8,11],[0,6,10],[0,3,6],[0,3,6,8,11,14],[0,6,8,14],[2,6,10,14],[0,3,10,12]],
  bass:[[0,3,6,10],[0,3,10],[0,6,8,14],[0,3,6,8,11,14],[0,10],[0,7,10]]};
function genProg(K, role, genre, avoid){ const md=K.set.includes(3)&&!K.set.includes(4)?'min':'maj', rk=(SEC_ROLE[role]||SEC_ROLE.Verse).k;
  const g=GEN&&GEN.prog, list=g&&((g[genre]&&g[genre][rk]&&g[genre][rk][md])||(g.pop&&g.pop[rk]&&g.pop[rk][md])||(g.pop&&g.pop.verse&&g.pop.verse[md]));
  if(!list||!list.length){ const p=harmProg(K); return p||[0,4,5,3].map((d,b)=>({s:b*16,l:16,p:48+((K.tonic+K.set[d%K.set.length])%12)})); }
  let loop=null; for(let k=0;k<8;k++){ loop=wpick(list,x=>x[1]*(new Set(x[0].split(',')).size>=3?1.5:1))[0]; if(!avoid||loop.split(',')[0]!==avoid) break; }
  const rl=(GEN.rhythm&&(GEN.rhythm[rk]||GEN.rhythm.verse))||[['0,16,32,48',1]], starts=wpick(rl)[0].split(',').map(Number), rs=loop.split(',').map(Number);
  return starts.map((s,i)=>({s, l:(i<starts.length-1?starts[i+1]:64)-s, p:48+((K.tonic+rs[i%rs.length])%12), r:rs[i%rs.length]})); }
/* drums for a section, from the beat's own pattern, by energy: a breakdown has none, an intro only hats, a bridge goes half-time, a chorus is
   full with a crash on its first beat; the last bar before a chorus or drop gets a fill (learned from drummers, else a snare roll) */
function genDrums(b, role, bars, fillInto, genre){ const e=(SEC_ROLE[role]||SEC_ROLE.Verse).e, slot=d=>(S.kit.slots.find(x=>x.sound===d)||S.kit.slots.find(x=>x.id===d)||{id:d}).id, hits=[];
  if(e<0.3) return hits;
  const L=Math.max(...Object.values(b.drums).map(p=>p.length));
  for(let s=0;s<bars*16;s++) for(const [d,p] of Object.entries(b.drums)){ const ch=p[s%L]; if(ch!=='x'&&ch!=='o') continue; const st=s%16;
    if(role==='Intro'&&d!=='hat'&&!(d==='kick'&&st===0)) continue;
    if(role==='Bridge'&&(d==='snare'||d==='clap')&&st!==8) continue; if(role==='Bridge'&&d==='kick'&&st!==0) continue;
    if(role==='Outro'&&Math.floor(s/16)===bars-1&&d!=='kick'&&d!=='hat') continue;
    if(e<0.6&&(d==='openhat'||d==='clap')) continue;
    hits.push({s, d:slot(d), v:ch==='o'?0.5:d==='hat'?0.7:0.95}); }
  if(e>=1){ for(let s=0;s<bars*16;s+=16) if(!hits.some(h=>h.s===s&&h.d==='kick')) hits.push({s,d:slot('kick'),v:0.95}); hits.push({s:0,d:slot('crash'),v:0.8}); }
  if(fillInto&&bars>=1){ const f0=(bars-1)*16+8; for(let i=hits.length-1;i>=0;i--) if(hits[i].s>=f0) hits.splice(i,1);
    const fs=GEN&&GEN.drums&&GEN.drums[GENRE_DRUMS[genre]||'pop']&&GEN.drums[GENRE_DRUMS[genre]||'pop'].fill; let used=false;
    if(fs&&fs.length){ const pat=wpick(fs)[0]; pat.split('|').forEach(part=>{ const [d,steps]=part.split(':'); (steps?steps.split(','):[]).map(Number).filter(x=>x>=8).forEach(x=>{ used=true; hits.push({s:(bars-1)*16+x, d:slot(d==='k'?'kick':d==='s'?'snare':'hat'), v:d==='s'?0.85:0.75}); }); }); }
    if(hits.filter(h=>h.s>=f0&&h.d===slot('snare')).length<2) used=false;   /* learned fills are often on toms (a Noodle kit has none): then a snare roll */
    if(!used) for(let x=8;x<16;x++) if((x%2===0||x>=12)&&!hits.some(h=>h.s===(bars-1)*16+x&&h.d===slot('snare'))) hits.push({s:(bars-1)*16+x, d:slot('snare'), v:+(0.45+0.4*(x-8)/7).toFixed(2)}); }
  return hits.sort((a,c)=>a.s-c.s); }
/* strike chords in a rhythm: learned (mostly on the beat) or a groove (syncopated); a high-energy section leans on the grooves */
function genComp(chords, bars, e){ if(e<0.45) return chords.map(c=>({...c}));   /* calm sections hold */
  if(Math.random()<(e>=0.9?0.65:0.3)){ const on=pickOne(GROOVES.comp), out=[]; for(const c of chords){ const hits=[]; for(let s=c.s;s<c.s+c.l;s++) if(on.includes(s%16)||s===c.s) hits.push(s);
      hits.forEach((s,i)=>out.push({s, l:(i<hits.length-1?hits[i+1]:c.s+c.l)-s, p:c.p})); } return out.filter(n=>n.s<bars*16); }
  return harmComp(chords, bars); }
/* the bass: none in a calm intro or breakdown, held roots in an outro, a learned line in a verse, and in a chorus it locks to the kick
   (a note on each kick, the chord's root) or a syncopated groove */
function genBass(chords, K, bars, oct, role, kicks){ const e=(SEC_ROLE[role]||SEC_ROLE.Verse).e, root=c=>oct+((Math.round(c.p)-oct)%12+12)%12, at=st=>chords.find(c=>st>=c.s&&st<c.s+c.l);
  if(e<0.3) return []; if(role==='Intro') return [];
  if(role==='Outro'||role==='Bridge') return chords.map(c=>({s:c.s,l:c.l,p:root(c),v:0.8}));
  let on=null; if(e>=0.9&&kicks&&kicks.length>=bars*2&&Math.random()<0.6) on=kicks; else if(e>=0.7||Math.random()<0.3){ const g=pickOne(GROOVES.bass); on=[]; for(let b=0;b<bars;b++) g.forEach(x=>on.push(b*16+x)); }
  if(!on){ const h=harmBass(chords,K,bars,oct); if(h&&h.length) return h; on=[]; for(let b=0;b<bars;b++) on.push(b*16,b*16+8); }
  on=[...new Set(on)].sort((a,c)=>a-c); chords.forEach(c=>{ if(!on.includes(c.s)) on.push(c.s); }); on.sort((a,c)=>a-c);   /* a chord change always lands on its root */
  return on.filter(s=>s<bars*16&&at(s)).map((s,i,a)=>({s, l:Math.max(1,Math.min(8,(a[i+1]??bars*16)-s)), p:root(at(s)), v:s%4===0?0.88:0.78})); }
/* the song's sections: the ones on the Sections row (gaps count as verses), else worked out from where parts start and stop */
function finishSections(N, E, grown){ const typed=(S.secs||[]).filter(x=>x.a<N&&SEC_ROLE[x.name]).map(x=>({a:x.a,b:Math.min(x.b,N),name:x.name})).sort((x,y)=>x.a-y.a);
  if(typed.length){ const out=[]; let at=0; for(const x of typed){ if(x.a>at) out.push({a:at,b:x.a,name:'Verse',gap:true}); out.push(x); at=Math.max(at,x.b); } if(at<N) out.push({a:at,b:N,name:'Verse',gap:true}); return {secs:out, marked:false}; }
  if(grown){ const h=Math.max(1,Math.round(N/2)); return {secs:[{a:0,b:h,name:'Verse'},{a:h,b:N,name:'Chorus'}], marked:true}; }
  const own=S.tracks.filter(t=>!t.guide&&!t._pvTemp&&hasContent(t)&&t.inst!=='mix'), blk=Math.max(1,Math.min(4,Math.floor(N/4)||1)), sig=[];
  for(let a=0;a<N;a+=blk){ const lanes=new Set(); own.forEach(t=>{ const o=(t.off||0)/16, e=o+pBars(t)*pLoops(t); if(o<a+blk&&e>a) lanes.add(s2LaneId(t)); }); sig.push({a,b:Math.min(N,a+blk),k:[...lanes].sort().join(','),n:lanes.size}); }
  const segs=[]; for(const x of sig){ const l=segs[segs.length-1]; if(l&&l.k===x.k&&l.b-l.a<8) l.b=x.b; else segs.push({...x}); }
  const mean=segs.reduce((s,x)=>s+x.n*(x.b-x.a),0)/N, top=Math.max(...segs.map(x=>x.n));
  if(segs.length<2||segs.every(x=>x.n===segs[0].n)){ const out=[], step=N>=16?8:4; let k=0; for(let a=0;a<N;a+=step,k++) out.push({a,b:Math.min(N,a+step),name:k%2?'Chorus':'Verse'}); return {secs:out, marked:true}; }
  segs.forEach((x,i)=>{ x.name= i===0&&x.n<mean*0.8&&x.b-x.a<=4?'Intro' : i===segs.length-1&&x.n<mean*0.8?'Outro' : x.n===top?'Chorus':'Verse'; });
  return {secs:segs.map(x=>({a:x.a,b:x.b,name:x.name})), marked:true}; }
async function finishSong(){ const miss=finishMissing(); if(!miss.length) return false;
  try{ await Promise.all([loadMusical(),loadHarmony(),loadGenre()]); }catch(e){}
  pvEnd(true); flushSave();
  const own=S.tracks.filter(t=>!t.guide&&!t._pvTemp&&hasContent(t));
  const E=Math.max(1,Math.ceil(Math.max(...own.filter(t=>t.inst!=='mix').map(t=>(t.off||0)/16+pBars(t)*pLoops(t)),1)-1e-6)), grown=E<8, N=grown?8:E;
  /* a short song grows: your parts repeat to fill 8 bars (copies, so each can be changed on its own); looping parts simply keep looping */
  if(grown){ for(const t of own.filter(t=>!pRep(t)&&t.inst!=='mix')){ for(let k=1;k*E<N;k++){ const off=(t.off||0)+k*E*16; if(off>=N*16) break;
      const c=JSON.parse(JSON.stringify(t,(kk,v)=>kk[0]==='_'?undefined:v)); c.id=S.nextId++; c.lane=s2LaneId(t); c.off=off; c.len=Math.min(pBars(t),N-off/16); c.lenSet=true; c.rep=false; delete c.sid; delete c.sidAt; delete c.sidHeard; delete c.ed; c.copyOf=t.id; c._dirty=true;
      if(t._raw){ c._raw=t._raw; try{ storeVox(c); }catch(e){} } S.tracks.push(c); } } }
  if(S.bars<N) S.bars=N;
  const free=BEATS.filter(b=>!b.pro), near=free.filter(b=>Math.abs(b.bpm-S.bpm)<=20), b=pickOne(near.length?near:free), genre=STYLE_GENRE[b.style]||'pop';
  const pitched=own.some(t=>t.notes&&t.notes.length&&INST[t.inst].kind==='pitched');
  let K=currentKey(); if(K.none||!pitched){ S.key=String(b.tonic); S.scale=b.scale; keyCache=null; scaleCache=null; K=currentKey(); }
  K={...K, set:SCALES[PARENT[K.scale]||K.scale]||K.set};
  const {secs, marked}=finishSections(N,E,grown); if(marked) S.secs=secs.map(x=>({a:x.a,b:x.b,name:x.name}));
  const ok=snd=>!proLocked(snd), add=[], got=[], lanes={};
  const part=(key,inst,o,sec,payload)=>{ const first=lanes[key], t=mkTrack(inst,{id:S.nextId++, ...(first?{lane:first.id}:{}), off:sec.a*16, len:sec.b-sec.a, lenSet:true, rep:false, picked:true, ...o, ...payload}); if(!first) lanes[key]=t; add.push(t); return t; };
  const mel=own.find(t=>(t.inst==='lead'||t.inst==='vox'||t.inst==='arp')&&melodyNotes(t).length), chordPart=own.find(t=>(t.inst==='keys'||t.inst==='pad')&&t.notes&&t.notes.length);
  const hasHook=secs.some(x=>['Chorus','Drop','Solo'].includes(x.name)), progs={}, hooks={};
  const chordsIn=(sec,role)=>{ const bars=sec.b-sec.a;
    if(mel){ const ms=melodyNotes(mel).map(n=>({...n,s:n.s+(mel.off||0)})).filter(n=>n.s>=sec.a*16&&n.s<sec.b*16).map(n=>({...n,s:n.s-sec.a*16}));   /* your melody here: chords that fit it */
      if(ms.length>=3){ const h=harmonize(ms,K,bars*16,16); if(h&&h.length) return h.map(x=>({s:x.s,l:x.l,p:x.root})); } }
    const key=role==='Drop'?'Chorus':role; if(!progs[key]) progs[key]=genProg(K,role,genre,role==='Bridge'&&progs.Chorus?String(progs.Chorus[0].r):null);
    const p=progs[key], out=[]; for(let s=0;s<bars*16;s+=64) p.forEach(c=>{ if(s+c.s<bars*16) out.push({s:s+c.s, l:Math.min(c.l,bars*16-s-c.s), p:c.p}); }); return out; };
  const secChords=secs.map(x=>chordsIn(x,x.name));
  secs.forEach((sec,i)=>{ const role=sec.name, e=(SEC_ROLE[role]||SEC_ROLE.Verse).e, bars=sec.b-sec.a, next=secs[i+1], fillInto=!!next&&(SEC_ROLE[next.name]||{}).e>=1&&e<1, ch=secChords[i];
    let kicks=null;
    if(miss.includes('drums')){ const hits=genDrums(b,role,bars,fillInto,genre); kicks=hits.filter(h=>h.d===(S.kit.slots.find(x=>x.sound==='kick')||{id:'kick'}).id).map(h=>h.s);
      if(hits.length) part('drums','kit',{sound:b.kit, vol:b.kitVol||80},sec,{hits}); }
    if(miss.includes('chords')&&ch.length){ const c=b.chords, notes=(c.inst==='keys'?genComp(ch,bars,e):ch).map(n=>({...n,v:+((n.s%16===0?0.76:0.68)*(0.8+0.2*e)).toFixed(2),x:true}));
      const t=part('chords',c.inst,{sound:c.sound, vol:c.vol||55, send:c.send??30, chordType:c.type||'triad'},sec,{notes}); if(c.tfx) t.tfx={...c.tfx}; }
    if(miss.includes('bass')&&ch.length){ const n=genBass(ch,K,bars,b.bass.oct,role,kicks); if(n.length) part('bass','bass',{sound:b.bass.sound, vol:74},sec,{notes:n}); }
    if(miss.includes('melody')&&typeof genMelody==='function'&&MZ&&ch.length&&(['Chorus','Drop','Solo'].includes(role)||(!hasHook&&role==='Verse'))){
      const key=role==='Drop'?'Chorus':role; let notes=hooks[key];
      if(!notes){ const span=bars*16, chordAt=st=>{ const c=ch.find(n=>st%span>=n.s&&st%span<n.s+n.l); return c?new Set(chordTones(Math.round(c.p),'triad').map(x=>((x%12)+12)%12)):null; };
        notes=genMelody(K,Math.min(bars,8),chordAt,role==='Solo'?{lo:67,hi:86}:role==='Verse'?{lo:62,hi:76}:{}); if(notes) hooks[key]=notes; }   /* the hook: the same melody every chorus */
      if(notes&&notes.length){ const span=Math.min(bars,8)*16, full=[]; for(let s=0;s<bars*16;s+=span) notes.forEach(n=>{ if(s+n.s<bars*16) full.push({...n,s:s+n.s,l:Math.min(n.l,bars*16-s-n.s),x:true}); });
        if(!lanes.lead){ const snd=pickOne(['Bell','Square','Saw','Supersaw','Guitar'].filter(ok)); lanes._leadSnd=snd; }
        part('lead','lead',{sound:lanes._leadSnd, vol:lanes._leadSnd==='Supersaw'||lanes._leadSnd==='Saw'?40:48, send:35},sec,{notes:full}); } } });
  if(miss.includes('melody')&&!lanes.lead){ const snd=pickOne(['Pluck','Bell','Square','Glass'].filter(ok));   /* no melody model here: an arp plays the chords where a hook would go */
    secs.forEach((sec,i)=>{ if(!(['Chorus','Drop','Solo'].includes(sec.name)||(!hasHook&&sec.name==='Verse'))||!secChords[i].length) return;
      const t=part('lead','arp',{sound:snd, vol:42, send:35, chordType:'triad'},sec,{notes:secChords[i].map(n=>({s:n.s,l:n.l,p:62+((Math.round(n.p)-62)%12+12)%12,v:0.7,x:true}))}); }); }
  ['drums','chords','bass','lead'].forEach(k=>{ if(lanes[k]) got.push({drums:'drums',chords:'chords',bass:'bass',lead:'a melody'}[k]); });
  if(miss.includes('fx')){ const fxs=[], P=N*16;
    secs.forEach((sec,i)=>{ const e=(SEC_ROLE[sec.name]||SEC_ROLE.Verse).e, prev=secs[i-1];
      if(prev&&e>=1){ fxs.push({...fxNew('riser',Math.max(prev.a*16,sec.a*16-16),P),l:Math.min(16,sec.a*16-prev.a*16),v:0.32}); fxs.push({...fxNew('impact',sec.a*16,P),v:0.35}); }   /* building into a chorus or drop, a hit on its first beat */
      else if(prev) fxs.push({...fxNew('sweepDown',sec.a*16,P),l:8,v:0.28}); });
    if(!fxs.length) fxs.push({...fxNew('sweepUp',(N-1)*16,P),v:0.3});
    const t=mkTrack('fx',{id:S.nextId++, off:0, len:N, lenSet:true, rep:false}); t.fxs=fxs.sort((a,c)=>a.s-c.s); add.push(t); got.push('transitions'); }
  if(miss.includes('mix')){ const intro=secs.find(x=>x.name==='Intro'), outro=secs.find(x=>x.name==='Outro');   /* on a real moment: an intro opening up, an outro closing, else the last bar */
    const [a,len,nodes]=intro?[intro.a,intro.b-intro.a,[{t:0,v:0.55},{t:1,v:0}]]:outro?[outro.a,outro.b-outro.a,[{t:0,v:0},{t:1,v:0.55}]]:[N-1,1,[{t:0,v:0},{t:0.85,v:0.28},{t:1,v:0}]];
    const t=mkTrack('mix',{id:S.nextId++, off:a*16, len, lenSet:true, rep:false}); t.mfx={k:'lp', curve:{nodes, curves:nodes.slice(1).map(()=>null)}, params:{}}; t.picked=true; add.push(t); got.push('a mix effect'); }
  if(!add.length&&!grown) return false;
  S.tracks.push(...add); keyCache=null; S.tracks.forEach(t=>{ t._dirty=true; }); Object.values(lanes).forEach(t=>{ if(t&&t.id) try{ autoOct(t); }catch(e){} });
  warmSounds(); save(); renderTracks(); scheduleRender();
  const list=got.length>1?got.slice(0,-1).join(', ')+' and '+got[got.length-1]:got[0]||'nothing new', names=[...new Set(secs.map(x=>x.name))];
  toast(`Added ${list}${marked?`, in sections: ${names.join(', ')}`:''}. Undo takes it out.`,5600); return true; }

/* ---- Chords and bass from data (round 24; owner: "account for rhythm, not just the progression"). noodle/harmony.json is learned from
   ~15,000 public-domain and CC0 songs in 4/4 (PDMX; modern genres weighted up; eval/musical_train/extract_harm.py, train_harm.py):
     prog: 4-bar progressions with their own harmonic rhythm (where each chord starts and how long it lasts), per mode, in semitones above
           the key; only ones Noodle plays exactly as written (a root in the key keeps the key's own chord, one outside is major);
     bass: 1-bar bass patterns: each note's start, length, interval above the chord under it, octave against the bar's first note;
     comp: 1-bar rhythms of where the accompaniment strikes (for keys).
   Picks are spread across each list (weight^0.6), and progressions with 3+ chords are favoured, so it isn't always the plainest one. ---- */
let HARM=null, harmLoad=null;
function loadHarmony(){ return harmLoad||(harmLoad=fetch(new URL('harmony.json',location.href)).then(r=>r.ok?r.json():null).then(j=>{ HARM=j; return j; }).catch(()=>{ harmLoad=null; return null; })); }
const wpick=(list,f)=>{ const w=list.map(x=>Math.pow(Math.max(1e-6,f?f(x):x[1]),0.6)); let t=w.reduce((a,b)=>a+b,0), r=Math.random()*t; for(let i=0;i<list.length;i++){ if((r-=w[i])<=0) return list[i]; } return list[list.length-1]; };
/* a 4-bar progression in key K: [{s,l,p}] roots (pitch class in octave 4 for chord parts) */
function harmProg(K){ if(!HARM) return null; const md=K.set.includes(3)&&!K.set.includes(4)?'min':'maj', list=HARM.prog[md]; if(!list||!list.length) return null;
  const [tpl]=wpick(list,x=>x[1]*(new Set(x[0].split(',').map(e=>e.split(':')[2])).size>=3?1.6:1));
  return tpl.split(',').map(e=>{ const [s,l,r]=e.split(':').map(Number); return {s, l, p:48+((K.tonic+r)%12)}; }); }
/* keys strike in a learned rhythm inside each chord; pads hold */
function harmComp(chords, bars){ if(!HARM||!HARM.comp||!HARM.comp.length) return chords; const [mask]=wpick(HARM.comp.filter(([m])=>m&1)), on=[]; for(let i=0;i<16;i++) if(mask&(1<<i)) on.push(i);
  const out=[]; for(const c of chords){ const hits=[]; for(let s=c.s;s<c.s+c.l;s++) if(on.includes(s%16)||s===c.s) hits.push(s);
    hits.forEach((s,i)=>out.push({s, l:(i<hits.length-1?hits[i+1]:c.s+c.l)-s, p:c.p})); }
  return out.filter(n=>n.s<bars*16); }
/* a bass line under chords [{s,l,p}] (roots), from a learned 1-bar pattern (a second one on each phrase's 4th bar); oct: the bass's lowest home */
function harmBass(chords, K, bars, oct){ if(!HARM||!HARM.bass) return null; const pats=HARM.bass.filter(([k])=>{ const n=k.split(',').length; return n>=2&&n<=8; }); if(!pats.length) return null;
  const parse=k=>k.split(',').map(e=>{ const [s,l,iv,o]=e.split(':').map(Number); return {s,l,iv,o}; }), A=parse(wpick(pats)[0]), B=parse(wpick(pats)[0]);
  const ink=m=>K.set.includes(((m-K.tonic)%12+12)%12), snap=m=>{ for(const d of [0,-1,1,-2,2]) if(ink(m+d)) return m+d; return m; };
  const chordAt=st=>chords.find(c=>st>=c.s&&st<c.s+c.l), out=[];
  for(let bar=0;bar<bars;bar++){ const pat=bar%4===3?B:A;
    for(const n of pat){ const st=bar*16+n.s, c=chordAt(st); if(!c) continue; const root=oct+((Math.round(c.p)-oct)%12+12)%12;
      let p= n.iv===0||c.s===st?root : n.iv===7?snap(root+7) : (n.iv===3||n.iv===4)?(ink(root+4)?root+4:root+3) : snap(root+n.iv);   /* a chord change always lands on its root */
      p+=12*Math.max(-1,Math.min(1,n.o)); if(p<oct-5) p+=12; if(p>oct+19) p-=12;
      out.push({s:st, l:Math.max(1,Math.min(n.l,(bar+1)*16-st)), p, v:n.s%4===0?0.88:0.78}); } }
  return out.sort((a,b)=>a.s-b.s).filter((n,i,a)=>!i||n.s>a[i-1].s); }
/* Ways to record with pads (round 26-27; round 29, owner: they are ways to record into a track, not track types). Record on an instrument
   track asks once how to record into it (Mic or pads; remembered per track as tr.rin, changed with Record with in the track's sheet). A pad
   screen covers the Studio: four count-in clicks, then the song plays from the playhead's bar while you play, until Stop (up to 16 bars).
   Drum pads: one per kit sound, hits on the nearest 16th. Chord pads: the key's six chords, each held until the next tap, on the nearest 8th.
   Note pads: the key's notes over an octave. Tap a rhythm: one pad; the taps are the rhythm and Noodle picks the notes (genMelody), fitted to
   the song's chords. Play pad: across = notes in the key, up = brighter. The take becomes a new part on that track, in its sound and octave;
   nothing is added until Keep (one Undo). */
const TAP_MAX=16;
const REC_WAYS={kit:['mic','drums'], keys:['mic','chords','notes'], pad:['mic','chords','notes'], arp:['mic','chords','notes'], lead:['mic','notes','rhythm','xy'], bass:['mic','notes','rhythm','xy']};
const recWays=inst=>REC_WAYS[inst]||['mic'];
const TAP_NAMES={mic:'Mic',drums:'Drum pads',chords:'Chord pads',notes:'Note pads',rhythm:'Tap a rhythm',xy:'Play pad'};
const TAP_INFO={mic:'Hum, sing, whistle or beatbox.',drums:'A big pad for each drum in your kit.',chords:'The key’s chords as big pads.',notes:'A pad for each note in the key.',rhythm:'Tap any rhythm. Noodle picks the notes, in the key.',xy:'Slide across for notes, up for a brighter sound.'};
const TAP_CENTER={bass:40, lead:64, keys:60, pad:57, arp:62};   /* where each instrument's notes sound best (MIDI) */
let tapIn=null;
function padChords(K,T){ const sc=SCALES[PARENT[K.scale]||K.scale]||SCALES.major, out=[], zone=(CHORD_ZONE[T.inst]||60)-12*T.oct;
  for(let d=0;d<7&&out.length<6;d++){ const pc=(K.tonic+sc[d])%12; let root=zone-6+(((pc-(zone-6))%12)+12)%12; const ps=chordTones(root,'triad'), third=((ps[1]-ps[0])%12+12)%12, fifth=((ps[2]-ps[0])%12+12)%12;
    if(fifth===6) continue;   /* the diminished chord is left off */
    out.push({root, name:NOTE_NAMES[pc]+(third===3?'m':'')}); }
  return out; }
/* Drum pads: one per sound in your kit (the kit's own sounds, any you added), up to 8 */
function tapDrumPads(){ return S.kit.slots.slice(0,8).map(sl=>({id:sl.id, name:slotLabel(sl.id), v:sl.sound==='kick'?1:sl.sound==='hat'?0.75:0.9})); }
/* Note pads: the key's notes over an octave (8 pads in a 7-note key), low to high from the bottom left, like a keypad; around where this
   instrument sounds best (a bass's pads are low) */
function tapNotePads(K,T){ const c=(TAP_CENTER[T.inst]||64)-12*T.oct, base=c-5+(((K.tonic-(c-5))%12)+12)%12, out=[];
  for(let p=base;out.length<9&&p<=base+12;p++) if(K.set.includes(((p-K.tonic)%12+12)%12)) out.push({p, name:NOTE_NAMES[((p%12)+12)%12]});
  const cols=Math.ceil(out.length/2); out.forEach((n,i)=>{ n.row=i<cols?2:1; n.col=i<cols?i+1:i-cols+1; }); out.cols=cols; return out; }   /* the low half on the bottom row */
/* one held note on the track's sound: returns a release function */
function leadNote(T,p,dur,tone=0.5,dest){ ensureCtx(); const g=ctx.createGain(), now=ctx.currentTime+0.005; g.gain.value=0.55; g.connect(dest||chain.input); VOICE_INST=T.inst;
  try{ voice(ctx,g,T.sound,now,dur,p+12*T.oct,0.8,tone); }catch(e){} finally{ VOICE_INST=null; }
  return ()=>{ const t=ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t); g.gain.linearRampToValueAtTime(0,t+0.06); setTimeout(()=>{ try{ g.disconnect(); }catch(e){} },400); }; }
/* taps into notes: the nearest 16th, each lasting until the next tap (at most 2 beats); two pads at once make a chord */
function tapNoteList(taps,span){ const by=new Map(); taps.forEach(x=>{ const s=Math.min(span-1,Math.round(x.st)); by.set(s+':'+x.p,{s,p:x.p}); });
  const ns=[...by.values()].sort((a,b)=>a.s-b.s||a.p-b.p), starts=[...new Set(ns.map(n=>n.s))];
  return ns.map(n=>{ const nx=starts.find(s=>s>n.s); return {s:n.s, l:Math.max(1,Math.min(8,(nx??span)-n.s)), p:n.p, v:n.s%4===0?0.85:0.75, x:true}; }); }
/* Play pad: across = the key's notes over two octaves (snapped), up = brighter. While a finger is down the note sounds; in a take, each note
   is kept with where it started and ended and how bright it was (nt.tn) */
function xyMount(T){ const box=$('tiXY'), cv=box.querySelector('canvas'); const K=T.K, c=(TAP_CENTER[T.inst]||64)-12*T.oct, lo=c-9+(((K.tonic-(c-9))%12)+12)%12, ps=[]; for(let p=lo;p<=lo+24;p++) if(K.set.includes(((p-K.tonic)%12+12)%12)) ps.push(p);
  T.xy={ps, down:false, cur:null, rel:null, ev:[]};
  const draw=(fx,fy)=>{ const r=box.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1); if(cv.width!==Math.round(r.width*dpr)){ cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); }
    const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,r.width,r.height); const W=r.width/ps.length, cs=getComputedStyle(box), ink=cs.getPropertyValue('--s2-muted').trim()||'#9299a8', amb=cs.getPropertyValue('--s2-amber').trim()||'#f1c75b';
    g.font='600 11px '+(cs.getPropertyValue('--f-display').trim()||'sans-serif'); g.textAlign='center';
    ps.forEach((p,i)=>{ const tonic=((p-K.tonic)%12+12)%12===0; g.fillStyle=tonic?'rgba(128,128,128,.16)':'rgba(128,128,128,.06)'; if(i%2===0||tonic) g.fillRect(i*W,0,W,r.height); g.fillStyle=ink; g.fillText(NOTE_NAMES[((p%12)+12)%12],i*W+W/2,r.height-8); });
    g.textAlign='left'; g.fillText('Brighter',8,16);
    if(fx!=null){ g.fillStyle=amb; g.beginPath(); g.arc(fx,fy,18,0,7); g.globalAlpha=0.35; g.fill(); g.globalAlpha=1; g.beginPath(); g.arc(fx,fy,7,0,7); g.fill(); } };
  T.xy.draw=draw; requestAnimationFrame(()=>draw());
  const at=e=>{ const r=box.getBoundingClientRect(), x=clamp(e.clientX-r.left,0,r.width-0.01), y=clamp(e.clientY-r.top,0,r.height); return {x,y,p:ps[Math.floor(x/r.width*ps.length)], tn:+clamp(1-y/r.height,0,1).toFixed(2)}; };
  const filt=()=>{ if(!T.xy.lp){ const f=ctx.createBiquadFilter(); f.type='lowpass'; f.Q.value=0.7; f.connect(chain.input); T.xy.lp=f; } return T.xy.lp; };
  const play=(c,e)=>{ const X=T.xy; X.tn=c.tn; filt().frequency.setTargetAtTime(400+c.tn*c.tn*9000,ctx.currentTime,0.02);
    if(X.cur!==c.p){ if(X.rel) X.rel(); X.cur=c.p; X.rel=leadNote(T,c.p,8,0.75,filt()); tapMark(T,c.p,c.tn,e); } draw(c.x,c.y); };
  box.addEventListener('pointerdown',e=>{ e.preventDefault(); ensureCtx(); try{ box.setPointerCapture(e.pointerId); }catch(_){} T.xy.down=true; play(at(e),e); });
  box.addEventListener('pointermove',e=>{ if(!T.xy.down) return; play(at(e),e); });
  const up=e=>{ if(!T.xy.down) return; T.xy.down=false; xyOff(T,e); draw(); };
  box.addEventListener('pointerup',up); box.addEventListener('pointercancel',up); }
/* in a take: a note starts (p) or the finger lifts (p null), at the moment it was heard */
function tapMark(T,p,tn,e){ if(T.state!=='take'&&T.state!=='count'||!T.start) return; const late=Math.min(0.1,Math.max(0,(performance.now()-(e&&e.timeStamp||performance.now()))/1000)), at=ctx.currentTime-late-T.lat;
  if(at<T.start-0.15||at>=T.end) return; T.taps.push({st:Math.max(0,(at-T.start)/stepDur()), p, tn}); }
function xyOff(T,e){ const X=T&&T.xy; if(!X) return; if(X.rel){ X.rel(); X.rel=null; } if(X.cur!=null){ tapMark(T,null,null,e); X.cur=null; } }
function xyNotes(T,span){ const out=[]; let cur=null;
  for(const ev of T.taps){ const s=Math.min(span,Math.round(ev.st)); if(cur){ cur.l=s-cur.s; if(cur.l<1&&ev.p==null) cur.l=1;   /* a quick tap is a 16th */ if(cur.l>=1) out.push(cur); cur=null; }
    if(ev.p!=null&&s<span) cur={s, l:1, p:ev.p, v:0.8, tn:ev.tn, x:true}; }
  if(cur){ cur.l=Math.max(1,span-cur.s); out.push(cur); }
  /* fast slides: a note shorter than a 16th gave its step to the next one; same pitch twice in a row is one note */
  const m=[]; for(const n of out){ const pv=m[m.length-1]; if(pv&&pv.p===n.p&&pv.s+pv.l===n.s){ pv.l+=n.l; continue; } if(pv&&pv.s+pv.l>n.s) pv.l=Math.max(1,n.s-pv.s); m.push(n); }
  return m.filter(n=>n.l>=1&&n.s<span).map(n=>({...n,l:Math.min(n.l,span-n.s)})); }
function tapKeyName(K){ return NOTE_NAMES[K.tonic]+' '+(K.set.includes(3)&&!K.set.includes(4)?'minor':'major'); }
/* the pad screen for one track (laneId): kind is how it records (drums, chords, notes, rhythm, xy) */
async function tapOpen(kind, laneId){ if(tapIn) tapClose(); const L=s2Lane(laneId); if(!L) return; ensureCtx(); pvEnd(true); flushSave(); if(playing) await togglePlay();
  const first=L.tracks[0], T=tapIn={kind, L, first, inst:first.inst, sound:first.sound, oct:first.oct||0, state:'ready', taps:[], tr:null, cur0:s2.cur||0, bars0:S.bars, key0:[S.key,S.scale], sec0:s2.sec, timers:[]};
  if(proLocked(T.sound)) T.sound=INST[T.inst].sounds.find(x=>!proLocked(x));
  { const K0=currentKey(), pitched=S.tracks.some(t=>!t.guide&&t.notes&&t.notes.length&&INST[t.inst].kind==='pitched');
    if(kind!=='drums'&&(K0.none||!pitched)){ S.key=String(K0.none?0:K0.tonic); S.scale=K0.none?'major':K0.scale; keyCache=null; scaleCache=null; } }   /* nothing pitched yet: the key is set now, so the chords don't change once notes arrive (kept only with the part) */
  s2.sec=null;   /* a looping section must not jump back during the take */
  T.P=clamp(Math.floor((s2.cur||0)+1e-6),0,63); T.max=Math.min(TAP_MAX,64-T.P); T.nb=T.max;
  const K=currentKey(); T.K={...K, set:SCALES[PARENT[K.scale]||K.scale]||K.set}; T.pads=kind==='drums'?tapDrumPads():kind==='notes'?tapNotePads(T.K,T):kind==='chords'?padChords(T.K,T):[];
  let el=$('tapIn'); if(!el){ el=document.createElement('div'); el.className='s2-ed tapin'; el.id='tapIn'; $('s2Ed').insertAdjacentElement('afterend',el); }
  el.innerHTML=`<div class="s2-top s2-g"><button class="s2-ib" id="tiBack" aria-label="Back to the timeline"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <div class="s2-edt"><b>${nxEsc(s2Name(L))}</b><small>${TAP_NAMES[kind]} · ${kind==='drums'?S.bpm+' BPM':tapKeyName(T.K)} · from bar ${T.P+1}</small></div>
    <button class="s2-ib" id="tiPlay" aria-label="Play the take" hidden></button></div>
    <div class="ti-body">${kind==='xy'?'<div class="ti-xy" id="tiXY" role="application" aria-label="Play pad: across for notes, up for a brighter sound"><canvas></canvas></div>':kind!=='rhythm'?`<div class="ti-pads"${kind==='notes'?` style="grid-template-columns:repeat(${T.pads.cols},1fr)"`:''}>${T.pads.map((c,i)=>`<button class="ti-pad" data-i="${i}"${c.row?` style="grid-row:${c.row};grid-column:${c.col}"`:''} aria-label="${nxEsc(c.name)}${kind==='chords'?' chord':''}">${nxEsc(c.name)}</button>`).join('')}</div>`:'<button class="ti-pad ti-one" id="tiOne" aria-label="Tap pad">Tap</button>'}</div>
    <div class="s2-edh s2-g" id="tiHint"></div><div class="ti-bar s2-g" id="tiBar"></div>`;
  el.hidden=false;
  el.querySelectorAll('.ti-pad').forEach(b=>b.addEventListener('pointerdown',e=>{ e.preventDefault(); tapHit(b,e); }));
  if(kind==='xy') xyMount(T);
  $('tiBack').onclick=()=>tapClose();
  $('tiPlay').onclick=()=>{ if(T.playing) tapStopPlay(); else tapPlay(); };
  $('tiBar').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const a=b.dataset.a;
    if(a==='rec') tapRec(); else if(a==='stop') tapStopTake(); else if(a==='keep') tapKeep(); else if(a==='again') tapRec(); else if(a==='more') tapRec(true); else if(a==='other') tapOther(); };
  tapUI();
  if(kind==='rhythm'){ try{ await loadMusical(); }catch(e){} try{ await loadHarmony(); }catch(e){} }
  renderDirty(); }
function tapUI(msg){ const T=tapIn; if(!T) return; const hint=$('tiHint'), bar=$('tiBar'), pl=$('tiPlay');
  const H={ready:T.kind==='rhythm'?'Record, then tap a rhythm. Noodle picks the notes.':T.kind==='xy'?'Slide across for notes, up for a brighter sound.':'Tap a pad to hear it. Record to play along.',
    review:{chords:'Each chord lasts until the next one.',rhythm:'Your rhythm, with notes in the key.',drums:'Add more plays this back while you tap another layer.',notes:'Each note lasts until the next one. Add more for a second line.',xy:'Your notes, in the key, with the brightness you played.'}[T.kind]};
  if(msg!=null) hint.textContent=msg; else if(H[T.state]) hint.textContent=H[T.state];
  const busy=T.state==='count'||T.state==='take'; document.getElementById('tapIn').classList.toggle('live',busy);
  bar.innerHTML= busy?'<button class="nx-ghost" data-a="stop">Stop</button>'
    : T.state==='review'?`<button class="nx-primary" data-a="keep">Keep</button><div class="ti-row"><button class="nx-ghost" data-a="again">Retake</button>${T.kind==='rhythm'?'<button class="nx-ghost" data-a="other">Other notes</button>':T.kind==='drums'||T.kind==='notes'?'<button class="nx-ghost" data-a="more">Add more</button>':''}</div>`
    : '<button class="nx-primary" data-a="rec">Record</button>';
  pl.hidden=T.state!=='review'; pl.setAttribute('aria-label',T.playing?'Stop':'Play the take');
  pl.innerHTML=T.playing?'<svg class="nx-ico" viewBox="0 0 24 24"><path d="M7 5v14M17 5v14" stroke-width="3"/></svg>':'<svg class="nx-ico" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8V4z" fill="currentColor"/></svg>'; }
/* a pad's own sound, on the track's sound: the chord, the note or the drum; a soft click for the rhythm pad (its notes aren't chosen yet) */
function tapSound(c){ ensureCtx(); const T=tapIn, now=ctx.currentTime+0.005;
  if(T.kind==='notes'){ leadNote(T,c.p,0.45); return; }
  if(T.kind==='drums'){ const out=ctx.createGain(); out.gain.value=0.7; out.connect(chain.input); try{ drumHit(ctx,out,c.id,now,c.v,T.sound,0.5); }catch(e){} return; }
  if(T.kind==='chords'){ const out=ctx.createGain(); out.gain.value=0.5; out.connect(chain.input); VOICE_INST=T.inst;
    const dur=T.state==='take'?Math.min(2,4*60/S.bpm):0.7; try{ chordTones(c.root,'triad').forEach(m=>voice(ctx,out,T.sound,now,dur,m+12*T.oct,0.7,0.5)); }catch(e){} finally{ VOICE_INST=null; } return; }
  const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.value=1800; g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.18,now+0.002); g.gain.exponentialRampToValueAtTime(0.001,now+0.04); o.connect(g); g.connect(chain.input); o.start(now); o.stop(now+0.05); }
function tapHit(b,e){ const T=tapIn; if(!T) return; b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
  const c=T.kind==='rhythm'?null:T.pads[+b.dataset.i]; tapSound(c);
  if(T.state!=='take'&&T.state!=='count'||!T.start) return;
  const late=Math.min(0.1,Math.max(0,(performance.now()-(e&&e.timeStamp||performance.now()))/1000));   /* how long ago the finger landed */
  const at=ctx.currentTime-late-T.lat; if(at<T.start-0.15||at>=T.end) return;
  T.taps.push({st:Math.max(0,(at-T.start)/stepDur()), root:c?c.root:null, d:c?c.id:null, v:c?c.v:null, p:c?c.p:null}); }
function tapClick(when,first){ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.value=first?2000:1500; g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(first?0.5:0.32,when+0.002); g.gain.exponentialRampToValueAtTime(0.001,when+0.03); o.connect(g); g.connect(ctx.destination); o.start(when); o.stop(when+0.04); return o; }
function tapClear(){ const T=tapIn; if(!T) return; T.timers.forEach(clearTimeout); T.timers=[]; if(T.clicks){ T.clicks.forEach(o=>{ try{ o.stop(); }catch(e){} }); T.clicks=null; } }
/* a take: from the playhead's bar until Stop (up to 16 bars); Add more records over the part you have, as long as it is */
async function tapRec(more){ const T=tapIn; if(!T||T.state==='count'||T.state==='take') return; ensureCtx(); try{ await ctx.resume(); }catch(e){}
  T.more=!!(more&&T.tr); tapStopPlay(); if(!T.more){ tapDrop(); T.nb=T.max; }   /* Add more: the take so far plays while you tap another layer */ T.state='count'; T.taps=[]; T.start=null; T.stopAt=null; tapUI('Get ready');
  if(S.bars<T.P+T.nb) S.bars=T.P+T.nb;   /* room to keep going (the song's length is put back unless the take is kept) */
  try{ await renderDirty(); }catch(e){}
  if(tapIn!==T||T.state!=='count') return;   /* closed or stopped while the song was being made */
  const bar=4*60/S.bpm, beat=bar/4, when=ctx.currentTime+0.15; T.start=when+bar; T.end=T.start+T.nb*bar;
  T.lat=outDelay()+0.01;   /* you tap to what you hear, which comes out a little after it's played */
  T.clicks=[0,1,2,3].map(i=>tapClick(when+i*beat,i===0));
  startAll(T.start, T.P*bar, {metro:true}); playing=true;
  if(feelBeat()) native({type:'metro', ...metroAt(when), beatMs:beat*1000, beats:4+T.nb*4, perBar:4});
  haptic('medium');
  const at=(t,f)=>T.timers.push(setTimeout(f,Math.max(0,(t-ctx.currentTime)*1000)));
  for(let i=0;i<4;i++) at(when+i*beat-0.02,()=>tapUI('Get ready · '+(4-i)));
  for(let k=0;k<T.nb;k++) at(T.start+k*bar-0.02,()=>{ T.state='take'; tapUI(T.more?`Bar ${k+1} of ${T.nb}`:`Bar ${k+1} · tap Stop when you’re done`); });
  at(T.end+0.05,()=>tapFinish()); }
function tapHalt(){ const T=tapIn; tapClear(); if(T) xyOff(T); native({type:'metroStop'}); if(playing){ stopAll(ctx.currentTime+0.02); playing=false; } if(T){ s2.cur=T.cur0; s2.pos=-1; playFrom=Math.min(T.cur0,S.bars)*16*stepDur(); } }
function tapCancelTake(){ const T=tapIn; if(!T) return; tapHalt(); haptic('medium'); T.state=T.more&&T.tr?'review':'ready'; T.more=false; T.taps=[]; if(!T.tr) S.bars=T.bars0; tapUI(); }   /* Stop during the count-in, or during Add more: back to what you had */
function tapStopTake(){ const T=tapIn; if(!T) return; if(T.state==='take'&&!T.more){ T.stopAt=ctx.currentTime; tapFinish(); } else tapCancelTake(); }
async function tapFinish(){ const T=tapIn; if(!T||T.state!=='take') return; tapHalt(); haptic('medium');
  if(!T.more){ const bar=4*60/S.bpm, beat=bar/4, heard=(T.stopAt??T.end)-T.lat-T.start, last=T.taps.reduce((m,x)=>Math.max(m,x.st),0);
    T.nb=clamp(Math.max(Math.ceil((heard-0.5*beat)/bar), Math.ceil((last+1)/16)),1,T.max); }   /* the bars you played (a Stop just after a bar line ends at that line) */
  const span=T.nb*16; let notes; T.taps=T.taps.filter(x=>x.st<span);
  if(T.kind==='notes'||T.kind==='xy'){ const nw=T.kind==='xy'?xyNotes(T,span):tapNoteList(T.taps,span);
    if(T.more&&T.tr){ T.more=false; if(!nw.length){ T.state='review'; tapUI('No taps came in. That layer is left out.'); return; }
      const key=n=>n.s+':'+n.p, have=new Set(nw.map(key)); T.tr.notes=T.tr.notes.filter(n=>!have.has(key(n))).concat(nw).sort((a,b)=>a.s-b.s); T.tr._dirty=true; T.state='review'; tapUI(); tapPlay(); return; }
    notes=nw; }
  else if(T.kind==='drums'){ const by=new Map(); T.taps.forEach(x=>{ const s=Math.min(span-1,Math.round(x.st)); by.set(s+':'+x.d,{s,d:x.d,v:x.v}); });   /* the nearest 16th; one hit per drum per step */
    if(T.more&&T.tr){ T.more=false; if(!by.size){ T.state='review'; tapUI('No taps came in. That layer is left out.'); return; }
      T.tr.hits.forEach(h=>{ if(!by.has(h.s+':'+h.d)) by.set(h.s+':'+h.d,h); }); T.tr.hits=[...by.values()].sort((a,b)=>a.s-b.s); T.tr._dirty=true; T.state='review'; tapUI(); tapPlay(); return; }
    notes=[...by.values()].sort((a,b)=>a.s-b.s); }
  else if(T.kind==='chords'){ const by=new Map(); T.taps.forEach(x=>{ const s=Math.min(span-2,Math.round(x.st/2)*2); by.set(s,x.root); });   /* the nearest 8th; two taps there: the later one */
    const ss=[...by.keys()].sort((a,b)=>a-b); notes=ss.map((s,i)=>({s, l:(i<ss.length-1?ss[i+1]:span)-s, p:by.get(s), v:0.74, x:true})); }
  else { const ons=[...new Set(T.taps.map(x=>Math.min(span-1,Math.round(x.st))))].sort((a,b)=>a-b); T.ons=ons; notes=ons.length>=2?tapMelody(T):[]; }
  if(!notes||!notes.length||T.kind==='rhythm'&&T.ons.length<2){ T.state='ready'; S.bars=T.bars0; tapUI(T.taps.length?'Tap at least two notes, then try again.':'No taps came in. Record and tap along with the song.'); return; }
  const f=T.first, tr=mkTrack(T.inst,{id:S.nextId++, lane:T.L.id, off:T.P*16, len:T.nb, lenSet:true, rep:false, sound:T.sound, vol:f.vol, mute:f.mute, solo:f.solo, send:f.send, tone:f.tone, oct:T.oct, ...(f.chordType!=null?{chordType:f.chordType}:{}), ...(T.inst==='kit'?{hits:notes}:{notes})});
  if(f.adsr) tr.adsr=f.adsr; if(f.fx) tr.fx=Object.assign({},f.fx); if(f.octSet) tr.octSet=true;
  S.bars=Math.max(T.bars0,T.P+T.nb);
  tr._tapTemp=true; S.tracks.push(tr); tr._dirty=true; keyCache=null; T.tr=tr; T.state='review'; tapUI(); tapPlay(); }
/* the chords under the part: the song's own, else a progression learned from real songs, else I V vi IV */
function tapChordAt(T){ const CM=songChordMap(), base=T.P*16, span=T.nb*16; let any=false; for(let s=base;s<base+span;s++) if(CM.get(s)&&CM.get(s).size){ any=true; break; }
  if(any) return st=>{ const a=CM.get(base+st); return a&&a.size?a:null; };
  if(!T.prog){ T.prog=(HARM&&harmProg(T.K))||[0,4,5,3].map((d,b)=>({s:b*16, l:16, p:48+((T.K.tonic+T.K.set[d%T.K.set.length])%12)})); }
  return st=>{ const q=st%64, c=T.prog.find(n=>q>=n.s&&q<n.s+n.l); return c?new Set(chordTones(Math.round(c.p),'triad').map(x=>((x%12)+12)%12)):null; }; }
function tapMelody(T){ const c=(TAP_CENTER[T.inst]||64)-12*T.oct, lo=T.inst==='bass'?c-4:c, hi=T.inst==='bass'?c+12:c+17;   /* a bass line stays low */
  if(typeof genMelody!=='function'||!MZ) return T.ons.map((s,i,a)=>({s, l:Math.max(1,Math.min(8,(a[i+1]??T.nb*16)-s)), p:lo+8, v:0.8, x:true}));
  const ns=genMelody(T.K,T.nb,tapChordAt(T),{onsets:T.ons,lo,hi}); return (ns||[]).map(n=>({...n,x:true})); }
async function tapPlay(){ const T=tapIn; if(!T||!T.tr) return; ensureCtx(); try{ await ctx.resume(); }catch(e){} try{ await renderDirty(); }catch(e){}
  if(tapIn!==T||T.state!=='review') return; const bar=4*60/S.bpm, when=ctx.currentTime+0.05;
  startAll(when, T.P*bar); playing=true; T.playing=true; tapUI();
  T.timers.push(setTimeout(()=>{ if(tapIn===T&&T.playing) tapStopPlay(); },(T.nb*bar+0.1)*1000)); }
function tapStopPlay(){ const T=tapIn; if(!T) return; const was=T.playing; T.playing=false; if(was) tapHalt(); if(T.state==='review') tapUI(); }
async function tapOther(){ const T=tapIn; if(!T||!T.tr||T.kind!=='rhythm') return; tapStopPlay(); const ns=tapMelody(T); if(!ns.length) return; T.tr.notes=ns; T.tr._dirty=true; tapPlay(); }
function tapDrop(){ const T=tapIn; if(!T||!T.tr) return; const i=S.tracks.indexOf(T.tr); if(i>=0) S.tracks.splice(i,1); try{ disposeTrack(T.tr); }catch(e){} T.tr=null; keyCache=null; }
function tapKeep(){ const T=tapIn; if(!T||!T.tr) return; tapStopPlay(); const tr=T.tr; delete tr._tapTemp; T.tr=null; T.kept=true; S.activeId=tr.id; s2.selId=tr.id; keyCache=null; save(); haptic('light');
  tapClose(); toast(`Added a part to ${s2Name(T.L)}. Undo takes it out.`,3500); }
function tapClose(){ const T=tapIn; if(!T) return; tapClear(); xyOff(T); if(T.state==='count'||T.state==='take'||T.playing){ T.playing=false; tapHalt(); } tapDrop();
  if(!T.kept){ S.bars=T.bars0; S.key=T.key0[0]; S.scale=T.key0[1]; keyCache=null; scaleCache=null; }
  s2.sec=T.sec0; tapIn=null; const el=$('tapIn'); if(el){ el.hidden=true; el.innerHTML=''; } renderTracks(); scheduleRender(); }
/* Record on an instrument track: the first time, how to record into it (Mic or pads); afterwards straight in. Record with in the track's sheet changes it. */
function recWaySheet(L, then){ const ws=recWays(L.tracks[0].inst), cur=L.tracks[0].rin;
  nxSheet(`<h2>How do you want to record?</h2><div class="sh-list">${ws.map(w=>`<div class="sh-row"><button class="nx-act sh-a" data-rin="${w}" aria-pressed="${w===cur}"><span>${TAP_NAMES[w]}</span>${w===cur?'<svg class="nx-ico pk-ok" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>':''}</button>${s2Inf(TAP_INFO[w])}</div>`).join('')}</div>`);
  $('nxSheet').onclick=e=>{ const ib=e.target.closest('[data-info]'); if(ib){ e.preventDefault(); infoPop(ib); return; } const b=e.target.closest('[data-rin]'); if(!b) return;
    flushSave(); L.tracks.forEach(t=>{ t.rin=b.dataset.rin; }); save(); nxClose(); if(then) then(); }; }
/* Continue this (round 27): a short part (up to 4 bars) grows to four times its length, as a phrase: the part, a variation (the same
   rhythm, new notes in its second half), an answer (the same rhythm, new notes: the melody model, fitted to the chords there) and the part
   again with an ending on the key's home note. Chord parts repeat and end on the home chord. Less room after it: 3 (part, answer, ending)
   or 2 (part, ending). One Undo. */
const continueOk=tr=>!!tr&&INST[tr.inst].kind==='pitched'&&tr.inst!=='vox'&&!tr.guide&&!!tr.notes&&tr.notes.length>0&&pSteps(tr)<=64;
async function continuePart(tr){ if(!continueOk(tr)) return false; try{ await loadMusical(); }catch(e){} try{ await loadHarmony(); }catch(e){}
  const L=pSteps(tr), off=tr.off||0, lane=s2LaneId(tr), next=S.tracks.filter(t=>t!==tr&&s2LaneId(t)===lane&&(t.off||0)>off).reduce((m,t)=>Math.min(m,t.off||0),64*16);
  const reps=Math.min(4,Math.floor((next-off)/L)); if(reps<2){ toast('No room after this part. Move the next part along first.'); return false; }
  const K0=currentKey(), K={...K0, set:SCALES[PARENT[K0.scale]||K0.scale]||K0.set}; if(K0.none){ toast('Set a key first (Key at the top).'); return false; }
  flushSave();
  const A=inWin(tr.notes,L).map(n=>({...n})).sort((a,b)=>a.s-b.s), chordy=chordsOn(tr), plan={2:'AE',3:'ABE',4:'AVBE'}[reps];
  const ps=A.map(pitchOf), lo=Math.min(...ps)-2, hi=Math.max(Math.max(...ps)+2,lo+12), ons=[...new Set(A.map(n=>n.s))];
  const CM=songChordMap(); let prog=null;
  const chordAt=k=>st=>{ const a=CM.get(off+k*L+st); if(a&&a.size&&!chordy) return a; if(!prog) prog=(HARM&&harmProg(K))||[0,4,5,3].map((d,b)=>({s:b*16,l:16,p:48+((K.tonic+K.set[d%K.set.length])%12)}));
    const q=(k*L+st)%64, c=prog.find(n=>q>=n.s&&q<n.s+n.l); return c?new Set(chordTones(Math.round(c.p),'triad').map(x=>((x%12)+12)%12)):null; };
  const fresh=k=>{ const g=typeof genMelody==='function'&&MZ?genMelody(K,Math.max(1,L/16),chordAt(k),{onsets:ons,lo,hi}):null; const m=new Map((g||[]).map(n=>[n.s,n.p])); return m; };
  const home=p=>{ let best=p, d=99; for(let q=p-6;q<=p+6;q++) if(((q-K.tonic)%12+12)%12===0&&Math.abs(q-p)<d){ d=Math.abs(q-p); best=q; } return best; };
  const out=[];
  [...plan].forEach((kind,k)=>{ let seg=A.map(n=>({...n}));
    if(!chordy&&(kind==='V'||kind==='B')){ const m=fresh(k); seg=seg.map(n=>{ const q=m.get(n.s); return q!=null&&(kind==='B'||n.s>=L/2)?{...n,p:q,x:true}:n; }); }
    if(kind==='E'&&seg.length){ const last=seg[seg.length-1], fs=seg.filter(n=>n.s===last.s); fs.forEach(n=>{ n.p=home(pitchOf(n)); n.x=true; }); }   /* it ends at home */
    seg.forEach(n=>{ n.s+=k*L; out.push(n); }); });
  tr.notes=out; tr.len=reps*L/16; tr.lenSet=true; tr.rep=false; if(S.bars<Math.ceil((off+reps*L)/16)) S.bars=Math.ceil((off+reps*L)/16);
  tr._dirty=true; keyCache=null; logEdit(tr,{k:'continue',n:reps}); save(); renderTracks(); scheduleRender();
  toast(`Now ${reps*L/16} bars: ${{2:'the part and an ending',3:'the part, an answer and an ending',4:'a repeat, a variation, an answer and an ending'}[reps]}. Undo puts it back.`,4500);
  return true; }
