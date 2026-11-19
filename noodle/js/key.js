"use strict";
/* ============================== key & scale ============================== */
function corr(a,b){ const ma=a.reduce((x,y)=>x+y)/12, mb=b.reduce((x,y)=>x+y)/12; let n=0,da=0,db=0; for(let i=0;i<12;i++){ n+=(a[i]-ma)*(b[i]-mb); da+=(a[i]-ma)**2; db+=(b[i]-mb)**2; } return da&&db?n/Math.sqrt(da*db):0; }
let keyCache=null;
/* Count-in arpeggio (optional, Timing & mic): the home chord, one note per count-in beat, so you start in the song's key.
   Only when the song already has a key (a key you set, or notes in it); silent once you start singing. */
function keyKnown(){ if(S.scale==='chromatic') return null;
  const has=S.key!=='auto' || S.tracks.some(t=>(INST[t.inst].kind==='pitched'&&t.notes&&t.notes.length)||(t.inst==='vox'&&(t.vn||[]).length));
  return has?currentKey():null; }
/* The count-in chord. For a guided tune it starts on the tune's first note and comes back to it, so the last thing you hear before you sing is your starting note. */
function playKeyArp(K, when, bar, root=null){ const kn=K&&!K.none, rel=iv=>root==null?true:kn?K.set.includes(((root+iv-K.tonic)%12+12)%12):[0,4,7].includes(iv);
  const tonic=root!=null?root:57+((K.tonic-57)%12+12)%12, third=root!=null?(rel(4)?4:3):(K.set.includes(4)?4:3), fifth=root!=null&&!rel(7)?6:7, beat=bar/4, out=ctx.createGain(); out.gain.value=0.16; out.connect(ctx.destination);
  (root!=null?[0,third,fifth,0]:[0,third,7,12]).forEach((iv,k)=>{ const t=when+k*beat, f=440*Math.pow(2,(tonic+iv-69)/12), o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain();
    o.type='triangle'; o2.type='sine'; o.frequency.value=f; o2.frequency.value=f*2; const g2=ctx.createGain(); g2.gain.value=0.25;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.012); g.gain.exponentialRampToValueAtTime(0.001,t+beat*0.9);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t+beat); o2.stop(t+beat); }); }
function currentKey(){
  if(keyCache) return keyCache;
  if(S.scale==='chromatic') return keyCache={none:true};
  const w=new Array(12).fill(0); let tot=0;
  S.tracks.forEach(t=>{ if(t.inst==='vox') (t.vn||[]).forEach(n=>{ const pc=((Math.round(n.p)%12)+12)%12; w[pc]+=n.l*4; tot+=n.l*4; }); });
  // the key comes from what you recorded; notes you place by hand don't move it (else fixing one note re-snaps the others)
  const recd=S.tracks.some(t=>INST[t.inst].kind==='pitched' && t.notes.some(n=>!n.x));
  S.tracks.forEach(t=>{ if(INST[t.inst].kind==='pitched'){ const n1=pSteps(t); t.notes.forEach(n=>{ if(recd && n.x) return; if(n.s<0||n.s>=n1) return; const pc=((Math.round(n.p)%12)+12)%12; w[pc]+=n.l*n.v; tot+=n.l*n.v; }); } });
  const modes = S.scale==='auto' ? ['major','minor'] : [MAJOR_FAMILY.has(S.scale)?'major':'minor'];
  let best={tonic:9,mode:'minor',c:-2};
  if(tot>0){ for(const mode of modes){ const prof=mode==='major'?KK_MAJ:KK_MIN;
    for(let tn=0;tn<12;tn++){ if(S.key!=='auto' && +S.key!==tn) continue; const rot=w.map((_,i)=>w[(i+tn)%12]); const c=corr(rot,prof); if(c>best.c) best={tonic:tn,mode,c}; } } }
  else if(S.key!=='auto') best.tonic=+S.key;
  if(S.scale!=='auto' && tot===0) best.mode=MAJOR_FAMILY.has(S.scale)?'major':'minor';
  const scaleName = S.scale==='auto'?best.mode:S.scale;
  return keyCache={tonic:best.tonic, mode:best.mode, scale:scaleName, set:SCALES[scaleName]};
}
/* Snap strength (Loose ↔ Tight). Recorded notes go to the nearest note in the key, EXCEPT an out-of-key note you sang
   confidently (close to the centre of that semitone and held at least 0.15 s) is kept. How close counts as confident
   comes from the slider: Tight keeps nothing out of key, Loose keeps everything (plain rounding).
   Measured (see EVAL notes): hummed melodies come out best Tight; singing with lyrics improves when looser. So the
   default is Tight, and corrections you make (pulling notes back out of the key) loosen it for you. */
const snapTol=()=>{ const v=S.snapStr??100; return v>=100?0:0.5*Math.pow(1-v/100,0.7); };
function snap(p,len){ const K=currentKey(); if(K.none) return Math.round(p); const r=Math.round(p), ink=m=>K.set.includes(((m-K.tonic)%12+12)%12);
  if(ink(r) || (Math.abs(p-r)<snapTol() && (len==null || len>=0.15))) return r;
  let bm=r, bd=1e9; for(let m=r-3;m<=r+3;m++){ if(ink(m)){ const d=Math.abs(m-p); if(d<bd-1e-9){bd=d;bm=m;} } } return bm; }
/* Intended notes from a sung line: of all readings in the song's key, pick the one that best explains the whole
   shape you sang, preferring the steps real melodies use. Out-of-key notes are allowed at a cost (lower with a looser
   Snap strength). If your guided takes show you sing upward/downward jumps narrower than meant, the reading allows for it. */
const IP_STEP={0:.16,1:.14,2:.30,3:.13,4:.08,5:.07,7:.05,6:.01,8:.02,9:.015,10:.01,11:.005,12:.01};
const ipStep=d=>Math.log((IP_STEP[Math.abs(d)]??0.002)/(d===0?1:2));
function ipFixOctaves(r){ r=r.slice();
  for(let i=0;i<r.length;i++){ const nb=[r[i-1],r[i+1]].filter(v=>v!=null); if(!nb.length) continue; const ref=nb.length===2?(nb[0]+nb[1])/2:nb[0];
    for(const k of [12,-12]) if(Math.abs(r[i]+k-ref) < Math.abs(r[i]-ref)-6){ r[i]+=k; break; } }
  return r; }
function ipDecodeKey(r,w,inKey,au,ad,ook,squeeze){
  const SINT=0.45, SPOS=1.6, SABS=0.6, n=r.length, r0=r[0], alpha=(au+ad)/2; let best={sc:-Infinity,q:null};
  const rmin=Math.min(...r), rmax=Math.max(...r);
  for(let q0=Math.round(r0)-2;q0<=Math.round(r0)+2;q0++){ if(!inKey(q0)) continue;
    const lo=q0+Math.floor((rmin-r0)/alpha)-3, hi=q0+Math.ceil((rmax-r0)/alpha)+3, m=hi-lo+1;
    const S=new Int32Array(m), kp=new Float64Array(m); for(let k=0;k<m;k++){ S[k]=lo+k; kp[k]=inKey(lo+k)?0:-ook; }
    const pos=(i,k)=> squeeze ? -(((r[i]-r0)-alpha*(S[k]-q0))**2)/(2*SPOS*SPOS)*w[i] : -((r[i]-S[k])**2)/(2*SABS*SABS)*w[i];
    const pri=new Float64Array(m*m), ex=new Float64Array(m*m);
    for(let a=0;a<m;a++) for(let b=0;b<m;b++){ const d=S[b]-S[a]; pri[a*m+b]=ipStep(d); ex[a*m+b]=(d>0?au:ad)*d; }
    let V=new Float64Array(m); for(let k=0;k<m;k++) V[k]=(S[k]===q0?0:-1e18)+pos(0,k)+kp[k]*w[0];
    const B=[];
    for(let i=1;i<n;i++){ const dr=r[i]-r[i-1], ws=Math.min(w[i],w[i-1]), V2=new Float64Array(m), bk=new Int32Array(m);
      for(let b=0;b<m;b++){ let bv=-Infinity, ba=0; for(let a=0;a<m;a++){ const e=dr-ex[a*m+b], v=V[a]+pri[a*m+b]-e*e/(2*SINT*SINT)*ws; if(v>bv){ bv=v; ba=a; } }
        V2[b]=bv+pos(i,b)+kp[b]*w[i]; bk[b]=ba; }
      B.push(bk); V=V2; }
    let k=0; for(let j=1;j<m;j++) if(V[j]>V[k]) k=j; const sc=V[k], path=[k];
    for(let i=B.length-1;i>=0;i--){ k=B[i][k]; path.push(k); }
    if(sc>best.sc) best={sc,q:path.reverse().map(k=>S[k])};
  }
  return best; }
/* r: sung pitches (semitones), dur: lengths, key: {tonic,set}; opts: {ook, squeeze} */
function intendedPitches(r, dur, key, opts={}){
  if(!r.length) return [];
  r=ipFixOctaves(r); const md=[...dur].sort((a,b)=>a-b)[Math.floor(dur.length/2)]||1, w=dur.map(d=>Math.min(2,Math.max(0.5,d/md)));
  const inKey=q=>key.set.includes(((q-key.tonic)%12+12)%12), ook=opts.ook??2;
  if(!opts.squeeze){ const b=ipDecodeKey(r,w,inKey,1,1,ook,false); return opts.withScore?b:b.q; }
  let best={sc:-Infinity,q:null};
  for(let u=0.55;u<1.16;u+=0.05) for(let d=0.7;d<1.16;d+=0.05){ const b=ipDecodeKey(r,w,inKey,u,d,ook,true), sc=b.sc-(((u-1)**2)+((d-1)**2))/(2*0.15*0.15); if(sc>best.sc) best={sc,q:b.q}; }
  return opts.withScore?best:best.q; }
/* Other versions of a take: the most likely readings in other scales, and with wider jumps (for people who squeeze them),
   that make a different melody from what Noodle chose. Tapping through them lets you keep the one you meant. */
function takeVersions(tr){
  const rec=tr.notes.filter(n=>!n.x).sort((a,b)=>a.s-b.s); if(rec.length<3) return [];
  const r=rec.map(n=>+n.p), du=rec.map(n=>n.l||1), ook=ookCost(), cands=[];
  for(let t=0;t<12;t++) for(const sc of ['major','minor']){ const b=intendedPitches(r,du,{tonic:t,set:SCALES[sc]},{ook,withScore:true}); cands.push({sc:b.sc,q:b.q,tonic:t,scale:sc,squeeze:false}); }
  cands.sort((a,b)=>b.sc-a.sc);
  for(const c of cands.slice(0,4)){ const b=intendedPitches(r,du,{tonic:c.tonic,set:SCALES[c.scale]},{ook,squeeze:true,withScore:true}); cands.push({sc:b.sc,q:b.q,tonic:c.tonic,scale:c.scale,squeeze:true}); }
  cands.sort((a,b)=>b.sc-a.sc);
  const cur=rec.map(n=>n.qk==='V'?Math.round(n.p):pitchOf(n));
  const diff=(a,b)=>{ let d=0; for(let i=1;i<a.length;i++) if(a[i]-a[i-1]!==b[i]-b[i-1]) d++; return d; };   /* how many steps of the melody differ */
  const out=[{q:null,label:'mine'}], kept=[cur];
  for(const c of cands){ if(kept.some(k=>diff(k,c.q)<2)) continue; kept.push(c.q); out.push(c); if(out.length>=4) break; }
  return out; }
/* "Another version": the cycle starts from your notes as they are right now (with your edits), saved as Mine; editing while on a
   version makes that your new Mine the next time you tap. */
const verSig=tr=>JSON.stringify(tr.notes.map(n=>[n.s,n.l,n.p,n.x?1:0,n.q??null,n.qk||'']));
function verMine(tr){ const m=tr._mine; if(!m) return; tr.notes=JSON.parse(m.notes); tr.reading=m.reading; S.key=m.key; S.scale=m.scale; S.keyByVersion=m.kbv; tr._sel=null; tr._vi=0;
  tr._dirty=true; keyChanged(); keyCache=m.kc; tr._verSig=verSig(tr); save(); renderTracks(); scheduleRender(); verUI(tr); toast('Back to your notes.'); }
function verNext(tr){ if(!tr._versions || verSig(tr)!==tr._verSig){ tr._mine={notes:JSON.stringify(tr.notes), reading:tr.reading||null, key:S.key, scale:S.scale, kbv:S.keyByVersion??null, kc:currentKey()};   /* kc: the key the notes are heard in right now, so Mine sounds exactly as before */ tr._versions=takeVersions(tr); tr._vi=0; }
  const V=tr._versions; if(V.length<2){ toast('This part has no other likely version.'); return; }
  const i=((tr._vi||0)+1)%V.length;
  if(i===0){ verMine(tr); return; }
  applyVersion(tr,i); verUI(tr); toast(`Version ${i+1} of ${V.length}. Tap again for the next, or Mine to go back.`); }
function verUI(tr){ const on=!!(tr&&tr._vi); $('s2EdMine').hidden=!on; $('s2EdFill').hidden=on||!(INST[tr.inst].kind==='pitched'&&tr.inst!=='arp'); $('s2EdVer').textContent=on?`Version ${tr._vi+1} of ${tr._versions.length}`:'Another version'; }
function applyVersion(tr, i){
  const V=tr._versions; if(!V||!V[i]) return; tr._vi=i; const v=V[i], rec=tr.notes.filter(n=>!n.x).sort((a,b)=>a.s-b.s);
  if(v.q){ rec.forEach((n,k)=>{ n.q=v.q[k]; n.qk='V'; }); tr.reading={tonic:v.tonic,scale:v.scale,squeeze:v.squeeze};
    if(S.key==='auto' || S.keyByVersion===tr.id){ S.key=String(v.tonic); S.scale=v.scale; S.keyByVersion=tr.id; } }   /* the song keeps this scale for later takes */
  else { rec.forEach(n=>{ delete n.q; delete n.qk; }); tr.reading=null; if(S.keyByVersion===tr.id){ S.key='auto'; S.scale='auto'; S.keyByVersion=null; } }
  keyCache=null; tr._dirty=true; keyChanged(); syncAllInputs(); tr._verSig=verSig(tr); save(); renderTracks(); scheduleRender();
  if(!playing) togglePlay(); }
/* Personal interval width, measured on guided takes (sung vs the Guide). The squeeze is only allowed for someone whose
   own takes show it, so people who sing intervals accurately are never "corrected". */
function squeezeOn(){ const q=S.sq; if(!q||q.nu<10) return false; return q.xyu/q.xxu<0.9; }
function learnSqueeze(tr){ const g=S.tracks.find(t=>t.guide); if(!g||!tr.notes) return;
  const pairs=tr.notes.filter(n=>!n.x).map(n=>[n,g.notes.reduce((b,x)=>Math.abs(x.s-n.s)<Math.abs(b.s-n.s)?x:b,g.notes[0])]).filter(([n,x])=>Math.abs(n.s-x.s)<=1);
  const q=S.sq||(S.sq={nu:0,xxu:0,xyu:0,nd:0,xxd:0,xyd:0});
  for(let i=1;i<pairs.length;i++){ const [a,ga]=pairs[i-1], [b,gb]=pairs[i]; if(ga===gb) continue; const d=Math.round(gb.p)-Math.round(ga.p), y=b.p-a.p; if(!d) continue;
    if(d>0){ q.nu++; q.xxu+=d*d; q.xyu+=d*y; } else { q.nd++; q.xxd+=d*d; q.xyd+=d*y; } } }
/* The same interval profile, learned from your fixes: once you've fixed the pitch of a recorded note in a part, that part counts as
   reviewed. Each pair of neighbouring recorded notes then adds what you sang (the raw pitch) against what the part now shows (your
   fix, or the note you left as it was). A part counts once; editing it again replaces its share. Notes you drew yourself don't count. */
function learnSqueezeFromFixes(tr){ if(!tr||tr.guide||!tr.notes||INST[tr.inst].kind!=='pitched') return;
  const fixed=tr.notes.some(n=>n.x&&n.r0!=null); const q=S.sq||(S.sq={nu:0,xxu:0,xyu:0,nd:0,xxd:0,xyd:0}), old=tr.sqc, was=squeezeOn();
  if(old) for(const k in old) q[k]=(q[k]||0)-old[k];
  const c={nu:0,xxu:0,xyu:0,nd:0,xxd:0,xyd:0};
  if(fixed){ const sung=n=>n.x?(n.r0??null):+n.p, rec=tr.notes.filter(n=>sung(n)!=null).sort((a,b)=>a.s-b.s);
    for(let i=1;i<rec.length;i++){ const a=rec[i-1], b=rec[i]; if(b.s-(a.s+a.l)>8) continue;   /* across a rest of more than half a bar: a new phrase */
      const d=pitchOf(b)-pitchOf(a), y=sung(b)-sung(a); if(!d||Math.abs(d)>12) continue;
      if(d>0){ c.nu++; c.xxu+=d*d; c.xyu+=d*y; } else { c.nd++; c.xxd+=d*d; c.xyd+=d*y; } } }
  for(const k in c) q[k]+=c[k]; if(c.nu||c.nd) tr.sqc=c; else delete tr.sqc;
  const now=squeezeOn(); if(now!==was){ save(); learnNote(now?'Noted: you tend to sing upward jumps a little narrow. Recorded notes now allow for it.':'Noted: you sing jumps about as wide as they’re meant. Recorded notes go to the nearest note again.'); } else if(old||c.nu) save(); }
/* Each recorded note's pitch is worked out once for its whole part and kept; it is worked out again only when the key,
   Snap strength or your interval profile changes (so editing one note never moves the others). */
/* Snap strength: Tight keeps every recorded note in the key; looser lets clearly sung out-of-key notes through */
const ookCost=()=>{ const v=S.snapStr??100; return v>=100?50:0.3+2.7*(v/100)**2; };
function decSig(){ const K=currentKey(); return K.none?'none':`${K.tonic}|${K.scale}|${S.snapStr??100}|${squeezeOn()?1:0}`; }
function decodePart(tr, sig){ const K=currentKey(), rec=tr.notes.filter(n=>!n.x).sort((a,b)=>a.s-b.s);
  const q=intendedPitches(rec.map(n=>+n.p), rec.map(n=>n.l||1), {tonic:K.tonic,set:K.set}, {ook:ookCost(), squeeze:squeezeOn()});
  /* follow slow tuning drift: re-read each note against the tuning of the notes around it; change it only when it then lands clearly on another note */
  const r=rec.map(n=>+n.p), inKey=p=>K.set.includes(((p-K.tonic)%12+12)%12);
  const fq=q.map((p,i)=>{ const d=r.slice(Math.max(0,i-8),i+9).map((x,j)=>x-q[Math.max(0,i-8)+j]).sort((a,b)=>a-b), x=r[i]-d[d.length>>1];
    let b=p; for(let c=Math.round(x)-3;c<=Math.round(x)+3;c++) if((inKey(c)||c===p) && Math.abs(c-x)<Math.abs(b-x)) b=c; return Math.abs(b-x)<=0.3 ? b : p; });
  rec.forEach((n,i)=>{ n.q=fq[i]; n.qk=sig; }); }
function pitchOf(n){ if(n.x) return Math.round(n.p);
  if(n.qk==='V' && n.q!=null) return n.q;   /* a version you picked */
  // people who sing intervals as meant keep today's key snapping exactly; the whole-line reading is for those whose takes show a squeeze
  if(!squeezeOn()) return snap(n.p, n.l!=null?n.l*stepDur():null);
  const sig=decSig(); if(sig==='none') return Math.round(n.p);
  if(n.q!=null && n.qk===sig) return n.q;
  const tr=S.tracks.find(t=>t.notes&&t.notes.includes(n)&&INST[t.inst].kind==='pitched');
  if(!tr) return snap(n.p, n.l!=null?n.l*stepDur():null);
  decodePart(tr,sig); return n.q; }
/* Auto-chords: the note you played is the root; the 3rd and 5th come from the song's key (stacked scale steps),
   so in A minor an A plays A minor, a C plays C major, a B plays B diminished. Pentatonic and blues keys use their
   parent 7-note scale; notes outside the key (or "any note") get a major triad. */
const PARENT={major:'major','pent-major':'major',minor:'minor','pent-minor':'minor',blues:'minor',dorian:'dorian',mixolydian:'mixolydian',lydian:'lydian',phrygian:'phrygian',locrian:'locrian','harm-minor':'harm-minor','mel-minor':'mel-minor','phryg-dom':'phryg-dom'};   /* the 7-note scale chords are stacked from */
const slidesOn=tr=>tr.slides ?? true;
function chordName(ps){ if(!ps||ps.length<2) return ''; const r=ps[0], iv=new Set(ps.slice(1).map(p=>((p-r)%12+12)%12)), nm=NOTE_NAMES[((r%12)+12)%12].replace('♯','#').replace('♭','b');
  if(iv.size===1&&iv.has(7)) return nm+'5'; if(!iv.has(3)&&!iv.has(4)&&iv.size===2&&(iv.has(7)||iv.has(6))){ if(iv.has(2)||iv.has(1)) return nm+'sus2'; if(iv.has(5)||iv.has(6)&&iv.has(7)) return nm+'sus4'; }
  const m=iv.has(3)&&!iv.has(4), dim=m&&iv.has(6)&&!iv.has(7); if(iv.size===3&&(iv.has(9)||iv.has(8))&&!iv.has(10)&&!iv.has(11)&&(iv.has(3)||iv.has(4))) return nm+(m?'m':'')+'6';
  let q=dim?'dim':m?'m':''; if(iv.has(11)) q+= (q?'':'')+'maj7'; else if(iv.has(10)) q+= dim?'7':'7'; if(iv.has(2)) q= q.includes('7')?q.replace('7','9'):q+'add9'; if(iv.has(5)&&q.includes('9')&&!q.includes('add')) q=q.replace('9','11');
  return nm+q; }
const CHORD_TYPES={off:'Single notes',triad:'Triad',seventh:'7th',ninth:'9th',eleventh:'11th',sixth:'6th',add9:'Add 9',sus2:'Sus 2',sus4:'Sus 4',power:'Power (root + 5th)'};
const chordType=tr=> tr.inst==='bass'||tr.inst==='lead' ? 'off' : tr.chordType ?? (tr.chords===true?'triad': tr.chords===false?'off' : (['keys','pad','arp'].includes(tr.inst)?'triad':'off'));
const chordsOn=tr=>chordType(tr)!=='off';
/* Where chords sound best: a hummed root (often around A2-D3) stacked into a chord down there is muddy. Unless you've set the octave yourself,
   a chord track's octave is chosen so its roots sit around this note (MIDI), with no root under C3 (48). The notes you sang keep their shape; only the octave moves. */
const CHORD_ZONE={keys:60,pad:57,arp:62};
function autoOct(tr){ if(!CHORD_ZONE[tr.inst]||!chordsOn(tr)) return false; const lane=S.tracks.filter(t=>s2LaneId(t)===s2LaneId(tr)&&t.inst===tr.inst); if(lane.some(t=>t.octSet)) return false;
  const roots=lane.flatMap(t=>inWin(t.notes||[],pSteps(t)).map(pitchOf)); if(!roots.length) return false; const med=median(roots), lo=Math.min(...roots); let best=0, bs=1e9;
  for(let o=-2;o<=2;o++){ const sc=Math.abs(med+12*o-CHORD_ZONE[tr.inst])+(lo+12*o<48?12:0); if(sc<bs){ bs=sc; best=o; } }
  if(lane.every(t=>(t.oct||0)===best)) return false; lane.forEach(t=>{ t.oct=best; t._dirty=true; }); return true; }
/* bass is strictly one note at a time: a note ends where the next begins; of two starting together, the selected (or stronger) one stays */
function enforceMono(tr){ if(tr.inst!=='bass'||!tr.notes||!tr.notes.length) return false; const n0=tr.notes.length, ln=tr.notes.map(x=>x.l).join();
  const by=new Map(); tr.notes.forEach(x=>{ const o=by.get(x.s); if(!o || x===tr._sel || (o!==tr._sel && x.v>o.v)) by.set(x.s,x); });
  const ns=[...by.values()].sort((a,b)=>a.s-b.s); for(let i=0;i<ns.length-1;i++) ns[i].l=Math.max(1,Math.min(ns[i].l, ns[i+1].s-ns[i].s));
  if(tr._sel && !ns.includes(tr._sel)) tr._sel=null; tr.notes=ns; return ns.length!==n0 || ns.map(x=>x.l).join()!==ln; }
/* stacked scale steps from the root: triad = root, 3rd, 5th; 7th and 9th keep stacking; power = root, 5th, octave */
function chordTones(root,type){
  if(type==='off') return [root];
  if(type==='power') return [root,root+7,root+12];
  const degs={seventh:[0,2,4,6],ninth:[0,2,4,6,8],eleventh:[0,2,4,6,8,10],sixth:[0,2,4,5],add9:[0,2,4,8],sus2:[0,1,4],sus4:[0,3,4]}[type]||[0,2,4];   /* scale steps above the root, so every shape follows the song's scale */
  const plain={triad:[0,4,7],seventh:[0,4,7,10],ninth:[0,4,7,10,14],eleventh:[0,4,7,10,14,17],sixth:[0,4,7,9],add9:[0,4,7,14],sus2:[0,2,7],sus4:[0,5,7]}[type]||[0,4,7];
  const K=currentKey(); if(K.none) return plain.map(x=>root+x);
  const sc=SCALES[PARENT[K.scale]||'major'], pc=((root-K.tonic)%12+12)%12, deg=sc.indexOf(pc);
  if(deg<0) return plain.map(x=>root+x);
  return degs.map(k=>{ const d=deg+k, o=Math.floor(d/7); return root-pc+sc[d%7]+12*o; });
}
const triad=root=>chordTones(root,'triad');
const notePitches=(tr,nt)=>chordTones(pitchOf(nt), chordType(tr));
/* Arpeggiator: each note's chord is played one tone at a time for as long as the note lasts */
const ARP_DEF={pat:'up',rate:1,oct:1,gate:0.6};
const arpOf=tr=>Object.assign({},ARP_DEF,tr.arp||{});
function arpEvents(tr){
  const A=arpOf(tr), out=[]; let seed=7;
  const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  tr.notes.forEach((nt,ni)=>{
    const tones=notePitches(tr,nt), pool=[]; for(let o=0;o<A.oct;o++) tones.forEach(t=>pool.push(t+12*o));
    let seq = A.pat==='down' ? pool.slice().reverse() : A.pat==='updown' ? pool.concat(pool.slice(1,-1).reverse()) : pool;
    const count=Math.max(1,Math.round(nt.l/A.rate)); seed=7+ni*131;
    for(let k=0;k<count;k++){ const p = A.pat==='random' ? pool[Math.floor(rnd()*pool.length)] : seq[k%seq.length];
      out.push({x:nt.s+k*A.rate, l:A.rate*A.gate, p, v:nt.v*(k%2?0.82:1)}); }
  });
  return out;
}
const tAt=x=>{ const f=Math.floor(x); return stepTime(f)+(x-f)*stepDur(); };
function keyChanged(){ keyCache=null; S.tracks.forEach(t=>{ if(INST[t.inst].kind==='pitched' || (t.inst==='vox' && fxOf(t).tune>0)) t._dirty=true; }); }
/* ---- Chords from your melody: one chord per bar (or half bar) from the key's own chords, picked to fit the melody ----
   Each chord is scored by how much of the melody in its stretch is a chord tone (notes on the strong beats count more, other
   notes of the key cost a little, notes outside the key cost more), plus how naturally it follows the chord before (V to I,
   IV to V, ii to V...). The best whole sequence wins (Viterbi). Empty stretches keep the chord before. Starts and ends at home. */
const HARM_PRIOR={major:[0.3,0.1,0,0.2,0.2,0.15,-1.5], minor:[0.3,-1.5,0.1,0.2,0.15,0.2,0.15]};
const HARM_MOVE={'4>0':0.45,'3>4':0.25,'3>0':0.2,'1>4':0.3,'5>3':0.2,'0>3':0.1,'0>4':0.1,'0>5':0.1,'5>1':0.15,'2>5':0.15,'6>0':0.2,'4>5':0.15};
function harmonize(notes, K, steps, per){   /* notes: [{s,l,p}] on the song's steps; returns [{s,l,deg,root}] */
  if(K.none) return null; const par=PARENT[K.scale]||(K.mode==='minor'?'minor':'major'), set=SCALES[par], mode=['minor','dorian','phrygian','harm-minor','locrian'].includes(par)?'minor':'major', nseg=Math.ceil(steps/per);
  if(!set||set.length!==7) return null;
  const tones=d=>[0,2,4].map(k=>set[(d+k)%7]);   /* the triad on scale degree d, as pitch classes from the tonic */
  const pcOf=p=>((Math.round(p)-K.tonic)%12+12)%12;
  const fit=[]; for(let g=0;g<nseg;g++){ const a=g*per, b=a+per, row=[]; let any=false;
    for(let d=0;d<7;d++){ const T=tones(d); let sc=0;
      for(const n of notes){ const o=Math.min(b,n.s+n.l)-Math.max(a,n.s); if(o<=0) continue; any=true; const pc=pcOf(n.p), w=o*(n.s>=a&&n.s%8===0?1.5:1)/per;
        sc+= T.includes(pc)?w : set.includes(pc)?-0.6*w : -1*w; }
      row.push(sc+HARM_PRIOR[mode][d]); }
    fit.push(any?row:null); }
  const V=[], B=[]; for(let g=0;g<nseg;g++){ V.push(new Array(7).fill(-1e9)); B.push(new Array(7).fill(0));
    for(let d=0;d<7;d++){ const f=fit[g]?fit[g][d]:HARM_PRIOR[mode][d]*0.5, here=f+(g===0&&d===0?0.4:0)+(g===nseg-1&&d===0?0.5:0);
      if(g===0){ V[g][d]=here; continue; }
      for(let e=0;e<7;e++){ const mv=e===d?(fit[g]?-0.45:0.6):(HARM_MOVE[e+'>'+d]||0)+(fit[g]?0:-0.6), v=V[g-1][e]+mv+here; if(v>V[g][d]){ V[g][d]=v; B[g][d]=e; } } } }
  let d=V[nseg-1].indexOf(Math.max(...V[nseg-1])); const path=[]; for(let g=nseg-1;g>=0;g--){ path.unshift(d); d=B[g][d]; }
  const out=[]; path.forEach((d,g)=>{ const s=g*per, l=Math.min(per,steps-s), root=48+((K.tonic+set[d])%12); const last=out[out.length-1];
    if(last&&last.deg===d&&!fit[g]) last.l+=l; else out.push({s,l,deg:d,root}); });
  return out; }
