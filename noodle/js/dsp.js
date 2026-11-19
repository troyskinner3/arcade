"use strict";

/* Sort beatbox hits into kick / snare / hat by brightness (1-D k-means with bounded centres) */
/* Fingerprint of one hit: the shape of its spectrum (24 mel bands -> 12 cepstral coefficients) in the first ~20 ms
   (the attack) and in the next ~45 ms (the body), how much it fades between them, its length, and its bass share.
   This separates far more mouth noises than brightness + length alone. */
/* Sort beatbox hits: B (kick) is bass-heavy; the rest are matched to three mouth sounds by brightness and length:
   k = short pop (clap), ch = longer, brighter hiss (snare), ts = brightest hiss (hi-hat).
   Prototype k-means: cluster centres adapt to your voice but are pulled toward the prototypes so they keep their meaning. */
/* A "kick" 30 dB quieter than the take's other kicks is a breath, a lip sound or the room, not a kick. Kicks only: hi-hats really are that much quieter than kicks
   (the owner's phone takes: kicks -3 to -20 dB, hats -31 to -41, faint false kicks -42 to -56). On the AVP freestyles this removes no real hit. */
/* which taught sounds get mistaken for each other (leave-one-out over the taught examples) */
function kitWarnings(){
  const T=taughtSlots(), sc=featScale(), w={};
  for(const sl of T){ const miss={}; sl.ex.forEach((f,i)=>{ const n=nearestSlot(f,T,sc,sl,i); if(n!==sl) miss[n.id]=(miss[n.id]||0)+1; });
    const top=Object.entries(miss).sort((a,b)=>b[1]-a[1])[0]; if(top && top[1]/sl.ex.length>=0.3) w[sl.id]=top[0]; }
  return w;
}
/* built-in rules used until at least two sounds are taught: B = kick, ch = snare, k = clap, ts = hat */
/* Built-in kick and snare examples for when you haven't taught your own sounds: sound fingerprints (the same features
   "Teach your sounds" stores) from 28 amateur beatboxers in the AVP dataset (Delgado, McDonald, Ng & Sandler, "A New
   Dataset for Amateur Vocal Percussion Analysis", 2019; ROLI / Queen Mary University of London; CC BY 4.0,
   https://zenodo.org/records/5036529). On people left out of the examples, rules for hi-hats and claps plus these for kick vs
   snare picked the right drum more often (prescribed sounds 63% → 66%; own sounds 56% → 57%; kicks most), see eval/README.md. */
/* Notes: Fewer ↔ More. Negative merges short blips and slides into neighbours; positive lets quicker changes stand. */
function detailNT(d){ d=clamp(d||0,-50,50)/50; const L=(a,lo,hi)=>d<0? a+(lo-a)*(-d) : a+(hi-a)*d;
  return {heldMin:L(NT.heldMin,0.14,0.05), driftMax:L(NT.driftMax,2.5,9), scoopMax:L(NT.scoopMax,0.32,0.1), hyst:L(NT.hyst,0.9,0.6),
    mergeSame:d<0?0.12*(-d):0, modelThr:L(NT.modelThr,0.8,0.42), onsetRise:L(NT.onsetRise,16,4), gapFrames:Math.round(L(NT.gapFrames,8,NT.gapFrames)), splitMin:L(NT.splitMin,0.18,0.06), minSeg:L(NT.minSeg,0.12,0.06)}; }
function withDetail(d,fn){ if(!d) return fn(); const keep=Object.assign({},NT); Object.assign(NT,detailNT(d)); try{ return fn(); } finally{ Object.assign(NT,keep); } }
const partDetail=tr=>clamp((tr&&tr.detail!=null?tr.detail:0)+(S.detailBias||0),-50,50);
/* Note starts from a small learned model (37 → 32 → 1), trained in eval/onset_model.py on VocalSet and Vocadito
   (both CC BY 4.0) from this detector's own per-frame readings: for each 10 ms frame it looks at pitch change,
   voicing, loudness change and pitch confidence across ±80 ms and scores "a note starts here". On singers it never
   saw, note accuracy went 0.49 → 0.59; on humming (never trained on) 0.62 → 0.63. Whistles use the rule-based path. */
/* Combined: the rule-based notes are the base (they follow slides and held pitches well); the model splits a note
   where it is confident a new one starts, and adds notes where it hears one and the rules found none. */
function mono(ab){ const n=ab.length, out=new Float32Array(n); const c=ab.numberOfChannels; for(let ch=0;ch<c;ch++){ const d=ab.getChannelData(ch); for(let i=0;i<n;i++) out[i]+=d[i]/c; } return out; }
/* ---- Learned note reader (v2): finds new notes inside long held notes (repeats hummed as one sound).
   Inputs every 10 ms: the sound (48 mel bands), the pitch reader's loudness/confidence/pitch, and where the moment sits on
   the beat. Trained on synthetic singers performing ~7,000 real folk-tune excerpts. Weights load on first use (noodle/reader.json). */
let READER=null, readerLoad=null;
function loadReader(){ return readerLoad||(readerLoad=fetch(new URL('reader.json',location.href)).then(r=>r.ok?r.json():null).then(j=>{ if(!j) return null;
  const f16=h=>{ const s=h&0x8000?-1:1, e=(h>>10)&31, m=h&1023; return e===0?s*m*2**-24:e===31?(m?NaN:s*Infinity):s*(1+m/1024)*2**(e-15); };
  const dec=b=>{ const s=atob(b), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i);
    if(j.fmt!=='f16') return new Float32Array(u.buffer); const h=new Uint16Array(u.buffer), out=new Float32Array(h.length); for(let i=0;i<h.length;i++) out[i]=f16(h[i]); return out; };
  const W={}; for(const [k,v] of Object.entries(j.w)) W[k]={shape:v.shape,d:dec(v.b)}; READER={W,hid:j.hid,lay:j.lay,fb:null}; return READER; }).catch(()=>null)); }
/* split a held note where the reader is confident a new note starts (only well inside the note), each piece with its own pitch */
/* ---- The background reader (js/reader-worker.js): the same reading, off the page. If a worker can't start here, takes are read on the page as before. ---- */
let RW=null, rwN=0, rwReader=false; const rwWait=new Map();
function rwStart(){ if(RW!==null) return RW;
  RW=(async()=>{ if(window.READER_ON_PAGE||globalThis.EXT_PITCH||typeof Worker==='undefined') return null;
    const href=n=>{ const el=document.querySelector(`[src^="js/${n}"],[href^="js/${n}"]`); return el?el.getAttribute('src')||el.getAttribute('href'):'js/'+n; };
    let w; try{ w=new Worker(href('reader-worker.js')); }catch(e){ return null; }
    w.onmessage=e=>{ const r=rwWait.get(e.data.id); if(!r) return; rwWait.delete(e.data.id); e.data.err?r.no(new Error(e.data.err)):r.ok(e.data.out); };
    w.onerror=e=>{ e.preventDefault&&e.preventDefault(); for(const r of rwWait.values()) r.no(new Error('reader worker')); rwWait.clear(); };
    const ask=m=>new Promise((ok,no)=>{ const id=++rwN; rwWait.set(id,{ok,no}); w.postMessage({...m,id}); });
    try{ await Promise.race([ask({op:'init',src:new URL(href('reader.js'),location.href).href}), new Promise((_,no)=>setTimeout(()=>no(new Error('slow')),4000))]); }catch(e){ w.terminate(); return null; }
    return ask; })();
  return RW; }
async function rwAsk(m){ const ask=await rwStart(); if(!ask) throw new Error('no worker'); return ask(m); }
/* read a take: in the background when possible, else on the page (same result) */
async function analyzeTakeBg(x, sr, inst, sens, notch, detail){
  const onPage=()=>withDetail(detail,()=>analyzeTake(x,sr,inst,sens,notch));
  try{ return await rwAsk({op:'analyze',x,sr,inst,kind:INST[inst].kind,sens,notch,nt:Object.assign({},NT,detail?detailNT(detail):{}),s:{kit:S.kit,kick:S.kick,snare:S.snare}}); }
  catch(e){ return onPage(); } }
async function readerOnsetsBg(x, sr, frames, grid){
  try{ const m={op:'onsets',x,sr,frames,grid}; if(!rwReader){ m.reader=READER; } const out=await rwAsk(m); rwReader=true; return out; }
  catch(e){ return readerOnsets(x,sr,frames,grid); } }
async function readerSplit(an, x, sr){
  const fr=an.notes.frames; if(!fr||!fr.length||an.notes.whistled) return;
  const R=await loadReader(); if(!R) return;
  const {P,pm,L,NM}=await readerOnsetsBg(x,sr,fr,{bpm:S.bpm,t0:an.align}), T0=fr[0].t, tune=an.notes.tune||0, out=[];
  /* a split needs the model to be confident AND some hint in the sound itself (a small loudness dip or pitch sag), so one held
     note that simply lasts across beats stays one note */
  an.cue={L,NM,T0};   /* the sound's colour per frame, for split hints */
  const RT=window.READER_THR??0.6, RD=window.READER_DIP??1.0, RS=window.READER_SAG??0.2;
  const cue=i=>{ if(RD>=99) return true; let L=-1e9,Rm=-1e9; for(let j=Math.max(0,i-8);j<i;j++) L=Math.max(L,fr[j].db); for(let j=i+1;j<=Math.min(fr.length-1,i+8);j++) Rm=Math.max(Rm,fr[j].db);
    let lo=1e9; for(let j=Math.max(0,i-3);j<=Math.min(fr.length-1,i+3);j++) lo=Math.min(lo,fr[j].db); const dip=Math.min(L,Rm)-lo;
    const side=[]; for(const j of [i-8,i-7,i-6,i+6,i+7,i+8]) if(j>=0&&j<pm.length&&!isNaN(pm[j])) side.push(pm[j]); let sag=0;
    if(side.length){ side.sort((a,b)=>a-b); let mn=1e9; for(let j=Math.max(0,i-3);j<=Math.min(pm.length-1,i+3);j++) if(!isNaN(pm[j])) mn=Math.min(mn,pm[j]); sag=side[side.length>>1]-mn; }
    return dip>=RD || sag>=RS; };
  const peaks=[]; for(let i=1;i<P.length-1;i++) if(P[i]>=RT&&P[i]>=P[i-1]&&P[i]>=P[i+1]&&cue(i)) peaks.push(fr[i].t);
  for(const nt of an.notes){ const cuts=peaks.filter(t=>t>=nt.t0+0.15&&t<=nt.t1-0.15); if(!cuts.length){ out.push(nt); continue; }
    const b=[nt.t0,...cuts,nt.t1];
    for(let k=0;k<b.length-1;k++){ const i0=Math.max(0,Math.round((b[k]-T0)/0.01)), i1=Math.min(pm.length,Math.round((b[k+1]-T0)/0.01));
      const seg=pm.slice(i0,i1).filter(v=>!isNaN(v)); let p=nt.p;
      if(seg.length>=4){ const q=Math.floor(seg.length/4), mid=seg.slice(q,Math.max(q+1,Math.floor(3*seg.length/4))).sort((a,c)=>a-c), h=mid.length>>1; p=(mid.length%2?mid[h]:(mid[h-1]+mid[h])/2)-tune; }
      out.push({...nt,t0:b[k],t1:b[k+1],p,g:k===0?nt.g:0}); } }
  const keep={whistled:an.notes.whistled,tune:an.notes.tune,frames:fr}; an.notes.length=0; an.notes.push(...out); Object.assign(an.notes,keep); }
/* Tap along (optional): one tap per note while you hum. A held note with taps inside it becomes one note per tap, each with the pitch
   sung there, which fixes repeats hummed as one sound. Taps are in the take's seconds; how late your taps sit against what was heard is
   worked out from the take itself (the median gap between note starts and their nearest tap). Returns how many notes were added. */
function tapSplit(an, taps){ const ns=an.notes; if(!taps||taps.length<2||!ns||!ns.length) return 0;
  const fr=ns.frames||[], tune=ns.tune||0, d=[];
  for(const n of ns){ let b=null; for(const t of taps) if(b===null||Math.abs(t-n.t0)<Math.abs(b-n.t0)) b=t; if(Math.abs(b-n.t0)<0.15) d.push(n.t0-b); }
  const off=d.length>=2?median(d):0, T=taps.map(t=>t+off), out=[]; let added=0;
  for(const nt of ns){ const c=T.filter(t=>t>=nt.t0+0.1&&t<=nt.t1-0.1); if(!c.length){ out.push(nt); continue; }
    const b=[nt.t0,...c,nt.t1];
    for(let k=0;k<b.length-1;k++){ const seg=fr.filter(f=>f.t>=b[k]+0.03&&f.t<b[k+1]-0.03&&f.conf<0.25).map(f=>f.m).sort((x,y)=>x-y);
      const sp=seg.length>=4?seg[seg.length>>1]-tune:nt.p, p=Math.abs(sp-nt.p)<0.75?nt.p:sp;   /* a repeat keeps the held note's pitch */ out.push({...nt,t0:b[k],t1:b[k+1],p,g:k===0?nt.g:0}); if(k) added++; } }
  /* and the other way: a note that starts with no tap near it, right where the one before ends, was one sound read as two: join them */
  const cover=out.filter(nt=>T.some(t=>Math.abs(t-nt.t0)<0.12)).length/out.length, MG=cover>=0.75?2:0, joined=[];   /* only when you tapped (nearly) every note */ for(const nt of out){ const pv=joined[joined.length-1], tapped=T.some(t=>Math.abs(t-nt.t0)<0.12);
    if(MG && pv && !tapped && nt.t0-pv.t1<0.06){ pv.t1=nt.t1; pv.db=Math.max(pv.db,nt.db); added--; } else joined.push(nt); }
  const keep={whistled:ns.whistled,tune:ns.tune,frames:fr}; ns.length=0; ns.push(...joined); Object.assign(ns,keep); return added; }
function fitWhistle(an, inst){
  if(!an.notes || !an.notes.whistled || !an.notes.length) return '';
  const center = inst==='bass' ? 57 : 69, med=median(an.notes.map(n=>n.p)), k=Math.max(0,Math.round((med-center)/12));
  if(k) an.notes.forEach(n=>n.p-=12*k);
  return ` Whistle detected${k?`, moved down ${k} octave${k>1?'s':''}`:''}.`;
}
function detectTempo(times, w){
  if(times.length<4) return null;
  const res=0.005, T=times[times.length-1]+1, n=Math.ceil(T/res)+8, env=new Float32Array(n);
  times.forEach((t,i)=>{ const k=Math.round(t/res); for(let j=-4;j<=4;j++){ if(k+j>=0&&k+j<n) env[k+j]+=w[i]*Math.exp(-(j*j)/(2*2.2*2.2)); } });
  const ac=lagS=>{ const L=lagS/res, li=Math.floor(L), fr=L-li; let s=0; for(let i=0;i+li+1<n;i++) s+=env[i]*(env[i+li]*(1-fr)+env[i+li+1]*fr); return s; };
  let best=null,bs=-1;
  for(let bpm=60;bpm<=180;bpm+=0.5){ const b=60/bpm; const sc=(ac(b)+0.5*ac(b/2)+0.6*ac(2*b)+0.4*ac(4*b))*Math.exp(-0.5*Math.pow(Math.log2(bpm/100)/0.55,2)); if(sc>bs){bs=sc;best=bpm;} }
  return Math.round(best);
}
/* turn a take's timings into grid steps for the current tempo */
function takeHits(tk, n=steps()){
  const an=tk.an, sd=stepDur(), q=S.quant==8?2:1, kind=INST[tk.inst].kind, out=[];
  for(const o of an.onsets){ const r=(o.t-an.align)/sd; if(r<-0.5*q) continue; const s=Math.max(0,Math.round(r/q)*q); if(s>=n) continue;
    out.push({s, d:kind==='drums'?o.cls:INST[tk.inst].drum, v:+o.v.toFixed(2), k:tk.id}); }
  return out;
}
function quantizeTrack(tr){
  if(INST[tr.inst].kind==='audio') return;
  const an=tr._an; if(!an) return;
  const n=pSteps(tr), sd=stepDur(), q=S.quant==8?2:1, kind=INST[tr.inst].kind;
  const raw=t=>(t-an.align)/sd;
  if(kind!=='pitched'){
    const takes = tr._takes || [{id:tr.takeN||1, inst:tr.inst, an}];
    let hits=tr.hits||[];
    for(const tk of takes){ hits=hits.filter(h=>h.k!==tk.id).concat(takeHits(tk,n)); }
    const map=new Map(); for(const h of hits){ const key=h.s+h.d; if(!map.has(key)||map.get(key).v<h.v) map.set(key,h); }
    tr.hits=[...map.values()].sort((a,b)=>a.s-b.s);
  } else {
    let ns=[];
    for(const nt of an.notes){ const r=raw(nt.t0); if(r<-0.5*q && raw(nt.t1)<1.5*q) continue; /* a note begun a moment before bar 1 keeps its part from bar 1 */ const s=Math.max(0,Math.round(r/q)*q); if(s>=n) continue;
      const e=Math.round(raw(nt.t1)/q+0.3)*q; ns.push({s,l:clamp(e-s,q,n-s),p:+nt.p.toFixed(2),v:+nt.v.toFixed(2),...(nt.g?{g:1}:{})}); }
    ns.sort((a,b)=>a.s-b.s||b.l-a.l);
    const out=[]; for(const nt of ns){ const last=out[out.length-1]; if(last&&last.s===nt.s) continue; if(last&&last.s+last.l>nt.s) last.l=nt.s-last.s; out.push(nt); }
    // two back-to-back notes of one phrase that land on the same key (a held note that drifted) are one held note
    const keyed=[]; for(const nt of out){ const pv=keyed[keyed.length-1];
      if(pv && nt.g && pv.s+pv.l===nt.s && !nt.x && !pv.x && Math.abs(pv.p-nt.p)<0.5){ if(nt.l>pv.l) pv.p=nt.p; pv.l+=nt.l; } else keyed.push(nt); }
    if(an.cue) keyed.forEach(nt=>{ const hs=splitHints(an,nt.s,nt.l,sd,q); if(hs.length) nt.hs=hs; });
    tr.notes=keyed;
  }
}
/* Split hints: inside a held note, the eighth-note points where the sound's colour clearly changes (a new syllable on the same pitch).
   Shown as a faint seam; tapping it splits the note there. Offsets are from the note's start. */
const HINT_THR=3.5;
function splitCue(c,t){ const NM=c.NM, L=c.L, T=L.length/NM, i=Math.round((t-c.T0)/0.01); if(i-10<0||i+10>T) return 0;
  const a=new Float64Array(NM), b=new Float64Array(NM); for(let f=i-10;f<i-2;f++) for(let k=0;k<NM;k++) a[k]+=L[f*NM+k]/8; for(let f=i+2;f<i+10;f++) for(let k=0;k<NM;k++) b[k]+=L[f*NM+k]/8;
  let ma=0,mb=0; for(let k=0;k<NM;k++){ ma+=a[k]; mb+=b[k]; } ma/=NM; mb/=NM; let ss=0; for(let k=0;k<NM;k++){ const d=(a[k]-ma)-(b[k]-mb); ss+=d*d; } return Math.sqrt(ss); }
function splitHints(an,s,l,sd,q){ const hs=[]; if(l<4||l>16) return hs;   /* up to a bar: longer is a note held on purpose */ const st=Math.max(2,q);
  for(let o=st;o<=l-st;o+=st) if(splitCue(an.cue,an.align+(s+o)*sd)>=HINT_THR) hs.push(o);
  return hs; }

