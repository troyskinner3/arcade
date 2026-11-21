"use strict";
/* ---- Musical mode (standard for everyone): after a melody take is read, reshape it toward something that sounds better,
   rather than closer to what was sung. Noodle can't know exactly what you meant, so the first version you hear should already sound good.
   Data plus music-theory rules. The data (noodle/musical.json, loaded on first use) is learned from ~45,000 public-domain and CC0 scores and
   folk tunes (PDMX's no-license-conflict subset, abc-collection; 7.2M melody notes; tunes like the test guides left out):
   how melodies move (next interval by scale degree, beat strength and the move before), how often notes are chord notes by beat strength and
   length, which degrees end phrases and songs, and where notes start in a bar. The reader's own mistakes (from the owner's guided takes) say
   how likely each fix is. A decoder picks the whole part at once:
     rhythm: tiny quiet blips go and one-step notes join the note before (rule); each start may move one step where real melodies start
             notes (data); notes in a phrase run into each other, phrase ends rounded to the beat (rule)
     pitch:  each note stays or moves to a key note within 2 semitones or an octave, weighing what was heard (reader's error pattern),
             how real melodies move, chord fit, and phrase/last-note degrees (data); the melody's ups and downs are kept (rule)
     velocity follows the beat (rule)
   Without the data (offline before it ever loaded) the earlier hand rules run (musicalRules). The reading as heard is kept (tr.heardNotes),
   and the note editor's As heard / Musical button swaps between the two. Offline tools: noodle/eval/musical_train/. ---- */
const musicalOn=()=>{ try{ return localStorage.getItem('noodle.musical')!=='0'; }catch(e){ return true; } };   /* on for everyone; '0' only for tests that measure the reader itself */
function musicalRules(tr, notes){
  const K=currentKey(); if(K.none||!notes.length) return notes.map(n=>({...n}));
  const n=pSteps(tr), ink=m=>K.set.includes(((m-K.tonic)%12+12)%12);
  let ns=notes.filter(x=>x.s>=0&&x.s<n).map(x=>({...x, p:pitchOf(x)})).sort((a,b)=>a.s-b.s), stat={};
  // 1. blips
  const medV=median(ns.map(x=>x.v??0.8)); stat.dropped=0; stat.joined=0;
  ns=ns.filter(x=>x.tp||!(x.l<=1&&(x.v??0.8)<medV*0.8&&(stat.dropped++,true)));   /* a note you tapped is never dropped or merged */
  for(let i=1;i<ns.length;i++){ const a=ns[i-1], b=ns[i]; if(b.l<=1&&!b.tp&&b.s-(a.s+a.l)<=1){ a.l=b.s+b.l-a.s; ns.splice(i,1); i--; stat.joined++; } }
  // 2. 8th grid, when most notes already sit on it
  stat.moved=0; if(ns.filter(x=>x.s%2===0).length>=ns.length*0.6) ns.forEach((x,i)=>{ if(x.s%2){ const pv=ns[i-1], dn=x.s-1, up=x.s+1, nx=ns[i+1];
      const to=(!pv||pv.s<dn)?dn:(!nx||nx.s>up)&&up<n?up:null; if(to!=null){ x.l+=x.s-to; x.s=to; stat.moved++; } } });
  ns=ns.filter((x,i)=>!i||x.s>ns[i-1].s);
  // 3. lengths: legato within a phrase (gap of a beat or less), phrase ends rounded to the beat
  const phraseEnd=i=>i===ns.length-1||ns[i+1].s-(ns[i].s+ns[i].l)>=4;
  ns.forEach((x,i)=>{ if(!phraseEnd(i)){ x.l=ns[i+1].s-x.s; } else { const lim=(i<ns.length-1?ns[i+1].s:n)-x.s; x.l=Math.max(2,Math.min(lim,Math.max(4,Math.round(x.l/4)*4))); } });
  // the chords: the song's chord parts at each step, else chords that fit this melody (one per bar)
  const off=tr.off||0, CM=songChordMap(), chordAt=new Map();
  if(![...CM.keys()].some(s=>s>=off&&s<off+n)){ const ch=harmonize(ns.map(x=>({s:x.s,l:x.l,p:x.p})),K,n,16)||[];
    ch.forEach(c=>{ const pcs=new Set(chordTones(c.root,'triad').map(p=>((p%12)+12)%12)); for(let s=c.s;s<c.s+c.l;s++) chordAt.set(s,pcs); }); }
  else for(let s=0;s<n;s++){ const a=CM.get(off+s); if(a) chordAt.set(s,a); }
  const tones=s=>chordAt.get(s)||null, toChord=(x,dirPref,max=2)=>{ const T=tones(x.s); if(!T||T.has(((x.p%12)+12)%12)) return false;
    for(let d=1;d<=max;d++) for(const sg of dirPref>=0?[1,-1]:[-1,1]){ const m=x.p+sg*d; if(T.has(((m%12)+12)%12)&&ink(m)){ x.p=m; return true; } } return false; };
  // 5. octave outliers (a lone note far from two close neighbours)
  stat.octave=0; for(let i=1;i<ns.length-1;i++){ const a=ns[i-1].p, x=ns[i], b=ns[i+1].p;
    if(Math.abs(x.p-a)>=8&&Math.abs(x.p-b)>=8&&Math.sign(x.p-a)===Math.sign(x.p-b)&&Math.abs(a-b)<=4){ const k=Math.round(((a+b)/2-x.p)/12); if(k){ x.p+=12*k; stat.octave++; } } }
  // 4. strong beats and long notes onto chord notes
  stat.chord=0; ns.forEach((x,i)=>{ if(x.s%8===0||x.l>=6){ const dir=i?Math.sign(x.p-ns[i-1].p):0; if(toChord(x,dir)) stat.chord++; } });
  // 6. phrase ends on chord notes; the last note on the home chord
  stat.ends=0; ns.forEach((x,i)=>{ if(!phraseEnd(i)) return; if(i===ns.length-1){ const home=[0,K.set[2],K.set[4]].map(d=>(K.tonic+d)%12), pc=((x.p%12)+12)%12;
      if(!home.includes(pc)){ let best=null; for(let d=1;d<=2&&best==null;d++) for(const sg of [-1,1]){ const m=x.p+sg*d; if(home.includes(((m%12)+12)%12)){ best=m; break; } } if(best!=null){ x.p=best; stat.ends++; } } }
    else if(toChord(x,0)) stat.ends++; });
  // 7. velocity follows the beat
  ns.forEach(x=>{ const acc=x.s%16===0?0.92:x.s%4===0?0.84:x.s%2===0?0.76:0.7; x.v=+Math.min(1,Math.max(0.3,acc*0.67+(x.v??0.8)*0.33)).toFixed(2); x.mz=1; });
  ns.stat=stat; return ns; }
/* the learned tables */
let MZ=null, mzLoad=null;
function loadMusical(){ return mzLoad||(mzLoad=fetch(new URL('musical.json',location.href)).then(r=>r.ok?r.json():null).then(j=>{ if(!j) return null;
  const A='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_', dec=str=>{ const c=[]; let n=0, t=0;
    for(let i=0;i<25;i++){ const k=A.indexOf(str[i]), v=k?Math.exp((k-1)*j.qs):0; c.push(v); n+=v; t+=v>0; } return {c,n,t}; };
  const tab=o=>{ const m=new Map(); for(const k in o) m.set(k,dec(o[k])); return m; };
  const ch={}; for(const k in j.ch){ const [o,i]=j.ch[k]; ch[k]=[Math.log((o+1)/(o+i+2)/4), Math.log((i+1)/(o+i+2)/3)]; }
  const deg=a=>{ const t=a.reduce((x,y)=>x+y,0)+12; return a.map(x=>Math.log((x+1)/t*12)); };
  MZ={o0:tab(j.o0), o1:tab(j.o1), o2:tab(j.o2), ch, end:{maj:deg(j.end.maj), min:deg(j.end.min)}, fin:{maj:deg(j.fin.maj), min:deg(j.fin.min)},
    on:j.on.map(r=>{ const t=r.reduce((x,y)=>x+y,0)+8; return r.map(x=>Math.log((x+0.5)/t)); })};
  return MZ; }).catch(()=>{ mzLoad=null; return null; })); }
const MZW={t:2, f:1, m:2.5, c:2.5, e:2.5, d:3}, MZERR={0:0, 1:-2.6, 2:-2.2, 12:-5};   /* how hard to push; the reader's error pattern (log odds) */
const mzMetric=s=>{ s=((s%16)+16)%16; return s===0?0:s===8?1:s%4===0?2:s%2===0?3:4; }, mzDur=l=>l<=1?0:l<=2?1:l<=4?2:3;
function mzIv(md, mn, deg, mc, prev, iv){ let p=1/25; const D=0.75;
  for(const key of [`${md},${mn}`, `${md},${mn},${deg},${mc}`, `${md},${mn},${deg},${mc},${prev==null?'S':prev}`]){
    const C=(key.split(',').length===2?MZ.o0:key.split(',').length===4?MZ.o1:MZ.o2).get(key); if(!C) break;
    p=Math.max(C.c[iv+12]-D,0)/C.n+D*C.t/C.n*p; }
  return p; }
function musicalize(tr, notes){
  if(!MZ) return musicalRules(tr, notes);
  const K=currentKey(); if(K.none||!notes.length) return notes.map(n=>({...n}));
  const n=pSteps(tr), ink=m=>K.set.includes(((m-K.tonic)%12+12)%12), md=K.set.includes(3)&&!K.set.includes(4)?'min':'maj', W=MZW;
  let ns=notes.filter(x=>x.s>=0&&x.s<n).map(x=>({...x, p:pitchOf(x)})).sort((a,b)=>a.s-b.s), stat={};
  // blips go; one-step notes join the note before
  const medV=median(ns.map(x=>x.v??0.8)); stat.dropped=0; stat.joined=0;
  ns=ns.filter(x=>x.tp||!(x.l<=1&&(x.v??0.8)<medV*0.8&&(stat.dropped++,true)));   /* a note you tapped is never dropped or merged */
  for(let i=1;i<ns.length;i++){ const a=ns[i-1], b=ns[i]; if(b.l<=1&&!b.tp&&b.s-(a.s+a.l)<=1){ a.l=b.s+b.l-a.s; ns.splice(i,1); i--; stat.joined++; } }
  if(!ns.length) return ns;
  // starts: each may move a step toward where real melodies start notes (Viterbi over -1/0/+1)
  { const N=ns.length, V=[]; for(let i=0;i<N;i++){ V.push(new Map());
      for(const d of [-1,0,1]){ const s=ns[i].s+d; if(s<0||s>=n) continue;
        if(!i){ V[0].set(d,[-W.t*Math.abs(d)+MZ.on[16][s%16],null]); continue; }
        let best=null; for(const [pd,[sc]] of V[i-1]){ const ps=ns[i-1].s+pd; if(ps>=s) continue; const v=sc-W.t*Math.abs(d)+MZ.on[s-ps<16?ps%16:16][s%16]; if(!best||v>best[0]) best=[v,pd]; }
        if(best) V[i].set(d,best); }
      if(!V[i].size){ let b=null; for(const [pd,[sc]] of V[i-1]) if(!b||sc>b[0]) b=[sc,pd]; V[i].set(0,b); } }
    let d=null, bv=-Infinity; for(const [k,[v]] of V[N-1]) if(v>bv){ bv=v; d=k; }
    stat.moved=0; for(let i=N-1;i>=0;i--){ const x=ns[i]; if(d){ x.s+=d; x.l-=d; stat.moved++; } d=V[i].get(d)[1]; }
    ns=ns.filter((x,i)=>!i||x.s>ns[i-1].s); }
  // lengths: legato within a phrase (gap under a beat), phrase ends rounded to the beat
  const gap=i=>ns[i+1].s-(ns[i].s+ns[i].l), phraseEnd=i=>i===ns.length-1||gap(i)>=4;
  ns.forEach((x,i)=>{ if(!phraseEnd(i)){ x.l=ns[i+1].s-x.s; } else { const lim=(i<ns.length-1?ns[i+1].s:n)-x.s; x.l=Math.max(2,Math.min(lim,Math.max(4,Math.round(x.l/4)*4))); } x.l=Math.max(1,x.l); });
  // the chords: the song's chord parts at each step, else chords that fit this melody (one per bar)
  const off=tr.off||0, CM=songChordMap(), chordAt=new Map();
  if(![...CM.keys()].some(s=>s>=off&&s<off+n)){ const ch=harmonize(ns.map(x=>({s:x.s,l:x.l,p:x.p})),K,n,16)||[];
    ch.forEach(c=>{ const pcs=new Set(chordTones(c.root,'triad').map(p=>((p%12)+12)%12)); for(let s=c.s;s<c.s+c.l;s++) chordAt.set(s,pcs); }); }
  else for(let s=0;s<n;s++){ const a=CM.get(off+s); if(a) chordAt.set(s,a); }
  // pitch: second-order Viterbi over each note's candidates
  const N=ns.length, pc=m=>((m%12)+12)%12, dg=m=>pc(m-K.tonic), sgn=x=>(x>0)-(x<0);
  const cand=ns.map(x=>{ const c=new Map([[x.p,0]]); for(const d of [-2,-1,1,2,-12,12]){ const q=x.p+d; if(ink(q)) c.set(q,MZERR[Math.abs(d)]); } return c; });
  const newPh=i=>i===0||gap(i-1)>=4;
  const unary=(i,q)=>{ const x=ns[i], m=mzMetric(x.s); let u=W.f*cand[i].get(q); const T=chordAt.get(x.s);
    if(T){ const a=MZ.ch[`${m},${mzDur(x.l)}`]; if(a) u+=W.c*(T.has(pc(q))?a[1]:a[0]); }
    if(i===N-1) u+=W.e*MZ.fin[md][dg(q)]; else if(phraseEnd(i)) u+=W.e*MZ.end[md][dg(q)];
    return u; };
  let V=new Map(); for(const q of cand[0].keys()) V.set('x,'+q,[unary(0,q),[q],null,q]);
  for(let i=1;i<N;i++){ const mn=mzMetric(ns[i].s), mc=mzMetric(ns[i-1].s), hd=sgn(ns[i].p-ns[i-1].p), np=newPh(i), np1=newPh(i-1), NV=new Map();
    for(const q of cand[i].keys()){ const u=unary(i,q); let best=null;
      for(const [,[s0,path,a,b]] of V){ let t=0;
        if(!np){ const iv=q-b, prev=a==null||np1?null:b-a;
          t=(iv>=-12&&iv<=12)?W.m*Math.log(mzIv(md,mn,dg(b),mc,prev,iv)):-12*W.m; if(sgn(iv)!==hd) t-=W.d; }
        const v=s0+t+u; if(!best||v>best[0]) best=[v,path,b]; }
      NV.set(best[2]+','+q,[best[0],best[1].concat(q),best[2],q]); }
    V=NV; }
  let bp=null; for(const [,v] of V) if(!bp||v[0]>bp[0]) bp=v;
  stat.pitch=0; ns.forEach((x,i)=>{ if(x.p!==bp[1][i]){ x.p=bp[1][i]; stat.pitch++; } });
  // velocity follows the beat
  ns.forEach(x=>{ const acc=x.s%16===0?0.92:x.s%4===0?0.84:x.s%2===0?0.76:0.7; x.v=+Math.min(1,Math.max(0.3,acc*0.67+(x.v??0.8)*0.33)).toFixed(2); x.mz=1; });
  ns.stat=stat; return ns; }
/* the musical pass on a part just recorded (when the switch is on) */
function musicalPass(tr){ if(!musicalOn()||!tr.notes||INST[tr.inst].kind!=='pitched'||tr.inst==='arp'||!tr.notes.length) return;
  const heard=tr.notes.map(n=>({...n})), mz=musicalize(tr,heard); tr.heardNotes=heard; tr.notes=mz.map(({mz,...x})=>({...x, mz:1})); tr.mzOn=true; tr._dirty=true; keyCache=null; }
/* the note editor's swap (in testing): the part as heard, or musical */
function musicalSwap(tr){ loadMusical(); if(!tr.heardNotes){ tr.heardNotes=tr.notes.map(n=>({...n})); const mz=musicalize(tr,tr.heardNotes); tr.notes=mz.map(({mz,...x})=>({...x,mz:1})); tr.mzOn=true; }
  else { const cur=tr.notes; tr.notes=tr.mzOn?tr.heardNotes:(tr.mzNotes||musicalize(tr,tr.heardNotes).map(({mz,...x})=>({...x,mz:1}))); if(tr.mzOn) tr.mzNotes=cur; tr.mzOn=!tr.mzOn; }
  tr._dirty=true; keyCache=null; save(); scheduleRender(); }
