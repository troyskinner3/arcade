"use strict";
/* ============================== takes → tracks ============================== */
function userTracks(){ return S.tracks.filter(t=>!t.ex); }
const hasContent=t=>!!(t.mfx||(t.hits&&t.hits.length)||(t.notes&&t.notes.length)||(t.fxs&&t.fxs.length)||t._raw||(t.inst==='vox'&&t.va!=null)||t.blank);   /* blank: an empty part you made to draw in */
const anyContent=()=>userTracks().some(hasContent);
function dropExamples(keep){ if(keep) keep.ex=false; S.tracks.filter(t=>t.ex).forEach(disposeTrack); S.tracks=S.tracks.filter(t=>!t.ex); }
/* ============ FX (beta): ear candy from mouth gestures ============
   One take can hold several gestures. Each becomes an event {s, l, k, v, c, a}: start and length in steps, kind, loudness, and two 16-point curves taken
   from the voice itself: c drives the effect (pitch for risers and downlifters, brightness for sweeps), a is its loudness shape. So the sound follows how you performed it.
   Kinds: riser, down, sweepUp, sweepDown, impact. Sorting is by plain rules on what Noodle already measures (pitched or noisy, rising or falling, how long). */
const FX_KINDS={riser:'Riser',down:'Downlifter',sweepUp:'Sweep up',sweepDown:'Sweep down',impact:'Impact'};
/* Sound packs. 'Synth' is built in. A sample pack maps kinds to audio files (relative to the page), e.g. {riser:'fx/mypack/riser.wav', impact:'fx/mypack/impact.wav'};
   kinds it leaves out fall back to the synth. Samples that build (riser, sweepUp) are lined up to END where the event ends; the others start where it starts. */
const FX_PACKS={Synth:{}};
const fxBufs=new Map();   /* url -> AudioBuffer (or null while loading / if it failed) */
async function fxLoadPack(name){ const P=FX_PACKS[name]||{}; await Promise.all(Object.values(P).map(async url=>{ if(fxBufs.has(url)) return; fxBufs.set(url,null);
    try{ const ab=await (await fetch(new URL(url,location.href))).arrayBuffer(); fxBufs.set(url, await ctx.decodeAudioData(ab)); }catch(e){} })); }
const fxSample=(tr,k)=>{ const u=(FX_PACKS[tr.sound]||{})[k]; return u?fxBufs.get(u)||null:null; };
function fxResample(a,n){ const o=new Float32Array(n); for(let i=0;i<n;i++){ const p=i/(n-1)*(a.length-1), i0=Math.floor(p), f=p-i0; o[i]=a[i0]*(1-f)+(a[Math.min(a.length-1,i0+1)])*f; } return o; }
function fxAnalyze(x, sr, align){
  const hp=biquad(x,'hp',70,0.707,sr), tn=trackNotes(hp, sr, [], S.sens??55), fr=tn&&tn.frames; if(!fr||fr.length<8) return [];
  const w=Math.round(0.01*sr), zc=fr.map(f=>{ const c=Math.round(f.t*sr), a=Math.max(1,c-w), b=Math.min(hp.length-1,c+w); let z=0; for(let i=a;i<b;i++) if((hp[i-1]<0)!==(hp[i]<0)) z++; return z/((b-a)/sr); });   /* crossings a second: how bright / hissy */
  const dbs=fr.map(f=>f.db).slice().sort((p,q)=>p-q), top=dbs[Math.floor((dbs.length-1)*0.99)], f0=dbs[Math.floor((dbs.length-1)*0.15)], floor=top-f0<12?top-35:f0, gate=floor+Math.max(8,(top-floor)*0.3);
  const on=fr.map(f=>f.db>gate), segs=[]; let a=-1;
  for(let i=0;i<=fr.length;i++){ if(i<fr.length&&on[i]){ if(a<0) a=i; } else if(a>=0){ segs.push([a,i-1]); a=-1; } }
  const merged=[]; for(const g of segs){ const L=merged[merged.length-1]; if(L && fr[g[0]].t-fr[L[1]].t<0.12) L[1]=g[1]; else merged.push(g.slice()); }
  const sd=stepDur(), out=[], med=v=>{ const b=v.slice().sort((p,q)=>p-q); return b.length?b[b.length>>1]:0; };
  for(const [i0,i1] of merged){ const t0=fr[i0].t, t1=fr[i1].t+0.01, dur=t1-t0; if(dur<0.09) continue;   /* shorter than that is a click or a pop */
    const F=fr.slice(i0,i1+1), Z=zc.slice(i0,i1+1), q=Math.max(1,Math.floor(F.length/4)), tonal=F.filter(f=>f.conf<0.3&&f.m>28&&f.m<100), tf=tonal.length/F.length;
    const loud=F.map(f=>f.db), l0=med(loud.slice(0,q)), l1=med(loud.slice(-q)), pk=Math.max(...loud), v=0.5*clamp((pk-(top-30))/30,0.35,1);   /* recorded effects sit in the background too: louder takes up to 50, like a new one at 40 */
    let k, cur;
    const zs0=med(Z.slice(0,q)), zs1=med(Z.slice(-q));
    if(dur<0.28&&!(zs1<zs0*0.8)){ k='impact'; cur=F.map(()=>0); }   /* short and staying bright: an impact ("pssh") */
    else if(dur<0.28){ k='sweepDown'; cur=Z.map(z=>Math.log(Math.max(200,z))); }   /* short but clearly darkening: a quick downsweep (owner's takes, Nov 2026: their "shhh" downsweeps were ~0.25 s and read as impacts) */
    else if(tf>=0.5){ const ms=tonal.map(f=>f.m), qq=Math.max(1,Math.floor(ms.length/4)), rise=med(ms.slice(-qq))-med(ms.slice(0,qq)); k = rise>=2 ? 'riser' : rise<=-2 ? 'down' : (l1-l0<=-8?'down':'riser');   /* a held note fades a little on its own: only a clear fade reads as a downlifter */
      let last=tonal[0].m; cur=F.map(f=>{ if(f.conf<0.3&&f.m>28&&f.m<100) last=f.m; return last; }); }
    else { const z0=med(Z.slice(0,q)), z1=med(Z.slice(-q)); k = (z1>z0*1.12 || (Math.abs(z1-z0)<=z0*0.12 && l1>=l0)) ? 'sweepUp' : 'sweepDown'; cur=Z.map(z=>Math.log(Math.max(200,z))); }
    const lo=Math.min(...cur), hi=Math.max(...cur), c=[...fxResample(cur.map(y=>hi-lo>1e-6?(y-lo)/(hi-lo):0.5),16)].map(y=>+y.toFixed(3)), am=[...fxResample(loud.map(d=>clamp((d-(pk-30))/30,0,1)),16)].map(y=>+y.toFixed(3));
    let s0=Math.max(0,Math.round((t0-align)/sd)), l=Math.max(2,Math.round(dur/sd));
    if(k==='riser'||k==='sweepUp'){ const end=s0+l, bar=Math.round(end/16)*16; if(bar>s0+2 && Math.abs(bar-end)<=4) l=bar-s0; }   /* a build lands on the bar line */
    else if(k==='impact'){ const b=Math.round(s0/4)*4; if(Math.abs(b-s0)<=1) s0=b; l=Math.max(8,l); }                           /* a hit lands on the beat, and rings */
    else { const b=Math.round(s0/4)*4; if(Math.abs(b-s0)<=1) s0=b; }
    const dup=out.find(o=>o.s===s0); if(dup){ if(v>dup.v) Object.assign(dup,{l,k,v:+v.toFixed(2),c,a:am}); continue; }   /* two sounds on the same spot: keep the louder */
    out.push({s:s0,l,k,v:+v.toFixed(2),c,a:am}); }
  return out; }
async function addFxTake(x, sr, opt){
  const busy=showBusy('Listening to your take…'); await new Promise(r=>setTimeout(r,30));
  try{ const ev=fxAnalyze(x, sr, opt.align!=null?opt.align:0);
    if(!ev.length){ toast('Noodle couldn’t hear an effect there. Try a long rising “woooop”, a “shhh”, or a short “pshh”, a little louder.'); return; }
    let tr=S.tracks.find(t=>t.id===S.target&&t.inst==='fx'); if(!tr){ tr=mkTrack('fx',{id:S.nextId++}); S.tracks.push(tr); }
    const n=pSteps(tr); tr.fxs=ev.filter(e=>e.s<n).map(e=>({...e,l:Math.min(e.l,n-e.s)})); tr._fxx=x; tr._dirty=true; S.activeId=tr.id; save(); renderTracks();
    const cnt={}; tr.fxs.forEach(e=>{ cnt[e.k]=(cnt[e.k]||0)+1; }); toast('FX: '+Object.entries(cnt).map(([k,c])=>c+' '+FX_KINDS[k].toLowerCase()+(c>1?'s':'')).join(', ')+'. Tap the part to change any of them.');
    await renderDirty(); if(!playing){ playing=true; playFrom=takeStart(); startAll(ctx.currentTime+0.08, playFrom); }
  } finally{ busy(); } }
function fxNoise(oc,dur){ const n=Math.ceil(dur*oc.sampleRate), b=oc.createBuffer(1,n,oc.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; const s=oc.createBufferSource(); s.buffer=b; return s; }
/* An effect's bend (e.b, -1..1; the dot in the middle of it in the Transitions editor): its loudness over its length times 1 + b·4u(1−u), so the
   middle is up to twice as loud (b = 1) or silent (b = −1); the ends stay as they were. */
const fxBend=(e,u)=>Math.max(0,1+clamp(e.b||0,-1,1)*4*u*(1-u));
/* the shape drawn for an effect (0..1 across it, from your voice's curve), bent like its loudness */
function fxShape(e,u){ const C=e.c||[0,1], up=e.k==='riser'||e.k==='sweepUp', x=u*(C.length-1), i=Math.min(C.length-2,Math.floor(x)), c=C.length>1?C[i]+(C[i+1]-C[i])*(x-i):C[0];
  const yv=e.k==='impact'?1-u:0.6*c+0.4*(up?u:1-u); return clamp(yv*fxBend(e,u),0,1); }   /* the ends stay where they are (as in Mix effects); only the middle bends (it used to be scaled down as a whole, so the start looked lower: owner) */
function fxPlay(oc, out, tr, e, t){ if(e.b){ const bg=oc.createGain(), D0=Math.max(0.12,e.l*stepDur()); bg.connect(out); bg.gain.setValueCurveAtTime(Float32Array.from({length:64},(_,i)=>Math.max(0.0001,fxBend(e,i/63))),t,D0); out=bg; }   /* the bend */
  if(e.pan){ const pn=oc.createStereoPanner(); pn.pan.value=clamp(e.pan,-1,1); pn.connect(out); out=pn; }   /* each effect can sit left or right */
  const D=Math.max(0.12,e.l*stepDur()), v=(e.v??0.8), N=64, cv=fxResample(Float32Array.from(e.c||[0,1]),N), av=fxResample(Float32Array.from(e.a||[1,1]),N);
  const smp=fxSample(tr,e.k);
  if(smp){ const src=oc.createBufferSource(), g=oc.createGain(); src.buffer=smp; g.gain.value=v; src.connect(g); g.connect(out); const build=e.k==='riser'||e.k==='sweepUp';
    if(build){ const lead=smp.duration-D; if(lead>0) src.start(t,lead); else src.start(t-lead); } else src.start(t); return; }
  const g=oc.createGain(); g.connect(out); const amp=Float32Array.from(av,(y,i)=>Math.max(0.0001,v*(0.15+0.85*y)*(i>N-4?(N-1-i)/4:1)*(i<2?(i+1)/3:1)));
  if(e.k==='impact'){ const o=oc.createOscillator(), og=oc.createGain(); o.type='sine'; o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(38,t+0.35); og.gain.setValueAtTime(0.0001,t); og.gain.exponentialRampToValueAtTime(v*0.9,t+0.008); og.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(0.7,D));
    o.connect(og); og.connect(out); o.start(t); o.stop(t+Math.max(0.8,D)+0.1);
    const n=fxNoise(oc,Math.max(1.2,D)), f=oc.createBiquadFilter(), ng=oc.createGain(); f.type='lowpass'; f.frequency.setValueAtTime(9000,t); f.frequency.exponentialRampToValueAtTime(300,t+Math.max(1.0,D)); ng.gain.setValueAtTime(0.0001,t); ng.gain.exponentialRampToValueAtTime(v*0.55,t+0.004); ng.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(1.1,D));
    n.connect(f); f.connect(ng); ng.connect(out); n.start(t); return; }
  if(e.k==='riser'||e.k==='down'){ const K=currentKey(), root=48+12*clamp(e.o||0,-2,2)+(K.none?0:K.tonic), up=e.k==='riser';   /* an octave higher than before for every song (owner, Nov 2026); e.o moves it (the editor's Octave). In the song's key: two octaves, shaped by your own curve, always ending high (riser) or low (downlifter) */
    const mono=Float32Array.from(cv,(y,i)=>{ const lin=i/(N-1), tgt=up?lin:1-lin; return 0.6*y+0.4*tgt; }), fq=Float32Array.from(mono,y=>440*Math.pow(2,(root+24*y-69)/12));
    [['sawtooth',1,0.5],['square',2.005,0.22]].forEach(([type,mul,lv])=>{ const o=oc.createOscillator(), og=oc.createGain(); o.type=type; o.frequency.setValueCurveAtTime(Float32Array.from(fq,f=>f*mul),t,D); og.gain.value=lv; o.connect(og); og.connect(g); o.start(t); o.stop(t+D+0.05); });
    const n=fxNoise(oc,D+0.05), f=oc.createBiquadFilter(), ng=oc.createGain(); f.type='bandpass'; f.Q.value=2; f.frequency.setValueCurveAtTime(Float32Array.from(fq,x=>Math.min(12000,x*6)),t,D); ng.gain.value=0.35; n.connect(f); f.connect(ng); ng.connect(g); n.start(t);
    const lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueCurveAtTime(Float32Array.from(mono,y=>600+9000*y),t,D); g.disconnect(); g.connect(lp); lp.connect(out);
    g.gain.setValueCurveAtTime(amp,t,D); return; }
  { const up=e.k==='sweepUp', mono=Float32Array.from(cv,(y,i)=>{ const lin=i/(N-1), tgt=up?lin:1-lin; return 0.55*y+0.45*tgt; });   /* noise sweep */
    const n=fxNoise(oc,D+0.05), f=oc.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.4; f.frequency.setValueCurveAtTime(Float32Array.from(mono,y=>250*Math.pow(40,y)),t,D); n.connect(f); f.connect(g); n.start(t); g.gain.setValueCurveAtTime(Float32Array.from(amp,y=>y*0.7),t,D); } }   /* noise sweeps 6 dB under before: they measure level with the risers, but their hiss sounds louder (owner, Nov 18) */
async function renderFx(tr){ await fxLoadPack(tr.sound);
  const sr=ctx.sampleRate, L=bufLen(tr), n=Math.round(L*sr), tail=3, oc=new OfflineAudioContext(2,n+tail*sr,sr), out=oc.createGain(); out.gain.value=0.8; out.connect(oc.destination);
  const off=tr.off||0, ps=pSteps(tr), end=Math.round(L/stepDur());
  for(const e of inWin(tr.fxs||[],ps)){ if(e.s+off>=end) continue; try{ fxPlay(oc,out,tr,e,stepTime(e.s+off)+0.002); }catch(err){} }
  const r=await oc.startRendering(), b=ctx.createBuffer(2,n,sr);
  return foldTail(b,r,n); }
async function addVocalTake(x, sr, opt){
  let pk=0; for(let i=0;i<x.length;i++) pk=Math.max(pk,Math.abs(x[i]));
  if(pk<0.003){ toast('Noodle couldn’t hear any singing. Move closer to the mic and try again.'); return; }
  let va=opt.align; if(va==null){ const ons=detectOnsets(biquad(x,'hp',80,0.707,sr),sr,55,0.09); va=ons.length?Math.max(0,ons[0].t-0.02):0; }
  const tg=S.tracks.find(t=>t.id===S.target && t.inst==='vox');
  if(opt.first) dropExamples(tg);
  let tr = tg || (S.replaceTonal ? [...userTracks()].reverse().find(t=>t.inst==='vox') : null);
  const over=!!(tr && tr._raw);
  if(!tr){ tr=mkTrack('vox',{id:S.nextId++}); S.tracks.push(tr); }
  S.activeId=tr.id;
  tr._raw={x,sr}; tr.va=+va.toFixed(4); tr.vtake=(tr.vtake||0)+1; tr._pitch=null; tr._tuned=null; tr._dirty=true;   // vtake: each take counts as a change (undo, Retake) even when it has no pitched notes
  // notes of the vocal (for the song's key and the editor), measured once
  const fr=voxPitch(tr); tr.vn=[]; let cur=null;
  fr.forEach((f,i)=>{ const m=f.ms; if(isNaN(m)){ if(cur){ if(cur.n>=8) tr.vn.push({t:cur.t-va, l:cur.n*0.01, p:+median(cur.ps).toFixed(2)}); cur=null; } return; }
    if(cur && Math.abs(m-median(cur.ps.slice(-6)))<0.9){ cur.ps.push(m); cur.n++; } else { if(cur && cur.n>=8) tr.vn.push({t:cur.t-va, l:cur.n*0.01, p:+median(cur.ps).toFixed(2)}); cur={t:f.t,ps:[m],n:1}; } });
  storeVox(tr); keyChanged(); save(); renderTracks(); 
  toast(`Vocals: ${(x.length/sr-va).toFixed(1)} s ${over?'recorded over':'recorded'}. Tuning follows the song’s key (${(()=>{ const K=currentKey(); return K.none?'any note':NOTE_NAMES[K.tonic]+' '+(SCALE_LABEL[K.scale]||K.scale); })()}).`);
  await renderDirty(); if(!playing){ playing=true; playFrom=takeStart(); startAll(ctx.currentTime+0.08, playFrom); }
}
/* ---- Sending takes for research (only on devices opened with a drop link: ?drop=<web app URL>&k=<key>) ----
   Each recorded take goes to the owner's own Google Drive folder ("Noodle takes") through their Apps Script web app:
   the audio (24 kHz WAV) plus what Noodle heard, and later the notes as you leave them after editing. */
const DROP_KEY='noodle.drop';
let drop=null; try{ drop=JSON.parse(localStorage.getItem(DROP_KEY)||'null'); }catch(e){}
(function(){ try{ const q=new URLSearchParams(location.search); if(q.get('drop')){
  if(q.get('drop')==='off'){ drop=null; localStorage.removeItem(DROP_KEY); }
  else { drop={url:q.get('drop'), k:q.get('k')||'', who:q.get('who')||''}; localStorage.setItem(DROP_KEY,JSON.stringify(drop)); }
  history.replaceState(null,'',location.pathname); }
  if(q.get('share')){ if(q.get('share')==='off') shareDisable(false); else if(q.get('age13')==='1') shareEnable(q.get('share')); history.replaceState(null,'',location.pathname); } }catch(e){} })();
/* Sharing through the Noodle takes service (opt-in, 13+). No account: this install gets a random id that only this phone knows,
   which lets it add, update and delete its own takes. */
const NOODLE_BUILD='2026-11-15';   /* which version of Noodle heard a shared take */
const CRASH_KEY='noodle.crash', crashOn=()=>{ try{ return localStorage.getItem(CRASH_KEY)!=='0'; }catch(e){ return false; } }, crashSeen=new Set();
function crashReport(msg, stack){ try{ if(!crashOn() || crashSeen.size>=10 || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !window.CRASH_TEST)) return;   /* CRASH_TEST: eval scripts only */
  const m=String(msg||'').slice(0,400), st=String(stack||'').split('\n').slice(0,8).map(l=>l.replace(/(https?|noodle|file):\/\/[^\s)]*\//g,'')).join('\n'), k=m+'|'+st.split('\n')[0]; if(!m||crashSeen.has(k)) return; crashSeen.add(k);
  fetch(NOODLE_API+'/v1/errors',{method:'PUT',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({msg:m, stack:st, build:NOODLE_BUILD, app:/NoodleApp/.test(navigator.userAgent)?'ios':'web', where:typeof nxAt==='string'?nxAt:''})}).catch(()=>{}); }catch(e){} }
window.addEventListener('error',e=>crashReport(e.message, e.error&&e.error.stack));
window.addEventListener('unhandledrejection',e=>{ const r=e.reason; crashReport(r&&r.message||String(r), r&&r.stack); });
/* ---- Usage stats: counts (no song content) so we can see where people get stuck and what they use; More > Send usage stats
   turns it off. Each batch carries a random ID made on this phone only for stats (statsId: not the takes/links/invites ID, never sent with
   an email or a purchase), so one phone's path can be followed and the owner's own phone left out; turning stats off deletes it. The event names are noodle-api's EVENTS. Each carries d = days since this phone first opened Noodle (return rates on day 1, 7, 30),
   batched and sent every 30 s or when the app goes to the background; at most 300 a day from one phone. ---- */
const STATS_KEY='noodle.stats', statsOn=()=>{ try{ return localStorage.getItem(STATS_KEY)!=='0'; }catch(e){ return false; } };
const statsQ=[], statsSess={takes:0, edits:0, at:Date.now()}; let statsT=0;
function statsDay(){ try{ let f=+localStorage.getItem('noodle.first')||0; if(!f){ f=Date.now(); localStorage.setItem('noodle.first',String(f)); } return Math.max(0,Math.floor((Date.now()-f)/864e5)); }catch(e){ return 0; } }
function track(e,p,v){ try{ if(!statsOn()) return; const day=new Date().toISOString().slice(0,10), c=localStorage.getItem('noodle.statsN')||'', n=c.startsWith(day+'|')?+c.split('|')[1]||0:0;
  if(n>=300) return; localStorage.setItem('noodle.statsN',day+'|'+(n+1));
  statsQ.push({e, p:p==null?'':String(p).replace(/[^A-Za-z0-9 _.+-]/g,'').slice(0,40), v:typeof v==='number'&&isFinite(v)?v:0, d:statsDay()});
  if(statsQ.length>=20) statsFlush(); else if(!statsT) statsT=setTimeout(statsFlush,30000); }catch(err){} }
/* the first time something happens on this phone (the new-person funnel) */
function trackOnce(e,p,v){ try{ if(!statsOn()) return; const k='noodle.ev.'+e; if(localStorage.getItem(k)) return; localStorage.setItem(k,'1'); }catch(err){ return; } track(e,p,v); }
function statsId(){ try{ let s=localStorage.getItem('noodle.statsId'); if(!s){ const b=crypto.getRandomValues(new Uint8Array(18)); s=btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_'); localStorage.setItem('noodle.statsId',s); } return s; }catch(e){ return ''; } }
function statsFlush(){ clearTimeout(statsT); statsT=0; if(!statsQ.length) return; const ev=statsQ.splice(0,50);
  if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !window.STATS_TEST){ window.statsSent=(window.statsSent||[]).concat(ev); return; }   /* tests: kept here, not sent */
  try{ fetch(NOODLE_API+'/v1/events',{method:'POST',headers:{'Content-Type':'text/plain'},keepalive:true,body:JSON.stringify({app:/NoodleApp/.test(navigator.userAgent)?'ios':'web', build:NOODLE_BUILD, plan:isPro()?'pro':'free', id:statsId(), ev})}).catch(()=>{}); }catch(e){} }
/* once a day: an open (return rates), and a session's totals when the app goes to the background */
function statsOpen(){ try{ const day=new Date().toISOString().slice(0,10); if(localStorage.getItem('noodle.ev.open')===day) return; trackOnce('first_open'); localStorage.setItem('noodle.ev.open',day); }catch(e){ return; } track('open'); }
function statsSessionEnd(){ const s=statsSess; if(s.takes||s.edits){ track('session','takes',s.takes); track('session','edits',s.edits); track('session','minutes',Math.round((Date.now()-s.at)/6e4)); } s.takes=0; s.edits=0; s.at=Date.now(); }
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ statsSessionEnd(); statsFlush(); } else statsOpen(); });
statsOpen();
const NOODLE_API=(()=>{ try{ return localStorage.getItem('noodle.api')||'https://noodle-takes.cracked.workers.dev'; }catch(e){ return 'https://noodle-takes.cracked.workers.dev'; } })();   /* 'noodle.api' is for tests */
/* Optional email list (news about Noodle and what comes next): separate from sharing takes, with its own consent. `text` is the wording the person agreed to. */
async function emailSignup(email, text){ try{ const r=await fetch(NOODLE_API+'/v1/signups',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({email, consent:{v:1, text}})}); return r.ok; }catch(e){ return false; } }
async function emailRemove(email){ try{ const r=await fetch(NOODLE_API+'/v1/signups',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}); return r.ok; }catch(e){ return false; } }
function shareEnable(api=NOODLE_API){ const b=crypto.getRandomValues(new Uint8Array(18)), id=btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_');
  drop={api:String(api).replace(/\/+$/,''), install:(drop&&drop.api&&drop.install)||id, consent:{v:1, age13:true, at:new Date().toISOString()}}; try{ localStorage.setItem(DROP_KEY,JSON.stringify(drop)); }catch(e){} }
async function shareDisable(deleteShared){ const d=drop; drop=null; try{ localStorage.removeItem(DROP_KEY); }catch(e){} if(!deleteShared){ try{ await outbox.clear(); }catch(e){} }
  if(deleteShared && d && d.api){ let ok=false; try{ ok=(await fetch(`${d.api}/v1/installs/${d.install}`,{method:'DELETE'})).ok; }catch(e){}
    if(!ok){ drop=d; try{ localStorage.setItem(DROP_KEY,JSON.stringify(d)); }catch(e){} }   /* keep the id, so deleting can be tried again */
    else { try{ await outbox.clear(); }catch(e){} }
    return ok; } return true; }
function wavBytes16k(x,sr){ const R=16000, n=Math.floor((x.length-1)*R/sr), z=sr>R?biquad(biquad(x,'lp',7200,0.707,sr),'lp',7200,0.707,sr):x, out=new DataView(new ArrayBuffer(44+n*2)), w=(o,t)=>{ for(let i=0;i<t.length;i++) out.setUint8(o+i,t.charCodeAt(i)); };
  w(0,'RIFF'); out.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); out.setUint32(16,16,true); out.setUint16(20,1,true); out.setUint16(22,1,true); out.setUint32(24,R,true); out.setUint32(28,R*2,true); out.setUint16(32,2,true); out.setUint16(34,16,true); w(36,'data'); out.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){ const q=i*sr/R, i0=Math.floor(q), fr=q-i0, v=z[i0]*(1-fr)+z[i0+1]*fr; out.setInt16(44+i*2,Math.max(-32768,Math.min(32767,Math.round(v*32767))),true); }
  return out.buffer; }
/* 'ok', 'retry' (no connection or the service is busy: try again later) or 'drop' (the service refused it: trying again won't help) */
async function sharePut(path, body, type){ if(navigator.onLine===false) return 'retry';
  for(let i=0;i<2;i++){ try{ const r=await fetch(`${drop.api}/v1/takes/${drop.install}/${path}`,{method:'PUT',headers:{'Content-Type':type},body}); if(r.ok) return 'ok'; if(r.status<500&&r.status!==429) return 'drop'; }catch(e){} if(i<1) await new Promise(r=>setTimeout(r,1500)); } return 'retry'; }
/* Takes recorded while offline (or when a send fails) wait here, on this device, and go out when the connection is back. One entry per take; a later update replaces the record and keeps the recording. */
const outbox={ req(mode,fn){ return takeStore.open().then(db=>db?new Promise(res=>{ try{ const q=fn(db.transaction('outbox',mode).objectStore('outbox')); q.onsuccess=()=>res(q.result??null); q.onerror=()=>res(null); }catch(e){ res(null); } }):null); },
  all(){ return this.req('readonly',st=>st.getAll()); }, get(k){ return this.req('readonly',st=>st.get(k)); }, put(v){ return this.req('readwrite',st=>st.put(v,v.sid)); }, del(k){ return this.req('readwrite',st=>st.delete(k)); }, clear(){ return this.req('readwrite',st=>st.clear()); } };
async function shareSend(it){ const a=await sharePut(`${it.sid}/meta`, JSON.stringify(it.meta), 'application/json'); if(a!=='ok') return a; if(!it.wav) return 'ok'; return sharePut(`${it.sid}/audio`, it.wav, 'audio/wav'); }
let shareFlushing=false;
async function shareFlush(){ if(shareFlushing||!drop||!drop.api||navigator.onLine===false) return; shareFlushing=true;
  try{ const items=((await outbox.all())||[]).sort((a,b)=>a.at-b.at); for(const it of items){ const r=await shareSend(it); if(r==='retry') break; await outbox.del(it.sid); } }catch(e){} finally{ shareFlushing=false; try{ nxMoreSync(); }catch(e){} } }
window.addEventListener('online',()=>shareFlush()); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) shareFlush(); }); setTimeout(()=>shareFlush(),4000);
// once a day while sharing: which video tools this phone has (decides how videos get made)
setTimeout(async()=>{ if(!drop) return; const day=new Date().toISOString().slice(0,10); try{ if(localStorage.getItem('noodle.diag')===day) return; localStorage.setItem('noodle.diag',day); }catch(e){}
  const r={ua:navigator.userAgent, VE:typeof VideoEncoder, AE:typeof AudioEncoder, MR:typeof MediaRecorder};
  try{ for(const sr of [44100,48000]) r['aac'+sr]=!!(await videoEncodeConfig(sr)); }catch(e){ r.err=String(e); }
  dropPost({sid:'diag-'+day+'-'+(slug(drop.who)||'me'), meta:r}); },4000);
async function dropPost(body){ if(!drop) return;
  if(drop.api){ if(!body.meta||!body.sid||/^diag-/.test(body.sid)) return true; const {who,ua,song,...m}=body.meta;
    const it={sid:body.sid, at:Date.now(), meta:{...m, consent:drop.consent, app:/NoodleApp/.test(navigator.userAgent)?'ios':'web'}, wav:body.pcm?wavBytes16k(body.pcm.x, body.pcm.sr):null};
    const waiting=await outbox.get(it.sid); if(waiting){ if(!it.wav&&waiting.wav) it.wav=waiting.wav; it.at=waiting.at; await outbox.put(it); shareFlush(); return true; }   /* this take is still waiting: update it in place */
    const r=await shareSend(it); if(r==='retry'){ const all=(await outbox.all())||[]; if(all.length>=150){ const old=all.sort((a,b)=>a.at-b.at)[0]; await outbox.del(old.sid); } await outbox.put(it); try{ nxMoreSync(); }catch(e){} }
    else if(r==='ok') shareFlush();
    return true; }
  const data=JSON.stringify({k:drop.k, ...body});
  for(let i=0;i<3;i++){ try{ await fetch(drop.url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:data,keepalive:data.length<60000}); return true; }catch(e){ await new Promise(r=>setTimeout(r,2000*(i+1))); } }
  return false; }
function dropWavB64(x,sr){ const R=24000, n=Math.floor((x.length-1)*R/sr), y=new Int16Array(n);
  const z=sr>R?biquad(biquad(x,'lp',10000,0.707,sr),'lp',10000,0.707,sr):x;
  for(let i=0;i<n;i++){ const p=i*sr/R, i0=Math.floor(p), fr=p-i0, v=z[i0]*(1-fr)+z[i0+1]*fr; y[i]=Math.max(-32768,Math.min(32767,Math.round(v*32767))); }
  const b=new DataView(new ArrayBuffer(44)), w=(o,t)=>{ for(let i=0;i<t.length;i++) b.setUint8(o+i,t.charCodeAt(i)); };
  w(0,'RIFF'); b.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); b.setUint32(16,16,true); b.setUint16(20,1,true); b.setUint16(22,1,true); b.setUint32(24,R,true); b.setUint32(28,R*2,true); b.setUint16(32,2,true); b.setUint16(34,16,true); w(36,'data'); b.setUint32(40,n*2,true);
  return new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result).split(',')[1]); fr.readAsDataURL(new Blob([b.buffer,y.buffer])); }); }
const slug=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
function dropState(tr){ return {notes:tr.notes?tr.notes.map(n=>({s:n.s,l:n.l,p:pitchOf(n),raw:+(+n.p).toFixed(3),v:n.v,x:!!n.x,...(n.r0!=null?{r0:n.r0}:{}),...(n.hs?{hs:n.hs}:{})})):undefined, hits:tr.hits?tr.hits.map(h=>({s:h.s,d:h.d,v:h.v})):undefined, fxs:tr.fxs?tr.fxs.map(e=>({s:e.s,l:e.l,k:e.k,v:e.v})):undefined, va:tr.va, sound:tr.sound}; }
function dropMeta(tr){ return {sid:tr.sid, song:S.title||'', inst:tr.inst, bpm:S.bpm, bars:S.bars, quant:S.quant, key:S.key, scale:S.scale, snapStr:S.snapStr??100, sens:tr.sens??S.sens, latMs:S.latMs, who:drop&&drop.who||'',
  recordedAt:tr.sidAt, updatedAt:new Date().toISOString(), heard:tr.sidHeard, now:dropState(tr), reading:tr.reading||null, prompt:S.prompt||null, guide:(()=>{ const g=S.tracks.find(t=>t.guide); return g?dropState(g):null; })(), playAlong:!!S.playAlong, noise:tr.sidNoise||null, edits:tr.ed||[], clip:{off:tr.off||0,len:tr.len||null}, cut:!!tr.cutAt, exportedAt:S.exportedAt||null, build:NOODLE_BUILD, ua:navigator.userAgent.slice(0,120)}; }
async function dropTake(x, sr, inst){ if(!drop) return;
  const tr=S.tracks.find(t=>(t._raw&&t._raw.x===x)||t._fxx===x||(t._takes||[]).some(k=>k.raw&&k.raw.x===x));
  if(!tr){ // nothing was heard: still worth sending, it shows what Noodle misses
    const d=new Date(), sid=`${d.toISOString().replace(/[-:]/g,'').slice(0,15)}-${(drop&&drop.api?'':slug(S.title))||'untitled'}-${inst}-nothing-heard`;
    dropPost({sid, ...(drop.api?{pcm:{x,sr}}:{wav:await dropWavB64(x,sr)}), meta:{sid, song:S.title||'', inst, bpm:S.bpm, prompt:S.prompt||null, heard:null, recordedAt:d.toISOString(), who:drop.who||'', ua:navigator.userAgent.slice(0,120)}}); return; }
  const d=new Date(), pad=v=>String(v).padStart(2,'0');
  tr.sid=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${(drop&&drop.api?'':slug(S.title))||'untitled'}-${inst}`;
  tr.sidAt=d.toISOString(); tr.sidHeard=dropState(tr); tr.sidNoise=lastNoise; tr._dropSent=null; persist();
  if(S.prompt && !tr.guide && INST[tr.inst].kind==='pitched'){ learnSqueeze(tr); persist(); }
  if(S.prompt && !tr.guide){ guidedDone.add(S.prompt); try{ localStorage.setItem('noodle.guided',JSON.stringify([...guidedDone])); }catch(e){} }
  const wav=drop.api?null:await dropWavB64(x,sr), meta=dropMeta(tr); tr._dropSent=JSON.stringify(meta.now);
  const ok=await dropPost({sid:tr.sid, ...(drop.api?{pcm:{x,sr}}:{wav}), meta}); if(!ok) toast('Couldn’t send that take. It’ll still work here.'); }
let dropTimer=0;
function dropSoon(){ if(!drop) return; clearTimeout(dropTimer); dropTimer=setTimeout(dropSync,8000); }
function dropSync(force){ if(!drop) return; clearTimeout(dropTimer);
  S.tracks.forEach(tr=>{ if(!tr.sid) return; const now=JSON.stringify(dropState(tr)); if(now===tr._dropSent && !force) return; tr._dropSent=now; dropPost({sid:tr.sid, meta:dropMeta(tr)}); }); }
/* ---- Guided takes (only while sharing is on): a 4-bar guide to listen to, then you record the same thing ---- */
const G_MEL={   // [midi, steps] (16 steps a bar, 4 bars)
  steps:   [[60,4],[62,4],[64,4],[65,4],[67,4],[65,4],[64,4],[62,4],[60,4],[62,4],[64,4],[65,4],[64,4],[62,4],[60,8]],   /* the first tune anyone meets: next-door notes only, five notes wide, the same shape twice (and enough rising steps for the voice profile) */
  scale:   [[60,4],[62,4],[64,4],[65,4],[67,4],[69,4],[71,4],[72,4],[71,4],[69,4],[67,4],[65,4],[64,4],[62,4],[60,8]],
  twinkle: [[62,4],[62,4],[69,4],[69,4],[71,4],[71,4],[69,8],[67,4],[67,4],[66,4],[66,4],[64,4],[64,4],[62,8]],
  mary:    [[64,4],[62,4],[60,4],[62,4],[64,4],[64,4],[64,8],[62,4],[62,4],[62,8],[64,4],[67,4],[67,8]],
  ode:     [[69,4],[69,4],[70,4],[72,4],[72,4],[70,4],[69,4],[67,4],[65,4],[65,4],[67,4],[69,4],[69,6],[67,2],[67,8]],
  jingle:  [[59,4],[59,4],[59,8],[59,4],[59,4],[59,8],[59,4],[62,4],[55,6],[57,2],[59,16]],
  frere:   [[65,4],[67,4],[69,4],[65,4],[65,4],[67,4],[69,4],[65,4],[69,4],[70,4],[72,8],[69,4],[70,4],[72,8]],
  birthday:[[55,3],[55,1],[57,4],[55,4],[60,4],[59,8],[null,8],[55,3],[55,1],[57,4],[55,4],[62,4],[60,8],[null,8]],
  long:    [[62,64]],
  row:     [[60,4],[60,4],[60,3],[62,1],[64,4],[64,3],[62,1],[64,3],[65,1],[67,8],[72,2],[72,2],[67,2],[67,2],[64,2],[64,2],[60,2],[60,2],[67,3],[65,1],[64,3],[62,1],[60,8]],
  london:  [[67,3],[69,1],[67,2],[65,2],[64,2],[65,2],[67,4],[62,2],[64,2],[65,4],[64,2],[65,2],[67,4],[67,3],[69,1],[67,2],[65,2],[64,2],[65,2],[67,4],[62,4],[67,4],[64,2],[60,6]],
  yankee:  [[60,2],[60,2],[62,2],[64,2],[60,2],[64,2],[62,2],[55,2],[60,2],[60,2],[62,2],[64,2],[60,4],[59,4],[60,2],[60,2],[62,2],[64,2],[65,2],[64,2],[62,2],[60,2],[59,2],[55,2],[57,2],[59,2],[60,4],[60,4]],
  saints:  [[60,2],[64,2],[65,2],[67,10],[60,2],[64,2],[65,2],[67,10],[60,2],[64,2],[65,2],[67,4],[64,4],[60,2],[64,4],[62,12]],
  farm:    [[60,4],[60,4],[60,4],[55,4],[57,4],[57,4],[55,8],[64,4],[64,4],[62,4],[62,4],[60,12],[null,4]],
  buns:    [[64,4],[62,4],[60,8],[64,4],[62,4],[60,8],[60,2],[60,2],[60,2],[60,2],[62,2],[62,2],[62,2],[62,2],[64,4],[62,4],[60,8]],
  joy:     [[72,4],[71,3],[69,1],[67,6],[65,2],[64,4],[62,4],[60,8],[67,2],[69,6],[69,2],[71,6],[71,2],[72,14]],
  birthday2:[[55,3],[55,1],[67,4],[64,4],[60,4],[59,4],[57,8],[null,4],[65,3],[65,1],[64,4],[60,4],[62,4],[60,12],[null,4]],
  susanna: [[60,2],[62,2],[64,4],[67,4],[67,3],[69,1],[67,4],[64,4],[60,6],[62,2],[64,4],[64,4],[62,4],[60,4],[62,12],[null,4]],
  taps:    [[55,3],[55,1],[60,12],[55,3],[60,1],[64,12],[55,3],[60,1],[64,8],[55,3],[60,1],[64,16]],
  kumbaya: [[60,2],[64,2],[67,6],[67,2],[69,2],[69,2],[67,8],[60,2],[64,2],[67,4],[67,6],[65,2],[64,4],[62,4],[60,12],[null,4]],
  michael: [[60,4],[64,4],[67,6],[64,2],[67,4],[69,4],[67,8],[64,4],[67,4],[69,4],[67,4],[64,4],[62,4],[60,8]],
  arpeggio:[[60,4],[64,4],[67,4],[72,4],[67,4],[64,4],[60,8],[62,4],[65,4],[69,4],[74,4],[69,4],[65,4],[62,8]],
  jumps:   [[60,4],[67,4],[60,4],[69,4],[60,4],[72,4],[60,4],[64,4],[60,4],[65,4],[60,4],[71,4],[60,4],[67,4],[72,8]],
};
const G_DRUM={
  beat: (()=>{ const h=[]; for(let b=0;b<4;b++){ const o=b*16; h.push([o,'kick'],[o+8,'kick'],[o+4,'snare'],[o+12,'snare']); for(let k=0;k<16;k+=2) h.push([o+k,'hat']); } return h; })(),
  each: [[0,'kick'],[4,'kick'],[8,'kick'],[12,'kick'],[16,'snare'],[20,'snare'],[24,'snare'],[28,'snare'],[32,'hat'],[36,'hat'],[40,'hat'],[44,'hat'],[48,'kick'],[52,'snare'],[56,'hat'],[60,'hat']],
};
const GUIDED=[
  ['steps-hum','steps','Hum it: “mm”'],
  ['scale-hum','scale','Hum it: “mm”'], ['scale-la','scale','Sing it on “la”'],
  ['twinkle-hum','twinkle','Hum it: “mm”'], ['twinkle-words','twinkle','Sing the words (Twinkle twinkle little star…)'], ['twinkle-whistle','twinkle','Whistle it'],
  ['twinkle-da','twinkle','Sing “da” on every note'], ['twinkle-soft','twinkle','Sing it quietly and breathily'], ['twinkle-scoops','twinkle','Slide up into each note'],
  ['twinkle-fast','twinkle','Hum it, faster','',140],
  ['mary-words','mary','Sing the words (Mary had a little lamb)'], ['mary-hum','mary','Hum it smoothly, no breaks between notes'],
  ['jingle-words','jingle','Sing the words (Jingle bells…)'], ['jingle-da','jingle','Sing “da” on every note'],
  ['ode-hum','ode','Hum it smoothly (Ode to Joy)'], ['ode-whistle','ode','Whistle it'],
  ['frere-la','frere','Sing it on “la” (Frère Jacques)'], ['birthday-words','birthday','Sing the words (Happy birthday to you…)'],
  ['long-vowels','long','One long note: slowly “ooo → aaa → eee → ooo”'], ['long-swell','long','One long note: quiet → loud → quiet'],
  ['long-bend','long','One long note with vibrato, then bend up and back down'],
  ['row-words','row','Sing the words (Row, row, row your boat…)'], ['row-hum','row','Hum it smoothly'],
  ['london-words','london','Sing the words (London Bridge is falling down…)'], ['london-da','london','Sing “da” on every note'],
  ['yankee-words','yankee','Sing the words (Yankee Doodle went to town…)'], ['yankee-hum','yankee','Hum it'],
  ['saints-words','saints','Sing the words (Oh when the saints…)'], ['saints-whistle','saints','Whistle it'],
  ['farm-words','farm','Sing the words (Old MacDonald had a farm…)'], ['farm-hum','farm','Hum it smoothly'],
  ['buns-words','buns','Sing the words (Hot cross buns…)'], ['buns-mm','buns','Hum it, with a tiny break on repeated notes (“mm-mm”)'],
  ['joy-words','joy','Sing the words (Joy to the world…)'], ['joy-la','joy','Sing it on “la”'],
  ['birthday2-words','birthday2','Sing: Happy birthday dear (any name), happy birthday to you'], ['birthday2-hum','birthday2','Hum it'],
  ['susanna-words','susanna','Sing the words (Oh I come from Alabama…)'], ['susanna-hum','susanna','Hum it'],
  ['taps-hum','taps','Hum it (Taps, the bugle call)'], ['taps-la','taps','Sing it on “la”'],
  ['kumbaya-words','kumbaya','Sing the words (Kumbaya, my Lord…)'], ['kumbaya-hum','kumbaya','Hum it'],
  ['michael-words','michael','Sing the words (Michael, row the boat ashore, hallelujah)'], ['michael-hum','michael','Hum it'],
  ['arpeggio-la','arpeggio','Sing it on “la”: up and down the chord'], ['arpeggio-hum','arpeggio','Hum it'],
  ['jumps-la','jumps','Sing it on “la”: big jumps away from the home note and back'], ['jumps-whistle','jumps','Whistle it'],
  ['beat','beat','Beatbox it: kick, snare, hats','kit'], ['drums-each','each','Beatbox each sound as shown: kicks, snares, then hats','kit'],
];
let guidedDone=new Set(); try{ guidedDone=new Set(JSON.parse(localStorage.getItem('noodle.guided')||'[]')); }catch(e){}
async function guidedSetup(id){ const g=GUIDED.find(x=>x[0]===id); if(!g) return; const [,mel,how,inst0,bpm]=g, kit=inst0==='kit';
  flushSave(); await projSaveCurrent(); if(playing){ stopAll(); playing=false; }
  const keepKeys=['feelBeat','buzzMs','kit','calibrated','latAuto','latMs','ec','sens','snapStr','detailBias','vocLat','mergeDrums','replaceTonal','mig2','mig3','sq','keyRef','playAlong','tapPad'];
  const o=defaultState(); keepKeys.forEach(k=>{ if(k in S) o[k]=S[k]; });
  o.title=id; o.prompt=id; o.bpm=bpm||110; o.bars=4; o.loops=2; let nid=S.nextId;
  let guide, take;
  if(kit){ guide=mkTrack('kit',{id:nid++, name:'Guide', hits:G_DRUM[mel].map(([s,d])=>({s,d,v:d==='hat'?0.6:0.9})), vol:70}); take=mkTrack('kit',{id:nid++, name:'Your take'}); }
  else { let t=0; const notes=[]; G_MEL[mel].forEach(([p,l])=>{ if(p!=null) notes.push({s:t,l,p,v:0.8,x:true}); t+=l; });
    guide=mkTrack('lead',{id:nid++, name:'Guide', notes, sound:'Square', vol:60, send:10}); take=mkTrack('lead',{id:nid++, name:'Your take'}); }
  guide.guide=true; o.tracks=[guide,take]; o.nextId=nid; o.activeId=take.id;
  takeBar=null; await restoreSnap({json:JSON.stringify(o), rt:new Map()}); S.activeId=take.id; S.inst=take.inst; save(); flushSave();
  toast(`${id}: ${how}`); }
let takeReading=0;   /* a take is read in the background: no new recording starts until it lands */
async function addTake(x, sr, inst, opt){ takeReading++; let r; try{ r=await addTake0(x, sr, inst, opt); } finally{ takeReading--; } if(musicalOn()) await loadMusical(); let kept=false; S.tracks.forEach(t=>{ if(t._raw&&t._raw.x===x){ if(keepSource(t)) kept=true; t._versions=null; t._vi=0; t.reading=null; delete t.heardNotes; delete t.mzNotes; delete t.mzOn; try{ musicalPass(t); }catch(e){} if(autoOct(t)){ save(); scheduleRender(); } } }); if(kept) save(); try{ dropTake(x, sr, inst); }catch(e){} try{ repeatTip(x); }catch(e){} return r; }
/* once: after the first melody take with a long held note, a tip for repeated notes */
function repeatTip(x){ if(localStorage.getItem('noodle.tipRepeat')) return;
  const tr=S.tracks.find(t=>(t._raw&&t._raw.x===x)); if(!tr||INST[tr.inst].kind!=='pitched'||!tr.notes) return;
  if(!tr.notes.some(n=>!n.x && n.l>=8)) return;
  localStorage.setItem('noodle.tipRepeat','1');
  setTimeout(()=>toast('Tip: for repeated notes, add a tiny break (“da da” or “mm-mm”). To split a long note, double-tap it.',7000),2500); }
async function addTake0(x, sr, inst, opt){
  opt.first = !anyContent();   // is this the first real recording? (the example parts make way for it)
  if(inst==='vox') return addVocalTake(x, sr, opt);
  if(inst==='fx') return addFxTake(x, sr, opt);
  const busy=showBusy('Listening to your take…');
  await new Promise(r=>setTimeout(r,30));
  try{
    let tr=mkTrack(inst,{id:S.nextId++, sens:S.sens});
    const tgD=S.tracks.find(t=>t.id===S.target); const an=await analyzeTakeBg(x,sr,inst,tr.sens,opt.notch,partDetail(tgD)); const wmsg=fitWhistle(an,inst);
    const kind=INST[inst].kind;
    let first = kind==='pitched' ? (an.notes[0]&&an.notes[0].t0) : (an.onsets[0]&&an.onsets[0].t);
    if(first===undefined){ toast(kind==='pitched'?'Noodle couldn’t hear clear notes. Hum a little louder, or raise Mic sensitivity in More.':'Noodle couldn’t hear any hits. Try a little louder, or raise Mic sensitivity in More.'); return; }
    an.align = opt.align!=null ? opt.align : Math.max(0,first-0.004); an.live=!!opt.live; an.notchUsed=!!opt.notch; an.base=an.align;
    let msg='', detBars=0;
    if(!opt.live && opt.first){
      const times = kind==='pitched'? an.notes.map(n=>n.t0) : an.onsets.map(o=>o.t), w = kind==='pitched'? an.notes.map(n=>n.v) : an.onsets.map(o=>o.v);
      const bpm=detectTempo(times,w);
      if(bpm){ S.bpm=bpm; const span=(Math.max(...times)-an.align)/stepDur(); const tg0=S.tracks.find(t=>t.id===S.target); detBars=(tg0&&tg0.lenSet)?tg0.len:([1,2,4,8,16].find(b=>b*16>=span+1)||16); S.bars=Math.max(S.bars,detBars); msg=` Tempo set to ${bpm} BPM, ${detBars} bar${detBars>1?'s':''}.`; }
    }
    if(opt.live){ const cb=removeClickBleed(an.onsets, an.align, x.length/sr, x.click); if(cb.removed){ an.onsets=cb.ons; an.bleed=cb.removed; if(kind!=='pitched'&&an.onsets[0]) first=an.onsets[0].t; } }
    if(kind!=='pitched' && !an.onsets.length){ toast('Nothing recorded: Noodle only heard the metronome click.'); return; }
    if(opt.first) guessFix=null;   // starting over: re-learn the mic delay
    const unCal = opt.live && S.latAuto && !S.calibrated;
    const preFit = an.align + (unCal && guessFix!=null && kind!=='pitched' ? guessFix : 0);
    an.align=fitAlign(takeTimes(an,inst), preFit); if(!opt.live) an.align=Math.min(an.align, first+0.02);
    // learn this phone's real delay from how far the take sat from the grid (only while not calibrated); it settles over a few takes
    if(opt.live && kind==='pitched'){ try{ await readerSplit(an, x, sr); }catch(e){} }   /* repeats hummed as one sound */
    if(kind==='pitched'){ try{ tapRead(an, opt.taps||[], inst); }catch(e){} }   /* your taps: today's split, or tap notes (in testing); both kept for A/B */
    if(opt.live && S.latAuto){ const d=an.align-preFit; S.autoAdj=clamp(0.6*(S.autoAdj||0)+0.4*(d+(S.autoAdj||0)), -0.06, 0.2); }
    if(unCal && guessFix==null && kind!=='pitched'){   // drums only: a hummed note's soft start is too vague to anchor beat one
      // not calibrated yet: if the first sound lands 1–3 steps after the downbeat, it was most likely meant for beat one.
      // Later takes reuse the same correction (the delay doesn't change), so a layer that starts on the off-beat stays there.
      const k=Math.round((first-an.align)/stepDur()); if(k>=1 && k<=3){ an.align+=k*stepDur(); an.guessed=k; }
      guessFix = (an.guessed||0)*stepDur();   // remember only the beat-one shift, never the fine-tuning (it used to pile up)
    }
    const isDrum = kind!=='pitched';
    let tg=S.tracks.find(t=>t.id===S.target); if(tg&&tg.guide) tg=S.tracks.find(t=>!t.guide&&t.inst===tg.inst)||null; if(!tg&&S.prompt) tg=S.tracks.find(t=>!t.guide&&t.inst===inst)||null;   // never record over a guided take's Guide
    if(detBars){ tr.len=detBars; if(tg) tg.len=detBars; }
    const tgFits = tg && (isDrum ? INST[tg.inst].kind!=='pitched' && INST[tg.inst].kind!=='audio' && INST[tg.inst].kind!=='mix' : tg.inst===inst);
    if(tgFits && !hasContent(tg)){ tr=tg; tr.sens=S.sens; }               // an empty part: this take fills it
    if(tg && tg.ex && tgFits){ tg.ex=false; }
    const tgtTonal = !isDrum ? (tgFits ? (hasContent(tg)?tg:null) : (S.replaceTonal && !tg ? [...userTracks()].reverse().find(t=>t.inst===inst&&hasContent(t)&&!t.guide) : null)) : null;
    if(tgtTonal){
      tgtTonal._range=null; tgtTonal._an=an; tgtTonal._raw={x,sr}; tgtTonal.takeN=1; tgtTonal._takes=[{id:1,inst,an,raw:{x,sr}}]; tgtTonal.sens=tr.sens;
      if(opt.first||tgtTonal.ex) dropExamples(tgtTonal); S.activeId=tgtTonal.id; quantizeTrack(tgtTonal); keyChanged(); save(); renderTracks(); 
      toast(`Recorded over ${INST[inst].label}: ${tgtTonal.notes.length} notes.${wmsg}`);
      tgtTonal._dirty=true; await renderDirty();
      if(!playing){ playing=true; playFrom=takeStart(); startAll(ctx.currentTime+0.08, playFrom); }
      return;
    }
    const target = isDrum ? (tgFits ? (hasContent(tg)?tg:null) : (S.mergeDrums && !tg ? [...userTracks()].reverse().find(t=>INST[t.inst].kind!=='pitched'&&INST[t.inst].kind!=='audio'&&INST[t.inst].kind!=='mix'&&hasContent(t)) : null)) : null;
    if(target){
      const id=(target.takeN||1)+1; target.takeN=id;
      if(!target._takes) target._takes = target._an ? [{id:id-1, inst:target.inst, an:target._an, raw:target._raw}] : [];
      target._takes.push({id, inst, an, raw:{x,sr}}); target._an=an; target._raw={x,sr};
      if(target.inst!=='kit' && target.inst!==inst && !(INST[target.inst].drum && INST[inst].kind==='drum' && INST[inst].drum===INST[target.inst].drum)) target.inst='kit';
      [inst,target.inst].forEach(i=>{ const dr=INST[i].drum; if(dr && !slotOf(dr) && !S.kit.slots.some(x=>x.sound===dr) && S.kit.slots.length<MAX_SLOTS) S.kit.slots.push({id:dr,sound:dr,say:''}); });
      if(opt.first||target.ex) dropExamples(target); S.activeId=target.id; quantizeTrack(target);
      const added=target.hits.filter(h=>h.k===id); const c={}; added.forEach(h=>c[slotLabel(h.d).toLowerCase()]=(c[slotLabel(h.d).toLowerCase()]||0)+1);
      save(); renderTracks();
      toast(`Layered ${added.length} hits onto ${INST[target.inst].label} (${Object.entries(c).map(([d,n])=>n+' '+d).join(', ')||'none'}). Take ${id}; tap Undo last take to remove it.`+(an.bleed?` Ignored ${an.bleed} metronome clicks.`:''));
      target._dirty=true; await renderDirty();
      if(!playing){ playing=true; playFrom=takeStart(); startAll(ctx.currentTime+0.08, playFrom); }
      return;
    }
    if(tr.inst!==inst && tr===tg){ /* single-drum part recorded with its own sound */ }
    tr._range=null; tr._an=an; tr._raw={x,sr}; tr.takeN=1; tr._takes=[{id:1,inst:tr.inst===inst?inst:tr.inst,an,raw:{x,sr}}];
    if(opt.first) dropExamples();
    quantizeTrack(tr);
    const count = kind==='pitched'? tr.notes.length : tr.hits.length;
    if(!S.tracks.includes(tr)) S.tracks.push(tr); S.activeId=tr.id; keyCache=null; if(kind==='pitched') keyChanged();
    save(); renderTracks(); 
    let detail='';
    if(inst==='kit'){ const c={}; S.kit.slots.forEach(x=>c[x.id]=0); tr.hits.forEach(h=>c[h.d]=(c[h.d]||0)+1); detail=' ('+Object.entries(c).filter(([d,n])=>n||['kick','snare','hat'].includes(d)).map(([d,n])=>n+' '+slotLabel(d).toLowerCase()).join(', ')+')'; }
    toast(`${INST[inst].label}: ${count} ${kind==='pitched'?'notes':'hits'}${detail}.${msg}${wmsg}`+(an.bleed?` Ignored ${an.bleed} metronome clicks the mic picked up; headphones avoid this.`:'')+(opt.live&&!S.calibrated&&S.latAuto?' If it sounds late, use Fix late notes in More.':''));
    tr._dirty=true; await renderDirty();
    if(!playing){ playing=true; playFrom=takeStart(); startAll(ctx.currentTime+0.08, playFrom); }
  } finally { busy(); }
}
function disposeTrack(tr){ if(tr._src){ try{tr._src.stop();}catch(e){} } if(tr._g){ try{tr._g.disconnect(); tr._p.disconnect(); tr._snd.disconnect();}catch(e){} } }
async function importFile(file){
  ensureCtx();
  const busy=showBusy('Opening '+file.name+'…');
  let ab;
  try{ const buf=await file.arrayBuffer(); ab=await new Promise((res,rej)=>{ const p=ctx.decodeAudioData(buf,res,rej); if(p&&p.then) p.then(res,rej); }); }
  catch(e){ busy(); toast('That file couldn’t be opened as audio. Try an .m4a, .mp3 or .wav recording.'); return; }
  busy();
  if(ab.duration>90){ toast('That recording is '+Math.round(ab.duration)+' s long. Only the first 90 s are used.'); }
  let x=mono(ab); if(ab.duration>90) x=x.subarray(0,Math.floor(90*ab.sampleRate));
  await addTake(x, ab.sampleRate, S.inst, {align:null, notch:false, live:false}); flushSave(); if(takeMode()) afterTake(); else if(!$('recSheet').hidden) showReview();
}

