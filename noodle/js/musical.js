"use strict";
/* ---- Musical mode (in testing: a switch in builds run from Xcode): after a melody take is read, reshape it toward something that sounds better,
   rather than closer to what was sung. Noodle can't know exactly what you meant, so the first version you hear should already sound good, and
   it may suggest ideas. Rules, in order:
   1. tiny quiet blips go; other one-step notes join the note before
   2. note starts move onto the 8th-note grid (where the take mostly is)
   3. notes in a phrase run into each other (no gaps); a phrase's last note lasts at least half a beat, rounded to the beat
   4. notes on beats 1 and 3, and long notes, move to a note of the chord there (the song's chords, else chords that fit the melody), at most 2
      semitones, keeping the melody's direction
   5. a single note a big leap away from both neighbours (who are close together) moves an octave toward them
   6. each phrase ends on a chord note; the part's last note on the home chord, preferably home itself
   7. velocity follows the beat (downbeats strongest), keeping a third of the sung dynamics
   The reading as heard is kept (tr.heardNotes), and the note editor can swap between the two. ---- */
const musicalOn=()=>{ if(!window.NOODLE_DEV) return false; try{ return localStorage.getItem('noodle.musical')==='1'; }catch(e){ return false; } };
function musicalize(tr, notes){
  const K=currentKey(); if(K.none||!notes.length) return notes.map(n=>({...n}));
  const n=pSteps(tr), ink=m=>K.set.includes(((m-K.tonic)%12+12)%12);
  let ns=notes.filter(x=>x.s>=0&&x.s<n).map(x=>({...x, p:pitchOf(x)})).sort((a,b)=>a.s-b.s), stat={};
  // 1. blips
  const medV=median(ns.map(x=>x.v??0.8)); stat.dropped=0; stat.joined=0;
  ns=ns.filter(x=>!(x.l<=1&&(x.v??0.8)<medV*0.8&&(stat.dropped++,true)));
  for(let i=1;i<ns.length;i++){ const a=ns[i-1], b=ns[i]; if(b.l<=1&&b.s-(a.s+a.l)<=1){ a.l=b.s+b.l-a.s; ns.splice(i,1); i--; stat.joined++; } }
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
/* the musical pass on a part just recorded (when the switch is on) */
function musicalPass(tr){ if(!musicalOn()||!tr.notes||INST[tr.inst].kind!=='pitched'||tr.inst==='arp'||!tr.notes.length) return;
  const heard=tr.notes.map(n=>({...n})), mz=musicalize(tr,heard); tr.heardNotes=heard; tr.notes=mz.map(({mz,...x})=>({...x, mz:1})); tr.mzOn=true; tr._dirty=true; keyCache=null; }
/* the note editor's swap (in testing): the part as heard, or musical */
function musicalSwap(tr){ if(!tr.heardNotes){ tr.heardNotes=tr.notes.map(n=>({...n})); const mz=musicalize(tr,tr.heardNotes); tr.notes=mz.map(({mz,...x})=>({...x,mz:1})); tr.mzOn=true; }
  else { const cur=tr.notes; tr.notes=tr.mzOn?tr.heardNotes:(tr.mzNotes||musicalize(tr,tr.heardNotes).map(({mz,...x})=>({...x,mz:1}))); if(tr.mzOn) tr.mzNotes=cur; tr.mzOn=!tr.mzOn; }
  tr._dirty=true; keyCache=null; save(); scheduleRender(); }
